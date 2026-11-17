import type { FlightOccurrence } from "@/lib/aviation/types";
import { formatDuration, formatLongDate } from "@/lib/dates";
import { scheduledBlockMinutes } from "@/lib/aviation/status";
import { cn } from "@/lib/cn";
import { AirportIdentifier, FlightStatus, GateLine, RouteLine, TimeStack } from "./flight-parts";

/** Bloco principal do voo: o que o passageiro precisa ver primeiro. */
export function FlightSummary({
  flight,
  hideGates = false,
  className,
  headingLevel = "h1",
}: {
  flight: FlightOccurrence;
  hideGates?: boolean;
  className?: string;
  headingLevel?: "h1" | "h2" | "p";
}) {
  const H = headingLevel;
  const block = scheduledBlockMinutes(flight);
  return (
    <div className={cn("rounded-lg border border-line bg-surface", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <H className="t-data text-xl font-medium text-ink">{flight.designator}</H>
          <p className="text-[13px] text-muted">
            {flight.airline.name} ·{" "}
            {flight.operatingDate ? formatLongDate(flight.operatingDate) : "data não informada"}
          </p>
        </div>
        <FlightStatus status={flight.status} className="text-[15px]" />
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex items-end">
          <AirportIdentifier airport={flight.departure.airport} />
          <div className="mb-6 flex min-w-0 flex-1 flex-col items-stretch text-center">
            <RouteLine flight={flight} />
            {block != null && (
              <p className="mt-1 text-xs text-muted">{formatDuration(block)} programado</p>
            )}
          </div>
          <AirportIdentifier airport={flight.arrival.airport} align="right" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-6 border-t border-line pt-5">
          <div className="space-y-2">
            <p className="t-label">Partida</p>
            <TimeStack
              times={flight.departure.gateTimes}
              tz={flight.departure.airport.timezone}
              operatingDate={flight.operatingDate}
            />
            <GateLine endpoint={flight.departure} hide={hideGates} />
          </div>
          <div className="space-y-2 text-right">
            <p className="t-label">Chegada</p>
            <TimeStack
              times={flight.arrival.gateTimes}
              tz={flight.arrival.airport.timezone}
              align="right"
              operatingDate={flight.operatingDate}
            />
            <div className="flex justify-end">
              <GateLine endpoint={flight.arrival} hide={hideGates} />
            </div>
          </div>
        </div>

        {flight.status === "diverted" && flight.divertedTo && (
          <p className="mt-5 rounded-md bg-critical-soft px-3 py-2 text-sm text-ink">
            Desviado para {flight.divertedTo.city ?? flight.divertedTo.name} (
            {flight.divertedTo.iata}).
          </p>
        )}
      </div>
    </div>
  );
}
