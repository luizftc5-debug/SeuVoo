import "server-only";
import { describeEvent, dedupeEvents, diffSnapshots } from "@/lib/aviation/events";
import { isFinal } from "@/lib/aviation/status";
import type { FlightOccurrence } from "@/lib/aviation/types";
import { formatTime } from "@/lib/dates";
import type { Database, FlightEventRow, TrackedFlightRow } from "../db/schema";
import { read, write } from "../db/store";
import { log } from "../log";
import { getOccurrence } from "./flights";

/** Intervalo mínimo entre consultas ao provedor por voo acompanhado. */
const REFRESH_MIN_MS = 5 * 60_000;

/**
 * Grava um instantâneo do voo, detecta mudanças, persiste eventos
 * deduplicados e gera notificações para quem acompanha o voo.
 * Executa dentro de uma transação (db já é o rascunho).
 */
export function applySnapshot(
  db: Database,
  occ: FlightOccurrence,
  now = new Date().toISOString(),
): FlightEventRow[] {
  const existing = db.flightOccurrences.find((o) => o.id === occ.id);
  const prev = existing?.snapshot ?? null;
  const stored = { ...occ, freshness: { ...occ.freshness, cached: false } };
  if (existing) {
    existing.snapshot = stored;
    existing.updatedAt = now;
  } else db.flightOccurrences.push({ id: occ.id, snapshot: stored, updatedAt: now });

  const keys = db.flightEvents.filter((e) => e.occurrenceId === occ.id).map((e) => e.dedupeKey);
  const fresh = dedupeEvents(keys, diffSnapshots(prev, occ, now));
  db.flightEvents.push(...fresh);

  if (fresh.length) {
    const watchers = db.trackedFlights.filter((t) => t.occurrenceId === occ.id);
    const fmt = {
      departure: (iso: string) => formatTime(iso, occ.departure.airport.timezone),
      arrival: (iso: string) => formatTime(iso, occ.arrival.airport.timezone),
    };
    for (const w of watchers) {
      for (const e of fresh) {
        if (db.notifications.some((n) => n.userId === w.userId && n.eventKey === e.dedupeKey))
          continue;
        const text = describeEvent(e, fmt);
        db.notifications.push({
          id: crypto.randomUUID(),
          userId: w.userId,
          type: "flight_event",
          title: `${occ.designator} · ${text.title}`,
          body: text.body,
          occurrenceId: occ.id,
          eventKey: e.dedupeKey,
          createdAt: now,
        });
      }
    }
  }
  return fresh;
}

export async function trackFlight(
  userId: string,
  occ: FlightOccurrence,
): Promise<TrackedFlightRow> {
  return write((db) => {
    const now = new Date().toISOString();
    let row = db.trackedFlights.find((t) => t.userId === userId && t.occurrenceId === occ.id);
    if (!row) {
      row = {
        id: crypto.randomUUID(),
        userId,
        occurrenceId: occ.id,
        createdAt: now,
        lastCheckedAt: now,
      };
      db.trackedFlights.push(row);
    }
    // Ao começar a acompanhar, eventos já detectados também viram alerta para este usuário.
    const pastEvents = db.flightEvents.filter((e) => e.occurrenceId === occ.id);
    applySnapshot(db, occ, now);
    const fmt = {
      departure: (iso: string) => formatTime(iso, occ.departure.airport.timezone),
      arrival: (iso: string) => formatTime(iso, occ.arrival.airport.timezone),
    };
    for (const e of pastEvents) {
      if (db.notifications.some((n) => n.userId === userId && n.eventKey === e.dedupeKey)) continue;
      const t = describeEvent(e, fmt);
      db.notifications.push({
        id: crypto.randomUUID(),
        userId,
        type: "flight_event",
        title: `${occ.designator} · ${t.title}`,
        body: t.body,
        occurrenceId: occ.id,
        eventKey: e.dedupeKey,
        createdAt: now,
      });
    }
    return row;
  });
}

export async function untrackFlight(userId: string, trackedId: string): Promise<boolean> {
  return write((db) => {
    const before = db.trackedFlights.length;
    db.trackedFlights = db.trackedFlights.filter(
      (t) => !(t.id === trackedId && t.userId === userId),
    );
    return db.trackedFlights.length < before;
  });
}

export interface TrackedFlightView {
  tracked: TrackedFlightRow;
  flight: FlightOccurrence;
  snapshotAt: string;
}

export async function listTracked(userId: string): Promise<TrackedFlightView[]> {
  return read((db) =>
    db.trackedFlights
      .filter((t) => t.userId === userId)
      .flatMap((t) => {
        const o = db.flightOccurrences.find((x) => x.id === t.occurrenceId);
        return o ? [{ tracked: t, flight: o.snapshot, snapshotAt: o.updatedAt }] : [];
      })
      .sort((a, b) =>
        (a.flight.departure.gateTimes.scheduled ?? "").localeCompare(
          b.flight.departure.gateTimes.scheduled ?? "",
        ),
      ),
  );
}

export async function findTracking(userId: string, occurrenceId: string) {
  return read(
    (db) =>
      db.trackedFlights.find((t) => t.userId === userId && t.occurrenceId === occurrenceId) ?? null,
  );
}

/**
 * Atualiza voos acompanhados não encerrados cujo instantâneo é antigo.
 * Chamado ao abrir a área pessoal e pelo endpoint de cron.
 * Falhas do provedor não alteram o estado salvo.
 */
export async function refreshTrackedFlights(
  filter: { userId?: string } = {},
): Promise<{ checked: number; events: number; failed: number }> {
  const due = await read((db) => {
    const cutoff = Date.now() - REFRESH_MIN_MS;
    const ids = new Set(
      db.trackedFlights
        .filter((t) => !filter.userId || t.userId === filter.userId)
        .map((t) => t.occurrenceId),
    );
    return db.flightOccurrences.filter(
      (o) =>
        ids.has(o.id) && !isFinal(o.snapshot.status) && new Date(o.updatedAt).getTime() < cutoff,
    );
  });
  let events = 0;
  let failed = 0;
  for (const o of due.slice(0, 25)) {
    try {
      const fresh = await getOccurrence(o.snapshot.source.id, o.snapshot.providerId);
      if (!fresh) continue;
      const created = await write((db) => {
        const now = new Date().toISOString();
        for (const t of db.trackedFlights) if (t.occurrenceId === fresh.id) t.lastCheckedAt = now;
        return applySnapshot(db, fresh, now);
      });
      events += created.length;
    } catch (e) {
      failed++;
      log("warn", "tracking.refresh_failed", {
        occurrence: o.id,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return { checked: due.length, events, failed };
}

export async function eventsFor(occurrenceId: string): Promise<FlightEventRow[]> {
  return read((db) =>
    db.flightEvents
      .filter((e) => e.occurrenceId === occurrenceId)
      .sort((a, b) => a.detectedAt.localeCompare(b.detectedAt)),
  );
}

/** Ao exibir um voo acompanhado por alguém, aproveita a consulta para detectar mudanças. */
export async function observeOccurrence(occ: FlightOccurrence): Promise<void> {
  const tracked = await read((db) => db.trackedFlights.some((t) => t.occurrenceId === occ.id));
  if (!tracked || occ.freshness.cached) return;
  await write((db) => {
    applySnapshot(db, occ);
  });
}
