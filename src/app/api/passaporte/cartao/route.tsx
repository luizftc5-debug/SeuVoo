import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { getPassport } from "@/server/services/passport";

/**
 * Cartão de retrospectiva (PNG) com dados agregados apenas — sem nome, e-mail,
 * datas exatas ou documentos. Gerado sob demanda para o próprio usuário;
 * compartilhar é decisão dele.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("Não autenticado.", { status: 401 });
  const ano = req.nextUrl.searchParams.get("ano");
  const year = ano && /^\d{4}$/.test(ano) ? Number(ano) : undefined;
  const p = await getPassport(user.id, year);
  const stats: [string, string][] = [
    ["voos", String(p.flights)],
    ["aeroportos", String(p.airports.length)],
    ["países", String(p.countries.length)],
    ["km em linha reta", p.distanceKm.toLocaleString("pt-BR")],
  ];
  const img = new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#152c3d",
        color: "#eef3f4",
        padding: 72,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 28, opacity: 0.7 }}>Meu Passaporte · SeuVoo</div>
        <div style={{ fontSize: 76, fontWeight: 600, letterSpacing: -2, marginTop: 12 }}>
          {year ? `Minhas viagens em ${year}` : "Minhas viagens"}
        </div>
      </div>
      <div style={{ display: "flex", gap: 56 }}>
        {stats.map(([k, v]) => (
          <div key={k} style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 64, fontWeight: 600 }}>{v}</div>
            <div style={{ fontSize: 24, opacity: 0.7 }}>{k}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 26, opacity: 0.8, display: "flex" }}>
        {p.airports.slice(0, 14).join("  ·  ")}
      </div>
    </div>,
    { width: 1200, height: 630 },
  );
  img.headers.set(
    "Content-Disposition",
    `attachment; filename="seuvoo-passaporte${year ? `-${year}` : ""}.png"`,
  );
  img.headers.set("Cache-Control", "private, no-store");
  return img;
}
