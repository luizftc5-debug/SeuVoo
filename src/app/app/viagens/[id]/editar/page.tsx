import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TripForm } from "@/components/travel/trip-form";
import { requireUser } from "@/server/auth";
import { getTripWorkspace } from "@/server/services/trips";

export const metadata: Metadata = { title: "Editar viagem" };

export default async function EditTrip({ params }: PageProps<"/app/viagens/[id]/editar">) {
  const { id } = await params;
  const user = await requireUser();
  const ws = await getTripWorkspace(user.id, id);
  if (!ws) notFound();
  const t = ws.trip;
  return (
    <div className="max-w-xl">
      <nav aria-label="Trilha" className="mb-4 text-[13px] text-muted">
        <Link href="/app/viagens" className="hover:text-ink">
          Viagens
        </Link>
        <span className="mx-1.5">/</span>
        <Link href={`/app/viagens/${t.id}`} className="hover:text-ink">
          {t.title}
        </Link>
        <span className="mx-1.5">/</span>Editar
      </nav>
      <h1 className="t-title mb-8">Editar viagem</h1>
      <TripForm
        tripId={t.id}
        defaults={{
          title: t.title,
          destination: t.destination,
          country: t.country,
          startDate: t.startDate,
          endDate: t.endDate,
          description: t.description,
          coverUrl: t.coverUrl,
          participants: t.participants.join(", "),
          budget: t.budgetCents != null ? (t.budgetCents / 100).toFixed(2).replace(".", ",") : "",
          currency: t.currency,
        }}
      />
    </div>
  );
}
