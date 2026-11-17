import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink, EmptyState, SectionHeader, inputClass } from "@/components/ui/primitives";
import {
  DEFAULT_TZ,
  countdownLabel,
  formatDateRange,
  todayIn,
  tripPhase,
  type TripPhase,
} from "@/lib/dates";
import { formatMoney } from "@/lib/currency";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth";
import { listTrips } from "@/server/services/trips";
import type { TripRow } from "@/server/db/schema";

export const metadata: Metadata = { title: "Viagens" };

const GROUPS: { phase: TripPhase; title: string }[] = [
  { phase: "ongoing", title: "Em andamento" },
  { phase: "upcoming", title: "Próximas" },
  { phase: "past", title: "Concluídas" },
];

export default async function Trips({ searchParams }: PageProps<"/app/viagens">) {
  const user = await requireUser("/app/viagens");
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const trips = await listTrips(user.id, q);
  const today = todayIn(DEFAULT_TZ);
  const by = (p: TripPhase) => trips.filter((t) => tripPhase(t.startDate, t.endDate, today) === p);

  return (
    <div className="space-y-10">
      <SectionHeader
        as="h1"
        title="Viagens"
        description="Roteiro, voos, orçamento, bagagem e documentos de cada viagem."
        action={<ButtonLink href="/app/viagens/nova">Nova viagem</ButtonLink>}
      />
      <form role="search" className="max-w-sm">
        <label htmlFor="q" className="sr-only">
          Buscar viagens
        </label>
        <input
          id="q"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nome ou destino"
          className={cn(inputClass, "h-10")}
        />
      </form>
      {trips.length === 0 ? (
        q ? (
          <EmptyState
            title={`Nenhuma viagem encontrada para “${q}”`}
            action={
              <ButtonLink href="/app/viagens" variant="secondary">
                Limpar busca
              </ButtonLink>
            }
          />
        ) : (
          <EmptyState
            title="Nenhuma viagem ainda"
            description="Crie sua primeira viagem para montar roteiro, orçamento e lista de bagagem."
            action={<ButtonLink href="/app/viagens/nova">Nova viagem</ButtonLink>}
          />
        )
      ) : (
        GROUPS.map((g) => {
          const items = g.phase === "past" ? by(g.phase).reverse() : by(g.phase);
          if (!items.length) return null;
          return (
            <section key={g.phase}>
              <h2 className="t-label mb-3">{g.title}</h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {items.map((t) => (
                  <TripItem key={t.id} trip={t} today={today} phase={g.phase} />
                ))}
              </ul>
            </section>
          );
        })
      )}
    </div>
  );
}

function TripItem({ trip, today, phase }: { trip: TripRow; today: string; phase: TripPhase }) {
  return (
    <li>
      <Link
        href={`/app/viagens/${trip.id}`}
        className="grid gap-1 px-5 py-4 transition-colors hover:bg-subtle sm:grid-cols-[1fr_auto] sm:items-center"
      >
        <div className="min-w-0">
          <p className="truncate font-medium text-ink">{trip.title}</p>
          <p className="text-sm text-muted">
            {trip.destination}
            {trip.country ? `, ${trip.country}` : ""} ·{" "}
            {formatDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>
        <div className="text-sm sm:text-right">
          <p className={phase === "upcoming" ? "font-medium text-accent" : "text-ink-2"}>
            {phase === "upcoming"
              ? countdownLabel(trip.startDate, today)
              : phase === "ongoing"
                ? "Em andamento"
                : "Concluída"}
          </p>
          {trip.budgetCents != null && (
            <p className="t-data text-[13px] text-muted">
              {formatMoney(trip.budgetCents, trip.currency)}
            </p>
          )}
        </div>
      </Link>
    </li>
  );
}
