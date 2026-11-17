// Copia o worker do MapLibre para /public. O bundler não resolve o worker
// que o MapLibre localiza via import.meta.url, então ele é servido como estático.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const dist = path.dirname(require.resolve("maplibre-gl/dist/maplibre-gl.mjs"));
mkdirSync("public/vendor", { recursive: true });
copyFileSync(path.join(dist, "maplibre-gl-worker.mjs"), "public/vendor/maplibre-gl-worker.mjs");
console.log("maplibre worker copiado para public/vendor/");
