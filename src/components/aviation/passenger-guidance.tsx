import { variance } from "@/lib/aviation/status";
import type { FlightOccurrence } from "@/lib/aviation/types";
import { formatDuration } from "@/lib/dates";

/**
 * Orientação ao passageiro (diferencial brasileiro).
 * Separa: (1) o que foi detectado, (2) o que não está confirmado,
 * (3) ações gerais, (4) onde ler as regras oficiais.
 * Não conclui direito a indenização nem cita prazos como garantidos:
 * a Resolução ANAC nº 400/2016 foi revisada em 2026 e o texto vigente
 * deve ser consultado na fonte oficial. Conteúdo revisado em 17/11/2026.
 */
export const GUIDANCE_REVIEWED_AT = "17/11/2026";

export function needsGuidance(f: FlightOccurrence): boolean {
  if (f.status === "cancelled" || f.status === "diverted") return true;
  const v = variance(f.departure.gateTimes);
  return v != null && v >= 30;
}

export function PassengerGuidance({ flight }: { flight: FlightOccurrence }) {
  const v = variance(flight.departure.gateTimes);
  const detected =
    flight.status === "cancelled"
      ? "O provedor de dados informou que este voo foi cancelado."
      : flight.status === "diverted"
        ? `O provedor informou desvio${flight.divertedTo ? ` para ${flight.divertedTo.city ?? flight.divertedTo.iata} (${flight.divertedTo.iata})` : ""}.`
        : v != null
          ? `A partida ${flight.departure.gateTimes.actual ? "ocorreu" : "está prevista"} ${formatDuration(v)} depois do horário programado.`
          : "Há alteração em relação ao horário programado.";

  return (
    <section aria-labelledby="orientacao" className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5 py-4">
        <h2 id="orientacao" className="t-heading">
          Orientação ao passageiro
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          Informação geral, não é aconselhamento jurídico. Revisado em {GUIDANCE_REVIEWED_AT}.
        </p>
      </div>
      <dl className="divide-y divide-line text-sm">
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-medium text-ink">O que foi detectado</dt>
          <dd className="text-ink-2">{detected}</dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-medium text-ink">O que não está confirmado</dt>
          <dd className="text-ink-2">
            O motivo da alteração, a remarcação oferecida e a situação da sua reserva específica.
            Esses dados vêm só da companhia aérea.
          </dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-medium text-ink">O que você pode fazer</dt>
          <dd className="text-ink-2">
            <ul className="list-disc space-y-1 pl-4">
              <li>Confirme a situação no aplicativo, site ou balcão da companhia.</li>
              <li>
                Peça por escrito as informações sobre a alteração e as alternativas oferecidas.
              </li>
              <li>Guarde cartão de embarque, comprovantes de gastos e registros de horário.</li>
              <li>Se tiver conexão, avise a companhia o quanto antes sobre o risco de perdê-la.</li>
            </ul>
          </dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-medium text-ink">Regras oficiais</dt>
          <dd className="space-y-2 text-ink-2">
            <p>
              A Resolução ANAC nº 400/2016 trata de deveres de informação, assistência material,
              reacomodação e reembolso em atrasos, cancelamentos e interrupções. A norma passou por
              revisão aprovada pela ANAC em setembro de 2026; confira o texto vigente antes de tomar
              decisões.
            </p>
            <ul className="space-y-1">
              <li>
                <a
                  className="text-accent underline underline-offset-2"
                  href="https://www.gov.br/anac/pt-br/assuntos/passageiros"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ANAC — Direitos dos passageiros
                </a>
              </li>
              <li>
                <a
                  className="text-accent underline underline-offset-2"
                  href="https://www.consumidor.gov.br"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  consumidor.gov.br — registrar reclamação
                </a>
              </li>
            </ul>
          </dd>
        </div>
        <div className="grid gap-1 px-5 py-4 sm:grid-cols-[11rem_1fr] sm:gap-6">
          <dt className="font-medium text-ink">Pode exigir análise individual</dt>
          <dd className="text-ink-2">
            Indenização por danos depende das circunstâncias e da legislação aplicável (incluindo o
            Código de Defesa do Consumidor). O SeuVoo não avalia nem garante ressarcimento. Para o
            seu caso, procure o Procon, a Defensoria Pública ou um advogado.
          </dd>
        </div>
      </dl>
    </section>
  );
}
