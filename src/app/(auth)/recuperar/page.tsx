import type { Metadata } from "next";
import Link from "next/link";
import { RequestResetForm } from "../forms";

export const metadata: Metadata = { title: "Recuperar acesso", robots: { index: false } };

export default function RecoverPage() {
  return (
    <>
      <h1 className="t-title">Recuperar acesso</h1>
      <p className="mb-8 mt-2 text-ink-2">
        Informe o e-mail da conta para receber um link de redefinição de senha.
      </p>
      <RequestResetForm />
      <p className="mt-8 text-sm text-muted">
        <Link href="/entrar" className="font-medium text-accent hover:underline">
          Voltar para entrar
        </Link>
      </p>
    </>
  );
}
