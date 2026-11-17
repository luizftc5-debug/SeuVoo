import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FlightRow } from "@/components/aviation/flight-parts";
import { FlightSearch } from "@/components/aviation/flight-search";
import {
  Container,
  DemoTag,
  EmptyState,
  InlineNotification,
  Skeleton,
} from "@/components/ui/primitives";
import { parseDesignator } from "@/lib/aviation/airlines";
import { findAirport } from "@/lib/aviation/airports";
import { DEFAULT_TZ, formatLongDate, isIsoDate, todayIn } from "@/lib/dates";
import { clientKey, rateLimit } from "@/server/rate-limit";
import {
  isDemoMode,
  providerErrorMessage,
  searchFlights,
  searchRoute,
} from "@/server/services/flights";

export const metadata: Metadata = {
  title: "Acompanhar voo",
  description:
    "Busque um voo pelo número e pela data para ver status, horários, terminal e portão.",
};

type Q =
  | { kind: "number"; designator: string; date: string }
  | { kind: "route"; origin: string; destination: string; date: string };

function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : "";
}

export default async function VoosPage({ searchParams }: PageProps<"/voos">) {
  const sp = await searchParams;
  const today = todayIn(DEFAULT_TZ);
  const numero = str(sp.numero);
  const origem = str(sp.origem).toUpperCase();
  const destino = str(sp.destino).toUpperCase();
  const data = str(sp.data) || today;

  let query: Q | null = null;
  let invalid: string | null = null;
  if (numero || origem || destino) {
    if (!isIsoDate(data)) invalid = "A data informada não é válida.";
    else if (numero) {
      const p = parseDesignator(numero);
      if (!p)
        invalid =
          "Número de voo inválido. Use o código da companhia e o número, por exemplo LA3456.";
      else query = { kind: "number", designator: p.designator, date: data };
    } else if (!/^[A-Z]{3}$/.test(origem) || !/^[A-Z]{3}$/.test(destino)) {
      invalid = "Informe origem e destino pelo código IATA de 3 letras.";
    } else query = { kind: "route", origin: origem, destination: destino, date: data };
  }

  const demo = isDemoMode();

  return (
    <Container className="py-10 sm:py-14">
      <div className="max-w-2xl">
        <h1 className="t-title">Acompanhar voo</h1>
        <p className="mt-2 text-ink-2">
          Busque pelo número do voo e pela data. Não é preciso ter conta para consultar.
        </p>
      </div>
      <div className="mt-8 max-w-3xl">
        <FlightSearch
          variant="compact"
          today={today}
          defaultDesignator={numero}
          defaultDate={data}
          defaultMode={origem || destino ? "route" : "number"}
          defaultOrigin={origem}
          defaultDestination={destino}
        />
      </div>

      {demo && (
        <InlineNotification tone="warning" title="Modo demonstração" className="mt-6 max-w-3xl">
          Nenhum provedor de dados de voo está configurado neste ambiente. As buscas usam a
          companhia fictícia <span className="t-data">ZZ</span> (voos{" "}
          <span className="t-data">ZZ1001</span> a <span className="t-data">ZZ1010</span>), com
          dados sintéticos. <Link href="/como-funciona#dados">Saiba mais</Link>.
        </InlineNotification>
      )}

      <div className="mt-10">
        {invalid && (
          <InlineNotification tone="critical" title="Confira a busca">
            {invalid}
          </InlineNotification>
        )}
        {query && (
          <Suspense key={JSON.stringify(query)} fallback={<ResultsSkeleton />}>
            <Results query={query} demo={demo} />
          </Suspense>
        )}
      </div>
    </Container>
  );
}

function ResultsSkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Carregando resultados">
      <Skeleton className="h-5 w-56" />
      <div className="rounded-lg border border-line bg-surface">
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex items-center gap-6 border-b border-line px-5 py-5 last:border-0"
          >
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="ml-auto h-4 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

async function Results({ query, demo }: { query: Q; demo: boolean }) {
  const rl = rateLimit(`search:${await clientKey()}`, 40, 60_000);
  if (!rl.ok)
    return (
      <InlineNotification tone="warning" title="Muitas buscas em pouco tempo">
        Aguarde {rl.retryAfterS} segundos e tente novamente.
      </InlineNotification>
    );

  let results;
  try {
    results =
      query.kind === "number"
        ? await searchFlights(query.designator, query.date)
        : await searchRoute(query.origin, query.destination, query.date);
  } catch (e) {
    return (
      <InlineNotification tone="critical" title="Não foi possível consultar agora">
        {providerErrorMessage(e)}
      </InlineNotification>
    );
  }

  const label =
    query.kind === "number"
      ? `${query.designator} · ${formatLongDate(query.date)}`
      : `${findAirport(query.origin)?.city ?? query.origin} → ${findAirport(query.destination)?.city ?? query.destination} · ${formatLongDate(query.date)}`;

  if (!results.length)
    return (
      <EmptyState
        title={`Nenhum voo encontrado para ${label}`}
        description={
          demo
            ? "No modo demonstração existem apenas os voos fictícios ZZ1001 a ZZ1010. Tente um deles."
            : "Confira o número e a data. Voos muito distantes no futuro ou no passado podem não estar disponíveis no provedor."
        }
      />
    );

  return (
    <section aria-labelledby="resultados" className="animate-enter">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="resultados" className="t-heading">
          {results.length === 1 ? "1 voo encontrado" : `${results.length} voos encontrados`}
        </h2>
        <p className="t-data text-[13px] text-muted">{label}</p>
      </div>
      {results.length > 1 && query.kind === "number" && (
        <p className="mb-3 text-sm text-ink-2">
          Há mais de uma operação com esse número na data. Escolha pelo horário e pela rota.
        </p>
      )}
      <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
        {results.map((f) => (
          <FlightRow key={f.id} flight={f} />
        ))}
      </div>
      <p className="mt-3 flex items-center gap-2 text-[13px] text-muted">
        {results[0].source.synthetic && <DemoTag />}
        Fonte: {results[0].source.name}
      </p>
    </section>
  );
}
