import type { AirportRef } from "./types";

export interface AirportInfo extends AirportRef {
  icao: string;
  city: string;
  /** Sigla da UF, apenas para aeroportos brasileiros. */
  state?: string;
  country: string;
  countryCode: string;
  lat: number;
  lon: number;
  /** Site oficial do operador. Incluído somente quando verificado. */
  officialSite?: string;
  /** Aeroporto com página dedicada (diretório brasileiro). */
  featured: boolean;
}

/**
 * Base estática de referência. Coordenadas do ponto de referência do aeródromo
 * (precisão suficiente para mapas e distância ortodrômica, não para navegação).
 * Fusos IANA conforme a localização.
 */
export const AIRPORTS: AirportInfo[] = [
  {
    iata: "GRU",
    icao: "SBGR",
    name: "Aeroporto Internacional de São Paulo/Guarulhos – Governador André Franco Montoro",
    city: "Guarulhos",
    state: "SP",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -23.4356,
    lon: -46.4731,
    officialSite: "https://www.gru.com.br",
    featured: true,
  },
  {
    iata: "CGH",
    icao: "SBSP",
    name: "Aeroporto de São Paulo/Congonhas – Deputado Freitas Nobre",
    city: "São Paulo",
    state: "SP",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -23.6261,
    lon: -46.6564,
    featured: true,
  },
  {
    iata: "VCP",
    icao: "SBKP",
    name: "Aeroporto Internacional de Viracopos",
    city: "Campinas",
    state: "SP",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -23.0074,
    lon: -47.1345,
    officialSite: "https://www.viracopos.com",
    featured: true,
  },
  {
    iata: "BSB",
    icao: "SBBR",
    name: "Aeroporto Internacional de Brasília – Presidente Juscelino Kubitschek",
    city: "Brasília",
    state: "DF",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -15.8711,
    lon: -47.9186,
    officialSite: "https://www.bsb.aero",
    featured: true,
  },
  {
    iata: "GIG",
    icao: "SBGL",
    name: "Aeroporto Internacional do Rio de Janeiro/Galeão – Antonio Carlos Jobim",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -22.81,
    lon: -43.2506,
    officialSite: "https://www.riogaleao.com",
    featured: true,
  },
  {
    iata: "SDU",
    icao: "SBRJ",
    name: "Aeroporto Santos Dumont",
    city: "Rio de Janeiro",
    state: "RJ",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -22.9105,
    lon: -43.1631,
    featured: true,
  },
  {
    iata: "SSA",
    icao: "SBSV",
    name: "Aeroporto Internacional de Salvador – Deputado Luís Eduardo Magalhães",
    city: "Salvador",
    state: "BA",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Bahia",
    lat: -12.9086,
    lon: -38.3225,
    featured: true,
  },
  {
    iata: "REC",
    icao: "SBRF",
    name: "Aeroporto Internacional do Recife/Guararapes – Gilberto Freyre",
    city: "Recife",
    state: "PE",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Recife",
    lat: -8.1265,
    lon: -34.9236,
    featured: true,
  },
  {
    iata: "FOR",
    icao: "SBFZ",
    name: "Aeroporto Internacional de Fortaleza – Pinto Martins",
    city: "Fortaleza",
    state: "CE",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Fortaleza",
    lat: -3.7763,
    lon: -38.5326,
    featured: true,
  },
  {
    iata: "POA",
    icao: "SBPA",
    name: "Aeroporto Internacional Salgado Filho",
    city: "Porto Alegre",
    state: "RS",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -29.9939,
    lon: -51.1711,
    featured: true,
  },
  {
    iata: "CNF",
    icao: "SBCF",
    name: "Aeroporto Internacional de Belo Horizonte/Confins – Tancredo Neves",
    city: "Confins",
    state: "MG",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -19.6244,
    lon: -43.9719,
    featured: true,
  },
  {
    iata: "CWB",
    icao: "SBCT",
    name: "Aeroporto Internacional de Curitiba – Afonso Pena",
    city: "São José dos Pinhais",
    state: "PR",
    country: "Brasil",
    countryCode: "BR",
    timezone: "America/Sao_Paulo",
    lat: -25.5285,
    lon: -49.1758,
    featured: true,
  },
  {
    iata: "LIS",
    icao: "LPPT",
    name: "Aeroporto Humberto Delgado",
    city: "Lisboa",
    country: "Portugal",
    countryCode: "PT",
    timezone: "Europe/Lisbon",
    lat: 38.7813,
    lon: -9.1359,
    featured: false,
  },
  {
    iata: "MAD",
    icao: "LEMD",
    name: "Aeropuerto Adolfo Suárez Madrid-Barajas",
    city: "Madri",
    country: "Espanha",
    countryCode: "ES",
    timezone: "Europe/Madrid",
    lat: 40.4983,
    lon: -3.5676,
    featured: false,
  },
  {
    iata: "CDG",
    icao: "LFPG",
    name: "Aéroport Paris-Charles de Gaulle",
    city: "Paris",
    country: "França",
    countryCode: "FR",
    timezone: "Europe/Paris",
    lat: 49.0097,
    lon: 2.5479,
    featured: false,
  },
  {
    iata: "MIA",
    icao: "KMIA",
    name: "Miami International Airport",
    city: "Miami",
    country: "Estados Unidos",
    countryCode: "US",
    timezone: "America/New_York",
    lat: 25.7959,
    lon: -80.287,
    featured: false,
  },
  {
    iata: "MCO",
    icao: "KMCO",
    name: "Orlando International Airport",
    city: "Orlando",
    country: "Estados Unidos",
    countryCode: "US",
    timezone: "America/New_York",
    lat: 28.4312,
    lon: -81.3081,
    featured: false,
  },
  {
    iata: "JFK",
    icao: "KJFK",
    name: "John F. Kennedy International Airport",
    city: "Nova York",
    country: "Estados Unidos",
    countryCode: "US",
    timezone: "America/New_York",
    lat: 40.6413,
    lon: -73.7781,
    featured: false,
  },
  {
    iata: "EZE",
    icao: "SAEZ",
    name: "Aeropuerto Internacional Ministro Pistarini",
    city: "Buenos Aires",
    country: "Argentina",
    countryCode: "AR",
    timezone: "America/Argentina/Buenos_Aires",
    lat: -34.8222,
    lon: -58.5358,
    featured: false,
  },
  {
    iata: "SCL",
    icao: "SCEL",
    name: "Aeropuerto Internacional Arturo Merino Benítez",
    city: "Santiago",
    country: "Chile",
    countryCode: "CL",
    timezone: "America/Santiago",
    lat: -33.393,
    lon: -70.7858,
    featured: false,
  },
];

const byIata = new Map(AIRPORTS.map((a) => [a.iata, a]));
const byIcao = new Map(AIRPORTS.map((a) => [a.icao, a]));

export function findAirport(code: string | undefined | null): AirportInfo | undefined {
  if (!code) return undefined;
  const c = code.trim().toUpperCase();
  return byIata.get(c) ?? byIcao.get(c);
}

export function featuredAirports(): AirportInfo[] {
  return AIRPORTS.filter((a) => a.featured);
}

export function airportLabel(a: Pick<AirportRef, "iata" | "city" | "name">): string {
  return a.city ? `${a.city} (${a.iata})` : `${a.name} (${a.iata})`;
}

/** Distância ortodrômica (haversine), em km. */
export function greatCircleKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const R = 6371.0088;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Pontos intermediários do grande círculo (para desenhar a ligação ilustrativa). */
export function greatCirclePoints(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
  steps = 64,
): [number, number][] {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(a.lat),
    λ1 = toRad(a.lon),
    φ2 = toRad(b.lat),
    λ2 = toRad(b.lon);
  const d =
    2 *
    Math.asin(
      Math.sqrt(
        Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
      ),
    );
  if (d === 0) return [[a.lon, a.lat]];
  const pts: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
    const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
    const z = A * Math.sin(φ1) + B * Math.sin(φ2);
    pts.push([toDeg(Math.atan2(y, x)), toDeg(Math.atan2(z, Math.sqrt(x * x + y * y)))]);
  }
  return pts;
}
