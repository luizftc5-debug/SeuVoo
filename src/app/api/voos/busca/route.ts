import { NextResponse, type NextRequest } from "next/server";
import { parseDesignator } from "@/lib/aviation/airlines";
import { occurrenceSlug } from "@/lib/aviation/ids";
import { isIsoDate } from "@/lib/dates";
import { rateLimit } from "@/server/rate-limit";
import { providerErrorMessage, searchFlights } from "@/server/services/flights";

/** Busca pública (JSON). Limitada por IP para evitar consultas abusivas e custo no provedor. */
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`api-search:${ip}`, 30, 60_000);
  if (!rl.ok)
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterS) } },
    );
  const p = parseDesignator(req.nextUrl.searchParams.get("numero") ?? "");
  const date = req.nextUrl.searchParams.get("data") ?? "";
  if (!p || !isIsoDate(date)) return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  try {
    const results = await searchFlights(p.designator, date);
    return NextResponse.json({
      results: results.map((f) => ({ ...f, slug: occurrenceSlug(f.id) })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: "provider_unavailable", message: providerErrorMessage(e) },
      { status: 503 },
    );
  }
}
