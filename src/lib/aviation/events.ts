import { diffMinutes } from "@/lib/dates";
import { DELAY_THRESHOLD_MIN, STATUS_META } from "./status";
import type { FlightEvent, FlightEventType, FlightOccurrence } from "./types";

/**
 * Motor de eventos: compara dois instantâneos do mesmo voo e devolve as
 * mudanças relevantes. A dedupeKey identifica a mudança (tipo + valor novo),
 * então reprocessar o mesmo instantâneo não gera alertas repetidos.
 */

/** Mudanças de horário menores que isso são ruído. */
export const TIME_CHANGE_MIN = 5;

type Draft = Omit<FlightEvent, "id" | "detectedAt" | "dedupeKey">;

function key(occurrenceId: string, type: FlightEventType, value: string | undefined) {
  return `${occurrenceId}|${type}|${value ?? "∅"}`;
}

function expected(t: { estimated?: string; actual?: string; scheduled?: string }) {
  return t.actual ?? t.estimated ?? t.scheduled;
}

export function diffSnapshots(
  prev: FlightOccurrence | null,
  next: FlightOccurrence,
  detectedAt: string = new Date().toISOString(),
): FlightEvent[] {
  const drafts: Draft[] = [];
  const id = next.id;
  const push = (type: FlightEventType, previousValue?: string, currentValue?: string) =>
    drafts.push({
      occurrenceId: id,
      type,
      previousValue,
      currentValue,
      occurredAt: next.freshness.providerUpdatedAt,
    });

  if (!prev) {
    // Estado inicial: só registra o que já é relevante ao passageiro.
    if (next.status === "cancelled") push("cancelled", undefined, "cancelled");
    else if (next.status === "diverted") push("diverted", undefined, next.divertedTo?.iata);
    else {
      const sched = next.departure.gateTimes.scheduled;
      const exp = expected(next.departure.gateTimes);
      if (sched && exp && diffMinutes(exp, sched) >= DELAY_THRESHOLD_MIN)
        push("delay_detected", sched, exp);
    }
  } else {
    if (next.status !== prev.status) {
      if (next.status === "cancelled") push("cancelled", prev.status, "cancelled");
      else if (next.status === "diverted") push("diverted", prev.status, next.divertedTo?.iata);
      else push("status_changed", prev.status, next.status);
    }
    const pd = expected(prev.departure.gateTimes);
    const nd = expected(next.departure.gateTimes);
    if (
      pd &&
      nd &&
      Math.abs(diffMinutes(nd, pd)) >= TIME_CHANGE_MIN &&
      !next.departure.gateTimes.actual
    )
      push("departure_time_changed", pd, nd);
    const pa = expected(prev.arrival.gateTimes);
    const na = expected(next.arrival.gateTimes);
    if (
      pa &&
      na &&
      Math.abs(diffMinutes(na, pa)) >= TIME_CHANGE_MIN &&
      !next.arrival.gateTimes.actual
    )
      push("arrival_time_changed", pa, na);
    if (next.departure.gate && prev.departure.gate !== next.departure.gate)
      push("departure_gate_changed", prev.departure.gate, next.departure.gate);
    if (next.arrival.gate && prev.arrival.gate !== next.arrival.gate)
      push("arrival_gate_changed", prev.arrival.gate, next.arrival.gate);
    if (next.departure.terminal && prev.departure.terminal !== next.departure.terminal)
      push("departure_terminal_changed", prev.departure.terminal, next.departure.terminal);
  }

  return drafts.map((d) => {
    const dedupeKey = key(id, d.type, d.currentValue);
    return { ...d, id: dedupeKey, detectedAt, dedupeKey };
  });
}

/** Remove eventos cuja chave já existe. */
export function dedupeEvents(existingKeys: Iterable<string>, events: FlightEvent[]): FlightEvent[] {
  const seen = new Set(existingKeys);
  const out: FlightEvent[] = [];
  for (const e of events) {
    if (seen.has(e.dedupeKey)) continue;
    seen.add(e.dedupeKey);
    out.push(e);
  }
  return out;
}

/** Texto humano do evento. Recebe um formatador de horário com fuso já aplicado. */
export function describeEvent(
  e: Pick<FlightEvent, "type" | "previousValue" | "currentValue">,
  fmt: { departure: (iso: string) => string; arrival: (iso: string) => string },
): { title: string; body: string } {
  const pv = e.previousValue;
  const cv = e.currentValue;
  switch (e.type) {
    case "cancelled":
      return {
        title: "Voo cancelado",
        body: "O provedor de dados informou o cancelamento. Confirme com a companhia aérea.",
      };
    case "diverted":
      return {
        title: "Voo desviado",
        body: cv ? `Desvio informado para ${cv}.` : "O provedor informou um desvio.",
      };
    case "delay_detected":
      return {
        title: "Partida prevista após o horário programado",
        body:
          pv && cv
            ? `Programado ${fmt.departure(pv)} · previsto ${fmt.departure(cv)}.`
            : "Estimativa posterior ao programado.",
      };
    case "departure_time_changed":
      return {
        title: "Horário de partida alterado",
        body: pv && cv ? `${fmt.departure(pv)} → ${fmt.departure(cv)}` : "",
      };
    case "arrival_time_changed":
      return {
        title: "Horário de chegada alterado",
        body: pv && cv ? `${fmt.arrival(pv)} → ${fmt.arrival(cv)}` : "",
      };
    case "departure_gate_changed":
      return {
        title: "Portão de embarque alterado",
        body: pv ? `Portão ${pv} → ${cv}` : `Portão ${cv} informado.`,
      };
    case "arrival_gate_changed":
      return {
        title: "Portão de chegada alterado",
        body: pv ? `Portão ${pv} → ${cv}` : `Portão ${cv} informado.`,
      };
    case "departure_terminal_changed":
      return {
        title: "Terminal de embarque alterado",
        body: pv ? `Terminal ${pv} → ${cv}` : `Terminal ${cv} informado.`,
      };
    case "status_changed": {
      const label = (s?: string) =>
        s && s in STATUS_META ? STATUS_META[s as keyof typeof STATUS_META].label : (s ?? "—");
      return { title: `Status: ${label(cv)}`, body: `Antes: ${label(pv)}.` };
    }
  }
}
