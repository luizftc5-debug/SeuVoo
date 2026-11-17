import "server-only";
import { findAirport, greatCircleKm } from "@/lib/aviation/airports";
import { DEMO_AIRLINE, parseDesignator } from "@/lib/aviation/airlines";
import { deriveStatus } from "@/lib/aviation/status";
import type {
  AirportRef,
  DataSource,
  FlightDataProvider,
  FlightOccurrence,
  FlightSearchQuery,
  FlightTrack,
  RouteSearchQuery,
  TimeSet,
} from "@/lib/aviation/types";
import { addDays, todayIn, zonedToUtc } from "@/lib/dates";

/**
 * Provedor de DEMONSTRAÇÃO.
 * Dados sintéticos e determinísticos, com companhia fictícia "ZZ".
 * Não representam voos reais. Não há posição ao vivo nem trajetória.
 */

export const DEMO_SOURCE: DataSource = {
  id: "demo",
  name: "Demonstração SeuVoo",
  synthetic: true,
  attribution: "Dados sintéticos de demonstração — não representam voos reais.",
};

type Scenario =
  | { kind: "on_time" }
  | { kind: "arrived"; outDelta: number; inDelta: number }
  | { kind: "landed"; outDelta: number; onDelta: number }
  | { kind: "airborne"; outDelta: number; etaDelta: number }
  | { kind: "boarding" }
  | { kind: "delayed"; delta: number }
  | { kind: "cancelled" }
  | { kind: "diverted"; to: string; outDelta: number };

interface Fixture {
  number: string;
  suffix?: string;
  from: string;
  to: string;
  dep: string; // HH:mm local origem
  arr: string; // HH:mm local destino
  arrDayOffset?: number;
  aircraft: string;
  terminalFrom?: string;
  gateFrom?: string;
  gateTo?: string;
  today: Scenario;
}

export const DEMO_FIXTURES: Fixture[] = [
  {
    number: "1001",
    from: "GRU",
    to: "GIG",
    dep: "07:10",
    arr: "08:15",
    aircraft: "A320",
    terminalFrom: "2",
    gateFrom: "214",
    gateTo: "C12",
    today: { kind: "arrived", outDelta: 4, inDelta: -2 },
  },
  {
    number: "1002",
    from: "CGH",
    to: "SDU",
    dep: "09:00",
    arr: "10:05",
    aircraft: "B738",
    gateFrom: "8",
    today: { kind: "delayed", delta: 50 },
  },
  {
    number: "1003",
    from: "BSB",
    to: "SSA",
    dep: "11:30",
    arr: "13:35",
    aircraft: "A321",
    gateFrom: "11",
    today: { kind: "airborne", outDelta: 12, etaDelta: 8 },
  },
  {
    number: "1004",
    from: "GRU",
    to: "LIS",
    dep: "22:05",
    arr: "11:40",
    arrDayOffset: 1,
    aircraft: "B789",
    terminalFrom: "3",
    gateFrom: "305",
    today: { kind: "on_time" },
  },
  {
    number: "1005",
    from: "REC",
    to: "GRU",
    dep: "06:00",
    arr: "09:25",
    aircraft: "A320",
    gateFrom: "5",
    today: { kind: "cancelled" },
  },
  {
    number: "1006",
    from: "POA",
    to: "CGH",
    dep: "08:20",
    arr: "09:55",
    aircraft: "B738",
    gateFrom: "3",
    today: { kind: "diverted", to: "VCP", outDelta: 6 },
  },
  {
    number: "1007",
    from: "CNF",
    to: "BSB",
    dep: "14:45",
    arr: "16:05",
    aircraft: "E195",
    gateFrom: "4",
    today: { kind: "boarding" },
  },
  {
    number: "1008",
    from: "FOR",
    to: "GRU",
    dep: "05:40",
    arr: "09:20",
    aircraft: "A320",
    gateFrom: "7",
    gateTo: "246",
    today: { kind: "landed", outDelta: 0, onDelta: -6 },
  },
  {
    number: "1009",
    from: "GIG",
    to: "MIA",
    dep: "23:15",
    arr: "06:10",
    arrDayOffset: 1,
    aircraft: "B77W",
    terminalFrom: "2",
    today: { kind: "on_time" },
  },
  {
    number: "1010",
    suffix: "a",
    from: "CWB",
    to: "GRU",
    dep: "06:30",
    arr: "07:35",
    aircraft: "E195",
    today: { kind: "arrived", outDelta: 1, inDelta: 0 },
  },
  {
    number: "1010",
    suffix: "b",
    from: "CWB",
    to: "GRU",
    dep: "18:30",
    arr: "19:35",
    aircraft: "E195",
    today: { kind: "on_time" },
  },
];

function ref(iata: string): AirportRef {
  const a = findAirport(iata);
  if (!a) throw new Error(`Aeroporto de demonstração desconhecido: ${iata}`);
  return {
    iata: a.iata,
    icao: a.icao,
    name: a.name,
    city: a.city,
    country: a.country,
    timezone: a.timezone,
    lat: a.lat,
    lon: a.lon,
  };
}

const plus = (iso: string, min: number) =>
  new Date(new Date(iso).getTime() + min * 60000).toISOString();

export function buildDemoOccurrence(
  fx: Fixture,
  date: string,
  now: Date = new Date(),
): FlightOccurrence {
  const from = ref(fx.from);
  const to = ref(fx.to);
  const schedOut = zonedToUtc(date, fx.dep, from.timezone);
  const schedIn = zonedToUtc(addDays(date, fx.arrDayOffset ?? 0), fx.arr, to.timezone);
  const taxiOut = 15;
  const taxiIn = 8;

  const dg: TimeSet = { scheduled: schedOut };
  const dr: TimeSet = { scheduled: plus(schedOut, taxiOut) };
  const ar: TimeSet = { scheduled: plus(schedIn, -taxiIn) };
  const ag: TimeSet = { scheduled: schedIn };

  const today = todayIn(from.timezone, now);
  // Datas passadas usam o desfecho do cenário; futuras ficam apenas programadas.
  let sc: Scenario = fx.today;
  if (date > today) sc = sc.kind === "cancelled" ? sc : { kind: "on_time" };
  else if (date < today) {
    if (
      sc.kind === "on_time" ||
      sc.kind === "boarding" ||
      sc.kind === "airborne" ||
      sc.kind === "landed" ||
      sc.kind === "delayed"
    )
      sc = {
        kind: "arrived",
        outDelta: sc.kind === "delayed" ? sc.delta : 3,
        inDelta: sc.kind === "delayed" ? sc.delta - 5 : 0,
      };
  }

  let cancelled = false;
  let diverted = false;
  let boarding = false;
  let divertedTo: AirportRef | undefined;

  switch (sc.kind) {
    case "on_time":
      dg.estimated = schedOut;
      ag.estimated = schedIn;
      break;
    case "delayed":
      dg.estimated = plus(schedOut, sc.delta);
      dr.estimated = plus(schedOut, sc.delta + taxiOut);
      ag.estimated = plus(schedIn, sc.delta - 5);
      break;
    case "boarding":
      boarding = true;
      dg.estimated = schedOut;
      ag.estimated = schedIn;
      break;
    case "airborne":
      dg.actual = plus(schedOut, sc.outDelta);
      dr.actual = plus(schedOut, sc.outDelta + taxiOut);
      ar.estimated = plus(schedIn, sc.etaDelta - taxiIn);
      ag.estimated = plus(schedIn, sc.etaDelta);
      break;
    case "landed":
      dg.actual = plus(schedOut, sc.outDelta);
      dr.actual = plus(schedOut, sc.outDelta + taxiOut);
      ar.actual = plus(schedIn, sc.onDelta - taxiIn);
      ag.estimated = plus(schedIn, sc.onDelta);
      break;
    case "arrived":
      dg.actual = plus(schedOut, sc.outDelta);
      dr.actual = plus(schedOut, sc.outDelta + taxiOut);
      ar.actual = plus(schedIn, sc.inDelta - taxiIn);
      ag.actual = plus(schedIn, sc.inDelta);
      break;
    case "cancelled":
      cancelled = true;
      break;
    case "diverted":
      diverted = true;
      divertedTo = ref(sc.to);
      dg.actual = plus(schedOut, sc.outDelta);
      dr.actual = plus(schedOut, sc.outDelta + taxiOut);
      break;
  }

  const providerId = `ZZ${fx.number}-${date.replaceAll("-", "")}${fx.suffix ? `-${fx.suffix}` : ""}`;
  return {
    id: `demo:${providerId}`,
    source: DEMO_SOURCE,
    providerId,
    airline: { ...DEMO_AIRLINE },
    designator: `ZZ${fx.number}`,
    flightNumber: fx.number,
    operatingDate: date,
    departure: {
      airport: from,
      terminal: fx.terminalFrom,
      gate: fx.gateFrom,
      gateTimes: dg,
      runwayTimes: dr,
    },
    arrival: { airport: to, gate: fx.gateTo, gateTimes: ag, runwayTimes: ar },
    divertedTo,
    status: deriveStatus({
      cancelled,
      diverted,
      boarding,
      departureGate: dg,
      departureRunway: dr,
      arrivalRunway: ar,
      arrivalGate: ag,
    }),
    providerStatusText: `demo:${sc.kind}`,
    aircraft: { type: fx.aircraft },
    greatCircleKm: Math.round(
      greatCircleKm(from as { lat: number; lon: number }, to as { lat: number; lon: number }),
    ),
    freshness: { fetchedAt: now.toISOString(), cached: false },
  };
}

function parseDemoId(providerId: string): { fx: Fixture; date: string } | null {
  const m = /^ZZ(\d{4})-(\d{4})(\d{2})(\d{2})(?:-([ab]))?$/.exec(providerId);
  if (!m) return null;
  const fx = DEMO_FIXTURES.find(
    (f) => f.number === m[1] && (f.suffix ?? undefined) === (m[5] ?? undefined),
  );
  if (!fx) return null;
  return { fx, date: `${m[2]}-${m[3]}-${m[4]}` };
}

export function createDemoProvider(now: () => Date = () => new Date()): FlightDataProvider {
  return {
    source: DEMO_SOURCE,
    async searchByDesignator(q: FlightSearchQuery) {
      const p = parseDesignator(q.designator);
      if (!p || p.carrier !== DEMO_AIRLINE.iata) return [];
      return DEMO_FIXTURES.filter((f) => f.number === p.number).map((f) =>
        buildDemoOccurrence(f, q.date, now()),
      );
    },
    async searchByRoute(q: RouteSearchQuery) {
      return DEMO_FIXTURES.filter(
        (f) => f.from === q.origin.toUpperCase() && f.to === q.destination.toUpperCase(),
      ).map((f) => buildDemoOccurrence(f, q.date, now()));
    },
    async getOccurrence(providerId: string) {
      const parsed = parseDemoId(providerId);
      return parsed ? buildDemoOccurrence(parsed.fx, parsed.date, now()) : null;
    },
    async getTrack(): Promise<FlightTrack | null> {
      return null; // O modo demonstração não simula posição.
    },
    async getAirportBoard(iata, kind) {
      const code = iata.toUpperCase();
      const list = DEMO_FIXTURES.filter((f) => (kind === "departures" ? f.from : f.to) === code);
      return list.map((f) => buildDemoOccurrence(f, todayIn(ref(f.from).timezone, now()), now()));
    },
  };
}
