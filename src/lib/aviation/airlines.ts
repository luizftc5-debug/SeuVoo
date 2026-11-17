import type { Airline } from "./types";

/** Companhias usadas para reconhecer designadores e sugerir na busca. */
export const AIRLINES: (Airline & { iata: string; icao: string })[] = [
  { iata: "LA", icao: "LAN", name: "LATAM Airlines" },
  { iata: "JJ", icao: "TAM", name: "LATAM Airlines Brasil" },
  { iata: "G3", icao: "GLO", name: "GOL Linhas Aéreas" },
  { iata: "AD", icao: "AZU", name: "Azul Linhas Aéreas" },
  { iata: "TP", icao: "TAP", name: "TAP Air Portugal" },
  { iata: "AA", icao: "AAL", name: "American Airlines" },
  { iata: "UA", icao: "UAL", name: "United Airlines" },
  { iata: "DL", icao: "DAL", name: "Delta Air Lines" },
  { iata: "AF", icao: "AFR", name: "Air France" },
  { iata: "IB", icao: "IBE", name: "Iberia" },
  { iata: "AR", icao: "ARG", name: "Aerolíneas Argentinas" },
  { iata: "CM", icao: "CMP", name: "Copa Airlines" },
  { iata: "AV", icao: "AVA", name: "Avianca" },
];

/** Companhia fictícia usada somente pelo provedor de demonstração. */
export const DEMO_AIRLINE = { iata: "ZZ", icao: "ZZD", name: "Demonstração SeuVoo" } as const;

export function findAirline(
  code: string | undefined,
): (Airline & { iata: string; icao: string }) | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  if (c === DEMO_AIRLINE.iata || c === DEMO_AIRLINE.icao) return { ...DEMO_AIRLINE };
  return AIRLINES.find((a) => a.iata === c || a.icao === c);
}

export interface ParsedDesignator {
  carrier: string;
  number: string;
  designator: string;
}

/**
 * Normaliza entradas como "la 3456", "LA3456", "TAM3456", "G3-1234".
 * Códigos IATA têm 2 caracteres (podem conter dígito, ex. G3); ICAO têm 3 letras.
 */
export function parseDesignator(input: string): ParsedDesignator | null {
  const raw = input.toUpperCase().replace(/[\s\-.]/g, "");
  const m = /^([A-Z]{3}|[A-Z][A-Z0-9]|[0-9][A-Z])(\d{1,4})([A-Z]?)$/.exec(raw);
  if (!m) return null;
  let carrier = m[1];
  const number = String(Number(m[2])) + m[3];
  if (carrier.length === 3) {
    const airline = findAirline(carrier);
    if (airline) carrier = airline.iata;
  }
  return { carrier, number, designator: `${carrier}${number}` };
}
