"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { parseOccurrenceSlug } from "@/lib/aviation/ids";
import { requireUser } from "@/server/auth";
import { getOccurrence } from "@/server/services/flights";
import { createShareLink, revokeShareLink } from "@/server/services/sharing";
import { refreshTrackedFlights, trackFlight, untrackFlight } from "@/server/services/tracking";
import { markRead } from "@/server/services/notifications";
import type { FormState } from "@/lib/validations";

export async function trackFlightAction(slug: string) {
  const user = await requireUser(`/voos/${slug}`);
  const ref = parseOccurrenceSlug(slug);
  if (!ref) throw new Error("Voo inválido.");
  const occ = await getOccurrence(ref.source, ref.providerId);
  if (!occ) throw new Error("Voo não encontrado no provedor.");
  await trackFlight(user.id, occ);
  revalidatePath(`/voos/${slug}`);
  revalidatePath("/app", "layout");
}

export async function untrackFlightAction(trackedId: string, returnTo?: string) {
  const user = await requireUser();
  await untrackFlight(user.id, trackedId);
  revalidatePath("/app", "layout");
  if (returnTo) {
    revalidatePath(returnTo);
    if (returnTo.startsWith("/")) redirect(returnTo);
  }
}

export async function refreshTrackedAction() {
  const user = await requireUser();
  await refreshTrackedFlights({ userId: user.id });
  revalidatePath("/app", "layout");
}

export type ShareState = FormState & { url?: string };

export async function createShareAction(
  occurrenceId: string,
  slug: string,
  _: ShareState,
  fd: FormData,
): Promise<ShareState> {
  const user = await requireUser();
  const exp = String(fd.get("expires") ?? "48");
  const hours = exp === "never" ? null : Math.min(Math.max(Number(exp) || 48, 1), 24 * 30);
  try {
    const { token } = await createShareLink(user.id, occurrenceId, {
      expiresInHours: hours,
      showGates: fd.get("showGates") === "on",
    });
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    revalidatePath(`/voos/${slug}`);
    return { ok: true, url: `${base}/compartilhado/${token}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Não foi possível criar o link." };
  }
}

export async function revokeShareAction(id: string, slug: string) {
  const user = await requireUser();
  await revokeShareLink(user.id, id);
  revalidatePath(`/voos/${slug}`);
}

export async function markNotificationReadAction(id: string | "all") {
  const user = await requireUser();
  await markRead(user.id, id);
  revalidatePath("/app", "layout");
}
