import type { Metadata } from "next";
import { ButtonLink, Container } from "@/components/ui/primitives";
import { isDemoMode } from "@/server/services/flights";

export const metadata: Metadata = {
  title: "Como funciona",
  description:
    "Como o SeuVoo obtém, atualiza e apresenta dados de voos, e como organiza suas viagens.",
};

const steps = [
  {
    t: "Você busca um voo",
    d: "Pelo código da companhia e número (LA3456, G31234, AD4501) e pela data. O número sozinho não identifica uma operação: a data e o identificador do provedor completam a referência.",
  },
  {
    t: "Consultamos a fonte de dados",
    d: "A consulta acontece no servidor, com cache curto para evitar chamadas repetidas e respeitar limites do provedor. Cada tela informa a fonte e quando os dados foram obtidos.",
  },
  {
    t: "Normalizamos sem adivinhar",
    d: "Horários ficam guardados em UTC e são exibidos no fuso de cada aeroporto. Programado, estimado e efetivo nunca se misturam. Uma etapa só é marcada como concluída com confirmação da fonte.",
  },
  {
    t: "Detectamos mudanças",
    d: "Para voos acompanhados, cada nova consulta é comparada com a anterior. Mudanças de horário (a partir de 5 minutos), portão, terminal e status viram um alerta — uma única vez.",
  },
  {
    t: "Você organiza a viagem",
    d: "Voos acompanhados podem ser vinculados a uma viagem com roteiro por dia, orçamento por categoria, checklist de bagagem e documentos privados.",
  },
];

export default function HowItWorks() {
  const demo = isDemoMode();
  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="t-title">Como funciona</h1>
        <p className="mt-3 text-lg text-ink-2">
          Informação clara, rastreável e honesta sobre o seu voo — e um lugar para organizar o resto
          da viagem.
        </p>
      </div>
      <ol className="mt-12 max-w-3xl divide-y divide-line border-y border-line">
        {steps.map((s, i) => (
          <li key={s.t} className="grid gap-2 py-6 sm:grid-cols-[4rem_1fr]">
            <span className="t-data text-sm text-muted">0{i + 1}</span>
            <div>
              <h2 className="font-medium text-ink">{s.t}</h2>
              <p className="mt-1 text-ink-2">{s.d}</p>
            </div>
          </li>
        ))}
      </ol>

      <section id="dados" className="mt-16 max-w-3xl scroll-mt-24">
        <h2 className="t-heading text-xl">Origem dos dados</h2>
        <div className="mt-4 space-y-4 text-ink-2">
          <p>
            O SeuVoo foi construído para trabalhar com provedores comerciais de dados de aviação (a
            integração inicial é com a FlightAware AeroAPI). A disponibilidade de portão, terminal,
            aeronave, posição e trajetória depende do provedor e do voo; quando um campo não é
            informado, mostramos isso em vez de preenchê-lo.
          </p>
          <p>
            Dados públicos de voos programados (como os do SIROS/ANAC) descrevem a malha planejada e
            não trazem posição em tempo real. O mapa só mostra posição ou trajetória quando a fonte
            fornece esses dados; sem isso, exibe apenas uma ligação ilustrativa entre os aeroportos,
            identificada como tal.
          </p>
          <p>
            <strong className="font-medium text-ink">Modo demonstração.</strong> Sem provedor
            configurado, o SeuVoo usa uma companhia fictícia (código{" "}
            <span className="t-data">ZZ</span>) com dados sintéticos e determinísticos, sempre
            marcados como “Demonstração”.{" "}
            {demo
              ? "Este ambiente está em modo demonstração."
              : "Este ambiente usa um provedor real."}
          </p>
        </div>
      </section>

      <div className="mt-14 flex flex-wrap gap-2">
        <ButtonLink href="/voos">Buscar um voo</ButtonLink>
        <ButtonLink href="/cadastro" variant="secondary">
          Criar conta
        </ButtonLink>
      </div>
    </Container>
  );
}
