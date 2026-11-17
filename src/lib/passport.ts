import { findAirport, greatCircleKm } from "./aviation/airports";
import { actualAirborneMinutes } from "./aviation/status";
import type { FlightOccurrence } from "./aviation/types";

/**
 * Estatísticas do Meu Passaporte, calculadas só a partir de dados persistidos.
 * Um voo conta como "realizado" quando o provedor registrou chegada ou pouso
 * efetivos — não pela passagem do horário.
 */

export interface PassportTrip {
  id: string;
  title: string;
  destination: string;
  country?: string;
  startDate: string;
  endDate: string;
}

export interface PassportStats {
  flights: number;
  airports: string[];
  countries: string[];
  cities: string[];
  distanceKm: number;
  /** Minutos em voo somando apenas voos com horários efetivos. */
  airborneMinutes: number;
  flightsWithAirborneData: number;
  tripsByYear: { year: number; trips: number; flights: number }[];
  completedFlights: FlightOccurrence[];
  pastTrips: PassportTrip[];
}

export function isCompletedFlight(f: FlightOccurrence): boolean {
  return (
    (f.status === "arrived" || f.status === "landed") &&
    !!(f.arrival.gateTimes.actual || f.arrival.runwayTimes.actual)
  );
}

export function computePassport(
  flights: FlightOccurrence[],
  trips: PassportTrip[],
  today: string,
  period?: { from?: string; to?: string },
): PassportStats {
  const inPeriod = (d: string) =>
    (!period?.from || d >= period.from) && (!period?.to || d <= period.to);
  const done = flights.filter((f) => isCompletedFlight(f) && inPeriod(f.operatingDate));
  const pastTrips = trips.filter((t) => t.endDate < today && inPeriod(t.startDate));

  const airports = new Set<string>();
  const countries = new Set<string>();
  const cities = new Set<string>();
  let distanceKm = 0;
  let airborneMinutes = 0;
  let flightsWithAirborneData = 0;

  for (const f of done) {
    for (const ap of [f.departure.airport, f.arrival.airport]) {
      airports.add(ap.iata);
      const info = findAirport(ap.iata);
      const country = info?.country ?? ap.country;
      const city = info?.city ?? ap.city;
      if (country) countries.add(country);
      if (city) cities.add(`${city}${country ? `, ${country}` : ""}`);
    }
    const a = findAirport(f.departure.airport.iata);
    const b = findAirport(f.arrival.airport.iata);
    if (f.greatCircleKm != null) distanceKm += f.greatCircleKm;
    else if (a && b) distanceKm += Math.round(greatCircleKm(a, b));
    const m = actualAirborneMinutes(f);
    if (m != null && m > 0) {
      airborneMinutes += m;
      flightsWithAirborneData++;
    }
  }
  for (const t of pastTrips) {
    if (t.country) countries.add(t.country);
    cities.add(`${t.destination}${t.country ? `, ${t.country}` : ""}`);
  }

  const years = new Map<number, { trips: number; flights: number }>();
  const bump = (y: number, k: "trips" | "flights") => {
    const v = years.get(y) ?? { trips: 0, flights: 0 };
    v[k]++;
    years.set(y, v);
  };
  for (const t of pastTrips) bump(Number(t.startDate.slice(0, 4)), "trips");
  for (const f of done) bump(Number(f.operatingDate.slice(0, 4)), "flights");

  return {
    flights: done.length,
    airports: [...airports].sort(),
    countries: [...countries].sort((x, y) => x.localeCompare(y, "pt-BR")),
    cities: [...cities].sort((x, y) => x.localeCompare(y, "pt-BR")),
    distanceKm,
    airborneMinutes,
    flightsWithAirborneData,
    tripsByYear: [...years.entries()]
      .map(([year, v]) => ({ year, ...v }))
      .sort((a, b) => b.year - a.year),
    completedFlights: done.sort((a, b) => b.operatingDate.localeCompare(a.operatingDate)),
    pastTrips: pastTrips.sort((a, b) => b.startDate.localeCompare(a.startDate)),
  };
}
