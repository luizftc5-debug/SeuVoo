import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/primitives";

const groups = [
  {
    title: "Produto",
    links: [
      { href: "/voos", label: "Acompanhar voo" },
      { href: "/app/viagens", label: "Planejar viagem" },
      { href: "/planos", label: "Planos" },
      { href: "/como-funciona", label: "Como funciona" },
    ],
  },
  {
    title: "Aeroportos",
    links: [
      { href: "/aeroportos/gru", label: "Guarulhos (GRU)" },
      { href: "/aeroportos/cgh", label: "Congonhas (CGH)" },
      { href: "/aeroportos/gig", label: "Galeão (GIG)" },
      { href: "/aeroportos", label: "Todos os aeroportos" },
    ],
  },
  {
    title: "Institucional",
    links: [
      { href: "/privacidade", label: "Privacidade" },
      { href: "/termos", label: "Termos de uso" },
      { href: "/como-funciona#dados", label: "Origem dos dados" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line">
      <Container className="grid grid-cols-2 gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="col-span-2 max-w-xs space-y-3 md:col-span-1">
          <Logo />
          <p className="text-sm text-muted">
            Acompanhamento de voos e planejamento de viagens, feito no Brasil.
          </p>
        </div>
        {groups.map((g) => (
          <div key={g.title}>
            <p className="t-label mb-3">{g.title}</p>
            <ul className="space-y-2 text-sm">
              {g.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-ink-2 hover:text-ink">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <Container className="flex flex-wrap justify-between gap-2 border-t border-line py-6 text-[13px] text-muted">
        <p>© {new Date().getFullYear()} SeuVoo.</p>
        <p>O SeuVoo não é afiliado a companhias aéreas, aeroportos ou à ANAC.</p>
      </Container>
    </footer>
  );
}
