import "server-only";

/**
 * Cache em memória com TTL e deduplicação de requisições em andamento.
 * Suficiente para uma instância; em produção multi-instância, trocar por
 * Redis/Upstash mantendo esta interface (ver docs/ARCHITECTURE.md).
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
const MAX_ENTRIES = 2000;

export async function cached<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<{ value: T; hit: boolean }> {
  const now = Date.now();
  const e = store.get(key) as Entry<T> | undefined;
  if (e && e.expiresAt > now) return { value: e.value, hit: true };
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return { value: await pending, hit: true };
  const p = load()
    .then((value) => {
      if (store.size >= MAX_ENTRIES) {
        const first = store.keys().next().value;
        if (first !== undefined) store.delete(first);
      }
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, p);
  return { value: await p, hit: false };
}

export function invalidate(prefix: string) {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
