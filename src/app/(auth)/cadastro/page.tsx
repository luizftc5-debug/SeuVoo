import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { SignUpForm } from "../forms";

export const metadata: Metadata = { title: "Criar conta", robots: { index: false } };

export default async function SignUpPage({ searchParams }: PageProps<"/cadastro">) {
  const sp = await searchParams;
  const next =
    typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//")
      ? sp.next
      : undefined;
  if (await getCurrentUser()) redirect(next ?? "/app");
  return (
    <>
      <h1 className="t-title">Criar conta</h1>
      <p className="mb-8 mt-2 text-ink-2">
        Gratuito. Pedimos só o necessário: nome, e-mail e senha.
      </p>
      <SignUpForm next={next} />
      <p className="mt-8 text-sm text-muted">
        Já tem conta?{" "}
        <Link
          href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"}
          className="font-medium text-accent hover:underline"
        >
          Entrar
        </Link>
      </p>
    </>
  );
}
