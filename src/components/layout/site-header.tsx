import Link from "next/link";
import { getCurrentUser } from "@/server/auth";
import { Logo } from "@/components/ui/logo";
import { ButtonLink, Container } from "@/components/ui/primitives";
import { MobileMenu } from "./mobile-menu";

export const PUBLIC_NAV = [
  { href: "/voos", label: "Acompanhar voo" },
  { href: "/app/viagens", label: "Planejar viagem" },
  { href: "/aeroportos", label: "Aeroportos" },
  { href: "/como-funciona", label: "Como funciona" },
] as const;

export async function SiteHeader() {
  const user = await getCurrentUser();
  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/95 backdrop-blur-[2px] supports-[backdrop-filter]:bg-canvas/90">
      <Container className="flex h-16 items-center gap-6">
        <Link href="/" className="shrink-0 rounded-md" aria-label="SeuVoo — início">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="hidden flex-1 items-center gap-1 md:flex">
          {PUBLIC_NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-md px-3 py-2 text-sm text-ink-2 transition-colors hover:bg-subtle hover:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto hidden items-center gap-2 md:flex">
          {user ? (
            <ButtonLink href="/app" size="sm">
              Minha área
            </ButtonLink>
          ) : (
            <>
              <ButtonLink href="/entrar" variant="ghost" size="sm">
                Entrar
              </ButtonLink>
              <ButtonLink href="/cadastro" size="sm">
                Criar conta
              </ButtonLink>
            </>
          )}
        </div>
        <MobileMenu
          signedIn={!!user}
          items={PUBLIC_NAV.map((n) => ({ href: n.href, label: n.label }))}
        />
      </Container>
    </header>
  );
}
