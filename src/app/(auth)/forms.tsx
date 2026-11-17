"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  requestResetAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/app/actions/auth";
import { Field, InlineNotification, Input } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FormState } from "@/lib/validations";

const err = (s: FormState, k: string) => s.fieldErrors?.[k];
const aria = (s: FormState, id: string) =>
  err(s, id) ? { "aria-invalid": true as const, "aria-describedby": `${id}-error` } : {};

export function SignInForm({ next }: { next?: string }) {
  const [s, action] = useActionState(signInAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {s.error && <InlineNotification tone="critical">{s.error}</InlineNotification>}
      <Field label="E-mail" htmlFor="email" error={err(s, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={s.values?.email}
          {...aria(s, "email")}
        />
      </Field>
      <Field label="Senha" htmlFor="password" error={err(s, "password")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...aria(s, "password")}
        />
      </Field>
      <div className="flex justify-end text-[13px]">
        <Link href="/recuperar" className="text-accent hover:underline">
          Esqueci minha senha
        </Link>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Entrando…">
        Entrar
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [s, action] = useActionState(signUpAction, {});
  return (
    <form action={action} className="space-y-4" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {s.error && <InlineNotification tone="critical">{s.error}</InlineNotification>}
      <Field label="Como podemos te chamar?" htmlFor="displayName" error={err(s, "displayName")}>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="given-name"
          required
          defaultValue={s.values?.displayName}
          {...aria(s, "displayName")}
        />
      </Field>
      <Field label="E-mail" htmlFor="email" error={err(s, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          defaultValue={s.values?.email}
          {...aria(s, "email")}
        />
      </Field>
      <Field
        label="Senha"
        htmlFor="password"
        error={err(s, "password")}
        hint="Ao menos 10 caracteres, com letras e números."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          {...aria(s, "password")}
        />
      </Field>
      <div>
        <label className="flex items-start gap-2.5 text-[13px] text-ink-2">
          <input type="checkbox" name="consent" className="mt-0.5 size-4 accent-[var(--accent)]" />
          <span>
            Li e aceito os{" "}
            <Link
              href="/termos"
              className="text-accent underline underline-offset-2"
              target="_blank"
            >
              termos de uso
            </Link>{" "}
            e a{" "}
            <Link
              href="/privacidade"
              className="text-accent underline underline-offset-2"
              target="_blank"
            >
              política de privacidade
            </Link>
            .
          </span>
        </label>
        {err(s, "consent") && (
          <p className="mt-1 text-[13px] text-critical" role="alert">
            {err(s, "consent")}
          </p>
        )}
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Criando conta…">
        Criar conta
      </SubmitButton>
    </form>
  );
}

export function RequestResetForm() {
  const [s, action] = useActionState(requestResetAction, {});
  if (s.ok)
    return (
      <InlineNotification tone="positive" title="Pedido registrado">
        {s.message}
      </InlineNotification>
    );
  return (
    <form action={action} className="space-y-4" noValidate>
      {s.error && <InlineNotification tone="critical">{s.error}</InlineNotification>}
      <Field label="E-mail da conta" htmlFor="email" error={err(s, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          {...aria(s, "email")}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Enviando…">
        Enviar link
      </SubmitButton>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [s, action] = useActionState(resetPasswordAction, {});
  if (s.ok)
    return (
      <InlineNotification tone="positive" title="Pronto">
        {s.message} <Link href="/entrar">Entrar</Link>
      </InlineNotification>
    );
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="token" value={token} />
      {s.error && <InlineNotification tone="critical">{s.error}</InlineNotification>}
      <Field
        label="Nova senha"
        htmlFor="password"
        error={err(s, "password")}
        hint="Ao menos 10 caracteres, com letras e números."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          {...aria(s, "password")}
        />
      </Field>
      <SubmitButton size="lg" className="w-full" pendingLabel="Salvando…">
        Salvar nova senha
      </SubmitButton>
    </form>
  );
}
