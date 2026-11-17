import type { Metadata } from "next";
import Link from "next/link";
import { TripForm } from "@/components/travel/trip-form";
import { requireUser } from "@/server/auth";

export const metadata: Metadata = { title: "Nova viagem" };

export default async function NewTrip() {
  await requireUser("/app/viagens/nova");
  return (
    <div className="max-w-xl">
      <nav aria-label="Trilha" className="mb-4 text-[13px] text-muted">
        <Link href="/app/viagens" className="hover:text-ink">
          Viagens
        </Link>
        <span className="mx-1.5">/</span>Nova
      </nav>
      <h1 className="t-title mb-8">Nova viagem</h1>
      <TripForm />
    </div>
  );
}
