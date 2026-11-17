import Link from "next/link";
import {
  applyTemplateAction,
  deleteDocumentAction,
  deleteExpenseAction,
  itineraryOpAction,
  linkFlightAction,
  packingOpAction,
  unlinkFlightAction,
} from "@/app/actions/trips";
import { FlightRow } from "@/components/aviation/flight-parts";
import {
  IconCheck,
  IconChevronDown,
  IconChevronUp,
  IconFile,
  IconTrash,
} from "@/components/ui/icons";
import { Disclosure } from "@/components/ui/disclosure";
import { EmptyState, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { budgetBalance, formatMoney, summarizeExpenses } from "@/lib/currency";
import { eachDay, formatIsoDate, formatShortDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import {
  DOCUMENT_CATEGORIES,
  EXPENSE_CATEGORIES,
  ITINERARY_CATEGORIES,
  PACKING_CATEGORIES,
  type ExpenseCategory,
  type PackingCategory,
} from "@/server/db/schema";
import type { TrackedFlightView } from "@/server/services/tracking";
import { PACKING_TEMPLATES, type TripWorkspace } from "@/server/services/trips";
import { DocumentForm, ExpenseForm, ItineraryForm, PackingForm } from "./forms";

function IconButton({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 place-items-center rounded-md text-muted transition-colors hover:bg-subtle hover:text-ink",
        className,
      )}
    >
      {children}
    </button>
  );
}

function AddPanel({
  summary,
  children,
  open,
}: {
  summary: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <Disclosure summary={summary} defaultOpen={open}>
      {children}
    </Disclosure>
  );
}

/* ---------- Roteiro ---------- */

export function ItinerarySection({ ws }: { ws: TripWorkspace }) {
  const { trip, itinerary } = ws;
  const days = eachDay(trip.startDate, trip.endDate);
  const outside = itinerary.filter((i) => i.date < trip.startDate || i.date > trip.endDate);
  return (
    <div className="space-y-8">
      <AddPanel summary="Adicionar atividade" open={itinerary.length === 0}>
        <ItineraryForm
          tripId={trip.id}
          minDate={trip.startDate}
          maxDate={trip.endDate}
          idPrefix="it-new"
        />
      </AddPanel>
      <ol className="space-y-8">
        {days.map((d, idx) => {
          const items = itinerary.filter((i) => i.date === d);
          return (
            <li key={d} aria-labelledby={`dia-${d}`}>
              <h3
                id={`dia-${d}`}
                className="mb-2 flex items-baseline gap-3 border-b border-line pb-2"
              >
                <span className="t-data text-sm text-muted">Dia {idx + 1}</span>
                <span className="font-medium text-ink">{formatShortDate(d)}</span>
              </h3>
              {items.length === 0 ? (
                <p className="py-2 text-sm text-muted">Nada planejado.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {items.map((it, i) => (
                    <li key={it.id} className="py-3">
                      <div className="grid grid-cols-[3.75rem_1fr_auto] items-start gap-3">
                        <p className="t-data pt-0.5 text-sm text-ink-2">
                          {it.startTime ?? "—"}
                          {it.endTime && (
                            <span className="block text-[12px] text-muted">{it.endTime}</span>
                          )}
                        </p>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "text-[15px]",
                              it.done ? "text-muted line-through" : "text-ink",
                            )}
                          >
                            {it.title}
                          </p>
                          <p className="text-[13px] text-muted">
                            {ITINERARY_CATEGORIES[it.category]}
                            {it.location && ` · ${it.location}`}
                          </p>
                          {it.description && (
                            <p className="mt-1 text-sm text-ink-2">{it.description}</p>
                          )}
                        </div>
                        <div className="flex items-center">
                          <form action={itineraryOpAction.bind(null, trip.id, it.id, "toggle")}>
                            <IconButton
                              label={it.done ? "Marcar como pendente" : "Marcar como concluída"}
                              className={it.done ? "text-positive" : undefined}
                            >
                              <IconCheck size={16} />
                            </IconButton>
                          </form>
                          {i > 0 && (
                            <form action={itineraryOpAction.bind(null, trip.id, it.id, "up")}>
                              <IconButton label="Mover para cima">
                                <IconChevronUp size={16} />
                              </IconButton>
                            </form>
                          )}
                          {i < items.length - 1 && (
                            <form action={itineraryOpAction.bind(null, trip.id, it.id, "down")}>
                              <IconButton label="Mover para baixo">
                                <IconChevronDown size={16} />
                              </IconButton>
                            </form>
                          )}
                          <form action={itineraryOpAction.bind(null, trip.id, it.id, "delete")}>
                            <IconButton label={`Excluir ${it.title}`}>
                              <IconTrash size={16} />
                            </IconButton>
                          </form>
                        </div>
                      </div>
                      <details className="ml-[4.5rem] mt-1">
                        <summary className="cursor-pointer text-[13px] text-accent">Editar</summary>
                        <div className="mt-3 rounded-md border border-line p-4">
                          <ItineraryForm
                            tripId={trip.id}
                            itemId={it.id}
                            minDate={trip.startDate}
                            maxDate={trip.endDate}
                            idPrefix={`it-${it.id}`}
                            defaults={{ ...it }}
                          />
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
      {outside.length > 0 && (
        <p className="text-sm text-warning">
          {outside.length} atividade(s) fora das datas da viagem. Ajuste as datas da viagem ou das
          atividades.
        </p>
      )}
    </div>
  );
}

/* ---------- Voos ---------- */

export function FlightsSection({
  ws,
  tracked,
}: {
  ws: TripWorkspace;
  tracked: TrackedFlightView[];
}) {
  const linked = new Set(ws.flights.map((f) => f.flight.id));
  const candidates = tracked.filter((t) => !linked.has(t.flight.id));
  return (
    <div className="space-y-6">
      {ws.flights.length === 0 ? (
        <EmptyState
          title="Nenhum voo vinculado"
          description="Vincule voos que você já acompanha. Para um voo novo, busque-o e toque em “Acompanhar voo” primeiro."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {ws.flights.map((f) => (
            <li key={f.segmentId}>
              <FlightRow flight={f.flight} />
              <form
                action={unlinkFlightAction.bind(null, ws.trip.id, f.segmentId)}
                className="border-t border-dashed border-line px-5 py-1.5 text-right"
              >
                <SubmitButton variant="ghost" size="sm" pendingLabel="Removendo…">
                  Desvincular
                </SubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}
      <div className="rounded-lg border border-line bg-surface p-5">
        <p className="text-sm font-medium text-ink">Vincular voo acompanhado</p>
        {candidates.length ? (
          <form
            action={linkFlightAction.bind(null, ws.trip.id)}
            className="mt-3 flex flex-wrap gap-2"
          >
            <label htmlFor="link-occ" className="sr-only">
              Voo
            </label>
            <Select id="link-occ" name="occurrenceId" className="h-10 min-w-0 flex-1">
              {candidates.map((t) => (
                <option key={t.flight.id} value={t.flight.id}>
                  {t.flight.designator} · {formatIsoDate(t.flight.operatingDate)} ·{" "}
                  {t.flight.departure.airport.iata} → {t.flight.arrival.airport.iata}
                </option>
              ))}
            </Select>
            <SubmitButton pendingLabel="Vinculando…">Vincular</SubmitButton>
          </form>
        ) : (
          <p className="mt-1 text-sm text-muted">
            Nenhum outro voo acompanhado.{" "}
            <Link href="/voos" className="text-accent underline underline-offset-2">
              Buscar voo
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}

/* ---------- Orçamento ---------- */

export function BudgetSection({ ws }: { ws: TripWorkspace }) {
  const { trip, expenses } = ws;
  const totals = summarizeExpenses(expenses);
  const main = totals.find((t) => t.currency === trip.currency) ?? {
    currency: trip.currency,
    plannedCents: 0,
    actualCents: 0,
    byCategory: [],
  };
  const others = totals.filter((t) => t.currency !== trip.currency);
  const balance = budgetBalance(trip.budgetCents, main.actualCents);
  const maxCat = Math.max(
    1,
    ...main.byCategory.map((c) => Math.max(c.actualCents, c.plannedCents)),
  );

  return (
    <div className="space-y-8">
      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-4">
        {[
          [
            "Orçamento",
            trip.budgetCents != null
              ? formatMoney(trip.budgetCents, trip.currency)
              : "Não definido",
          ],
          ["Previsto", formatMoney(main.plannedCents, trip.currency)],
          ["Gasto", formatMoney(main.actualCents, trip.currency)],
          ["Saldo", balance != null ? formatMoney(balance, trip.currency) : "—"],
        ].map(([k, v]) => (
          <div key={k} className="bg-surface px-4 py-3.5">
            <dt className="text-[12px] text-muted">{k}</dt>
            <dd
              className={cn(
                "t-data mt-0.5 text-[17px]",
                k === "Saldo" && balance != null && balance < 0 ? "text-critical" : "text-ink",
              )}
            >
              {v}
            </dd>
          </div>
        ))}
      </dl>
      {others.length > 0 && (
        <p className="text-[13px] text-muted">
          Também há despesas em{" "}
          {others
            .map((o) => `${o.currency} (${formatMoney(o.actualCents, o.currency)} gastos)`)
            .join(", ")}
          . Moedas diferentes não são somadas: o SeuVoo não aplica câmbio sem fonte e data de
          referência.
        </p>
      )}

      {main.byCategory.length > 0 && (
        <section aria-labelledby="por-categoria">
          <h3 id="por-categoria" className="t-label mb-3">
            Por categoria · {trip.currency}
          </h3>
          <table className="w-full text-sm">
            <thead className="sr-only">
              <tr>
                <th>Categoria</th>
                <th>Gasto</th>
                <th>Previsto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {main.byCategory.map((c) => (
                <tr key={c.category}>
                  <th scope="row" className="w-32 py-2.5 pr-3 text-left font-normal text-ink-2">
                    {EXPENSE_CATEGORIES[c.category as ExpenseCategory] ?? c.category}
                  </th>
                  <td className="py-2.5" aria-hidden="true">
                    <div className="relative h-1.5 rounded-full bg-subtle">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-line-strong"
                        style={{ width: `${(c.plannedCents / maxCat) * 100}%` }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-ink"
                        style={{ width: `${(c.actualCents / maxCat) * 100}%` }}
                      />
                    </div>
                  </td>
                  <td className="t-data w-32 whitespace-nowrap py-2.5 pl-3 text-right text-ink">
                    {formatMoney(c.actualCents, trip.currency)}
                  </td>
                  <td className="t-data hidden w-36 whitespace-nowrap py-2.5 pl-3 text-right text-muted sm:table-cell">
                    {formatMoney(c.plannedCents, trip.currency)} prev.
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <AddPanel summary="Registrar despesa" open={expenses.length === 0}>
        <ExpenseForm tripId={trip.id} idPrefix="ex-new" defaults={{ currency: trip.currency }} />
      </AddPanel>

      {expenses.length > 0 && (
        <section aria-labelledby="despesas">
          <h3 id="despesas" className="t-label mb-3">
            Despesas
          </h3>
          <div className="overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[34rem] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-[12px] text-muted">
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Descrição
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Data
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Previsto
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right font-medium">
                    Gasto
                  </th>
                  <th scope="col" className="w-10 px-2">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {expenses.map((e) => (
                  <tr key={e.id}>
                    <td className="px-4 py-2.5">
                      <p className="text-ink">{e.description}</p>
                      <p className="text-[12px] text-muted">{EXPENSE_CATEGORIES[e.category]}</p>
                    </td>
                    <td className="t-data px-4 py-2.5 text-ink-2">
                      {e.date ? formatIsoDate(e.date) : "—"}
                    </td>
                    <td className="t-data px-4 py-2.5 text-right text-muted">
                      {e.plannedCents != null ? formatMoney(e.plannedCents, e.currency) : "—"}
                    </td>
                    <td className="t-data px-4 py-2.5 text-right text-ink">
                      {e.actualCents != null ? formatMoney(e.actualCents, e.currency) : "—"}
                    </td>
                    <td className="px-2 py-1.5">
                      <form action={deleteExpenseAction.bind(null, trip.id, e.id)}>
                        <IconButton label={`Excluir ${e.description}`}>
                          <IconTrash size={15} />
                        </IconButton>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* ---------- Bagagem ---------- */

export function PackingSection({ ws }: { ws: TripWorkspace }) {
  const { trip, packing } = ws;
  const done = packing.filter((p) => p.completed).length;
  const cats = Object.keys(PACKING_CATEGORIES) as PackingCategory[];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          {packing.length ? (
            <>
              <span className="t-data font-medium text-ink">{done}</span> de{" "}
              <span className="t-data">{packing.length}</span> itens prontos
            </>
          ) : (
            "Lista vazia."
          )}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] text-muted">Modelos:</span>
          {Object.entries(PACKING_TEMPLATES).map(([k, t]) => (
            <form key={k} action={applyTemplateAction.bind(null, trip.id, k)}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Aplicando…">
                {t.label}
              </SubmitButton>
            </form>
          ))}
        </div>
      </div>
      {packing.length > 0 && (
        <div
          className="h-1 overflow-hidden rounded-full bg-subtle"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={packing.length}
          aria-valuenow={done}
          aria-label="Itens prontos"
        >
          <div
            className="h-full bg-positive transition-[width] duration-300"
            style={{ width: `${(done / packing.length) * 100}%` }}
          />
        </div>
      )}
      <PackingForm tripId={trip.id} />
      <div className="grid gap-8 sm:grid-cols-2">
        {cats.map((c) => {
          const items = packing.filter((p) => p.category === c);
          if (!items.length) return null;
          return (
            <section key={c} aria-labelledby={`pk-${c}`}>
              <h3 id={`pk-${c}`} className="t-label mb-2">
                {PACKING_CATEGORIES[c]}
              </h3>
              <ul className="divide-y divide-line border-y border-line">
                {items.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-1.5">
                    <form
                      action={packingOpAction.bind(null, trip.id, p.id, "toggle")}
                      className="flex-1"
                    >
                      <button
                        type="submit"
                        role="checkbox"
                        aria-checked={p.completed}
                        className="flex w-full items-center gap-3 rounded-md py-1.5 text-left text-[15px]"
                      >
                        <span
                          className={cn(
                            "grid size-5 shrink-0 place-items-center rounded border transition-colors",
                            p.completed
                              ? "border-positive bg-positive text-white"
                              : "border-line-strong bg-surface",
                          )}
                        >
                          {p.completed && <IconCheck size={13} strokeWidth={2.4} />}
                        </span>
                        <span className={p.completed ? "text-muted line-through" : "text-ink"}>
                          {p.label}
                        </span>
                      </button>
                    </form>
                    <form action={packingOpAction.bind(null, trip.id, p.id, "delete")}>
                      <IconButton label={`Remover ${p.label}`}>
                        <IconTrash size={15} />
                      </IconButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- Documentos ---------- */

export function DocumentsSection({ ws }: { ws: TripWorkspace }) {
  const { trip, documents } = ws;
  return (
    <div className="space-y-8">
      <p className="text-sm text-muted">
        Documentos ficam privados: só você acessa, pela sua sessão. O SeuVoo não pede número de
        passaporte ou identidade.
      </p>
      {documents.length > 0 && (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {documents.map((d) => {
            const expiring = d.expiresOn && d.expiresOn <= trip.endDate;
            return (
              <li key={d.id} className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
                <IconFile size={18} className="mt-0.5 shrink-0 text-muted" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-ink">{d.name}</p>
                  <p className="text-[13px] text-muted">
                    {DOCUMENT_CATEGORIES[d.category]}
                    {d.expiresOn && (
                      <span className={expiring ? "text-warning" : undefined}>
                        {" · "}validade {formatIsoDate(d.expiresOn)}
                        {expiring ? " — vence antes do fim da viagem" : ""}
                      </span>
                    )}
                  </p>
                  {d.notes && <p className="mt-1 text-sm text-ink-2">{d.notes}</p>}
                  {d.file && (
                    <a
                      href={`/api/documentos/${d.id}`}
                      className="mt-1 inline-block text-[13px] font-medium text-accent hover:underline"
                      target="_blank"
                      rel="noopener"
                    >
                      Abrir arquivo ({Math.ceil(d.file.size / 1024)} kB)
                    </a>
                  )}
                </div>
                <form action={deleteDocumentAction.bind(null, trip.id, d.id)}>
                  <IconButton label={`Excluir ${d.name}`}>
                    <IconTrash size={15} />
                  </IconButton>
                </form>
              </li>
            );
          })}
        </ul>
      )}
      <AddPanel summary="Adicionar documento" open={documents.length === 0}>
        <DocumentForm tripId={trip.id} />
      </AddPanel>
    </div>
  );
}
