"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import * as trips from "@/server/services/trips";
import { deleteUpload, MAX_UPLOAD_BYTES, saveUpload, sniffMime } from "@/server/storage";
import {
  documentSchema,
  expenseSchema,
  fieldErrors,
  formValues,
  itinerarySchema,
  packingSchema,
  tripSchema,
  type FormState,
} from "@/lib/validations";

const TRIP_KEYS = [
  "title",
  "destination",
  "country",
  "startDate",
  "endDate",
  "description",
  "coverUrl",
  "participants",
  "budget",
  "currency",
];
const path = (id: string) => `/app/viagens/${id}`;

function tripInput(d: ReturnType<typeof tripSchema.parse>): trips.TripInput {
  return {
    title: d.title,
    destination: d.destination,
    country: d.country,
    startDate: d.startDate,
    endDate: d.endDate,
    description: d.description,
    coverUrl: d.coverUrl,
    participants: d.participants,
    budgetCents: d.budget,
    currency: d.currency,
  };
}

export async function createTripAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await requireUser("/app/viagens/nova");
  const parsed = tripSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd, TRIP_KEYS) };
  const t = await trips.createTrip(user.id, tripInput(parsed.data));
  revalidatePath("/app", "layout");
  redirect(path(t.id));
}

export async function updateTripAction(
  tripId: string,
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = tripSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd, TRIP_KEYS) };
  await trips.updateTrip(user.id, tripId, tripInput(parsed.data));
  revalidatePath("/app", "layout");
  redirect(path(tripId));
}

export async function deleteTripAction(tripId: string) {
  const user = await requireUser();
  await trips.deleteTrip(user.id, tripId);
  revalidatePath("/app", "layout");
  redirect("/app/viagens");
}

/* Roteiro */

const ITIN_KEYS = ["date", "startTime", "endTime", "title", "category", "description", "location"];

export async function saveItineraryAction(
  tripId: string,
  itemId: string | null,
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = itinerarySchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd, ITIN_KEYS) };
  if (itemId) await trips.updateItineraryItem(user.id, tripId, itemId, parsed.data);
  else await trips.addItineraryItem(user.id, tripId, parsed.data);
  revalidatePath(path(tripId));
  return { ok: true, message: itemId ? "Atividade atualizada." : "Atividade adicionada." };
}

export async function itineraryOpAction(
  tripId: string,
  itemId: string,
  op: "toggle" | "delete" | "up" | "down",
) {
  const user = await requireUser();
  if (op === "toggle") await trips.toggleItineraryDone(user.id, tripId, itemId);
  else if (op === "delete") await trips.deleteItineraryItem(user.id, tripId, itemId);
  else await trips.moveItineraryItem(user.id, tripId, itemId, op);
  revalidatePath(path(tripId));
}

/* Orçamento */

const EXP_KEYS = ["category", "description", "planned", "actual", "currency", "date"];

export async function saveExpenseAction(
  tripId: string,
  expenseId: string | null,
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = expenseSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success)
    return { fieldErrors: fieldErrors(parsed.error), values: formValues(fd, EXP_KEYS) };
  const d = parsed.data;
  const input = {
    category: d.category,
    description: d.description,
    plannedCents: d.planned,
    actualCents: d.actual,
    currency: d.currency,
    date: d.date,
  };
  if (expenseId) await trips.updateExpense(user.id, tripId, expenseId, input);
  else await trips.addExpense(user.id, tripId, input);
  revalidatePath(path(tripId));
  return { ok: true, message: expenseId ? "Despesa atualizada." : "Despesa registrada." };
}

export async function deleteExpenseAction(tripId: string, id: string) {
  const user = await requireUser();
  await trips.deleteExpense(user.id, tripId, id);
  revalidatePath(path(tripId));
}

/* Bagagem */

export async function addPackingAction(
  tripId: string,
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = packingSchema.safeParse(Object.fromEntries(fd));
  if (!parsed.success)
    return {
      fieldErrors: fieldErrors(parsed.error),
      values: formValues(fd, ["label", "category"]),
    };
  await trips.addPackingItem(user.id, tripId, parsed.data.label, parsed.data.category);
  revalidatePath(path(tripId));
  return { ok: true, values: { category: parsed.data.category } };
}

export async function packingOpAction(tripId: string, id: string, op: "toggle" | "delete") {
  const user = await requireUser();
  if (op === "toggle") await trips.togglePackingItem(user.id, tripId, id);
  else await trips.deletePackingItem(user.id, tripId, id);
  revalidatePath(path(tripId));
}

export async function applyTemplateAction(tripId: string, key: string) {
  const user = await requireUser();
  await trips.applyPackingTemplate(user.id, tripId, key);
  revalidatePath(path(tripId));
}

/* Voos vinculados */

export async function linkFlightAction(tripId: string, fd: FormData) {
  const user = await requireUser();
  const occ = String(fd.get("occurrenceId") ?? "");
  if (occ) await trips.linkFlight(user.id, tripId, occ);
  revalidatePath(path(tripId));
}

export async function unlinkFlightAction(tripId: string, segmentId: string) {
  const user = await requireUser();
  await trips.unlinkFlight(user.id, tripId, segmentId);
  revalidatePath(path(tripId));
}

/* Documentos */

export async function addDocumentAction(
  tripId: string,
  _: FormState,
  fd: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const values = formValues(fd, ["name", "category", "expiresOn", "notes"]);
  const parsed = documentSchema.safeParse(values);
  if (!parsed.success) return { fieldErrors: fieldErrors(parsed.error), values };
  let file: trips.DocumentInput["file"];
  const f = fd.get("file");
  if (f instanceof File && f.size > 0) {
    if (f.size > MAX_UPLOAD_BYTES)
      return { fieldErrors: { file: "Arquivo acima de 5 MB." }, values };
    const bytes = new Uint8Array(await f.arrayBuffer());
    const mime = sniffMime(bytes);
    if (!mime) return { fieldErrors: { file: "Envie PDF, PNG ou JPEG." }, values };
    const storageKey = await saveUpload(user.id, bytes);
    file = { storageKey, mime, size: f.size, originalName: f.name.slice(0, 120) };
  }
  try {
    await trips.addDocument(user.id, tripId, { ...parsed.data, file });
  } catch (e) {
    if (file) await deleteUpload(file.storageKey);
    throw e;
  }
  revalidatePath(path(tripId));
  return { ok: true, message: "Documento registrado." };
}

export async function deleteDocumentAction(tripId: string, id: string) {
  const user = await requireUser();
  const d = await trips.deleteDocument(user.id, id);
  if (d?.file) await deleteUpload(d.file.storageKey);
  revalidatePath(path(tripId));
}
