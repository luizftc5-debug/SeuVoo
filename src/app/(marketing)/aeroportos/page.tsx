import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/primitives";
import { AIRPORTS } from "@/lib/aviation/airports";

export const metadata: Metadata = {
  title: "Aeroportos",
  description:
    "Diretório de aeroportos brasileiros: códigos IATA e ICAO, localização, fuso horário e links oficiais.",
};

export default function AirportsPage() {
  const br = AIRPORTS.filter((a) => a.featured);
  const intl = AIRPORTS.filter((a) => !a.featured);
  return (
    <Container className="py-10 sm:py-14">
      <h1 className="t-title">Aeroportos</h1>
      <p className="mt-2 max-w-2xl text-ink-2">
        Os principais aeroportos brasileiros, com códigos, localização e fuso horário.
      </p>

      <div className="mt-10 overflow-x-auto rounded-lg border border-line bg-surface">
        <table className="w-full min-w-[36rem] text-sm">
          <caption className="sr-only">Aeroportos brasileiros</caption>
          <thead>
            <tr className="border-b border-line text-left text-[12px] text-muted">
              <th scope="col" className="px-4 py-3 font-medium">
                IATA
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Aeroporto
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                Cidade
              </th>
              <th scope="col" className="px-4 py-3 font-medium">
                ICAO
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {br.map((a) => (
              <tr key={a.iata} className="group hover:bg-subtle">
                <td className="px-4 py-3">
                  <Link
                    href={`/aeroportos/${a.iata.toLowerCase()}`}
                    className="t-data font-medium text-ink"
                  >
                    {a.iata}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/aeroportos/${a.iata.toLowerCase()}`}
                    className="text-ink group-hover:underline underline-offset-2"
                  >
                    {a.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-ink-2">
                  {a.city} · {a.state}
                </td>
                <td className="t-data px-4 py-3 text-muted">{a.icao}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="t-heading mt-14">Destinos internacionais de referência</h2>
      <p className="mt-1 text-sm text-muted">
        Usados para reconhecer rotas e calcular distâncias; ainda sem página dedicada.
      </p>
      <ul className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {intl.map((a) => (
          <li key={a.iata} className="flex gap-3 border-b border-line py-2">
            <span className="t-data w-10 text-ink">{a.iata}</span>
            <span className="text-ink-2">
              {a.city}, {a.country}
            </span>
          </li>
        ))}
      </ul>
    </Container>
  );
}
