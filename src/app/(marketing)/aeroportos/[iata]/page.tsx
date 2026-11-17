import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FlightRow } from "@/components/aviation/flight-parts";
import { LazyMap } from "@/components/maps/lazy-map";
import { Container, DemoTag, EmptyState, InlineNotification } from "@/components/ui/primitives";
import { findAirport } from "@/lib/aviation/airports";
import { formatTime, utcOffsetLabel } from "@/lib/dates";
import { getAirportBoard, providerErrorMessage } from "@/server/services/flights";

export async function generateMetadata({
  params,
}: PageProps<"/aeroportos/[iata]">): Promise<Metadata> {
  const { iata } = await params;
  const a = findAirport(iata);
  if (!a?.featured) return { title: "Aeroporto" };
  return {
    title: `${a.city} (${a.iata}) — ${a.name}`,
    description: `Informações do ${a.name} (${a.iata}/${a.icao}) em ${a.city}, ${a.state}: localização, fuso horário, links oficiais e voos.`,
    alternates: { canonical: `/aeroportos/${a.iata.toLowerCase()}` },
  };
}

export default async function AirportPage({ params }: PageProps<"/aeroportos/[iata]">) {
  const { iata } = await params;
  const a = findAirport(iata);
  if (!a?.featured || iata !== iata.toLowerCase()) notFound();
  const now = new Date().toISOString();

  return (
    <Container className="py-10 sm:py-14">
      <nav aria-label="Trilha" className="mb-6 text-[13px] text-muted">
        <Link href="/aeroportos" className="hover:text-ink">
          Aeroportos
        </Link>
        <span className="mx-1.5">/</span>
        <span className="t-data text-ink-2">{a.iata}</span>
      </nav>
      <div className="grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div>
          <p className="t-data text-5xl font-medium text-ink sm:text-6xl">{a.iata}</p>
          <h1 className="t-heading mt-3 max-w-xl text-xl">{a.name}</h1>
          <p className="mt-1 text-ink-2">
            {a.city} · {a.state} · {a.country}
          </p>

          <dl className="mt-8 grid max-w-xl grid-cols-2 gap-y-3 border-t border-line pt-6 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted">IATA</dt>
              <dd className="t-data text-ink">{a.iata}</dd>
            </div>
            <div>
              <dt className="text-muted">ICAO</dt>
              <dd className="t-data text-ink">{a.icao}</dd>
            </div>
            <div>
              <dt className="text-muted">Fuso horário</dt>
              <dd className="text-ink">
                {utcOffsetLabel(now, a.timezone)}{" "}
                <span className="text-muted">· agora {formatTime(now, a.timezone)}</span>
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-3">
              <dt className="text-muted">Coordenadas</dt>
              <dd className="t-data text-ink">
                {a.lat.toFixed(4)}, {a.lon.toFixed(4)}
              </dd>
            </div>
          </dl>

          <div className="mt-8 max-w-xl text-sm">
            <p className="t-label mb-2">Links oficiais</p>
            <ul className="space-y-1.5">
              {a.officialSite ? (
                <li>
                  <a
                    href={a.officialSite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent underline underline-offset-2"
                  >
                    Site do aeroporto
                  </a>
                </li>
              ) : (
                <li className="text-muted">Site do operador ainda não verificado nesta versão.</li>
              )}
              <li>
                <a
                  href="https://www.gov.br/anac/pt-br/assuntos/passageiros"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent underline underline-offset-2"
                >
                  ANAC — informações ao passageiro
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="h-64 lg:h-72">
          <LazyMap
            ariaLabel={`Localização do aeroporto ${a.iata}`}
            points={[{ id: a.iata, lon: a.lon, lat: a.lat, label: a.iata, emphasis: true }]}
          />
        </div>
      </div>

      <section className="mt-14" aria-labelledby="painel">
        <h2 id="painel" className="t-heading">
          Partidas e chegadas
        </h2>
        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <Board iata={a.iata} kind="departures" />
          <Board iata={a.iata} kind="arrivals" />
        </div>
      </section>
    </Container>
  );
}

async function Board({ iata, kind }: { iata: string; kind: "departures" | "arrivals" }) {
  const title = kind === "departures" ? "Partidas" : "Chegadas";
  let list;
  try {
    list = await getAirportBoard(iata, kind);
  } catch (e) {
    return (
      <div>
        <h3 className="mb-2 text-sm font-medium text-ink">{title}</h3>
        <InlineNotification tone="warning">{providerErrorMessage(e)}</InlineNotification>
      </div>
    );
  }
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-ink">{title}</h3>
        {list?.[0]?.source.synthetic && <DemoTag />}
      </div>
      {list == null ? (
        <EmptyState
          title="Painel indisponível"
          description="A fonte de dados configurada não fornece o painel deste aeroporto."
        />
      ) : list.length === 0 ? (
        <EmptyState
          title={`Sem ${title.toLowerCase()} na fonte de dados`}
          description="Não inventamos horários: o painel aparece quando a fonte fornece dados."
        />
      ) : (
        <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
          {list.map((f) => (
            <FlightRow key={f.id} flight={f} />
          ))}
        </div>
      )}
    </div>
  );
}
