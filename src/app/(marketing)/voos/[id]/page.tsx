import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlightMap } from "@/components/maps/flight-map";
import { FreshnessNote, TzNote } from "@/components/aviation/flight-parts";
import { FlightSummary } from "@/components/aviation/flight-summary";
import { FlightTimeline } from "@/components/aviation/flight-timeline";
import { PassengerGuidance, needsGuidance } from "@/components/aviation/passenger-guidance";
import { SharePanel } from "@/components/aviation/share-panel";
import { IconRefresh } from "@/components/ui/icons";
import { ButtonLink, Container, InlineNotification } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { trackFlightAction, untrackFlightAction } from "@/app/actions/flights";
import { parseOccurrenceSlug } from "@/lib/aviation/ids";
import { actualAirborneMinutes } from "@/lib/aviation/status";
import type { FlightOccurrence, TimeSet } from "@/lib/aviation/types";
import { formatDateTime, formatDuration, formatTime } from "@/lib/dates";
import { getCurrentUser } from "@/server/auth";
import { clientKey, rateLimit } from "@/server/rate-limit";
import { getOccurrence, getTrack, providerErrorMessage } from "@/server/services/flights";
import { listShareLinks, shareLinkActive } from "@/server/services/sharing";
import { eventsFor, findTracking, observeOccurrence } from "@/server/services/tracking";

export async function generateMetadata({ params }: PageProps<"/voos/[id]">): Promise<Metadata> {
  const { id } = await params;
  const ref = parseOccurrenceSlug(id);
  return {
    title: ref ? `Voo ${ref.providerId.split("-")[0]}` : "Voo",
    robots: { index: false }, // páginas de ocorrência são efêmeras
  };
}

export default async function FlightPage({ params, searchParams }: PageProps<"/voos/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const ref = parseOccurrenceSlug(id);
  if (!ref) notFound();

  let fresh = sp.atualizar === "1";
  if (fresh && !rateLimit(`refresh:${await clientKey()}`, 6, 60_000).ok) fresh = false;

  let flight: FlightOccurrence | null;
  try {
    flight = await getOccurrence(ref.source, ref.providerId, { fresh });
  } catch (e) {
    return (
      <Container className="py-14">
        <InlineNotification tone="critical" title="Não foi possível carregar este voo">
          {providerErrorMessage(e)}
        </InlineNotification>
        <ButtonLink href={`/voos/${id}`} variant="secondary" className="mt-5">
          Tentar novamente
        </ButtonLink>
      </Container>
    );
  }
  if (!flight) notFound();

  await observeOccurrence(flight);
  const user = await getCurrentUser();
  const [track, events, tracking] = await Promise.all([
    getTrack(flight.source.id, flight.providerId).catch(() => null),
    eventsFor(flight.id),
    user ? findTracking(user.id, flight.id) : Promise.resolve(null),
  ]);
  const links = user && tracking ? await listShareLinks(user.id, flight.id) : [];
  const dTz = flight.departure.airport.timezone;
  const aTz = flight.arrival.airport.timezone;
  const airborne = actualAirborneMinutes(flight);

  return (
    <Container className="py-8 sm:py-12">
      <nav aria-label="Trilha" className="mb-6 text-[13px] text-muted">
        <Link href="/voos" className="hover:text-ink">
          Voos
        </Link>
        <span className="mx-1.5">/</span>
        <span className="t-data text-ink-2">{flight.designator}</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-8">
          <div className="space-y-3">
            <FlightSummary flight={flight} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <FreshnessNote flight={flight} />
                <TzNote flight={flight} />
              </div>
              <Link
                href={`/voos/${id}?atualizar=1`}
                className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline"
                prefetch={false}
              >
                <IconRefresh size={14} /> Atualizar agora
              </Link>
            </div>
          </div>

          {needsGuidance(flight) && <PassengerGuidance flight={flight} />}

          <section
            aria-labelledby="linha-do-tempo"
            className="rounded-lg border border-line bg-surface p-5 sm:p-6"
          >
            <h2 id="linha-do-tempo" className="t-heading mb-5">
              Linha do tempo
            </h2>
            <FlightTimeline flight={flight} events={events} />
          </section>

          <section aria-labelledby="mapa">
            <h2 id="mapa" className="t-heading mb-3">
              Rota
            </h2>
            <FlightMap flight={flight} track={track} />
          </section>

          <section aria-labelledby="detalhes">
            <h2 id="detalhes" className="t-heading mb-3">
              Detalhes operacionais
            </h2>
            <div className="overflow-x-auto rounded-lg border border-line bg-surface">
              <table className="w-full min-w-[34rem] text-sm">
                <caption className="sr-only">Horários programados, estimados e efetivos</caption>
                <thead>
                  <tr className="border-b border-line text-left text-[12px] text-muted">
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Etapa
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Programado
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Estimado
                    </th>
                    <th scope="col" className="px-4 py-2.5 font-medium">
                      Efetivo
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  <TimeRow
                    label={`Saída do portão · ${flight.departure.airport.iata}`}
                    t={flight.departure.gateTimes}
                    tz={dTz}
                  />
                  <TimeRow label="Decolagem" t={flight.departure.runwayTimes} tz={dTz} />
                  <TimeRow
                    label={`Pouso · ${flight.arrival.airport.iata}`}
                    t={flight.arrival.runwayTimes}
                    tz={aTz}
                  />
                  <TimeRow label="Chegada ao portão" t={flight.arrival.gateTimes} tz={aTz} />
                </tbody>
              </table>
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
              <Detail k="Companhia" v={flight.airline.name} />
              <Detail k="Aeronave" v={flight.aircraft?.type} />
              <Detail k="Registro" v={flight.aircraft?.registration} />
              <Detail
                k="Distância entre aeroportos"
                v={
                  flight.greatCircleKm != null
                    ? `${flight.greatCircleKm.toLocaleString("pt-BR")} km (ortodrômica)`
                    : undefined
                }
              />
              <Detail
                k="Tempo em voo"
                v={airborne != null ? `${formatDuration(airborne)} (horários efetivos)` : undefined}
              />
              <Detail
                k="Origem"
                v={`${flight.departure.airport.name} (${flight.departure.airport.iata})`}
              />
              <Detail
                k="Destino"
                v={`${flight.arrival.airport.name} (${flight.arrival.airport.iata})`}
              />
              <Detail k="Fonte" v={flight.source.attribution} />
              <Detail k="Consultado em" v={formatDateTime(flight.freshness.fetchedAt, dTz)} />
            </dl>
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <section className="rounded-lg border border-line bg-surface p-5">
            {tracking ? (
              <>
                <p className="font-medium text-ink">Você acompanha este voo</p>
                <p className="mt-1 text-[13px] text-muted">
                  Mudanças aparecem na sua central de alertas.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <ButtonLink href="/app/alertas" variant="secondary" size="sm">
                    Ver alertas
                  </ButtonLink>
                  <form action={untrackFlightAction.bind(null, tracking.id, `/voos/${id}`)}>
                    <SubmitButton variant="ghost" size="sm" pendingLabel="Removendo…">
                      Deixar de acompanhar
                    </SubmitButton>
                  </form>
                </div>
              </>
            ) : (
              <>
                <p className="font-medium text-ink">Acompanhar este voo</p>
                <p className="mt-1 text-[13px] text-muted">
                  Salve na sua área e receba alertas de mudanças de horário, portão e status.
                </p>
                {user ? (
                  <form action={trackFlightAction.bind(null, id)} className="mt-4">
                    <SubmitButton className="w-full" pendingLabel="Salvando…">
                      Acompanhar voo
                    </SubmitButton>
                  </form>
                ) : (
                  <ButtonLink
                    href={`/entrar?next=${encodeURIComponent(`/voos/${id}`)}`}
                    className="mt-4 w-full"
                  >
                    Entrar para acompanhar
                  </ButtonLink>
                )}
              </>
            )}
          </section>

          {tracking && (
            <SharePanel
              occurrenceId={flight.id}
              slug={id}
              links={links.map((l) => ({
                id: l.id,
                createdAt: l.createdAt,
                active: shareLinkActive(l),
                showGates: l.scope.showGates,
                expiresLabel: l.revokedAt
                  ? "Revogado"
                  : l.expiresAt
                    ? `${shareLinkActive(l) ? "Válido até" : "Expirou em"} ${formatDateTime(l.expiresAt, dTz)}`
                    : "Sem validade definida",
              }))}
            />
          )}
        </aside>
      </div>
    </Container>
  );
}

function TimeRow({ label, t, tz }: { label: string; t: TimeSet; tz: string }) {
  const cell = (v?: string) =>
    v ? (
      <span className="t-data text-ink">{formatTime(v, tz)}</span>
    ) : (
      <span className="text-muted">—</span>
    );
  return (
    <tr>
      <th scope="row" className="px-4 py-2.5 text-left font-normal text-ink-2">
        {label}
      </th>
      <td className="px-4 py-2.5">{cell(t.scheduled)}</td>
      <td className="px-4 py-2.5">{cell(t.estimated)}</td>
      <td className="px-4 py-2.5">{cell(t.actual)}</td>
    </tr>
  );
}

function Detail({ k, v }: { k: string; v?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-line py-2 sm:block sm:border-0 sm:py-0">
      <dt className="text-muted">{k}</dt>
      <dd className={v ? "text-right text-ink sm:text-left" : "text-right text-muted sm:text-left"}>
        {v ?? "Não informado pela fonte"}
      </dd>
    </div>
  );
}
