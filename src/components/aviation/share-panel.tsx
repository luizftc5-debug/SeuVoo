"use client";

import { useActionState, useState } from "react";
import { createShareAction, revokeShareAction, type ShareState } from "@/app/actions/flights";
import { IconCheck, IconLink } from "@/components/ui/icons";
import { Button, Select } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";

export interface ShareLinkView {
  id: string;
  createdAt: string;
  expiresLabel: string;
  active: boolean;
  showGates: boolean;
}

export function SharePanel({
  occurrenceId,
  slug,
  links,
}: {
  occurrenceId: string;
  slug: string;
  links: ShareLinkView[];
}) {
  const [state, action] = useActionState<ShareState, FormData>(
    createShareAction.bind(null, occurrenceId, slug),
    {},
  );
  const [copied, setCopied] = useState(false);
  const url = state.url
    ? state.url.startsWith("http")
      ? state.url
      : `${typeof window !== "undefined" ? window.location.origin : ""}${state.url}`
    : null;

  async function copy() {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      aria-labelledby="compartilhar"
      className="rounded-lg border border-line bg-surface p-5"
    >
      <h2 id="compartilhar" className="t-heading">
        Compartilhar acompanhamento
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        O link mostra só o status do voo. Nenhum dado pessoal é incluído.
      </p>
      <form action={action} className="mt-4 space-y-3">
        <div className="grid grid-cols-[1fr_auto] items-end gap-2">
          <div>
            <label htmlFor="share-exp" className="mb-1 block text-[13px] text-ink-2">
              Validade
            </label>
            <Select id="share-exp" name="expires" defaultValue="48" className="h-10">
              <option value="12">12 horas</option>
              <option value="48">48 horas</option>
              <option value="168">7 dias</option>
              <option value="never">Até eu revogar</option>
            </Select>
          </div>
          <SubmitButton size="md" pendingLabel="Criando…">
            Criar link
          </SubmitButton>
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-2">
          <input
            type="checkbox"
            name="showGates"
            defaultChecked
            className="size-4 accent-[var(--accent)]"
          />
          Mostrar terminal e portão
        </label>
      </form>
      {state.error && (
        <p className="mt-3 text-[13px] text-critical" role="alert">
          {state.error}
        </p>
      )}
      {url && (
        <div className="animate-enter mt-4 rounded-md border border-line bg-canvas p-3">
          <p className="mb-2 text-[13px] text-ink-2">
            Link criado. Copie agora: por segurança, ele não será exibido de novo.
          </p>
          <div className="flex items-center gap-2">
            <IconLink size={16} className="shrink-0 text-muted" />
            <input
              readOnly
              value={url}
              aria-label="Link de compartilhamento"
              className="t-data min-w-0 flex-1 bg-transparent text-[13px] text-ink"
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button size="sm" variant="secondary" onClick={copy} type="button">
              {copied ? (
                <>
                  <IconCheck size={14} /> Copiado
                </>
              ) : (
                "Copiar"
              )}
            </Button>
          </div>
        </div>
      )}
      {links.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <p className="t-label mb-2">Links criados</p>
          <ul className="space-y-2">
            {links.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 text-sm">
                <span className={l.active ? "text-ink-2" : "text-muted line-through"}>
                  {l.expiresLabel}
                  {l.showGates ? "" : " · sem portão"}
                </span>
                {l.active ? (
                  <form action={revokeShareAction.bind(null, l.id, slug)}>
                    <SubmitButton size="sm" variant="ghost" pendingLabel="Revogando…">
                      Revogar
                    </SubmitButton>
                  </form>
                ) : (
                  <span className="text-[12px] text-muted">inativo</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
