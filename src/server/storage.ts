import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { dataDir } from "./db/store";

/**
 * Armazenamento privado de arquivos (modo local). Arquivos ficam fora de /public
 * e só são servidos pela rota autenticada /api/documentos/[id], que confere o dono.
 * Em produção: Supabase Storage com bucket privado e URLs assinadas de curta duração.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg"] as const;

/** Confere o tipo pelos primeiros bytes, não pela extensão declarada. */
export function sniffMime(buf: Uint8Array): (typeof ALLOWED_MIME)[number] | null {
  if (buf.length >= 4 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46)
    return "application/pdf";
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47)
    return "image/png";
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  return null;
}

function root() {
  return path.join(dataDir(), "uploads");
}

function resolveKey(key: string) {
  if (!/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(key)) throw new Error("Chave de arquivo inválida.");
  return path.join(root(), key);
}

export async function saveUpload(userId: string, bytes: Uint8Array): Promise<string> {
  const key = `${userId}/${crypto.randomUUID()}`;
  const file = resolveKey(key);
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  await fs.writeFile(file, bytes, { mode: 0o600 });
  return key;
}

export async function readUpload(key: string): Promise<Buffer> {
  return fs.readFile(resolveKey(key));
}

export async function deleteUpload(key: string) {
  await fs.rm(resolveKey(key), { force: true });
}

export async function deleteUserUploads(userId: string) {
  if (!/^[0-9a-f-]{36}$/.test(userId)) return;
  await fs.rm(path.join(root(), userId), { recursive: true, force: true });
}
