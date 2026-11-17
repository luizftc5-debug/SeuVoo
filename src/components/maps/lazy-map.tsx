"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/primitives";

/** Carrega o componente de mapa (e seu CSS) só no cliente, sob demanda. */
export const LazyMap = dynamic(() => import("./map-view").then((m) => m.MapView), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});
