import type { DataSourceId } from "./types";

const SOURCES: DataSourceId[] = ["demo", "aeroapi"];

/** Converte o id interno (`fonte:id`) em segmento de URL estável. */
export function occurrenceSlug(id: string): string {
  const i = id.indexOf(":");
  return `${id.slice(0, i)}.${encodeURIComponent(id.slice(i + 1))}`;
}

export function parseOccurrenceSlug(
  slug: string,
): { source: DataSourceId; providerId: string } | null {
  const s = decodeURIComponent(slug);
  const i = s.indexOf(".");
  if (i <= 0) return null;
  const source = s.slice(0, i) as DataSourceId;
  const providerId = s.slice(i + 1);
  if (!SOURCES.includes(source) || !/^[A-Za-z0-9\-_]{3,120}$/.test(providerId)) return null;
  return { source, providerId };
}
