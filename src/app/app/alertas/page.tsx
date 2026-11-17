import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, InlineNotification, SectionHeader } from "@/components/ui/primitives";
import { SubmitButton } from "@/components/ui/submit-button";
import { markNotificationReadAction } from "@/app/actions/flights";
import { occurrenceSlug } from "@/lib/aviation/ids";
import { DEFAULT_TZ, formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth";
import { emailConfigured } from "@/server/mail";
import { listNotifications } from "@/server/services/notifications";
import { refreshTrackedFlights } from "@/server/services/tracking";

export const metadata: Metadata = { title: "Alertas" };

export default async function Alerts() {
  const user = await requireUser("/app/alertas");
  await refreshTrackedFlights({ userId: user.id }).catch(() => undefined);
  const list = await listNotifications(user.id, { limit: 200 });
  const unread = list.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-8">
      <SectionHeader
        as="h1"
        title="Alertas"
        description="Mudanças detectadas nos voos que você acompanha. Cada mudança gera um único alerta."
        action={
          unread > 0 ? (
            <form action={markNotificationReadAction.bind(null, "all")}>
              <SubmitButton variant="secondary" size="sm" pendingLabel="Marcando…">
                Marcar todos como lidos
              </SubmitButton>
            </form>
          ) : undefined
        }
      />
      {!emailConfigured() && (
        <InlineNotification tone="info">
          Os alertas aparecem aqui no site. O envio por e-mail será ativado quando um serviço de
          envio estiver configurado.
        </InlineNotification>
      )}
      {list.length === 0 ? (
        <EmptyState
          title="Nenhum alerta"
          description="Quando um voo acompanhado mudar de horário, portão, terminal ou status, o alerta aparece aqui."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {list.map((n) => (
            <li
              key={n.id}
              className={cn("flex gap-3 px-4 py-4 sm:px-5", !n.readAt && "bg-accent-soft/40")}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.readAt ? "bg-line-strong" : "bg-accent",
                )}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">
                  {n.occurrenceId ? (
                    <Link
                      href={`/voos/${occurrenceSlug(n.occurrenceId)}`}
                      className="hover:underline"
                    >
                      {n.title}
                    </Link>
                  ) : (
                    n.title
                  )}
                </p>
                {n.body && <p className="mt-0.5 text-sm text-ink-2">{n.body}</p>}
                <p className="mt-1 text-[12px] text-muted">
                  Detectado em {formatDateTime(n.createdAt, DEFAULT_TZ)} (horário de Brasília)
                  {n.readAt ? "" : " · não lido"}
                </p>
              </div>
              {!n.readAt && (
                <form action={markNotificationReadAction.bind(null, n.id)}>
                  <SubmitButton
                    variant="ghost"
                    size="sm"
                    pendingLabel="…"
                    aria-label="Marcar como lido"
                  >
                    Lido
                  </SubmitButton>
                </form>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
