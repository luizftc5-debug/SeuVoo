"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  addDocumentAction,
  addPackingAction,
  saveExpenseAction,
  saveItineraryAction,
} from "@/app/actions/trips";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { CURRENCIES } from "@/lib/currency";
import {
  DOCUMENT_CATEGORIES,
  EXPENSE_CATEGORIES,
  ITINERARY_CATEGORIES,
  PACKING_CATEGORIES,
} from "@/server/db/schema";
import type { FormState } from "@/lib/validations";

/** Limpa o formulário após sucesso e mantém o foco no primeiro campo. */
function useResetOnSuccess(state: FormState) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok && ref.current) {
      ref.current.reset();
      const first = ref.current.querySelector<HTMLInputElement>(
        "input:not([type=hidden]):not([type=date]), textarea",
      );
      first?.focus();
    }
  }, [state]);
  return ref;
}

function useHelpers(s: FormState) {
  const e = (k: string) => s.fieldErrors?.[k];
  const a = (k: string) =>
    e(k) ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {};
  return { e, a };
}

function Status({ s }: { s: FormState }) {
  if (s.error)
    return (
      <p className="text-[13px] text-critical" role="alert">
        {s.error}
      </p>
    );
  if (s.ok && s.message)
    return (
      <p className="text-[13px] text-positive" role="status">
        {s.message}
      </p>
    );
  return null;
}

/* ---------- Roteiro ---------- */

export interface ItineraryDefaults {
  date?: string;
  startTime?: string;
  endTime?: string;
  title?: string;
  category?: string;
  description?: string;
  location?: string;
}

export function ItineraryForm({
  tripId,
  itemId = null,
  defaults = {},
  minDate,
  maxDate,
  idPrefix,
}: {
  tripId: string;
  itemId?: string | null;
  defaults?: ItineraryDefaults;
  minDate: string;
  maxDate: string;
  idPrefix: string;
}) {
  const [s, action] = useActionState<FormState, FormData>(
    saveItineraryAction.bind(null, tripId, itemId),
    {},
  );
  const ref = useResetOnSuccess(itemId ? {} : s);
  const { e, a } = useHelpers(s);
  const v = { ...defaults, ...(s.ok ? {} : s.values) };
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_9rem]">
        <Field label="Atividade" htmlFor={id("title")} error={e("title")}>
          <Input
            id={id("title")}
            name="title"
            defaultValue={v.title}
            required
            maxLength={120}
            {...a("title")}
          />
        </Field>
        <Field label="Categoria" htmlFor={id("category")}>
          <Select id={id("category")} name="category" defaultValue={v.category ?? "tour"}>
            {Object.entries(ITINERARY_CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-3">
        <Field label="Dia" htmlFor={id("date")} error={e("date")}>
          <Input
            id={id("date")}
            name="date"
            type="date"
            min={minDate}
            max={maxDate}
            defaultValue={v.date ?? minDate}
            className="t-data"
            {...a("date")}
          />
        </Field>
        <Field label="Início" htmlFor={id("startTime")} error={e("startTime")} optional>
          <Input
            id={id("startTime")}
            name="startTime"
            type="time"
            defaultValue={v.startTime}
            className="t-data"
            {...a("startTime")}
          />
        </Field>
        <Field label="Fim" htmlFor={id("endTime")} error={e("endTime")} optional>
          <Input
            id={id("endTime")}
            name="endTime"
            type="time"
            defaultValue={v.endTime}
            className="t-data"
            {...a("endTime")}
          />
        </Field>
      </div>
      <Field label="Local" htmlFor={id("location")} error={e("location")} optional>
        <Input
          id={id("location")}
          name="location"
          defaultValue={v.location}
          maxLength={160}
          {...a("location")}
        />
      </Field>
      <Field label="Descrição" htmlFor={id("description")} error={e("description")} optional>
        <Textarea
          id={id("description")}
          name="description"
          defaultValue={v.description}
          rows={2}
          maxLength={500}
          {...a("description")}
        />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Salvando…">
          {itemId ? "Salvar" : "Adicionar ao roteiro"}
        </SubmitButton>
        <Status s={s} />
      </div>
    </form>
  );
}

/* ---------- Orçamento ---------- */

export interface ExpenseDefaults {
  category?: string;
  description?: string;
  planned?: string;
  actual?: string;
  currency?: string;
  date?: string;
}

export function ExpenseForm({
  tripId,
  expenseId = null,
  defaults = {},
  idPrefix,
}: {
  tripId: string;
  expenseId?: string | null;
  defaults?: ExpenseDefaults;
  idPrefix: string;
}) {
  const [s, action] = useActionState<FormState, FormData>(
    saveExpenseAction.bind(null, tripId, expenseId),
    {},
  );
  const ref = useResetOnSuccess(expenseId ? {} : s);
  const { e, a } = useHelpers(s);
  const v = { ...defaults, ...(s.ok ? {} : s.values) };
  const id = (k: string) => `${idPrefix}-${k}`;
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
        <Field label="Descrição" htmlFor={id("description")} error={e("description")}>
          <Input
            id={id("description")}
            name="description"
            defaultValue={v.description}
            maxLength={120}
            {...a("description")}
          />
        </Field>
        <Field label="Categoria" htmlFor={id("category")}>
          <Select id={id("category")} name="category" defaultValue={v.category ?? "food"}>
            {Object.entries(EXPENSE_CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1fr_1fr_6.5rem_1fr]">
        <Field label="Previsto" htmlFor={id("planned")} error={e("planned")} optional>
          <Input
            id={id("planned")}
            name="planned"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={v.planned}
            className="t-data"
            {...a("planned")}
          />
        </Field>
        <Field label="Gasto" htmlFor={id("actual")} error={e("actual")} optional>
          <Input
            id={id("actual")}
            name="actual"
            inputMode="decimal"
            placeholder="0,00"
            defaultValue={v.actual}
            className="t-data"
            {...a("actual")}
          />
        </Field>
        <Field label="Moeda" htmlFor={id("currency")}>
          <Select id={id("currency")} name="currency" defaultValue={v.currency ?? "BRL"}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Data" htmlFor={id("date")} error={e("date")} optional>
          <Input
            id={id("date")}
            name="date"
            type="date"
            defaultValue={v.date}
            className="t-data"
            {...a("date")}
          />
        </Field>
      </div>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Salvando…">
          {expenseId ? "Salvar" : "Registrar despesa"}
        </SubmitButton>
        <Status s={s} />
      </div>
    </form>
  );
}

/* ---------- Bagagem ---------- */

export function PackingForm({ tripId }: { tripId: string }) {
  const [s, action] = useActionState<FormState, FormData>(addPackingAction.bind(null, tripId), {});
  const ref = useResetOnSuccess(s);
  const { e, a } = useHelpers(s);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2" noValidate>
      <div className="min-w-48 flex-1">
        <Field label="Novo item" htmlFor="pk-label" error={e("label")}>
          <Input
            id="pk-label"
            name="label"
            maxLength={100}
            defaultValue={s.ok ? "" : s.values?.label}
            {...a("label")}
          />
        </Field>
      </div>
      <div className="w-40">
        <Field label="Categoria" htmlFor="pk-category">
          <Select
            id="pk-category"
            name="category"
            defaultValue={s.values?.category ?? "clothing"}
            key={s.values?.category}
          >
            {Object.entries(PACKING_CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <SubmitButton className="h-11" pendingLabel="Adicionando…">
        Adicionar
      </SubmitButton>
    </form>
  );
}

/* ---------- Documentos ---------- */

export function DocumentForm({ tripId }: { tripId: string }) {
  const [s, action] = useActionState<FormState, FormData>(addDocumentAction.bind(null, tripId), {});
  const ref = useResetOnSuccess(s);
  const { e, a } = useHelpers(s);
  const v = s.ok ? {} : (s.values ?? {});
  return (
    <form ref={ref} action={action} className="space-y-3" noValidate>
      <div className="grid gap-3 sm:grid-cols-[1fr_14rem]">
        <Field label="Nome" htmlFor="doc-name" error={e("name")}>
          <Input
            id="doc-name"
            name="name"
            defaultValue={v.name}
            maxLength={120}
            placeholder="Ex.: Seguro viagem"
            {...a("name")}
          />
        </Field>
        <Field label="Categoria" htmlFor="doc-category">
          <Select id="doc-category" name="category" defaultValue={v.category ?? "booking"}>
            {Object.entries(DOCUMENT_CATEGORIES).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <Field label="Validade" htmlFor="doc-exp" error={e("expiresOn")} optional>
          <Input
            id="doc-exp"
            name="expiresOn"
            type="date"
            defaultValue={v.expiresOn}
            className="t-data"
            {...a("expiresOn")}
          />
        </Field>
        <Field
          label="Arquivo"
          htmlFor="doc-file"
          error={e("file")}
          optional
          hint="PDF, PNG ou JPEG até 5 MB. Fica privado."
        >
          <input
            id="doc-file"
            name="file"
            type="file"
            accept="application/pdf,image/png,image/jpeg"
            className="block w-full text-sm text-ink-2 file:mr-3 file:h-9 file:rounded-md file:border file:border-line-strong file:bg-surface file:px-3 file:text-sm file:text-ink"
            {...a("file")}
          />
        </Field>
      </div>
      <Field
        label="Observações"
        htmlFor="doc-notes"
        error={e("notes")}
        optional
        hint="Não anote números de documentos, senhas ou dados de cartão."
      >
        <Textarea
          id="doc-notes"
          name="notes"
          defaultValue={v.notes}
          rows={2}
          maxLength={500}
          {...a("notes")}
        />
      </Field>
      <div className="flex items-center gap-3">
        <SubmitButton size="sm" pendingLabel="Enviando…">
          Adicionar documento
        </SubmitButton>
        <Status s={s} />
      </div>
    </form>
  );
}
