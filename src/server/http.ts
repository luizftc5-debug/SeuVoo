import "server-only";
import { log } from "./log";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/**
 * fetch com timeout e backoff exponencial (com jitter) para 429/5xx e falhas de rede.
 * Não repete 4xx (exceto 429) para não gastar cota paga à toa.
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit & { timeoutMs?: number; retries?: number; label?: string } = {},
): Promise<Response> {
  const { timeoutMs = 8000, retries = 2, label = "http", ...rest } = init;
  let attempt = 0;
  for (;;) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...rest, signal: ctrl.signal, cache: "no-store" });
      if ((res.status === 429 || res.status >= 500) && attempt < retries)
        throw new HttpError(res.status, "retryable");
      return res;
    } catch (err) {
      if (attempt >= retries) {
        log("warn", `${label}.failed`, {
          attempt,
          message: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }
      const base = 400 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, base + Math.random() * base * 0.3));
      attempt++;
    } finally {
      clearTimeout(timer);
    }
  }
}
