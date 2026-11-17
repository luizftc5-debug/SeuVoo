import type { Metadata } from "next";
import { ButtonLink, Container } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "O SeuVoo é gratuito nesta fase. Veja o que está incluído e o que planejamos para o SeuVoo Plus.",
};

const free = [
  "Consulta de voos e status",
  "Acompanhamento de voos com central de alertas",
  "Compartilhamento do acompanhamento",
  "Viagens com roteiro, orçamento, bagagem e documentos",
  "Meu Passaporte com histórico e estatísticas",
];
const plus = [
  "Monitoramento ampliado e alertas por e-mail e mensagens",
  "Inteligência de conexões e risco de atraso",
  "Estatísticas adicionais de pontualidade",
  "Compartilhamento avançado e viagens em grupo",
];

export default function Plans() {
  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="t-title">Planos</h1>
        <p className="mt-3 text-lg text-ink-2">
          Nesta fase, tudo o que está disponível no SeuVoo é gratuito. Não há cobrança nem cartão.
        </p>
      </div>
      <div className="mt-12 grid gap-px overflow-hidden rounded-lg border border-line bg-line md:grid-cols-2">
        <section className="bg-surface p-7">
          <p className="t-label">Disponível agora</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">Gratuito</h2>
          <p className="mt-1 text-muted">R$ 0</p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
            {free.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full bg-positive"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
          <ButtonLink href="/cadastro" className="mt-8">
            Criar conta gratuita
          </ButtonLink>
        </section>
        <section className="bg-canvas p-7">
          <p className="t-label">Em planejamento</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">SeuVoo Plus</h2>
          <p className="mt-1 text-muted">Ainda não disponível · preço não definido</p>
          <ul className="mt-6 space-y-2.5 text-sm text-ink-2">
            {plus.map((f) => (
              <li key={f} className="flex gap-2.5">
                <span
                  className="mt-2 size-1.5 shrink-0 rounded-full border border-line-strong"
                  aria-hidden="true"
                />
                {f}
              </li>
            ))}
          </ul>
          <p className="mt-8 text-[13px] text-muted">
            Esses recursos dependem de fontes de dados e serviços de envio que ainda não estão
            contratados. Não aceitamos assinaturas antecipadas.
          </p>
        </section>
      </div>
    </Container>
  );
}
