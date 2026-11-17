import "server-only";
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { read, write } from "./db/store";
import type { ProfileRow, UserRow } from "./db/schema";

/**
 * Autenticação do modo local: e-mail + senha (scrypt), sessão opaca em
 * cookie httpOnly, armazenada como hash no banco (revogável).
 * Em produção com Supabase, substituir por Supabase Auth mantendo
 * getCurrentUser/requireUser como contrato (docs/ARCHITECTURE.md).
 */

export const SESSION_COOKIE = "sv_session";
const SESSION_DAYS = 30;

function scrypt(pw: string, salt: Buffer, len: number): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scryptCb(pw, salt, len, (err, key) => (err ? reject(err) : resolve(key))),
  );
}

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(pw, salt, 64);
  return `scrypt$${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, saltB64, keyB64] = stored.split("$");
  if (alg !== "scrypt" || !saltB64 || !keyB64) return false;
  const expected = Buffer.from(keyB64, "base64");
  const got = await scrypt(pw, Buffer.from(saltB64, "base64"), expected.length);
  return got.length === expected.length && timingSafeEqual(got, expected);
}

/** Hash fictício para igualar o custo quando o e-mail não existe. */
const DUMMY_HASH = `scrypt$${Buffer.alloc(16).toString("base64")}$${Buffer.alloc(64).toString("base64")}`;

export interface CurrentUser {
  id: string;
  email: string;
  profile: ProfileRow;
}

export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400000);
  await write((db) => {
    const now = new Date().toISOString();
    db.sessions = db.sessions.filter((s) => s.expiresAt > now);
    db.sessions.push({
      tokenHash: sha256(token),
      userId,
      expiresAt: expires.toISOString(),
      createdAt: now,
    });
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    path: "/",
    expires,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    const h = sha256(token);
    await write((db) => {
      db.sessions = db.sessions.filter((s) => s.tokenHash !== h);
    });
  }
  jar.delete(SESSION_COOKIE);
}

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const h = sha256(token);
  return read((db) => {
    const s = db.sessions.find((x) => x.tokenHash === h);
    if (!s || s.expiresAt < new Date().toISOString()) return null;
    const u = db.users.find((x) => x.id === s.userId);
    const p = db.profiles.find((x) => x.userId === s.userId);
    if (!u || !p) return null;
    return { id: u.id, email: u.email, profile: p };
  });
});

export async function requireUser(next?: string): Promise<CurrentUser> {
  const u = await getCurrentUser();
  if (!u) redirect(`/entrar${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return u;
}

export function normalizeEmail(e: string) {
  return e.trim().toLowerCase();
}

export async function registerUser(input: {
  email: string;
  password: string;
  displayName: string;
}): Promise<{ ok: true; user: UserRow } | { ok: false; error: string }> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);
  return write((db) => {
    if (db.users.some((u) => u.email === email))
      return { ok: false as const, error: "Já existe uma conta com esse e-mail." };
    const now = new Date().toISOString();
    const user: UserRow = { id: crypto.randomUUID(), email, passwordHash, createdAt: now };
    db.users.push(user);
    db.profiles.push({
      userId: user.id,
      displayName: input.displayName.trim(),
      preferences: { theme: "system", emailAlerts: false },
      createdAt: now,
    });
    db.entitlements.push({ userId: user.id, plan: "free", status: "active" });
    return { ok: true as const, user };
  });
}

export async function authenticate(emailIn: string, password: string): Promise<UserRow | null> {
  const email = normalizeEmail(emailIn);
  const user = await read((db) => db.users.find((u) => u.email === email) ?? null);
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  return user && ok ? user : null;
}

/** Cria token de redefinição (1 h). Retorna o token em claro para o link. */
export async function createPasswordReset(
  emailIn: string,
): Promise<{ token: string; email: string } | null> {
  const email = normalizeEmail(emailIn);
  const token = newToken();
  return write((db) => {
    const u = db.users.find((x) => x.email === email);
    if (!u) return null;
    db.passwordResets = db.passwordResets.filter((r) => r.userId !== u.id);
    db.passwordResets.push({
      tokenHash: sha256(token),
      userId: u.id,
      expiresAt: new Date(Date.now() + 3600_000).toISOString(),
    });
    return { token, email };
  });
}

export async function consumePasswordReset(token: string, newPassword: string): Promise<boolean> {
  const h = sha256(token);
  const passwordHash = await hashPassword(newPassword);
  return write((db) => {
    const r = db.passwordResets.find((x) => x.tokenHash === h);
    if (!r || r.usedAt || r.expiresAt < new Date().toISOString()) return false;
    const u = db.users.find((x) => x.id === r.userId);
    if (!u) return false;
    u.passwordHash = passwordHash;
    r.usedAt = new Date().toISOString();
    db.sessions = db.sessions.filter((s) => s.userId !== u.id); // encerra sessões antigas
    return true;
  });
}
