import type { Metadata } from "next";
import Link from "next/link";
import { FreshnessNote, TzNote } from "@/components/aviation/flight-parts";
import { FlightSummary } from "@/components/aviation/flight-summary";
import { FlightTimeline } from "@/components/aviation/flight-timeline";
import { Logo } from "@/components/ui/logo";
import { ButtonLink, Container, InlineNotification } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/dates";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { resolveShare } from "@/server/services/sharing";

export const metadata: Metadata = {
  title: "Acompanhamento compartilhado",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function SharedFlight({ params }: PageProps<"/compartilhado/[token]">) {
  const { token } = await params;
  const limited = !rateLimit(`share:${await clientKey()}`, 60, 60_000).ok;
  const view = limited ? null : await resolveShare(token);

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line">
        <Container className="flex h-14 items-center justify-between">
          <Link href="/" aria-label="SeuVoo">
            <Logo />
          </Link>
          <span className="text-[13px] text-muted">Acompanhamento compartilhado</span>
        </Container>
      </header>
      <main id="conteudo">
        <Container className="max-w-3xl py-10">
          {limited ? (
            <InlineNotification tone="warning" title="Muitos acessos em pouco tempo">
              Aguarde um minuto e recarregue a página.
            </InlineNotification>
          ) : !view || view.state === "invalid" ? (
            <div className="max-w-md">
              <h1 className="t-title">Link indisponível</h1>
              <p className="mt-3 text-ink-2">
                Este link de acompanhamento expirou, foi revogado pela pessoa que o criou, ou não
                existe.
              </p>
              <ButtonLink href="/voos" variant="secondary" className="mt-6">
                Buscar um voo
              </ButtonLink>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-sm text-ink-2">
                Alguém compartilhou com você o acompanhamento deste voo.
              </p>
              {view.stale && (
                <InlineNotification tone="warning" title="Exibindo a última informação salva">
                  Não foi possível consultar a fonte de dados agora. Os dados abaixo podem estar
                  desatualizados.
                </InlineNotification>
              )}
              <FlightSummary flight={view.flight} hideGates={!view.showGates} />
              <div className="space-y-1">
                <FreshnessNote flight={view.flight} />
                <TzNote flight={view.flight} />
                {view.expiresAt && (
                  <p className="text-[13px] text-muted">
                    Link válido até{" "}
                    {formatDateTime(view.expiresAt, view.flight.departure.airport.timezone)}.
                  </p>
                )}
              </div>
              <section
                className="rounded-lg border border-line bg-surface p-5 sm:p-6"
                aria-labelledby="tl"
              >
                <h2 id="tl" className="t-heading mb-5">
                  Linha do tempo
                </h2>
                <FlightTimeline flight={view.flight} />
              </section>
              <p className="text-[13px] text-muted">
                Confirme sempre com a companhia aérea. O SeuVoo não é afiliado a companhias ou
                aeroportos.
              </p>
            </div>
          )}
        </Container>
      </main>
    </div>
  );
}
