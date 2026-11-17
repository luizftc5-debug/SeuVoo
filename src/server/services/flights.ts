import "server-only";
import { isFinal } from "@/lib/aviation/status";
import {
  ProviderError,
  type DataSourceId,
  type FlightDataProvider,
  type FlightOccurrence,
  type FlightTrack,
} from "@/lib/aviation/types";
import { cached, invalidate } from "../cache";
import { log } from "../log";
import { createAeroApiProvider } from "../providers/aeroapi";
import { createDemoProvider } from "../providers/demo";

/**
 * Fachada de dados de voo. A interface só conversa com este módulo.
 * Seleção do provedor por configuração: FLIGHT_DATA_PROVIDER=aeroapi + AEROAPI_KEY.
 * Sem configuração, usa o provedor de demonstração.
 */

let active: FlightDataProvider | null = null;
const demo = createDemoProvider();

export function activeProvider(): FlightDataProvider {
  if (active) return active;
  const want = process.env.FLIGHT_DATA_PROVIDER;
  const key = process.env.AEROAPI_KEY;
  if (want === "aeroapi" && key) active = createAeroApiProvider(key);
  else {
    if (want === "aeroapi") log("warn", "flights.provider.missing_key", { fallback: "demo" });
    active = demo;
  }
  return active;
}

function providerFor(source: DataSourceId): FlightDataProvider | null {
  const p = activeProvider();
  if (p.source.id === source) return p;
  if (source === "demo") return demo; // links de demonstração seguem funcionando
  return null;
}

export function isDemoMode(): boolean {
  return activeProvider().source.synthetic;
}

const TTL = {
  search: 120_000,
  live: 60_000,
  final: 30 * 60_000,
  track: 60_000,
  board: 120_000,
};

function markCached(list: FlightOccurrence[], hit: boolean): FlightOccurrence[] {
  return hit ? list.map((f) => ({ ...f, freshness: { ...f.freshness, cached: true } })) : list;
}

export async function searchFlights(designator: string, date: string): Promise<FlightOccurrence[]> {
  const p = activeProvider();
  const { value, hit } = await cached(
    `search:${p.source.id}:${designator}:${date}`,
    TTL.search,
    () => p.searchByDesignator({ designator, date }),
  );
  return markCached(value, hit).sort((a, b) =>
    (a.departure.gateTimes.scheduled ?? "").localeCompare(b.departure.gateTimes.scheduled ?? ""),
  );
}

export async function searchRoute(
  origin: string,
  destination: string,
  date: string,
): Promise<FlightOccurrence[]> {
  const p = activeProvider();
  const { value, hit } = await cached(
    `route:${p.source.id}:${origin}:${destination}:${date}`,
    TTL.search,
    () => p.searchByRoute({ origin, destination, date }),
  );
  return markCached(value, hit).sort((a, b) =>
    (a.departure.gateTimes.scheduled ?? "").localeCompare(b.departure.gateTimes.scheduled ?? ""),
  );
}

export async function getOccurrence(
  source: DataSourceId,
  providerId: string,
  opts: { fresh?: boolean } = {},
): Promise<FlightOccurrence | null> {
  const p = providerFor(source);
  if (!p)
    throw new ProviderError(
      "not_configured",
      "A fonte deste voo não está configurada neste ambiente.",
    );
  const cacheKey = `occ:${source}:${providerId}`;
  if (opts.fresh) invalidate(cacheKey);
  // Voos encerrados mudam pouco: consultas já finalizadas ficam em cache por mais tempo.
  const done = await cached(
    `${cacheKey}:final`,
    TTL.final,
    async () => null as FlightOccurrence | null,
  );
  if (done.value) return { ...done.value, freshness: { ...done.value.freshness, cached: true } };
  const first = await cached(cacheKey, TTL.live, () => p.getOccurrence(providerId));
  if (!first.value) return null;
  if (isFinal(first.value.status)) {
    invalidate(`${cacheKey}:final`);
    await cached(`${cacheKey}:final`, TTL.final, async () => first.value);
  }
  return first.hit
    ? { ...first.value, freshness: { ...first.value.freshness, cached: true } }
    : first.value;
}

export async function getTrack(
  source: DataSourceId,
  providerId: string,
): Promise<FlightTrack | null> {
  const p = providerFor(source);
  if (!p) return null;
  const { value } = await cached(`track:${source}:${providerId}`, TTL.track, () =>
    p.getTrack(providerId),
  );
  return value;
}

export async function getAirportBoard(iata: string, kind: "departures" | "arrivals") {
  const p = activeProvider();
  const { value } = await cached(`board:${p.source.id}:${iata}:${kind}`, TTL.board, () =>
    p.getAirportBoard(iata, kind),
  );
  return value;
}

/** Mensagem segura para o usuário a partir de um erro do provedor. */
export function providerErrorMessage(e: unknown): string {
  if (e instanceof ProviderError) {
    switch (e.kind) {
      case "rate_limited":
        return "Muitas consultas ao provedor de dados agora. Tente novamente em alguns minutos.";
      case "not_configured":
        return "A fonte de dados de voo não está configurada neste ambiente.";
      case "invalid_query":
        return "O provedor não aceitou essa consulta. Confira o número do voo e a data.";
      case "not_found":
        return "O provedor não tem registro desse voo.";
      default:
        return "Não foi possível consultar o provedor de dados de voo agora. Isso não significa que o voo foi cancelado — tente novamente em instantes.";
    }
  }
  log("error", "flights.unexpected", { message: e instanceof Error ? e.message : String(e) });
  return "Não foi possível consultar esse voo agora. Tente novamente em instantes.";
}
