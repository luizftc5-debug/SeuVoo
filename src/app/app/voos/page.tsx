import type { Metadata } from "next";
import { FlightRow } from "@/components/aviation/flight-parts";
import { ButtonLink, EmptyState, SectionHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { refreshTrackedAction, untrackFlightAction } from "@/app/actions/flights";
import { isFinal } from "@/lib/aviation/status";
import { DEFAULT_TZ, relativeFromNow, todayIn } from "@/lib/dates";
import { requireUser } from "@/server/auth";
import {
  listTracked,
  refreshTrackedFlights,
  type TrackedFlightView,
} from "@/server/services/tracking";

export const metadata: Metadata = { title: "Meus voos" };

export default async function MyFlights() {
  const user = await requireUser("/app/voos");
  await refreshTrackedFlights({ userId: user.id }).catch(() => undefined);
  const list = await listTracked(user.id);
  const today = todayIn(DEFAULT_TZ);
  const active = list.filter((t) => !isFinal(t.flight.status) || t.flight.operatingDate >= today);
  const past = list.filter((t) => !active.includes(t)).reverse();

  return (
    <div className="space-y-10">
      <SectionHeader
        as="h1"
        title="Voos"
        description="Voos que você acompanha. Os não encerrados são consultados de novo a cada 5 minutos quando você abre esta página."
        action={
          <div className="flex gap-2">
            <form action={refreshTrackedAction}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Atualizando…">
                Atualizar
              </SubmitButton>
            </form>
            <ButtonLink href="/voos" size="sm">
              Buscar voo
            </ButtonLink>
          </div>
        }
      />
      {list.length === 0 ? (
        <EmptyState
          title="Você ainda não acompanha nenhum voo"
          description="Busque pelo número e pela data, abra o voo e toque em “Acompanhar voo”."
          action={<ButtonLink href="/voos">Buscar voo</ButtonLink>}
        />
      ) : (
        <>
          <Group title="Próximos e em andamento" items={active} empty="Nenhum voo ativo." />
          {past.length > 0 && <Group title="Encerrados" items={past} />}
        </>
      )}
    </div>
  );
}

function Group({
  title,
  items,
  empty,
}: {
  title: string;
  items: TrackedFlightView[];
  empty?: string;
}) {
  return (
    <section>
      <h2 className="t-label mb-3">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {items.map((t) => (
            <li key={t.tracked.id} className="relative">
              <FlightRow
                flight={t.flight}
                meta={
                  <p className="text-[12px] text-muted">
                    atualizado {relativeFromNow(t.snapshotAt)}
                  </p>
                }
              />
              <form
                action={untrackFlightAction.bind(null, t.tracked.id, undefined)}
                className="border-t border-dashed border-line px-4 py-1.5 text-right sm:px-5"
              >
                <SubmitButton
                  variant="ghost"
                  size="sm"
                  pendingLabel="Removendo…"
                  aria-label={`Deixar de acompanhar ${t.flight.designator}`}
                >
                  Deixar de acompanhar
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
