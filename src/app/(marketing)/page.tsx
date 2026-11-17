import Link from "next/link";
import { FlightSearch } from "@/components/aviation/flight-search";
import { FlightSummary } from "@/components/aviation/flight-summary";
import { FlightTimeline } from "@/components/aviation/flight-timeline";
import { IconArrowRight, IconLink } from "@/components/ui/icons";
import { ButtonLink, Container, DemoTag, InlineNotification } from "@/components/ui/primitives";
import { describeEvent, diffSnapshots } from "@/lib/aviation/events";
import { DEFAULT_TZ, formatTime, todayIn } from "@/lib/dates";
import { createDemoProvider } from "@/server/providers/demo";
import { isDemoMode } from "@/server/services/flights";

export const metadata = {
  title: { absolute: "SeuVoo — Seu voo, sem surpresas." },
};

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = await searchParams;
  const today = todayIn(DEFAULT_TZ);
  // A demonstração de produto usa o provedor sintético — e é identificada como tal.
  const demo = createDemoProvider();
  const [sample] = await demo.searchByDesignator({ designator: "ZZ1002", date: today });
  const [airborne] = await demo.searchByDesignator({ designator: "ZZ1003", date: today });
  const demoMode = isDemoMode();
  const fmt = (tz: string) => ({
    departure: (i: string) => formatTime(i, tz),
    arrival: (i: string) => formatTime(i, tz),
  });
  const sampleEvents = diffSnapshots(null, sample);
  const gateChange = describeEvent(
    { type: "departure_gate_changed", previousValue: "8", currentValue: "11" },
    fmt(DEFAULT_TZ),
  );
  const delay = sampleEvents[0]
    ? describeEvent(sampleEvents[0], fmt(sample.departure.airport.timezone))
    : null;

  return (
    <>
      {sp.conta === "excluida" && (
        <Container className="pt-6">
          <InlineNotification tone="positive" title="Conta excluída">
            Seus dados foram removidos do SeuVoo.
          </InlineNotification>
        </Container>
      )}

      {/* Hero */}
      <section className="border-b border-line">
        <Container className="grid gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-24 lg:pt-24">
          <div className="animate-enter">
            <p className="t-label mb-5">Acompanhamento de voos e viagens</p>
            <h1 className="t-display max-w-[12ch] text-ink">Seu voo, sem surpresas.</h1>
            <p className="mt-5 max-w-md text-lg text-ink-2">
              Acompanhe voos, organize viagens e receba as informações certas, na hora certa.
            </p>
            <div className="mt-9 max-w-xl">
              <FlightSearch today={today} />
              {demoMode && (
                <p className="mt-3 text-[13px] text-muted">
                  Este ambiente está em{" "}
                  <strong className="font-medium text-ink-2">modo demonstração</strong>: experimente{" "}
                  {["ZZ1002", "ZZ1003", "ZZ1005", "ZZ1010"].map((d, i) => (
                    <span key={d}>
                      {i > 0 && ", "}
                      <Link
                        href={`/voos?numero=${d}&data=${today}`}
                        className="t-data text-accent underline-offset-2 hover:underline"
                      >
                        {d}
                      </Link>
                    </span>
                  ))}
                  .
                </p>
              )}
            </div>
          </div>

          <div className="relative lg:pt-6" aria-label="Exemplo da interface de acompanhamento">
            <div className="mb-3 flex items-center justify-between">
              <DemoTag />
              <span className="text-[12px] text-muted">Interface real, dados sintéticos</span>
            </div>
            <FlightSummary flight={sample} headingLevel="p" />
            <div className="mt-3 flex items-start gap-3 rounded-lg border border-line bg-surface px-4 py-3">
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full bg-warning-mark"
                aria-hidden="true"
              />
              <div className="text-sm">
                <p className="font-medium text-ink">{delay?.title ?? "Alteração detectada"}</p>
                <p className="text-muted">{delay?.body}</p>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Acompanhe */}
      <section id="acompanhe">
        <Container className="grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="max-w-md">
            <p className="t-label mb-3">01 · Acompanhe seu voo</p>
            <h2 className="t-title">
              O que aconteceu, o que está previsto e o que ainda não se sabe.
            </h2>
            <p className="mt-4 text-ink-2">
              Horários programados, estimados e efetivos aparecem separados, no fuso de cada
              aeroporto. O SeuVoo não presume que um avião decolou porque o relógio passou da hora —
              só marca uma etapa quando a fonte de dados confirma.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-ink-2">
              <li>Terminal e portão quando informados</li>
              <li>Fonte e horário da última consulta em cada tela</li>
              <li>Mapa com a ligação entre aeroportos, sem posição inventada</li>
            </ul>
          </div>
          <div className="rounded-lg border border-line bg-surface p-5 sm:p-7">
            <div className="mb-5 flex items-center justify-between">
              <p className="t-data text-sm text-ink">
                {airborne.designator} · {airborne.departure.airport.iata} →{" "}
                {airborne.arrival.airport.iata}
              </p>
              <DemoTag />
            </div>
            <FlightTimeline flight={airborne} />
          </div>
        </Container>
      </section>

      {/* Antecipe */}
      <section className="border-y border-line bg-surface">
        <Container className="grid gap-10 py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div className="order-2 lg:order-1">
            <ol className="divide-y divide-line border-y border-line">
              {[
                { t: delay?.title ?? "", b: delay?.body ?? "", tone: "bg-warning-mark" },
                { t: gateChange.title, b: gateChange.body, tone: "bg-accent" },
                {
                  t: "Voo cancelado",
                  b: "O provedor de dados informou o cancelamento. Confirme com a companhia aérea.",
                  tone: "bg-critical",
                },
              ].map((n) => (
                <li key={n.t} className="flex gap-3 py-4">
                  <span
                    className={`mt-1.5 size-2 shrink-0 rounded-full ${n.tone}`}
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-medium text-ink">{n.t}</p>
                    <p className="text-sm text-muted">{n.b}</p>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-[12px] text-muted">
              Exemplos de alertas gerados pelo motor de eventos.
            </p>
          </div>
          <div className="order-1 max-w-md lg:order-2">
            <p className="t-label mb-3">02 · Antecipe mudanças</p>
            <h2 className="t-title">Um alerta por mudança. Nunca o mesmo duas vezes.</h2>
            <p className="mt-4 text-ink-2">
              Quando partida, chegada, portão, terminal ou status mudam, o SeuVoo registra a
              alteração uma única vez e avisa quem acompanha o voo. Se algo der errado, você vê o
              que foi detectado, o que não está confirmado e onde estão as regras oficiais da ANAC.
            </p>
          </div>
        </Container>
      </section>

      {/* Planeje */}
      <section>
        <Container className="grid gap-10 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
          <div className="max-w-md">
            <p className="t-label mb-3">03 · Planeje sua viagem</p>
            <h2 className="t-title">
              Roteiro, orçamento, bagagem e documentos no mesmo lugar dos seus voos.
            </h2>
            <p className="mt-4 text-ink-2">
              Cada viagem tem um espaço próprio: atividades por dia, despesas previstas e gastas por
              categoria, checklist de bagagem e documentos guardados de forma privada.
            </p>
            <ButtonLink href="/app/viagens/nova" variant="secondary" className="mt-7">
              Criar uma viagem <IconArrowRight size={16} />
            </ButtonLink>
          </div>
          <div className="rounded-lg border border-line bg-surface">
            <div className="flex items-baseline justify-between border-b border-line px-5 py-4">
              <div>
                <p className="font-medium text-ink">Férias em Lisboa</p>
                <p className="text-[13px] text-muted">Exemplo de roteiro · dia 2</p>
              </div>
              <p className="t-data text-[13px] text-muted">qua, 16 dez</p>
            </div>
            <ol className="divide-y divide-line">
              {[
                ["09:30", "Café da manhã no hotel", "Hospedagem"],
                ["11:00", "Mosteiro dos Jerónimos", "Passeio"],
                ["13:30", "Almoço em Belém", "Restaurante"],
                ["17:00", "Elétrico 28 até Alfama", "Transporte"],
              ].map(([h, t, c]) => (
                <li
                  key={t}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-3 px-5 py-3"
                >
                  <span className="t-data text-sm text-ink-2">{h}</span>
                  <span className="text-sm text-ink">{t}</span>
                  <span className="text-[12px] text-muted">{c}</span>
                </li>
              ))}
            </ol>
            <div className="grid grid-cols-3 border-t border-line text-sm">
              {[
                ["Orçamento", "R$ 12.000"],
                ["Gasto", "R$ 7.430"],
                ["Bagagem", "14 de 21"],
              ].map(([k, v]) => (
                <div key={k} className="border-r border-line px-5 py-3 last:border-r-0">
                  <p className="text-[12px] text-muted">{k}</p>
                  <p className="t-data text-ink">{v}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* Compartilhe */}
      <section className="border-t border-line">
        <Container className="grid gap-10 py-20 md:grid-cols-[1fr_1fr] lg:gap-20">
          <div className="max-w-md">
            <p className="t-label mb-3">04 · Compartilhe o acompanhamento</p>
            <h2 className="t-title">Quem vai buscar você no aeroporto vê só o que precisa.</h2>
            <p className="mt-4 text-ink-2">
              Gere um link com validade, escolha se o portão aparece e revogue quando quiser. A
              página compartilhada mostra o status do voo — nunca seu nome, reserva, viagem ou
              documentos.
            </p>
          </div>
          <div className="self-center rounded-lg border border-line bg-surface p-5">
            <div className="flex items-center gap-3 rounded-md border border-line bg-canvas px-3 py-2.5">
              <IconLink size={16} className="text-muted" />
              <span className="t-data truncate text-sm text-ink-2">
                seuvoo.com.br/compartilhado/•••••••••
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Validade</dt>
              <dd className="text-right text-ink">48 horas</dd>
              <dt className="text-muted">Mostrar portão</dt>
              <dd className="text-right text-ink">Sim</dd>
              <dt className="text-muted">Dados pessoais</dt>
              <dd className="text-right text-ink">Nunca incluídos</dd>
            </dl>
          </div>
        </Container>
      </section>

      {/* Do início ao fim */}
      <section className="border-t border-line">
        <Container className="py-20">
          <div className="max-w-xl">
            <p className="t-label mb-3">05 · Organização do início ao fim</p>
            <h2 className="t-title">Da busca do voo ao histórico das suas viagens.</h2>
          </div>
          <ol className="mt-10 grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Encontre", "Busque pelo número do voo e pela data, sem precisar de conta."],
              ["Acompanhe", "Salve o voo e receba na central de alertas cada mudança relevante."],
              ["Organize", "Vincule voos a uma viagem com roteiro, gastos e bagagem."],
              ["Relembre", "Meu Passaporte reúne voos realizados, aeroportos e países."],
            ].map(([t, d], i) => (
              <li key={t} className="bg-canvas p-6">
                <p className="t-data text-[13px] text-muted">0{i + 1}</p>
                <p className="mt-6 font-medium text-ink">{t}</p>
                <p className="mt-1 text-sm text-muted">{d}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* CTA */}
      <section className="bg-navy text-navy-ink">
        <Container className="flex flex-col items-start justify-between gap-8 py-16 md:flex-row md:items-end">
          <div className="max-w-xl">
            <h2 className="t-title">Comece pelo próximo voo.</h2>
            <p className="mt-3 text-navy-ink/75">
              Criar conta é gratuito. Consultar voos não exige cadastro.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/cadastro" variant="inverse" size="lg">
              Criar conta gratuita
            </ButtonLink>
            <ButtonLink href="/voos" variant="inverseOutline" size="lg">
              Buscar um voo
            </ButtonLink>
          </div>
        </Container>
      </section>
    </>
  );
}
