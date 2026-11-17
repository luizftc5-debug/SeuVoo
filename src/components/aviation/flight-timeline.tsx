import { describeEvent } from "@/lib/aviation/events";
import type { FlightEvent, FlightOccurrence } from "@/lib/aviation/types";
import { formatDateTime, formatTime } from "@/lib/dates";
import { cn } from "@/lib/cn";

type Step = {
  key: string;
  label: string;
  time?: string;
  tz?: string;
  state: "done" | "expected" | "flag" | "critical";
  note?: string;
};

/**
 * Linha do tempo operacional. Só marca como concluído o que tem horário efetivo.
 * Etapas sem dado ficam como "previsto" (com estimativa/programado) ou são omitidas.
 */
export function FlightTimeline({
  flight,
  events = [],
}: {
  flight: FlightOccurrence;
  events?: Pick<
    FlightEvent,
    "type" | "previousValue" | "currentValue" | "detectedAt" | "dedupeKey"
  >[];
}) {
  const dTz = flight.departure.airport.timezone;
  const aTz = flight.arrival.airport.timezone;
  const d = flight.departure;
  const a = flight.arrival;
  const steps: Step[] = [];

  if (d.gateTimes.scheduled)
    steps.push({
      key: "sched",
      label: "Partida programada",
      time: d.gateTimes.scheduled,
      tz: dTz,
      state: "done",
      note: `Chegada programada ${a.gateTimes.scheduled ? formatTime(a.gateTimes.scheduled, aTz) : "não informada"}`,
    });

  const fmt = {
    departure: (iso: string) => formatTime(iso, dTz),
    arrival: (iso: string) => formatTime(iso, aTz),
  };
  for (const e of events) {
    if (e.type === "status_changed") continue;
    const t = describeEvent(e, fmt);
    steps.push({
      key: e.dedupeKey,
      label: t.title,
      note: `${t.body} Detectado em ${formatDateTime(e.detectedAt, dTz)}.`,
      state: e.type === "cancelled" || e.type === "diverted" ? "critical" : "flag",
    });
  }

  if (flight.status === "cancelled") {
    steps.push({
      key: "cancel",
      label: "Cancelado",
      state: "critical",
      note: "Informado pelo provedor de dados.",
    });
  } else {
    if (flight.status === "boarding")
      steps.push({
        key: "board",
        label: "Embarque",
        state: "done",
        note: "Informado pelo provedor; horário não disponível.",
      });
    const outT = d.gateTimes.actual ?? d.gateTimes.estimated;
    steps.push({
      key: "out",
      label: d.gateTimes.actual ? "Saída do portão" : "Saída do portão (prevista)",
      time: outT,
      tz: dTz,
      state: d.gateTimes.actual ? "done" : "expected",
    });
    if (d.runwayTimes.actual || d.runwayTimes.estimated)
      steps.push({
        key: "off",
        label: d.runwayTimes.actual ? "Decolagem" : "Decolagem (prevista)",
        time: d.runwayTimes.actual ?? d.runwayTimes.estimated,
        tz: dTz,
        state: d.runwayTimes.actual ? "done" : "expected",
      });
    if (flight.status === "diverted") {
      steps.push({
        key: "div",
        label: "Desviado",
        state: "critical",
        note: flight.divertedTo
          ? `Destino alternativo: ${flight.divertedTo.city ?? flight.divertedTo.name} (${flight.divertedTo.iata}).`
          : "Destino alternativo não informado.",
      });
    } else {
      if (flight.status === "airborne")
        steps.push({ key: "enroute", label: "Em rota", state: "done" });
      if (a.runwayTimes.actual || a.runwayTimes.estimated)
        steps.push({
          key: "on",
          label: a.runwayTimes.actual ? "Pouso" : "Pouso (previsto)",
          time: a.runwayTimes.actual ?? a.runwayTimes.estimated,
          tz: aTz,
          state: a.runwayTimes.actual ? "done" : "expected",
        });
      const inT = a.gateTimes.actual ?? a.gateTimes.estimated ?? a.gateTimes.scheduled;
      steps.push({
        key: "in",
        label: a.gateTimes.actual ? "Chegada ao portão" : "Chegada (prevista)",
        time: inT,
        tz: aTz,
        state: a.gateTimes.actual ? "done" : "expected",
      });
    }
  }

  return (
    <ol className="relative">
      {steps.map((s, i) => (
        <li
          key={s.key}
          className="relative grid grid-cols-[1.25rem_1fr_auto] gap-x-3 pb-5 last:pb-0"
        >
          {i < steps.length - 1 && (
            <span
              className={cn(
                "absolute left-[9px] top-4 h-full w-px",
                s.state === "done" ? "bg-ink/70" : "bg-line-strong",
              )}
              aria-hidden="true"
            />
          )}
          <span
            className={cn(
              "relative mt-1 size-[11px] translate-x-[4px] rounded-full border",
              s.state === "done" && "border-ink bg-ink",
              s.state === "expected" && "border-line-strong bg-canvas",
              s.state === "flag" && "border-warning-mark bg-warning-mark",
              s.state === "critical" && "border-critical bg-critical",
            )}
            aria-hidden="true"
          />
          <div className="min-w-0">
            <p
              className={cn(
                "text-sm",
                s.state === "expected" ? "text-muted" : "font-medium text-ink",
              )}
            >
              {s.label}
            </p>
            {s.note && <p className="mt-0.5 text-[13px] text-muted">{s.note}</p>}
          </div>
          <p className={cn("t-data text-sm", s.state === "expected" ? "text-muted" : "text-ink")}>
            {s.time && s.tz ? formatTime(s.time, s.tz) : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}
