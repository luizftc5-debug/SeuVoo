import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { ButtonLink } from "@/components/ui/primitives";

export default function NotFound() {
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16"
    >
      <Link href="/" className="mb-12 inline-block">
        <Logo />
      </Link>
      <p className="t-data text-sm text-muted">404</p>
      <h1 className="t-title mt-2">Página não encontrada</h1>
      <p className="mt-3 text-ink-2">
        O endereço pode ter mudado, ou o voo, viagem ou link compartilhado não existe mais.
      </p>
      <div className="mt-8 flex gap-2">
        <ButtonLink href="/">Ir para o início</ButtonLink>
        <ButtonLink href="/voos" variant="secondary">
          Buscar voo
        </ButtonLink>
      </div>
    </main>
  );
}
