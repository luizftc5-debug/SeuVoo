import Link from "next/link";
import { occurrenceSlug } from "@/lib/aviation/ids";
import {
  STATUS_META,
  bestTime,
  variance,
  varianceLabel,
  type StatusTone,
} from "@/lib/aviation/status";
import type {
  AirportRef,
  FlightEndpoint,
  FlightOccurrence,
  FlightStatusCode,
  TimeSet,
} from "@/lib/aviation/types";
import {
  formatShortDate,
  formatTime,
  localDate,
  relativeFromNow,
  utcOffsetLabel,
} from "@/lib/dates";
import { cn } from "@/lib/cn";
import { DemoTag } from "@/components/ui/primitives";
import { IconChevronRight } from "@/components/ui/icons";

const toneText: Record<StatusTone, string> = {
  neutral: "text-ink-2",
  positive: "text-positive",
  warning: "text-warning",
  critical: "text-critical",
  active: "text-accent",
};
const toneDot: Record<StatusTone, string> = {
  neutral: "bg-line-strong",
  positive: "bg-positive",
  warning: "bg-warning-mark",
  critical: "bg-critical",
  active: "bg-accent",
};

export function FlightStatus({
  status,
  className,
}: {
  status: FlightStatusCode;
  className?: string;
}) {
  const m = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        toneText[m.tone],
        className,
      )}
    >
      <span className={cn("size-2 rounded-full", toneDot[m.tone])} aria-hidden="true" />
      {m.label}
    </span>
  );
}

export function AirportIdentifier({
  airport,
  align = "left",
  size = "lg",
}: {
  airport: AirportRef;
  align?: "left" | "right";
  size?: "lg" | "md";
}) {
  return (
    <div className={cn("min-w-0", align === "right" && "text-right")}>
      <p
        className={cn(
          "t-data font-medium leading-none text-ink",
          size === "lg" ? "text-[40px] sm:text-[52px]" : "text-2xl",
        )}
      >
        {airport.iata}
      </p>
      <p className="mt-1.5 truncate text-sm text-ink-2" title={airport.name}>
        {airport.city ?? airport.name}
      </p>
    </div>
  );
}

const KIND_LABEL = { actual: "efetivo", estimated: "estimado", scheduled: "programado" } as const;

/** Horário principal + natureza do dado + programado quando difere. */
export function TimeStack({
  times,
  tz,
  align = "left",
  operatingDate,
}: {
  times: TimeSet;
  tz: string;
  align?: "left" | "right";
  operatingDate?: string;
}) {
  const b = bestTime(times);
  if (!b)
    return (
      <div className={cn(align === "right" && "text-right")}>
        <p className="t-data text-xl text-muted">—</p>
        <p className="text-xs text-muted">sem horário informado</p>
      </div>
    );
  const v = variance(times);
  const vl = varianceLabel(v);
  const changed = b.kind !== "scheduled" && times.scheduled && v != null && Math.abs(v) >= 5;
  const day = localDate(b.iso, tz);
  const otherDay = operatingDate && day !== operatingDate;
  return (
    <div className={cn(align === "right" && "text-right")}>
      <p className="t-data text-2xl font-medium text-ink">
        {formatTime(b.iso, tz)}
        {otherDay && (
          <span className="ml-1 align-top text-xs text-muted">{formatShortDate(day)}</span>
        )}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {KIND_LABEL[b.kind]}
        {changed && times.scheduled && (
          <>
            {" · prog. "}
            <span className="t-data line-through decoration-muted/60">
              {formatTime(times.scheduled, tz)}
            </span>
          </>
        )}
      </p>
      {changed && vl && (
        <p className={cn("mt-0.5 text-xs font-medium", v! > 0 ? "text-warning" : "text-positive")}>
          {vl}
        </p>
      )}
    </div>
  );
}

export function GateLine({ endpoint, hide }: { endpoint: FlightEndpoint; hide?: boolean }) {
  if (hide) return null;
  const parts = [
    endpoint.terminal ? `Terminal ${endpoint.terminal}` : null,
    endpoint.gate ? `Portão ${endpoint.gate}` : null,
  ].filter(Boolean);
  return (
    <p className="text-[13px] text-ink-2">
      {parts.length ? (
        parts.join(" · ")
      ) : (
        <span className="text-muted">Terminal e portão não informados</span>
      )}
    </p>
  );
}

/** Linha de rota entre os dois aeroportos, com marcador de progresso só quando há horário efetivo. */
export function RouteLine({ flight }: { flight: FlightOccurrence }) {
  const s = flight.status;
  const progressed =
    s === "arrived" || s === "landed" ? 100 : s === "airborne" ? 50 : s === "departed" ? 8 : 0;
  const broken = s === "cancelled" || s === "diverted";
  return (
    <div className="relative mx-3 flex h-6 items-center sm:mx-6" aria-hidden="true">
      <div
        className={cn(
          "h-px w-full",
          broken ? "border-t border-dashed border-critical/50" : "bg-line-strong",
        )}
      />
      {!broken && progressed > 0 && (
        <div className="absolute left-0 h-[2px] bg-ink" style={{ width: `${progressed}%` }} />
      )}
      <span className="absolute left-0 size-1.5 -translate-x-1/2 rounded-full bg-ink" />
      <span
        className={cn(
          "absolute right-0 size-1.5 translate-x-1/2 rounded-full",
          progressed === 100 ? "bg-ink" : "border border-ink bg-canvas",
        )}
      />
      {s === "airborne" && (
        <span className="absolute left-1/2 -translate-x-1/2 rounded-sm bg-canvas px-1.5 text-[11px] font-medium uppercase tracking-wide text-accent">
          em voo
        </span>
      )}
    </div>
  );
}

export function FreshnessNote({
  flight,
  className,
}: {
  flight: FlightOccurrence;
  className?: string;
}) {
  const f = flight.freshness;
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted",
        className,
      )}
    >
      {flight.source.synthetic && <DemoTag />}
      <span>
        Fonte: {flight.source.name} · consultado {relativeFromNow(f.fetchedAt)}
        {f.cached ? " (cache)" : ""}
        {f.providerUpdatedAt
          ? ` · atualizado pelo provedor ${relativeFromNow(f.providerUpdatedAt)}`
          : ""}
      </span>
    </p>
  );
}

export function TzNote({ flight }: { flight: FlightOccurrence }) {
  const d = flight.departure.airport;
  const a = flight.arrival.airport;
  const ref = flight.departure.gateTimes.scheduled ?? new Date().toISOString();
  const same = d.timezone === a.timezone;
  return (
    <p className="text-[13px] text-muted">
      Horários locais de cada aeroporto
      {same
        ? ` (${utcOffsetLabel(ref, d.timezone)}).`
        : `: ${d.iata} ${utcOffsetLabel(ref, d.timezone)}, ${a.iata} ${utcOffsetLabel(ref, a.timezone)}.`}
    </p>
  );
}

/** Linha compacta para listas (resultados, voos acompanhados, quadros). */
export function FlightRow({
  flight,
  href,
  meta,
}: {
  flight: FlightOccurrence;
  href?: string;
  meta?: React.ReactNode;
}) {
  const dep = bestTime(flight.departure.gateTimes);
  const arr = bestTime(flight.arrival.gateTimes);
  const link = href ?? `/voos/${occurrenceSlug(flight.id)}`;
  return (
    <Link
      href={link}
      className="group grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-4 py-4 transition-colors hover:bg-subtle sm:grid-cols-[8rem_1fr_9rem_auto] sm:px-5"
    >
      <div className="min-w-0">
        <p className="t-data text-[15px] font-medium text-ink">{flight.designator}</p>
        <p className="truncate text-[13px] text-muted">{formatShortDate(flight.operatingDate)}</p>
      </div>
      <div className="order-3 col-span-2 flex items-center gap-3 sm:order-none sm:col-span-1">
        <span className="t-data text-ink">
          {flight.departure.airport.iata}{" "}
          <span className="text-ink-2">
            {dep ? formatTime(dep.iso, flight.departure.airport.timezone) : "—"}
          </span>
        </span>
        <span className="h-px w-6 bg-line-strong" aria-hidden="true" />
        <span className="t-data text-ink">
          {flight.arrival.airport.iata}{" "}
          <span className="text-ink-2">
            {arr ? formatTime(arr.iso, flight.arrival.airport.timezone) : "—"}
          </span>
        </span>
        <span className="sr-only">
          de {flight.departure.airport.city} para {flight.arrival.airport.city}
        </span>
      </div>
      <div className="justify-self-end sm:justify-self-start">
        <FlightStatus status={flight.status} />
        {meta}
      </div>
      <IconChevronRight className="hidden text-muted transition-transform group-hover:translate-x-0.5 sm:block" />
    </Link>
  );
}
