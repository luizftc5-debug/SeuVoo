import { NextResponse, type NextRequest } from "next/server";
import { refreshTrackedFlights } from "@/server/services/tracking";

/**
 * Atualização periódica dos voos acompanhados (ex.: Vercel Cron a cada 10 min).
 * Protegido por CRON_SECRET (Authorization: Bearer <segredo>).
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const result = await refreshTrackedFlights();
  return NextResponse.json(result);
}
