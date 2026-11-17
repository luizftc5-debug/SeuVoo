/**
 * Utilitários de data/hora. Regras:
 * - instantes são ISO-8601 em UTC;
 * - datas sem hora (viagens, roteiro) são strings AAAA-MM-DD, sem fuso;
 * - exibição sempre em pt-BR, 24 h, no fuso IANA do lugar.
 */

export const DEFAULT_TZ = "America/Sao_Paulo";
const LOCALE = "pt-BR";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(s: string): boolean {
  if (!ISO_DATE.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function parts(date: Date, tz: string) {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const out: Record<string, number> = {};
  for (const p of f.formatToParts(date)) if (p.type !== "literal") out[p.type] = Number(p.value);
  return out as {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
  };
}

/** Offset do fuso em minutos para um instante (ex.: -180 para UTC−3). */
export function tzOffsetMinutes(date: Date, tz: string): number {
  const p = parts(date, tz);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

/** Converte data + hora locais de um fuso IANA em instante ISO UTC. */
export function zonedToUtc(date: string, time: string, tz: string): string {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let offset = tzOffsetMinutes(new Date(guess), tz);
  let utc = guess - offset * 60000;
  // Segunda passada cobre transições de horário de verão.
  const offset2 = tzOffsetMinutes(new Date(utc), tz);
  if (offset2 !== offset) {
    offset = offset2;
    utc = guess - offset * 60000;
  }
  return new Date(utc).toISOString();
}

/** Data local (AAAA-MM-DD) de um instante em um fuso. */
export function localDate(iso: string | Date, tz: string): string {
  const p = parts(typeof iso === "string" ? new Date(iso) : iso, tz);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

export function todayIn(tz: string = DEFAULT_TZ, now: Date = new Date()): string {
  return localDate(now, tz);
}

export function formatTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function formatDateTime(iso: string, tz: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: tz,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

/** "17/11/2026" a partir de AAAA-MM-DD, sem conversão de fuso. */
export function formatIsoDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${d}/${m}/${y}`;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function ymd(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return { y, m, d, dow: new Date(Date.UTC(y, m - 1, d)).getUTCDay() };
}

/** "seg, 17 nov" */
export function formatShortDate(date: string): string {
  const { m, d, dow } = ymd(date);
  return `${WEEKDAYS[dow]}, ${d} ${MONTHS[m - 1]}`;
}

/** "17 de novembro de 2026" */
export function formatLongDate(date: string): string {
  const { y, m, d } = ymd(date);
  return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`;
}

/** "17–24 nov 2026" ou "28 nov – 3 dez 2026" */
export function formatDateRange(start: string, end: string): string {
  const a = ymd(start);
  const b = ymd(end);
  if (a.y === b.y && a.m === b.m) return `${a.d}–${b.d} ${MONTHS[a.m - 1]} ${a.y}`;
  if (a.y === b.y) return `${a.d} ${MONTHS[a.m - 1]} – ${b.d} ${MONTHS[b.m - 1]} ${a.y}`;
  return `${a.d} ${MONTHS[a.m - 1]} ${a.y} – ${b.d} ${MONTHS[b.m - 1]} ${b.y}`;
}

export function monthYearLabel(date: string): string {
  const { y, m } = ymd(date);
  return `${MONTHS_LONG[m - 1]} de ${y}`;
}

/** "UTC−3" */
export function utcOffsetLabel(iso: string, tz: string): string {
  const off = tzOffsetMinutes(new Date(iso), tz);
  const sign = off < 0 ? "−" : "+";
  const abs = Math.abs(off);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

export function diffMinutes(laterIso: string, earlierIso: string): number {
  return Math.round((new Date(laterIso).getTime() - new Date(earlierIso).getTime()) / 60000);
}

/** "2 h 05 min", "45 min" */
export function formatDuration(minutes: number): string {
  const sign = minutes < 0 ? "−" : "";
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m} min`;
  return `${sign}${h} h ${String(m).padStart(2, "0")} min`;
}

/** Diferença em dias entre duas datas AAAA-MM-DD (b − a). */
export function daysBetween(a: string, b: string): number {
  const A = ymd(a);
  const B = ymd(b);
  return Math.round((Date.UTC(B.y, B.m - 1, B.d) - Date.UTC(A.y, A.m - 1, A.d)) / 86400000);
}

export function addDays(date: string, n: number): string {
  const { y, m, d } = ymd(date);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** Lista de datas inclusivas entre start e end. Limite defensivo de 366 dias. */
export function eachDay(start: string, end: string): string[] {
  const n = Math.min(daysBetween(start, end), 365);
  if (n < 0) return [];
  return Array.from({ length: n + 1 }, (_, i) => addDays(start, i));
}

export type TripPhase = "upcoming" | "ongoing" | "past";

export function tripPhase(start: string, end: string, today: string): TripPhase {
  if (today < start) return "upcoming";
  if (today > end) return "past";
  return "ongoing";
}

/** Texto curto de contagem regressiva em dias (datas sem fuso). */
export function countdownLabel(start: string, today: string): string {
  const n = daysBetween(today, start);
  if (n <= 0) return "Começa hoje";
  if (n === 1) return "Começa amanhã";
  return `Faltam ${n} dias`;
}

/** Tempo relativo curto para frescor de dados: "há 3 min". */
export function relativeFromNow(iso: string, now: Date = new Date()): string {
  const s = Math.round((now.getTime() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "há instantes";
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}
