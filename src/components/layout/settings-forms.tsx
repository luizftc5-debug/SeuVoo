"use client";

import { useActionState, useEffect } from "react";
import { deleteAccountAction, savePreferencesAction } from "@/app/actions/account";
import { Field, InlineNotification, Input, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validations";

export function PreferencesForm({
  defaults,
  emailAvailable,
}: {
  defaults: { displayName: string; theme: string; emailAlerts: boolean; homeAirport?: string };
  emailAvailable: boolean;
}) {
  const [s, action] = useActionState<FormState, FormData>(savePreferencesAction, {});
  useEffect(() => {
    const t = s.values?.theme;
    if (!s.ok || !t) return;
    try {
      if (t === "system") {
        localStorage.removeItem("sv-theme");
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem("sv-theme", t);
        document.documentElement.dataset.theme = t;
      }
    } catch {
      /* ignore */
    }
  }, [s]);
  const e = (k: string) => s.fieldErrors?.[k];
  return (
    <form action={action} className="space-y-5" noValidate>
      <Field label="Nome de exibição" htmlFor="displayName" error={e("displayName")}>
        <Input
          id="displayName"
          name="displayName"
          defaultValue={defaults.displayName}
          maxLength={60}
        />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tema" htmlFor="theme">
          <Select id="theme" name="theme" defaultValue={defaults.theme}>
            <option value="system">Seguir o sistema</option>
            <option value="light">Claro</option>
            <option value="dark">Escuro</option>
          </Select>
        </Field>
        <Field
          label="Aeroporto de origem habitual"
          htmlFor="homeAirport"
          error={e("homeAirport")}
          optional
        >
          <Input
            id="homeAirport"
            name="homeAirport"
            defaultValue={defaults.homeAirport}
            maxLength={3}
            className="t-data uppercase"
            placeholder="GRU"
          />
        </Field>
      </div>
      <label className="flex items-start gap-2.5 text-sm text-ink-2">
        <input
          type="checkbox"
          name="emailAlerts"
          defaultChecked={defaults.emailAlerts}
          className="mt-0.5 size-4 accent-[var(--accent)]"
        />
        <span>
          Receber alertas de voo por e-mail
          {!emailAvailable && (
            <span className="block text-[13px] text-muted">
              O envio de e-mail ainda não está configurado neste ambiente; a preferência fica salva
              para quando estiver.
            </span>
          )}
        </span>
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton pendingLabel="Salvando…">Salvar</SubmitButton>
        {s.ok && (
          <p className="text-sm text-positive" role="status">
            {s.message}
          </p>
        )}
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [s, action] = useActionState<FormState, FormData>(deleteAccountAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {s.error && <InlineNotification tone="critical">{s.error}</InlineNotification>}
      <Field
        label="Para confirmar, digite seu e-mail"
        htmlFor="confirm"
        error={s.fieldErrors?.confirm}
      >
        <Input id="confirm" name="confirm" type="email" autoComplete="off" />
      </Field>
      <SubmitButton variant="danger" pendingLabel="Excluindo…">
        Excluir conta e dados
      </SubmitButton>
    </form>
  );
}
