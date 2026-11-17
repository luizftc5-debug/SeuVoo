import "server-only";
import { findAirport, greatCircleKm } from "@/lib/aviation/airports";
import { findAirline } from "@/lib/aviation/airlines";
import { deriveStatus } from "@/lib/aviation/status";
import {
  ProviderError,
  type AirportRef,
  type DataSource,
  type FlightDataProvider,
  type FlightOccurrence,
  type FlightTrack,
} from "@/lib/aviation/types";
import { addDays, DEFAULT_TZ, localDate, zonedToUtc } from "@/lib/dates";
import { fetchWithRetry } from "../http";

/**
 * Adapter FlightAware AeroAPI (v4).
 * Mapeamento baseado na documentação pública; validar contra a conta
 * contratada antes de produção (docs/AVIATION_DATA.md).
 * Chave somente no servidor: AEROAPI_KEY.
 */

export const AEROAPI_SOURCE: DataSource = {
  id: "aeroapi",
  name: "FlightAware AeroAPI",
  synthetic: false,
  attribution: "Dados de voo: FlightAware AeroAPI.",
};

const BASE = process.env.AEROAPI_BASE_URL ?? "https://aeroapi.flightaware.com/aeroapi";

/** Subconjunto dos campos da AeroAPI usado pelo SeuVoo. */
export interface AeroAirport {
  code?: string | null;
  code_iata?: string | null;
  code_icao?: string | null;
  name?: string | null;
  city?: string | null;
  timezone?: string | null;
}

export interface AeroFlight {
  fa_flight_id: string;
  ident?: string | null;
  ident_iata?: string | null;
  operator?: string | null;
  operator_iata?: string | null;
  flight_number?: string | null;
  registration?: string | null;
  aircraft_type?: string | null;
  origin?: AeroAirport | null;
  destination?: AeroAirport | null;
  scheduled_out?: string | null;
  estimated_out?: string | null;
  actual_out?: string | null;
  scheduled_off?: string | null;
  estimated_off?: string | null;
  actual_off?: string | null;
  scheduled_on?: string | null;
  estimated_on?: string | null;
  actual_on?: string | null;
  scheduled_in?: string | null;
  estimated_in?: string | null;
  actual_in?: string | null;
  gate_origin?: string | null;
  gate_destination?: string | null;
  terminal_origin?: string | null;
  terminal_destination?: string | null;
  status?: string | null;
  cancelled?: boolean | null;
  diverted?: boolean | null;
  route_distance?: number | null;
}

const u = <T>(v: T | null | undefined): T | undefined => (v == null || v === "" ? undefined : v);

function toAirportRef(a: AeroAirport | null | undefined): AirportRef {
  const iata = u(a?.code_iata) ?? u(a?.code) ?? "???";
  const known = findAirport(iata) ?? findAirport(u(a?.code_icao));
  return {
    iata: known?.iata ?? iata,
    icao: u(a?.code_icao) ?? known?.icao,
    name: u(a?.name) ?? known?.name ?? iata,
    city: u(a?.city) ?? known?.city,
    country: known?.country,
    timezone: u(a?.timezone) ?? known?.timezone ?? DEFAULT_TZ,
    lat: known?.lat,
    lon: known?.lon,
  };
}

export function normalizeAeroFlight(
  f: AeroFlight,
  fetchedAt: string,
  cached: boolean,
): FlightOccurrence {
  const dep = toAirportRef(f.origin);
  const arr = toAirportRef(f.destination);
  const dg = {
    scheduled: u(f.scheduled_out),
    estimated: u(f.estimated_out),
    actual: u(f.actual_out),
  };
  const dr = {
    scheduled: u(f.scheduled_off),
    estimated: u(f.estimated_off),
    actual: u(f.actual_off),
  };
  const ar = { scheduled: u(f.scheduled_on), estimated: u(f.estimated_on), actual: u(f.actual_on) };
  const ag = { scheduled: u(f.scheduled_in), estimated: u(f.estimated_in), actual: u(f.actual_in) };
  const carrier = u(f.operator_iata) ?? u(f.operator) ?? "";
  const airline = findAirline(carrier) ?? {
    iata: u(f.operator_iata),
    icao: u(f.operator),
    name: carrier || "Companhia não informada",
  };
  const number = u(f.flight_number) ?? "";
  const designator = u(f.ident_iata) ?? u(f.ident) ?? `${carrier}${number}`;
  const anchor = dg.scheduled ?? dr.scheduled;
  const km =
    dep.lat != null && arr.lat != null
      ? Math.round(greatCircleKm({ lat: dep.lat, lon: dep.lon! }, { lat: arr.lat, lon: arr.lon! }))
      : undefined;
  return {
    id: `aeroapi:${f.fa_flight_id}`,
    source: AEROAPI_SOURCE,
    providerId: f.fa_flight_id,
    airline,
    designator,
    flightNumber: number,
    operatingDate: anchor ? localDate(anchor, dep.timezone) : "",
    departure: {
      airport: dep,
      terminal: u(f.terminal_origin),
      gate: u(f.gate_origin),
      gateTimes: dg,
      runwayTimes: dr,
    },
    arrival: {
      airport: arr,
      terminal: u(f.terminal_destination),
      gate: u(f.gate_destination),
      gateTimes: ag,
      runwayTimes: ar,
    },
    status: deriveStatus({
      cancelled: !!f.cancelled,
      diverted: !!f.diverted,
      boarding: /boarding/i.test(f.status ?? ""),
      departureGate: dg,
      departureRunway: dr,
      arrivalRunway: ar,
      arrivalGate: ag,
    }),
    providerStatusText: u(f.status),
    aircraft: { type: u(f.aircraft_type), registration: u(f.registration) },
    greatCircleKm: km,
    freshness: { fetchedAt, cached },
  };
}

export function createAeroApiProvider(apiKey: string): FlightDataProvider {
  async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const qs = new URLSearchParams(params).toString();
    const res = await fetchWithRetry(`${BASE}${path}${qs ? `?${qs}` : ""}`, {
      headers: { "x-apikey": apiKey, accept: "application/json" },
      label: "aeroapi",
    }).catch(() => {
      throw new ProviderError("unavailable", "O provedor de dados de voo não respondeu.");
    });
    if (res.status === 404) throw new ProviderError("not_found", "Nenhum registro no provedor.");
    if (res.status === 429)
      throw new ProviderError("rate_limited", "Limite de consultas do provedor atingido.");
    if (res.status === 400)
      throw new ProviderError("invalid_query", "Consulta recusada pelo provedor.");
    if (res.status === 401 || res.status === 403)
      throw new ProviderError("not_configured", "Credencial do provedor inválida.");
    if (!res.ok) throw new ProviderError("unavailable", `Provedor respondeu ${res.status}.`);
    return (await res.json()) as T;
  }

  /** Janela UTC que cobre o dia local inteiro no Brasil e fusos vizinhos. */
  function windowFor(date: string) {
    return {
      start: zonedToUtc(date, "00:00", "Etc/GMT-14"),
      end: zonedToUtc(addDays(date, 1), "00:00", "Etc/GMT+12"),
    };
  }

  const now = () => new Date().toISOString();
  const tolerant = async <T>(p: Promise<T>): Promise<T | null> => {
    try {
      return await p;
    } catch (e) {
      if (e instanceof ProviderError && e.kind === "not_found") return null;
      throw e;
    }
  };

  return {
    source: AEROAPI_SOURCE,
    async searchByDesignator(q) {
      const w = windowFor(q.date);
      const data = await tolerant(
        get<{ flights?: AeroFlight[] }>(`/flights/${encodeURIComponent(q.designator)}`, {
          ident_type: "designator",
          start: w.start,
          end: w.end,
        }),
      );
      const t = now();
      return (data?.flights ?? [])
        .map((f) => normalizeAeroFlight(f, t, false))
        .filter((f) => f.operatingDate === q.date);
    },
    async searchByRoute(q) {
      const w = windowFor(q.date);
      const data = await tolerant(
        get<{ flights?: { segments?: AeroFlight[] }[] }>(
          `/airports/${encodeURIComponent(q.origin)}/flights/to/${encodeURIComponent(q.destination)}`,
          { type: "Airline", start: w.start, end: w.end },
        ),
      );
      const t = now();
      return (data?.flights ?? [])
        .flatMap((x) => x.segments ?? [])
        .map((f) => normalizeAeroFlight(f, t, false))
        .filter((f) => f.operatingDate === q.date);
    },
    async getOccurrence(providerId) {
      const data = await tolerant(
        get<{ flights?: AeroFlight[] }>(`/flights/${encodeURIComponent(providerId)}`, {
          ident_type: "fa_flight_id",
        }),
      );
      const f = data?.flights?.[0];
      return f ? normalizeAeroFlight(f, now(), false) : null;
    },
    async getTrack(providerId): Promise<FlightTrack | null> {
      const data = await tolerant(
        get<{
          positions?: {
            latitude: number;
            longitude: number;
            altitude?: number;
            groundspeed?: number;
            heading?: number;
            timestamp: string;
          }[];
        }>(`/flights/${encodeURIComponent(providerId)}/track`),
      );
      if (!data?.positions?.length) return null;
      return {
        occurrenceId: `aeroapi:${providerId}`,
        source: AEROAPI_SOURCE,
        positions: data.positions.map((p) => ({
          lat: p.latitude,
          lon: p.longitude,
          altitudeFt: p.altitude != null ? p.altitude * 100 : undefined, // AeroAPI: centenas de pés
          groundspeedKt: p.groundspeed,
          heading: p.heading,
          timestamp: p.timestamp,
        })),
      };
    },
    async getAirportBoard(iata, kind) {
      const path = kind === "departures" ? "scheduled_departures" : "scheduled_arrivals";
      const data = await tolerant(
        get<Record<string, AeroFlight[] | undefined>>(
          `/airports/${encodeURIComponent(iata)}/flights/${path}`,
          { type: "Airline", max_pages: "1" },
        ),
      );
      if (!data) return null;
      const t = now();
      return (data[path] ?? []).map((f) => normalizeAeroFlight(f, t, false));
    },
  };
}
