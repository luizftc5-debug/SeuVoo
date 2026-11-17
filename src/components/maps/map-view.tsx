"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MLMap } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/cn";

export interface MapPoint {
  id: string;
  lon: number;
  lat: number;
  label: string;
  emphasis?: boolean;
}

export interface MapLine {
  id: string;
  coordinates: [number, number][];
  /** "illustrative" = ligação geométrica (tracejada); "observed" = trajetória do provedor. */
  kind: "illustrative" | "observed";
}

const STYLE_URL =
  process.env.NEXT_PUBLIC_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/positron";

/**
 * Mapa com carregamento progressivo: o MapLibre (≈200 kB) só é baixado
 * quando o mapa entra na viewport. Se o estilo/tiles não carregarem,
 * cai para um esquema SVG que não depende de rede.
 */
export function MapView({
  points,
  lines = [],
  className,
  ariaLabel,
}: {
  points: MapPoint[];
  lines?: MapLine[];
  className?: string;
  ariaLabel: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "fallback">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let map: MLMap | null = null;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      setState("loading");
      try {
        const ml = await import("maplibre-gl");
        // Worker servido de /public (ver scripts/copy-maplibre-worker.mjs).
        ml.setWorkerUrl(
          `${window.location.origin}/vendor/maplibre-gl-worker.mjs?v=${ml.getVersion()}`,
        );
        if (cancelled) return;
        const bounds = new ml.LngLatBounds();
        for (const p of points) bounds.extend([p.lon, p.lat]);
        for (const l of lines) for (const c of l.coordinates) bounds.extend(c);
        map = new ml.Map({
          container: el,
          style: STYLE_URL,
          bounds: points.length > 1 || lines.length ? bounds : undefined,
          center: points.length === 1 ? [points[0].lon, points[0].lat] : undefined,
          zoom: points.length === 1 ? 9 : undefined,
          fitBoundsOptions: { padding: 48, maxZoom: 9 },
          attributionControl: { compact: true },
          cooperativeGestures: true,
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.addControl(new ml.NavigationControl({ showCompass: false }), "top-right");
        timer = setTimeout(() => !cancelled && map && !map.loaded() && setState("fallback"), 9000);
        map.on("error", () => !cancelled && !map?.loaded() && setState("fallback"));
        map.on("load", () => {
          if (cancelled || !map) return;
          clearTimeout(timer);
          const css = getComputedStyle(document.documentElement);
          const ink = css.getPropertyValue("--ink").trim() || "#17212b";
          const accent = css.getPropertyValue("--accent").trim() || "#326d75";
          for (const l of lines) {
            map.addSource(l.id, {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "LineString", coordinates: l.coordinates },
              },
            });
            map.addLayer({
              id: l.id,
              type: "line",
              source: l.id,
              layout: { "line-cap": "round", "line-join": "round" },
              paint:
                l.kind === "observed"
                  ? { "line-color": accent, "line-width": 2.5 }
                  : {
                      "line-color": ink,
                      "line-width": 1.5,
                      "line-dasharray": [2, 2.5],
                      "line-opacity": 0.7,
                    },
            });
          }
          map.addSource("pts", {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: points.map((p) => ({
                type: "Feature",
                properties: { label: p.label, emphasis: p.emphasis ? 1 : 0 },
                geometry: { type: "Point", coordinates: [p.lon, p.lat] },
              })),
            },
          });
          map.addLayer({
            id: "pts",
            type: "circle",
            source: "pts",
            paint: {
              "circle-radius": ["case", ["==", ["get", "emphasis"], 1], 5, 3.5],
              "circle-color": ink,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-width": 1.5,
            },
          });
          setState("ready");
        });
      } catch {
        if (!cancelled) setState("fallback");
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          void init();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      io.disconnect();
      map?.remove();
    };
    // Os dados do mapa são estáveis por página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border border-line bg-[var(--map-water)]",
        className,
      )}
    >
      <div
        ref={ref}
        className={cn("absolute inset-0", state === "fallback" && "hidden")}
        role="img"
        aria-label={ariaLabel}
      />
      {state !== "ready" && state !== "fallback" && (
        <div className="absolute inset-0 grid place-items-center text-[13px] text-muted">
          Carregando mapa…
        </div>
      )}
      {state === "fallback" && <SchematicMap points={points} lines={lines} ariaLabel={ariaLabel} />}
    </div>
  );
}

/** Esquema equiretangular simples, sem tiles. */
function SchematicMap({
  points,
  lines,
  ariaLabel,
}: {
  points: MapPoint[];
  lines: MapLine[];
  ariaLabel: string;
}) {
  const all = [
    ...points.map((p) => [p.lon, p.lat] as [number, number]),
    ...lines.flatMap((l) => l.coordinates),
  ];
  const lons = all.map((c) => c[0]);
  const lats = all.map((c) => c[1]);
  const pad = 4;
  const minX = Math.min(...lons) - pad,
    maxX = Math.max(...lons) + pad;
  const minY = Math.min(...lats) - pad,
    maxY = Math.max(...lats) + pad;
  const W = 600,
    H = 320;
  const sx = (lon: number) => ((lon - minX) / (maxX - minX || 1)) * W;
  const sy = (lat: number) => H - ((lat - minY) / (maxY - minY || 1)) * H;
  return (
    <div className="absolute inset-0 flex flex-col">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-full w-full"
        role="img"
        aria-label={ariaLabel}
        preserveAspectRatio="xMidYMid meet"
      >
        {lines.map((l) => (
          <polyline
            key={l.id}
            points={l.coordinates.map((c) => `${sx(c[0])},${sy(c[1])}`).join(" ")}
            fill="none"
            stroke="var(--ink)"
            strokeOpacity={0.7}
            strokeWidth={1.5}
            strokeDasharray={l.kind === "illustrative" ? "5 6" : undefined}
          />
        ))}
        {points.map((p) => (
          <g key={p.id}>
            <circle
              cx={sx(p.lon)}
              cy={sy(p.lat)}
              r={p.emphasis ? 5 : 3.5}
              fill="var(--ink)"
              stroke="var(--surface)"
              strokeWidth={1.5}
            />
            <text
              x={sx(p.lon) + 8}
              y={sy(p.lat) + 4}
              fontSize={12}
              fill="var(--ink)"
              fontFamily="var(--font-mono)"
            >
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <p className="absolute bottom-2 left-3 text-[11px] text-muted">
        Mapa base indisponível — esquema simplificado.
      </p>
    </div>
  );
}
