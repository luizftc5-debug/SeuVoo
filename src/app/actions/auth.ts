"use server";

import { redirect } from "next/navigation";
import {
  authenticate,
  consumePasswordReset,
  createPasswordReset,
  createSession,
  destroySession,
  registerUser,
} from "@/server/auth";
import { sendEmail } from "@/server/mail";
import { clientKey, rateLimit } from "@/server/rate-limit";
import {
  fieldErrors,
  formValues,
  signInSchema,
  signUpSchema,
  type FormState,
} from "@/lib/validations";

/** Só aceita caminhos internos para evitar open redirect. */
function safeNext(v: FormDataEntryValue | null): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/app";
}

export async function signUpAction(_: FormState, fd: FormData): Promise<FormState> {
  const rl = rateLimit(`signup:${await clientKey()}`, 10, 3600_000);
  if (!rl.ok) return { error: "Muitas tentativas. Tente novamente mais tarde." };
  const values = formValues(fd, ["displayName", "email"]);
  const parsed = signUpSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const r = await registerUser(parsed.data);
  if (!r.ok) return { fieldErrors: { email: r.error }, values };
  await createSession(r.user.id);
  redirect(safeNext(fd.get("next")));
}

export async function signInAction(_: FormState, fd: FormData): Promise<FormState> {
  const values = formValues(fd, ["email"]);
  const rl = rateLimit(`signin:${await clientKey()}`, 20, 15 * 60_000);
  if (!rl.ok)
    return { error: `Muitas tentativas. Aguarde ${Math.ceil(rl.retryAfterS / 60)} min.`, values };
  const parsed = signInSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  const user = await authenticate(parsed.data.email, parsed.data.password);
  if (!user) return { error: "E-mail ou senha incorretos.", values };
  await createSession(user.id);
  redirect(safeNext(fd.get("next")));
}

export async function signOutAction() {
  await destroySession();
  redirect("/");
}

export async function requestResetAction(_: FormState, fd: FormData): Promise<FormState> {
  const rl = rateLimit(`reset:${await clientKey()}`, 5, 3600_000);
  if (!rl.ok) return { error: "Muitas solicitações. Tente mais tarde." };
  const email = String(fd.get("email") ?? "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { fieldErrors: { email: "Informe um e-mail válido." } };
  const r = await createPasswordReset(email);
  let delivery: Awaited<ReturnType<typeof sendEmail>> = "logged";
  if (r) {
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    delivery = await sendEmail(
      r.email,
      "Redefinir sua senha do SeuVoo",
      `Para criar uma nova senha, acesse (válido por 1 hora):\n${base}/recuperar/nova?token=${r.token}\n\nSe você não pediu, ignore este e-mail.`,
    );
  }
  if (delivery === "unavailable")
    return {
      error:
        "O envio de e-mail não está configurado neste ambiente. Fale com o suporte para recuperar o acesso.",
    };
  // Mesma resposta exista ou não a conta (evita enumeração de e-mails).
  return {
    ok: true,
    message:
      delivery === "logged"
        ? "Se houver uma conta com esse e-mail, o link foi gerado. Em desenvolvimento, ele aparece no console do servidor."
        : "Se houver uma conta com esse e-mail, enviamos um link para redefinir a senha.",
  };
}

export async function resetPasswordAction(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password))
    return { fieldErrors: { password: "Use ao menos 10 caracteres, com letras e números." } };
  const ok = await consumePasswordReset(token, password);
  if (!ok) return { error: "Este link expirou ou já foi usado. Peça um novo." };
  return { ok: true, message: "Senha alterada. Entre com a nova senha." };
}
