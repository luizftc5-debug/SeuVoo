import type { Metadata } from "next";
import Link from "next/link";
import { FlightRow } from "@/components/aviation/flight-parts";
import { FlightSummary } from "@/components/aviation/flight-summary";
import { IconArrowRight } from "@/components/ui/icons";
import { ButtonLink, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { occurrenceSlug } from "@/lib/aviation/ids";
import { isFinal } from "@/lib/aviation/status";
import {
  DEFAULT_TZ,
  countdownLabel,
  formatDateRange,
  formatShortDate,
  relativeFromNow,
  todayIn,
  tripPhase,
} from "@/lib/dates";
import { requireUser } from "@/server/auth";
import { listNotifications } from "@/server/services/notifications";
import { listTracked, refreshTrackedFlights } from "@/server/services/tracking";
import { getTripWorkspace, listTrips } from "@/server/services/trips";

export const metadata: Metadata = { title: "Visão geral" };

export default async function Overview() {
  const user = await requireUser("/app");
  await refreshTrackedFlights({ userId: user.id }).catch(() => undefined);
  const today = todayIn(DEFAULT_TZ);
  const [tracked, trips, alerts] = await Promise.all([
    listTracked(user.id),
    listTrips(user.id),
    listNotifications(user.id, { unreadOnly: true, limit: 4 }),
  ]);

  const activeFlights = tracked.filter(
    (t) => !isFinal(t.flight.status) || t.flight.operatingDate >= today,
  );
  const next = activeFlights.find((t) => !isFinal(t.flight.status)) ?? activeFlights[0];
  const ongoing = trips.find((t) => tripPhase(t.startDate, t.endDate, today) === "ongoing");
  const upcoming = trips.find((t) => tripPhase(t.startDate, t.endDate, today) === "upcoming");
  const focusTrip = ongoing ?? upcoming;
  const ws = focusTrip ? await getTripWorkspace(user.id, focusTrip.id) : null;
  const nextActivity = ws?.itinerary.find((i) => i.date >= today && !i.done);
  const packingLeft = ws ? ws.packing.filter((p) => !p.completed).length : 0;

  return (
    <div className="space-y-12">
      <div>
        <p className="t-label">{formatShortDate(today)}</p>
        <h1 className="t-title mt-1">Olá, {user.profile.displayName.split(" ")[0]}</h1>
      </div>

      <section aria-labelledby="proximo-voo">
        <SectionHeader
          title={<span id="proximo-voo">{next ? "Próximo voo" : "Voos"}</span>}
          action={
            <Link href="/app/voos" className="text-sm font-medium text-accent hover:underline">
              Todos os voos
            </Link>
          }
        />
        <div className="mt-4">
          {next ? (
            <>
              <Link
                href={`/voos/${occurrenceSlug(next.flight.id)}`}
                className="block rounded-lg transition-shadow hover:shadow-[0_0_0_1px_var(--line-strong)]"
              >
                <FlightSummary flight={next.flight} headingLevel="h2" />
              </Link>
              <p className="mt-2 text-[13px] text-muted">
                Atualizado {relativeFromNow(next.snapshotAt)} · {next.flight.source.name}
              </p>
              {activeFlights.length > 1 && (
                <div className="mt-4 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                  {activeFlights
                    .filter((t) => t !== next)
                    .slice(0, 3)
                    .map((t) => (
                      <FlightRow key={t.tracked.id} flight={t.flight} />
                    ))}
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="Nenhum voo acompanhado"
              description="Busque um voo e toque em “Acompanhar voo” para vê-lo aqui com alertas de mudanças."
              action={<ButtonLink href="/voos">Buscar voo</ButtonLink>}
            />
          )}
        </div>
      </section>

      <div className="grid gap-12 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="viagem">
          <SectionHeader
            title={<span id="viagem">{ongoing ? "Viagem em andamento" : "Próxima viagem"}</span>}
            action={
              <Link href="/app/viagens" className="text-sm font-medium text-accent hover:underline">
                Todas as viagens
              </Link>
            }
          />
          <div className="mt-4">
            {focusTrip && ws ? (
              <Link
                href={`/app/viagens/${focusTrip.id}`}
                className="group block rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-lg font-semibold tracking-tight text-ink">
                      {focusTrip.title}
                    </p>
                    <p className="text-sm text-muted">
                      {focusTrip.destination} ·{" "}
                      {formatDateRange(focusTrip.startDate, focusTrip.endDate)}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-medium text-accent">
                    {ongoing ? "Em andamento" : countdownLabel(focusTrip.startDate, today)}
                  </p>
                </div>
                <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-line pt-4 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-muted">Próximo compromisso</dt>
                    <dd className="text-ink">
                      {nextActivity
                        ? `${formatShortDate(nextActivity.date)}${nextActivity.startTime ? ` · ${nextActivity.startTime}` : ""} — ${nextActivity.title}`
                        : "Nada no roteiro"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted">Voos vinculados</dt>
                    <dd className="text-ink">{ws.flights.length || "Nenhum"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Bagagem</dt>
                    <dd className="text-ink">
                      {ws.packing.length
                        ? packingLeft
                          ? `${packingLeft} itens pendentes`
                          : "Tudo pronto"
                        : "Lista vazia"}
                    </dd>
                  </div>
                </dl>
                <span className="mt-4 inline-flex items-center gap-1 text-sm text-ink-2 group-hover:text-ink">
                  Abrir viagem <IconArrowRight size={15} />
                </span>
              </Link>
            ) : (
              <EmptyState
                title="Nenhuma viagem planejada"
                description="Crie uma viagem para organizar roteiro, orçamento, bagagem e documentos."
                action={<ButtonLink href="/app/viagens/nova">Nova viagem</ButtonLink>}
              />
            )}
          </div>
        </section>

        <section aria-labelledby="alertas-recentes">
          <SectionHeader
            title={<span id="alertas-recentes">Alertas não lidos</span>}
            action={
              <Link href="/app/alertas" className="text-sm font-medium text-accent hover:underline">
                Central de alertas
              </Link>
            }
          />
          {alerts.length ? (
            <ul className="mt-4 divide-y divide-line border-y border-line">
              {alerts.map((n) => (
                <li key={n.id} className="py-3">
                  <p className="text-sm font-medium text-ink">{n.title}</p>
                  <p className="text-[13px] text-muted">
                    {n.body} · {relativeFromNow(n.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 border-y border-line py-6 text-sm text-muted">
              Nenhum alerta pendente.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
