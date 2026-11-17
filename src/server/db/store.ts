import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { emptyDatabase, type Database } from "./schema";

/**
 * Armazenamento LOCAL (desenvolvimento e demonstração).
 * Um arquivo JSON com escrita atômica (arquivo temporário + rename) e
 * transações serializadas em processo. Não serve para múltiplas instâncias
 * nem para hospedagem serverless: em produção, usar Postgres/Supabase
 * (supabase/migrations). Ver docs/ARCHITECTURE.md.
 */

export function dataDir(): string {
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    process.env.SEUVOO_DATA_DIR ?? ".data",
  );
}

function dbFile() {
  return path.join(dataDir(), "seuvoo.json");
}

interface StoreState {
  file: string;
  db: Database | null;
  queue: Promise<unknown>;
}

const g = globalThis as unknown as { __seuvooStore?: StoreState };

function state(): StoreState {
  const file = dbFile();
  if (!g.__seuvooStore || g.__seuvooStore.file !== file)
    g.__seuvooStore = { file, db: null, queue: Promise.resolve() };
  return g.__seuvooStore;
}

async function load(s: StoreState): Promise<Database> {
  if (s.db) return s.db;
  try {
    const raw = await fs.readFile(s.file, "utf8");
    s.db = { ...emptyDatabase(), ...(JSON.parse(raw) as Database) };
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
    s.db = emptyDatabase();
  }
  return s.db;
}

async function persist(s: StoreState, db: Database) {
  await fs.mkdir(path.dirname(s.file), { recursive: true });
  const tmp = `${s.file}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(db), { mode: 0o600 });
  await fs.rename(tmp, s.file);
}

/** Leitura consistente (aguarda escritas pendentes). */
export async function read<T>(fn: (db: Database) => T): Promise<T> {
  const s = state();
  await s.queue.catch(() => undefined);
  return fn(await load(s));
}

/**
 * Transação de escrita: as mutações são feitas numa cópia e só
 * substituem o estado se a função terminar sem erro.
 */
export function write<T>(fn: (db: Database) => T): Promise<T> {
  const s = state();
  const run = async () => {
    const current = await load(s);
    const draft = structuredClone(current);
    const result = fn(draft);
    await persist(s, draft);
    s.db = draft;
    return result;
  };
  const p = s.queue.then(run, run);
  s.queue = p.catch(() => undefined);
  return p;
}

/** Apenas para testes. */
export function resetStoreCache() {
  delete g.__seuvooStore;
}
