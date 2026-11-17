import "server-only";

/** Janela fixa por chave (ex.: IP + rota). Em memória, por instância. */
const windows = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterS: number } {
  const now = Date.now();
  let w = windows.get(key);
  if (!w || w.resetAt <= now) {
    w = { count: 0, resetAt: now + windowMs };
    windows.set(key, w);
    if (windows.size > 10000) {
      for (const [k, v] of windows) if (v.resetAt <= now) windows.delete(k);
    }
  }
  w.count++;
  return { ok: w.count <= limit, retryAfterS: Math.ceil((w.resetAt - now) / 1000) };
}

export async function clientKey(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  const fwd = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || h.get("x-real-ip") || "local";
}
