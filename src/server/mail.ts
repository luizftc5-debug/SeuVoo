import "server-only";
import { log } from "./log";

/**
 * Envio de e-mail. Só envia de fato com EMAIL_PROVIDER=resend, RESEND_API_KEY e EMAIL_FROM.
 * Sem provedor: em desenvolvimento, o conteúdo vai para o console do servidor;
 * em produção, o envio é recusado e a interface informa isso.
 */
export function emailConfigured(): boolean {
  return (
    process.env.EMAIL_PROVIDER === "resend" &&
    !!process.env.RESEND_API_KEY &&
    !!process.env.EMAIL_FROM
  );
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<"sent" | "logged" | "unavailable"> {
  if (emailConfigured()) {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    }).catch(() => null);
    if (!res?.ok) {
      log("error", "mail.failed", { status: res?.status ?? 0 });
      return "unavailable";
    }
    return "sent";
  }
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `\n[SeuVoo · e-mail de desenvolvimento — não enviado]\nAssunto: ${subject}\n${text}\n`,
    );
    return "logged";
  }
  return "unavailable";
}
