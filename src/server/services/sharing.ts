import "server-only";
import type { FlightOccurrence } from "@/lib/aviation/types";
import { newToken, sha256 } from "../auth";
import type { ShareLinkRow } from "../db/schema";
import { read, write } from "../db/store";
import { getOccurrence } from "./flights";

/**
 * Links de acompanhamento compartilhado. O token só existe em claro no momento
 * da criação; o banco guarda o hash. A página pública mostra apenas dados
 * operacionais do voo — nunca nome, e-mail, viagem, reserva ou documentos.
 */

export async function createShareLink(
  userId: string,
  occurrenceId: string,
  opts: { expiresInHours: number | null; showGates: boolean },
): Promise<{ token: string; link: ShareLinkRow }> {
  const token = newToken();
  const link = await write((db) => {
    if (!db.trackedFlights.some((t) => t.userId === userId && t.occurrenceId === occurrenceId))
      throw new Error("Acompanhe o voo antes de compartilhar.");
    const row: ShareLinkRow = {
      id: crypto.randomUUID(),
      userId,
      resourceType: "flight",
      resourceId: occurrenceId,
      tokenHash: sha256(token),
      scope: { showGates: opts.showGates },
      expiresAt: opts.expiresInHours
        ? new Date(Date.now() + opts.expiresInHours * 3600_000).toISOString()
        : undefined,
      createdAt: new Date().toISOString(),
    };
    db.shareLinks.push(row);
    return row;
  });
  return { token, link };
}

export async function listShareLinks(userId: string, occurrenceId: string) {
  return read((db) =>
    db.shareLinks
      .filter((s) => s.userId === userId && s.resourceId === occurrenceId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  );
}

export async function revokeShareLink(userId: string, id: string) {
  await write((db) => {
    const s = db.shareLinks.find((x) => x.id === id && x.userId === userId);
    if (s && !s.revokedAt) s.revokedAt = new Date().toISOString();
  });
}

export function shareLinkActive(s: ShareLinkRow, at = new Date()): boolean {
  return !s.revokedAt && (!s.expiresAt || new Date(s.expiresAt) > at);
}

export type SharedView =
  | {
      state: "ok";
      flight: FlightOccurrence;
      showGates: boolean;
      expiresAt?: string;
      stale: boolean;
    }
  | { state: "invalid" };

export async function resolveShare(token: string): Promise<SharedView> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { state: "invalid" };
  const h = sha256(token);
  const found = await read((db) => {
    const s = db.shareLinks.find((x) => x.tokenHash === h);
    if (!s || !shareLinkActive(s)) return null;
    const occ = db.flightOccurrences.find((o) => o.id === s.resourceId);
    return occ ? { link: s, snapshot: occ.snapshot } : null;
  });
  if (!found) return { state: "invalid" };
  let flight = found.snapshot;
  let stale = false;
  try {
    const fresh = await getOccurrence(flight.source.id, flight.providerId);
    if (fresh) flight = fresh;
  } catch {
    stale = true; // mostra o último instantâneo, sinalizado
  }
  return {
    state: "ok",
    flight,
    showGates: found.link.scope.showGates,
    expiresAt: found.link.expiresAt,
    stale,
  };
}
