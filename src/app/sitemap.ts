import type { MetadataRoute } from "next";
import { featuredAirports } from "@/lib/aviation/airports";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const pages = [
    "",
    "/voos",
    "/aeroportos",
    "/como-funciona",
    "/planos",
    "/privacidade",
    "/termos",
  ];
  return [
    ...pages.map((p) => ({
      url: `${base}${p}`,
      changeFrequency: "weekly" as const,
      priority: p === "" ? 1 : 0.6,
    })),
    ...featuredAirports().map((a) => ({
      url: `${base}/aeroportos/${a.iata.toLowerCase()}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
