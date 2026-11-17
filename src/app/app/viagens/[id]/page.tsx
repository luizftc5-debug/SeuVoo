import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteTripAction } from "@/app/actions/trips";
import { FlightRow } from "@/components/aviation/flight-parts";
import {
  BudgetSection,
  DocumentsSection,
  FlightsSection,
  ItinerarySection,
  PackingSection,
} from "@/components/travel/sections";
import { ButtonLink } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { isFinal } from "@/lib/aviation/status";
import { formatMoney, summarizeExpenses } from "@/lib/currency";
import {
  DEFAULT_TZ,
  countdownLabel,
  daysBetween,
  formatDateRange,
  formatShortDate,
  todayIn,
  tripPhase,
} from "@/lib/dates";
import { cn } from "@/lib/cn";
import { ITINERARY_CATEGORIES } from "@/server/db/schema";
import { requireUser } from "@/server/auth";
import { listTracked } from "@/server/services/tracking";
import { getTripWorkspace, type TripWorkspace } from "@/server/services/trips";

const SECTIONS = [
  { key: "visao", label: "Visão geral" },
  { key: "roteiro", label: "Roteiro" },
  { key: "voos", label: "Voos" },
  { key: "orcamento", label: "Orçamento" },
  { key: "bagagem", label: "Bagagem" },
  { key: "documentos", label: "Documentos" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

export async function generateMetadata({
  params,
}: PageProps<"/app/viagens/[id]">): Promise<Metadata> {
  const { id } = await params;
  const user = await requireUser();
  const ws = await getTripWorkspace(user.id, id);
  return { title: ws?.trip.title ?? "Viagem" };
}

export default async function TripPage({ params, searchParams }: PageProps<"/app/viagens/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser(`/app/viagens/${id}`);
  const ws = await getTripWorkspace(user.id, id);
  if (!ws) notFound();
  const section: SectionKey = SECTIONS.some((s) => s.key === sp.secao)
    ? (sp.secao as SectionKey)
    : "visao";
  const today = todayIn(DEFAULT_TZ);
  const phase = tripPhase(ws.trip.startDate, ws.trip.endDate, today);
  const nights = daysBetween(ws.trip.startDate, ws.trip.endDate);

  return (
    <div>
      <nav aria-label="Trilha" className="mb-4 text-[13px] text-muted">
        <Link href="/app/viagens" className="hover:text-ink">
          Viagens
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-ink-2">{ws.trip.title}</span>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-title">{ws.trip.title}</h1>
          <p className="mt-1.5 text-ink-2">
            {ws.trip.destination}
            {ws.trip.country ? `, ${ws.trip.country}` : ""} ·{" "}
            {formatDateRange(ws.trip.startDate, ws.trip.endDate)} ·{" "}
            {nights === 0 ? "bate e volta" : `${nights} ${nights === 1 ? "noite" : "noites"}`}
          </p>
        </div>
        <p
          className={cn("text-sm font-medium", phase === "upcoming" ? "text-accent" : "text-ink-2")}
        >
          {phase === "upcoming"
            ? countdownLabel(ws.trip.startDate, today)
            : phase === "ongoing"
              ? "Em andamento"
              : "Concluída"}
        </p>
      </header>

      <nav
        aria-label="Seções da viagem"
        className="-mx-4 mt-8 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0"
      >
        <ul className="flex min-w-max gap-1">
          {SECTIONS.map((s) => (
            <li key={s.key}>
              <Link
                href={
                  s.key === "visao" ? `/app/viagens/${id}` : `/app/viagens/${id}?secao=${s.key}`
                }
                aria-current={section === s.key ? "page" : undefined}
                scroll={false}
                className={cn(
                  "-mb-px inline-block border-b-2 px-3 py-2.5 text-sm transition-colors",
                  section === s.key
                    ? "border-ink font-medium text-ink"
                    : "border-transparent text-muted hover:text-ink",
                )}
              >
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="animate-enter pt-8" key={section}>
        {section === "visao" && <Overview ws={ws} today={today} />}
        {section === "roteiro" && <ItinerarySection ws={ws} />}
        {section === "voos" && <FlightsSection ws={ws} tracked={await listTracked(user.id)} />}
        {section === "orcamento" && <BudgetSection ws={ws} />}
        {section === "bagagem" && <PackingSection ws={ws} />}
        {section === "documentos" && <DocumentsSection ws={ws} />}
      </div>
    </div>
  );
}

function Overview({ ws, today }: { ws: TripWorkspace; today: string }) {
  const { trip } = ws;
  const nextItem = ws.itinerary.find((i) => i.date >= today && !i.done);
  const nextFlight = ws.flights.find((f) => !isFinal(f.flight.status)) ?? null;
  const totals = summarizeExpenses(ws.expenses).find((t) => t.currency === trip.currency);
  const spent = totals?.actualCents ?? 0;
  const pending: { text: string; href: string }[] = [];
  const left = ws.packing.filter((p) => !p.completed).length;
  if (ws.packing.length === 0)
    pending.push({ text: "Criar a lista de bagagem", href: "?secao=bagagem" });
  else if (left)
    pending.push({
      text: `${left} ${left === 1 ? "item" : "itens"} de bagagem por preparar`,
      href: "?secao=bagagem",
    });
  if (ws.flights.length === 0)
    pending.push({ text: "Vincular os voos da viagem", href: "?secao=voos" });
  if (ws.itinerary.length === 0) pending.push({ text: "Montar o roteiro", href: "?secao=roteiro" });
  if (trip.budgetCents == null)
    pending.push({ text: "Definir um orçamento", href: `/app/viagens/${trip.id}/editar` });
  const expiring = ws.documents.filter((d) => d.expiresOn && d.expiresOn <= trip.endDate);
  for (const d of expiring)
    pending.push({
      text: `${d.name}: validade termina antes do fim da viagem`,
      href: "?secao=documentos",
    });

  return (
    <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-10">
        <section aria-labelledby="ov-voo">
          <h2 id="ov-voo" className="t-label mb-3">
            Próximo voo
          </h2>
          {nextFlight ? (
            <div className="overflow-hidden rounded-lg border border-line bg-surface">
              <FlightRow flight={nextFlight.flight} />
            </div>
          ) : (
            <p className="text-sm text-muted">
              {ws.flights.length
                ? "Todos os voos vinculados foram encerrados."
                : "Nenhum voo vinculado."}{" "}
              <Link href="?secao=voos" className="text-accent underline underline-offset-2">
                Voos da viagem
              </Link>
            </p>
          )}
        </section>

        <section aria-labelledby="ov-agenda">
          <h2 id="ov-agenda" className="t-label mb-3">
            Próximo compromisso
          </h2>
          {nextItem ? (
            <div className="flex gap-4 border-y border-line py-3">
              <p className="t-data w-28 shrink-0 text-sm text-ink-2">
                {formatShortDate(nextItem.date)}
                {nextItem.startTime && <span className="block">{nextItem.startTime}</span>}
              </p>
              <div>
                <p className="text-ink">{nextItem.title}</p>
                <p className="text-[13px] text-muted">
                  {ITINERARY_CATEGORIES[nextItem.category]}
                  {nextItem.location ? ` · ${nextItem.location}` : ""}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted">
              Nada pendente no roteiro.{" "}
              <Link href="?secao=roteiro" className="text-accent underline underline-offset-2">
                Abrir roteiro
              </Link>
            </p>
          )}
        </section>

        <section aria-labelledby="ov-fin">
          <h2 id="ov-fin" className="t-label mb-3">
            Resumo financeiro
          </h2>
          <dl className="grid grid-cols-3 border-y border-line text-sm">
            <div className="py-3 pr-3">
              <dt className="text-muted">Orçamento</dt>
              <dd className="t-data text-ink">
                {trip.budgetCents != null ? formatMoney(trip.budgetCents, trip.currency) : "—"}
              </dd>
            </div>
            <div className="py-3 pr-3">
              <dt className="text-muted">Gasto</dt>
              <dd className="t-data text-ink">{formatMoney(spent, trip.currency)}</dd>
            </div>
            <div className="py-3">
              <dt className="text-muted">Saldo</dt>
              <dd
                className={cn(
                  "t-data",
                  trip.budgetCents != null && trip.budgetCents - spent < 0
                    ? "text-critical"
                    : "text-ink",
                )}
              >
                {trip.budgetCents != null
                  ? formatMoney(trip.budgetCents - spent, trip.currency)
                  : "—"}
              </dd>
            </div>
          </dl>
        </section>

        {(trip.description || trip.participants.length > 0) && (
          <section aria-labelledby="ov-sobre" className="text-sm">
            <h2 id="ov-sobre" className="t-label mb-3">
              Sobre
            </h2>
            {trip.description && <p className="text-ink-2">{trip.description}</p>}
            {trip.participants.length > 0 && (
              <p className="mt-2 text-muted">Participantes: {trip.participants.join(", ")}</p>
            )}
          </section>
        )}
      </div>

      <aside className="space-y-8">
        <section aria-labelledby="ov-pend">
          <h2 id="ov-pend" className="t-label mb-3">
            Pendências
          </h2>
          {pending.length ? (
            <ul className="divide-y divide-line border-y border-line text-sm">
              {pending.map((p) => (
                <li key={p.text}>
                  <Link
                    href={p.href}
                    className="flex items-center justify-between gap-3 py-2.5 text-ink-2 hover:text-ink"
                  >
                    {p.text}
                    <span aria-hidden="true" className="text-muted">
                      ›
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-y border-line py-3 text-sm text-positive">Nada pendente.</p>
          )}
        </section>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href={`/app/viagens/${trip.id}/editar`} variant="secondary" size="sm">
            Editar viagem
          </ButtonLink>
          <details className="relative">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center rounded-md px-3 text-[13px] text-critical hover:bg-critical-soft [&::-webkit-details-marker]:hidden">
              Excluir
            </summary>
            <div className="absolute left-0 z-10 mt-2 w-64 rounded-lg border border-line bg-surface p-4 shadow-[0_12px_24px_-12px_rgb(0_0_0/0.25)]">
              <p className="text-sm text-ink">Excluir “{trip.title}”?</p>
              <p className="mt-1 text-[13px] text-muted">
                Roteiro, despesas e bagagem serão apagados. Voos continuam acompanhados.
              </p>
              <form action={deleteTripAction.bind(null, trip.id)} className="mt-3">
                <SubmitButton variant="danger" size="sm" pendingLabel="Excluindo…">
                  Excluir definitivamente
                </SubmitButton>
              </form>
            </div>
          </details>
        </div>
      </aside>
    </div>
  );
}
