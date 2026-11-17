/**
 * Contrato interno do SeuVoo para dados aeronáuticos.
 *
 * A interface nunca consome o formato de um provedor externo diretamente:
 * todo adapter (src/server/providers) converte para estes tipos.
 * Todos os instantes são ISO-8601 em UTC. O fuso de exibição vem do aeroporto.
 */

export type FlightStatusCode =
  | "scheduled" // programado, sem sinal operacional
  | "boarding" // embarque informado pelo provedor
  | "departed" // saiu do portão (out)
  | "airborne" // decolou (off) / em rota
  | "landed" // pousou (on)
  | "arrived" // chegou ao portão (in)
  | "delayed" // programado, mas com estimativa posterior ao horário
  | "cancelled"
  | "diverted"
  | "unknown";

export type DataSourceId = "demo" | "aeroapi";

export interface DataSource {
  id: DataSourceId;
  name: string;
  /** Verdadeiro quando os dados são sintéticos (modo demonstração). */
  synthetic: boolean;
  attribution: string;
}

export interface DataFreshness {
  /** Quando o SeuVoo obteve os dados do provedor (UTC). */
  fetchedAt: string;
  /** Última atualização informada pelo próprio provedor, se houver. */
  providerUpdatedAt?: string;
  /** Veio do cache do servidor? */
  cached: boolean;
}

export interface AirportRef {
  iata: string;
  icao?: string;
  name: string;
  city?: string;
  country?: string;
  /** Fuso IANA, ex.: America/Sao_Paulo */
  timezone: string;
  lat?: number;
  lon?: number;
}

export interface Airline {
  iata?: string;
  icao?: string;
  name: string;
}

export interface Aircraft {
  /** Código de tipo ICAO, ex.: A320, B738 */
  type?: string;
  registration?: string;
}

/** Um conjunto de horários de um extremo do voo (partida ou chegada). */
export interface TimeSet {
  scheduled?: string;
  estimated?: string;
  actual?: string;
}

export interface FlightEndpoint {
  airport: AirportRef;
  terminal?: string;
  gate?: string;
  /** Portão/pátio: out (partida) ou in (chegada). */
  gateTimes: TimeSet;
  /** Pista: off (decolagem) ou on (pouso). */
  runwayTimes: TimeSet;
}

export interface FlightOccurrence {
  /** Identificador estável e opaco: `${source}:${providerId}` */
  id: string;
  source: DataSource;
  providerId: string;
  airline: Airline;
  /** Ex.: "LA3456" (IATA) */
  designator: string;
  flightNumber: string;
  /** Data local de operação na origem (AAAA-MM-DD). */
  operatingDate: string;
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  /** Aeroporto alternativo quando desviado. */
  divertedTo?: AirportRef;
  status: FlightStatusCode;
  /** Texto do status como veio do provedor (para auditoria). */
  providerStatusText?: string;
  aircraft?: Aircraft;
  /** Distância ortodrômica entre aeroportos (km), quando calculável. */
  greatCircleKm?: number;
  freshness: DataFreshness;
}

export interface FlightPosition {
  lat: number;
  lon: number;
  altitudeFt?: number;
  groundspeedKt?: number;
  heading?: number;
  timestamp: string;
}

export interface FlightTrack {
  occurrenceId: string;
  positions: FlightPosition[];
  source: DataSource;
}

export type FlightEventType =
  | "departure_time_changed"
  | "arrival_time_changed"
  | "departure_gate_changed"
  | "arrival_gate_changed"
  | "departure_terminal_changed"
  | "status_changed"
  | "cancelled"
  | "diverted"
  | "delay_detected";

export interface FlightEvent {
  id: string;
  occurrenceId: string;
  type: FlightEventType;
  previousValue?: string;
  currentValue?: string;
  /** Quando a mudança aconteceu segundo o provedor (se informado). */
  occurredAt?: string;
  /** Quando o SeuVoo detectou a mudança. */
  detectedAt: string;
  /** Chave de deduplicação: mesma mudança => mesma chave. */
  dedupeKey: string;
}

export interface FlightSearchQuery {
  /** Designador: código da companhia + número, ex. "LA3456" ou "ZZ1001" */
  designator: string;
  /** Data local AAAA-MM-DD */
  date: string;
}

export interface RouteSearchQuery {
  origin: string;
  destination: string;
  date: string;
}

export type ProviderErrorKind =
  "not_configured" | "unavailable" | "rate_limited" | "invalid_query" | "not_found";

export class ProviderError extends Error {
  constructor(
    public kind: ProviderErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

export interface FlightDataProvider {
  source: DataSource;
  searchByDesignator(q: FlightSearchQuery): Promise<FlightOccurrence[]>;
  searchByRoute(q: RouteSearchQuery): Promise<FlightOccurrence[]>;
  getOccurrence(providerId: string): Promise<FlightOccurrence | null>;
  /** Posição/trajetória: só quando o provedor fornece de fato. */
  getTrack(providerId: string): Promise<FlightTrack | null>;
  getAirportBoard(
    iata: string,
    kind: "departures" | "arrivals",
  ): Promise<FlightOccurrence[] | null>;
}
