import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { SignInForm } from "../forms";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

export default async function SignInPage({ searchParams }: PageProps<"/entrar">) {
  const sp = await searchParams;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : undefined;
  if (await getCurrentUser()) redirect(next ?? "/app");
  return (
    <>
      <h1 className="t-title">Entrar</h1>
      <p className="mb-8 mt-2 text-ink-2">Acesse seus voos acompanhados e suas viagens.</p>
      <SignInForm next={next} />
      <p className="mt-8 text-sm text-muted">
        Ainda não tem conta?{" "}
        <Link
          href={next ? `/cadastro?next=${encodeURIComponent(next)}` : "/cadastro"}
          className="font-medium text-accent hover:underline"
        >
          Criar conta
        </Link>
      </p>
    </>
  );
}
