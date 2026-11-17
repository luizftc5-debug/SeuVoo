import type { Metadata } from "next";
import Link from "next/link";
import { LazyMap } from "@/components/maps/lazy-map";
import { EmptyState, SectionHeader, buttonClass } from "@/components/ui/primitives";
import { findAirport } from "@/lib/aviation/airports";
import { occurrenceSlug } from "@/lib/aviation/ids";
import { formatDateRange, formatDuration, formatIsoDate } from "@/lib/dates";
import { cn } from "@/lib/cn";
import { requireUser } from "@/server/auth";
import { getPassport } from "@/server/services/passport";

export const metadata: Metadata = { title: "Meu Passaporte" };

export default async function Passport({ searchParams }: PageProps<"/app/passaporte">) {
  const user = await requireUser("/app/passaporte");
  const sp = await searchParams;
  const y = typeof sp.ano === "string" && /^\d{4}$/.test(sp.ano) ? Number(sp.ano) : undefined;
  const p = await getPassport(user.id, y);
  const empty = p.flights === 0 && p.pastTrips.length === 0;
  const points = p.airports.flatMap((code) => {
    const a = findAirport(code);
    return a ? [{ id: code, lon: a.lon, lat: a.lat, label: code }] : [];
  });

  return (
    <div className="space-y-10">
      <SectionHeader
        as="h1"
        title="Meu Passaporte"
        description="Seu histórico calculado a partir dos voos acompanhados com chegada confirmada e das viagens concluídas."
        action={
          !empty ? (
            <a
              href={`/api/passaporte/cartao${y ? `?ano=${y}` : ""}`}
              className={buttonClass("secondary", "sm")}
              download
            >
              Baixar cartão de retrospectiva
            </a>
          ) : undefined
        }
      />

      {p.years.length > 0 && (
        <nav aria-label="Período" className="flex flex-wrap gap-1">
          {[undefined, ...p.years].map((yr) => (
            <Link
              key={yr ?? "all"}
              href={yr ? `/app/passaporte?ano=${yr}` : "/app/passaporte"}
              aria-current={y === yr ? "page" : undefined}
              className={cn(
                "t-data rounded-md px-3 py-1.5 text-sm",
                y === yr ? "bg-ink text-canvas" : "text-ink-2 hover:bg-subtle",
              )}
            >
              {yr ?? "Tudo"}
            </Link>
          ))}
        </nav>
      )}

      {empty ? (
        <EmptyState
          title={y ? `Nada registrado em ${y}` : "Seu passaporte ainda está em branco"}
          description="Voos acompanhados entram aqui quando a fonte de dados confirma a chegada. Viagens entram depois da data de volta."
          action={
            <Link href="/voos" className={buttonClass("primary")}>
              Buscar voo
            </Link>
          }
        />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-5 border-y border-line py-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Voos realizados", p.flights.toString(), null],
              ["Aeroportos", p.airports.length.toString(), null],
              ["Países", p.countries.length.toString(), null],
              ["Cidades", p.cities.length.toString(), null],
              [
                "Distância",
                `${p.distanceKm.toLocaleString("pt-BR")} km`,
                "linha reta entre aeroportos",
              ],
              [
                "Tempo em voo",
                p.flightsWithAirborneData ? formatDuration(p.airborneMinutes) : "—",
                p.flightsWithAirborneData
                  ? `${p.flightsWithAirborneData} de ${p.flights} voos com horários efetivos`
                  : "sem horários efetivos",
              ],
            ].map(([k, v, note]) => (
              <div key={k}>
                <dt className="text-[13px] text-muted">{k}</dt>
                <dd className="t-data mt-1 whitespace-nowrap text-xl text-ink sm:text-2xl">{v}</dd>
                {note && <dd className="mt-0.5 text-[12px] text-muted">{note}</dd>}
              </div>
            ))}
          </dl>

          {points.length > 0 && (
            <section aria-labelledby="mapa-pessoal">
              <h2 id="mapa-pessoal" className="t-heading mb-3">
                Aeroportos visitados
              </h2>
              <div className="h-72">
                <LazyMap
                  ariaLabel={`Mapa com ${points.length} aeroportos visitados`}
                  points={points}
                />
              </div>
              <p className="mt-2 text-sm text-ink-2">
                <span className="t-data">{p.airports.join(" · ")}</span>
              </p>
            </section>
          )}

          <div className="grid gap-10 md:grid-cols-2">
            <section aria-labelledby="paises">
              <h2 id="paises" className="t-label mb-3">
                Países
              </h2>
              <ul className="divide-y divide-line border-y border-line text-sm">
                {p.countries.map((c) => (
                  <li key={c} className="py-2 text-ink">
                    {c}
                  </li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="cidades">
              <h2 id="cidades" className="t-label mb-3">
                Cidades
              </h2>
              <ul className="divide-y divide-line border-y border-line text-sm">
                {p.cities.map((c) => (
                  <li key={c} className="py-2 text-ink">
                    {c}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {p.tripsByYear.length > 0 && !y && (
            <section aria-labelledby="por-ano">
              <h2 id="por-ano" className="t-label mb-3">
                Por ano
              </h2>
              <table className="w-full max-w-md text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-[12px] text-muted">
                    <th scope="col" className="py-2 font-medium">
                      Ano
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Viagens
                    </th>
                    <th scope="col" className="py-2 text-right font-medium">
                      Voos
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {p.tripsByYear.map((r) => (
                    <tr key={r.year}>
                      <th scope="row" className="t-data py-2 text-left font-normal">
                        <Link
                          href={`/app/passaporte?ano=${r.year}`}
                          className="text-accent hover:underline"
                        >
                          {r.year}
                        </Link>
                      </th>
                      <td className="t-data py-2 text-right">{r.trips}</td>
                      <td className="t-data py-2 text-right">{r.flights}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {p.pastTrips.length > 0 && (
            <section aria-labelledby="viagens-anteriores">
              <h2 id="viagens-anteriores" className="t-label mb-3">
                Viagens anteriores
              </h2>
              <ul className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                {p.pastTrips.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/viagens/${t.id}`}
                      className="flex flex-wrap justify-between gap-2 px-5 py-3.5 hover:bg-subtle"
                    >
                      <span className="font-medium text-ink">{t.title}</span>
                      <span className="text-sm text-muted">
                        {t.destination} · {formatDateRange(t.startDate, t.endDate)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.completedFlights.length > 0 && (
            <section aria-labelledby="voos-realizados">
              <h2 id="voos-realizados" className="t-label mb-3">
                Voos realizados
              </h2>
              <div className="overflow-x-auto rounded-lg border border-line bg-surface">
                <table className="w-full min-w-[30rem] text-sm">
                  <thead>
                    <tr className="border-b border-line text-left text-[12px] text-muted">
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Data
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Voo
                      </th>
                      <th scope="col" className="px-4 py-2.5 font-medium">
                        Rota
                      </th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">
                        Distância
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {p.completedFlights.map((f) => (
                      <tr key={f.id}>
                        <td className="t-data px-4 py-2.5 text-ink-2">
                          {formatIsoDate(f.operatingDate)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Link
                            href={`/voos/${occurrenceSlug(f.id)}`}
                            className="t-data text-accent hover:underline"
                          >
                            {f.designator}
                          </Link>
                        </td>
                        <td className="t-data px-4 py-2.5 text-ink">
                          {f.departure.airport.iata} → {f.arrival.airport.iata}
                        </td>
                        <td className="t-data px-4 py-2.5 text-right text-ink-2">
                          {f.greatCircleKm != null
                            ? `${f.greatCircleKm.toLocaleString("pt-BR")} km`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
