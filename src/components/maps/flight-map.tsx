import { greatCirclePoints } from "@/lib/aviation/airports";
import type { FlightOccurrence, FlightTrack } from "@/lib/aviation/types";
import { formatTime } from "@/lib/dates";
import { LazyMap } from "./lazy-map";

/**
 * Mapa do voo. Sem trajetória do provedor, mostra só a ligação geométrica
 * entre os aeroportos — e diz isso explicitamente.
 */
export function FlightMap({
  flight,
  track,
}: {
  flight: FlightOccurrence;
  track: FlightTrack | null;
}) {
  const d = flight.departure.airport;
  const a = flight.arrival.airport;
  if (d.lat == null || d.lon == null || a.lat == null || a.lon == null)
    return (
      <p className="text-sm text-muted">
        Coordenadas dos aeroportos indisponíveis para desenhar o mapa.
      </p>
    );
  const observed = track && track.positions.length > 1;
  const last = observed ? track.positions[track.positions.length - 1] : null;
  return (
    <figure>
      <div className="h-64 sm:h-80">
        <LazyMap
          ariaLabel={`Mapa de ${d.city ?? d.iata} para ${a.city ?? a.iata}`}
          points={[
            { id: "o", lon: d.lon, lat: d.lat, label: d.iata, emphasis: true },
            { id: "d", lon: a.lon, lat: a.lat, label: a.iata, emphasis: true },
            ...(last ? [{ id: "pos", lon: last.lon, lat: last.lat, label: "Última posição" }] : []),
          ]}
          lines={[
            observed
              ? {
                  id: "track",
                  kind: "observed" as const,
                  coordinates: track.positions.map((p) => [p.lon, p.lat] as [number, number]),
                }
              : {
                  id: "gc",
                  kind: "illustrative" as const,
                  coordinates: greatCirclePoints(
                    { lat: d.lat, lon: d.lon },
                    { lat: a.lat, lon: a.lon },
                  ),
                },
          ]}
        />
      </div>
      <figcaption className="mt-2 text-[13px] text-muted">
        {observed
          ? `Trajetória observada informada por ${track.source.name}. Última posição às ${formatTime(last!.timestamp, d.timezone)} (horário de ${d.iata}).`
          : "Ligação ilustrativa pelo menor caminho entre os aeroportos (ortodrômica). Não é a rota percorrida nem a posição da aeronave."}
      </figcaption>
    </figure>
  );
}
