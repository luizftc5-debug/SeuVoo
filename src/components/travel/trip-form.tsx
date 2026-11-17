"use client";

import { useActionState } from "react";
import { createTripAction, updateTripAction } from "@/app/actions/trips";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { CURRENCIES } from "@/lib/currency";
import type { FormState } from "@/lib/validations";

export interface TripFormDefaults {
  title?: string;
  destination?: string;
  country?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  coverUrl?: string;
  participants?: string;
  budget?: string;
  currency?: string;
}

const COUNTRIES = [
  "Brasil",
  "Portugal",
  "Argentina",
  "Chile",
  "Estados Unidos",
  "Espanha",
  "França",
  "Itália",
  "Uruguai",
  "México",
  "Reino Unido",
  "Japão",
];

export function TripForm({
  tripId,
  defaults = {},
}: {
  tripId?: string;
  defaults?: TripFormDefaults;
}) {
  const [s, action] = useActionState<FormState, FormData>(
    tripId ? updateTripAction.bind(null, tripId) : createTripAction,
    {},
  );
  const v = { ...defaults, ...s.values };
  const e = (k: string) => s.fieldErrors?.[k];
  const a = (k: string) =>
    e(k) ? { "aria-invalid": true as const, "aria-describedby": `${k}-error` } : {};

  return (
    <form action={action} className="space-y-8" noValidate>
      <fieldset className="space-y-4">
        <legend className="t-label mb-2">Essencial</legend>
        <Field
          label="Nome da viagem"
          htmlFor="title"
          error={e("title")}
          hint="Ex.: Férias em Lisboa — dezembro"
        >
          <Input
            id="title"
            name="title"
            defaultValue={v.title}
            required
            maxLength={80}
            {...a("title")}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Destino principal" htmlFor="destination" error={e("destination")}>
            <Input
              id="destination"
              name="destination"
              defaultValue={v.destination}
              required
              maxLength={80}
              {...a("destination")}
            />
          </Field>
          <Field label="País" htmlFor="country" error={e("country")} optional>
            <Input
              id="country"
              name="country"
              defaultValue={v.country}
              list="countries"
              maxLength={60}
              {...a("country")}
            />
            <datalist id="countries">
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Ida" htmlFor="startDate" error={e("startDate")}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              defaultValue={v.startDate}
              required
              className="t-data"
              {...a("startDate")}
            />
          </Field>
          <Field label="Volta" htmlFor="endDate" error={e("endDate")}>
            <Input
              id="endDate"
              name="endDate"
              type="date"
              defaultValue={v.endDate}
              required
              className="t-data"
              {...a("endDate")}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="t-label mb-2">Orçamento</legend>
        <div className="grid grid-cols-[1fr_8rem] gap-4">
          <Field label="Orçamento estimado" htmlFor="budget" error={e("budget")} optional>
            <Input
              id="budget"
              name="budget"
              inputMode="decimal"
              placeholder="12.000,00"
              defaultValue={v.budget}
              className="t-data"
              {...a("budget")}
            />
          </Field>
          <Field label="Moeda" htmlFor="currency" error={e("currency")}>
            <Select id="currency" name="currency" defaultValue={v.currency ?? "BRL"}>
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="t-label mb-2">Detalhes</legend>
        <Field
          label="Participantes"
          htmlFor="participants"
          error={e("participants")}
          optional
          hint="Nomes separados por vírgula. Apenas para sua organização; ninguém é convidado."
        >
          <Input
            id="participants"
            name="participants"
            defaultValue={v.participants}
            {...a("participants")}
          />
        </Field>
        <Field label="Descrição" htmlFor="description" error={e("description")} optional>
          <Textarea
            id="description"
            name="description"
            defaultValue={v.description}
            maxLength={500}
            rows={3}
            {...a("description")}
          />
        </Field>
        <Field
          label="Imagem de capa (URL)"
          htmlFor="coverUrl"
          error={e("coverUrl")}
          optional
          hint="Endereço https:// de uma imagem que você tenha direito de usar."
        >
          <Input
            id="coverUrl"
            name="coverUrl"
            type="url"
            inputMode="url"
            defaultValue={v.coverUrl}
            {...a("coverUrl")}
          />
        </Field>
      </fieldset>

      {s.error && (
        <p className="text-sm text-critical" role="alert">
          {s.error}
        </p>
      )}
      <SubmitButton size="lg" pendingLabel="Salvando…">
        {tripId ? "Salvar alterações" : "Criar viagem"}
      </SubmitButton>
    </form>
  );
}
