import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3200);

/**
 * Jornadas principais contra o build de produção em modo demonstração.
 * Rode `npm run build` antes de `npm run test:e2e`.
 */
export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: { baseURL: `http://localhost:${PORT}`, locale: "pt-BR", timezoneId: "America/Sao_Paulo" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `rm -rf .data-e2e && next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    env: { SEUVOO_DATA_DIR: ".data-e2e", INSECURE_COOKIES: "1", FLIGHT_DATA_PROVIDER: "demo" },
  },
});
