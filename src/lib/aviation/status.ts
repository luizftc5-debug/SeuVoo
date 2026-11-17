import { diffMinutes } from "@/lib/dates";
import type { FlightOccurrence, FlightStatusCode, TimeSet } from "./types";

/** Atraso a partir do qual o voo é tratado como "atrasado" (minutos). */
export const DELAY_THRESHOLD_MIN = 15;

export interface StatusSignals {
  cancelled?: boolean;
  diverted?: boolean;
  boarding?: boolean;
  departureGate: TimeSet;
  departureRunway: TimeSet;
  arrivalRunway: TimeSet;
  arrivalGate: TimeSet;
}

/**
 * Deriva o status somente de sinais explícitos do provedor
 * (flags e horários efetivos). Nunca usa o relógio para "adivinhar"
 * que um voo decolou porque o horário programado passou.
 */
export function deriveStatus(s: StatusSignals): FlightStatusCode {
  if (s.cancelled) return "cancelled";
  if (s.diverted) return "diverted";
  if (s.arrivalGate.actual) return "arrived";
  if (s.arrivalRunway.actual) return "landed";
  if (s.departureRunway.actual) return "airborne";
  if (s.departureGate.actual) return "departed";
  if (s.boarding) return "boarding";
  const sched = s.departureGate.scheduled;
  const est = s.departureGate.estimated;
  if (sched && est && diffMinutes(est, sched) >= DELAY_THRESHOLD_MIN) return "delayed";
  if (sched) return "scheduled";
  return "unknown";
}

export type StatusTone = "neutral" | "positive" | "warning" | "critical" | "active";

export const STATUS_META: Record<FlightStatusCode, { label: string; tone: StatusTone }> = {
  scheduled: { label: "Programado", tone: "neutral" },
  boarding: { label: "Embarque", tone: "active" },
  departed: { label: "Saiu do portão", tone: "active" },
  airborne: { label: "Em voo", tone: "active" },
  landed: { label: "Pousou", tone: "positive" },
  arrived: { label: "Chegou", tone: "positive" },
  delayed: { label: "Atrasado", tone: "warning" },
  cancelled: { label: "Cancelado", tone: "critical" },
  diverted: { label: "Desviado", tone: "critical" },
  unknown: { label: "Sem status", tone: "neutral" },
};

/** Melhor horário conhecido, com a natureza explícita. */
export function bestTime(
  t: TimeSet,
): { iso: string; kind: "actual" | "estimated" | "scheduled" } | null {
  if (t.actual) return { iso: t.actual, kind: "actual" };
  if (t.estimated) return { iso: t.estimated, kind: "estimated" };
  if (t.scheduled) return { iso: t.scheduled, kind: "scheduled" };
  return null;
}

/** Variação (min) do melhor horário conhecido em relação ao programado. */
export function variance(t: TimeSet): number | null {
  const b = bestTime(t);
  if (!b || !t.scheduled || b.kind === "scheduled") return null;
  return diffMinutes(b.iso, t.scheduled);
}

export function varianceLabel(min: number | null): string | null {
  if (min == null) return null;
  if (Math.abs(min) < 5) return "no horário";
  if (min > 0) return `${min} min atrasado`;
  return `${Math.abs(min)} min adiantado`;
}

/** Duração programada portão a portão (min). */
export function scheduledBlockMinutes(f: FlightOccurrence): number | null {
  const a = f.departure.gateTimes.scheduled;
  const b = f.arrival.gateTimes.scheduled;
  return a && b ? diffMinutes(b, a) : null;
}

/** Tempo efetivamente voado (decolagem → pouso), apenas com horários reais. */
export function actualAirborneMinutes(f: FlightOccurrence): number | null {
  const off = f.departure.runwayTimes.actual;
  const on = f.arrival.runwayTimes.actual;
  if (off && on) return diffMinutes(on, off);
  const out = f.departure.gateTimes.actual;
  const inn = f.arrival.gateTimes.actual;
  return out && inn ? diffMinutes(inn, out) : null;
}

export function isFinal(status: FlightStatusCode): boolean {
  return (
    status === "arrived" || status === "landed" || status === "cancelled" || status === "diverted"
  );
}
