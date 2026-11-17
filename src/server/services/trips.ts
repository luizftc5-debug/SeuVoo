import "server-only";
import type { FlightOccurrence } from "@/lib/aviation/types";
import type {
  Database,
  DocumentCategory,
  ExpenseCategory,
  ExpenseRow,
  ItineraryCategory,
  ItineraryItemRow,
  PackingCategory,
  PackingItemRow,
  TravelDocumentRow,
  TripRow,
} from "../db/schema";
import { read, write } from "../db/store";

export class NotFoundError extends Error {
  constructor(what = "Recurso") {
    super(`${what} não encontrado.`);
  }
}

/** Autorização por recurso: só o dono da viagem acessa. */
function ownedTrip(db: Database, userId: string, tripId: string): TripRow {
  const t = db.trips.find((x) => x.id === tripId && x.userId === userId);
  if (!t) throw new NotFoundError("Viagem");
  return t;
}

const now = () => new Date().toISOString();

export interface TripInput {
  title: string;
  destination: string;
  country?: string;
  startDate: string;
  endDate: string;
  description?: string;
  coverUrl?: string;
  participants: string[];
  budgetCents: number | null;
  currency: string;
}

export async function listTrips(userId: string, q?: string): Promise<TripRow[]> {
  const needle = q?.trim().toLowerCase();
  return read((db) =>
    db.trips
      .filter((t) => t.userId === userId)
      .filter(
        (t) =>
          !needle ||
          `${t.title} ${t.destination} ${t.country ?? ""}`.toLowerCase().includes(needle),
      )
      .sort((a, b) => a.startDate.localeCompare(b.startDate)),
  );
}

export async function createTrip(userId: string, input: TripInput): Promise<TripRow> {
  return write((db) => {
    const t: TripRow = {
      id: crypto.randomUUID(),
      userId,
      ...input,
      createdAt: now(),
      updatedAt: now(),
    };
    db.trips.push(t);
    return t;
  });
}

export async function updateTrip(
  userId: string,
  tripId: string,
  input: TripInput,
): Promise<TripRow> {
  return write((db) => {
    const t = ownedTrip(db, userId, tripId);
    Object.assign(t, input, { updatedAt: now() });
    return t;
  });
}

export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    db.trips = db.trips.filter((t) => t.id !== tripId);
    db.tripSegments = db.tripSegments.filter((x) => x.tripId !== tripId);
    db.itineraryItems = db.itineraryItems.filter((x) => x.tripId !== tripId);
    db.expenses = db.expenses.filter((x) => x.tripId !== tripId);
    db.packingItems = db.packingItems.filter((x) => x.tripId !== tripId);
    for (const d of db.travelDocuments) if (d.tripId === tripId) d.tripId = null;
  });
}

export interface TripWorkspace {
  trip: TripRow;
  flights: { segmentId: string; flight: FlightOccurrence }[];
  itinerary: ItineraryItemRow[];
  expenses: ExpenseRow[];
  packing: PackingItemRow[];
  documents: TravelDocumentRow[];
}

export async function getTripWorkspace(
  userId: string,
  tripId: string,
): Promise<TripWorkspace | null> {
  return read((db) => {
    const trip = db.trips.find((t) => t.id === tripId && t.userId === userId);
    if (!trip) return null;
    const flights = db.tripSegments
      .filter((s) => s.tripId === tripId)
      .flatMap((s) => {
        const o = db.flightOccurrences.find((x) => x.id === s.occurrenceId);
        return o ? [{ segmentId: s.id, flight: o.snapshot }] : [];
      })
      .sort((a, b) =>
        (a.flight.departure.gateTimes.scheduled ?? "").localeCompare(
          b.flight.departure.gateTimes.scheduled ?? "",
        ),
      );
    return {
      trip,
      flights,
      itinerary: db.itineraryItems
        .filter((i) => i.tripId === tripId)
        .sort((a, b) => a.date.localeCompare(b.date) || a.sortOrder - b.sortOrder),
      expenses: db.expenses
        .filter((e) => e.tripId === tripId)
        .sort(
          (a, b) =>
            (a.date ?? "").localeCompare(b.date ?? "") || a.createdAt.localeCompare(b.createdAt),
        ),
      packing: db.packingItems
        .filter((p) => p.tripId === tripId)
        .sort((a, b) => a.sortOrder - b.sortOrder),
      documents: db.travelDocuments
        .filter((d) => d.tripId === tripId && d.userId === userId)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    };
  });
}

/* ---------- Voos vinculados ---------- */

export async function linkFlight(userId: string, tripId: string, occurrenceId: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    // Só voos que o usuário acompanha (o instantâneo precisa existir).
    if (!db.trackedFlights.some((t) => t.userId === userId && t.occurrenceId === occurrenceId))
      throw new NotFoundError("Voo acompanhado");
    if (db.tripSegments.some((s) => s.tripId === tripId && s.occurrenceId === occurrenceId)) return;
    db.tripSegments.push({
      id: crypto.randomUUID(),
      tripId,
      segmentType: "flight",
      occurrenceId,
      createdAt: now(),
    });
  });
}

export async function unlinkFlight(userId: string, tripId: string, segmentId: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    db.tripSegments = db.tripSegments.filter((s) => !(s.id === segmentId && s.tripId === tripId));
  });
}

/* ---------- Roteiro ---------- */

export interface ItineraryInput {
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  category: ItineraryCategory;
  description?: string;
  location?: string;
}

export async function addItineraryItem(userId: string, tripId: string, input: ItineraryInput) {
  return write((db) => {
    ownedTrip(db, userId, tripId);
    const sameDay = db.itineraryItems.filter((i) => i.tripId === tripId && i.date === input.date);
    const item: ItineraryItemRow = {
      id: crypto.randomUUID(),
      tripId,
      ...input,
      sortOrder: sameDay.length ? Math.max(...sameDay.map((i) => i.sortOrder)) + 1 : 0,
      done: false,
      createdAt: now(),
    };
    db.itineraryItems.push(item);
    return item;
  });
}

export async function updateItineraryItem(
  userId: string,
  tripId: string,
  itemId: string,
  input: ItineraryInput,
) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    const it = db.itineraryItems.find((i) => i.id === itemId && i.tripId === tripId);
    if (!it) throw new NotFoundError("Atividade");
    if (it.date !== input.date) {
      const sameDay = db.itineraryItems.filter((i) => i.tripId === tripId && i.date === input.date);
      it.sortOrder = sameDay.length ? Math.max(...sameDay.map((i) => i.sortOrder)) + 1 : 0;
    }
    Object.assign(it, input);
  });
}

export async function deleteItineraryItem(userId: string, tripId: string, itemId: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    db.itineraryItems = db.itineraryItems.filter((i) => !(i.id === itemId && i.tripId === tripId));
  });
}

export async function toggleItineraryDone(userId: string, tripId: string, itemId: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    const it = db.itineraryItems.find((i) => i.id === itemId && i.tripId === tripId);
    if (it) it.done = !it.done;
  });
}

/** Move a atividade uma posição dentro do mesmo dia. */
export async function moveItineraryItem(
  userId: string,
  tripId: string,
  itemId: string,
  dir: "up" | "down",
) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    const it = db.itineraryItems.find((i) => i.id === itemId && i.tripId === tripId);
    if (!it) return;
    const day = db.itineraryItems
      .filter((i) => i.tripId === tripId && i.date === it.date)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = day.findIndex((i) => i.id === itemId);
    const swap = day[dir === "up" ? idx - 1 : idx + 1];
    if (!swap) return;
    day.forEach((d, i) => (d.sortOrder = i)); // normaliza
    [it.sortOrder, swap.sortOrder] = [swap.sortOrder, it.sortOrder];
  });
}

/* ---------- Despesas ---------- */

export interface ExpenseInput {
  category: ExpenseCategory;
  description: string;
  plannedCents: number | null;
  actualCents: number | null;
  currency: string;
  date?: string;
}

export async function addExpense(userId: string, tripId: string, input: ExpenseInput) {
  return write((db) => {
    ownedTrip(db, userId, tripId);
    const e: ExpenseRow = { id: crypto.randomUUID(), tripId, ...input, createdAt: now() };
    db.expenses.push(e);
    return e;
  });
}

export async function updateExpense(
  userId: string,
  tripId: string,
  id: string,
  input: ExpenseInput,
) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    const e = db.expenses.find((x) => x.id === id && x.tripId === tripId);
    if (!e) throw new NotFoundError("Despesa");
    Object.assign(e, input);
  });
}

export async function deleteExpense(userId: string, tripId: string, id: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    db.expenses = db.expenses.filter((x) => !(x.id === id && x.tripId === tripId));
  });
}

/* ---------- Bagagem ---------- */

export const PACKING_TEMPLATES: Record<
  string,
  { label: string; items: [string, PackingCategory][] }
> = {
  basico: {
    label: "Essenciais",
    items: [
      ["Documento de identificação", "documents"],
      ["Cartão de embarque", "documents"],
      ["Carregador do celular", "electronics"],
      ["Escova e pasta de dente", "hygiene"],
      ["Roupas para os dias da viagem", "clothing"],
      ["Medicamentos de uso contínuo", "medicine"],
    ],
  },
  internacional: {
    label: "Viagem internacional",
    items: [
      ["Passaporte", "documents"],
      ["Visto ou autorização de entrada, se exigido", "documents"],
      ["Comprovante de seguro viagem", "documents"],
      ["Adaptador de tomada", "electronics"],
      ["Cartão com uso internacional habilitado", "other"],
    ],
  },
};

export async function addPackingItem(
  userId: string,
  tripId: string,
  label: string,
  category: PackingCategory,
) {
  return write((db) => {
    ownedTrip(db, userId, tripId);
    const items = db.packingItems.filter((p) => p.tripId === tripId);
    const row: PackingItemRow = {
      id: crypto.randomUUID(),
      tripId,
      label,
      category,
      completed: false,
      sortOrder: items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0,
      createdAt: now(),
    };
    db.packingItems.push(row);
    return row;
  });
}

export async function applyPackingTemplate(userId: string, tripId: string, key: string) {
  const tpl = PACKING_TEMPLATES[key];
  if (!tpl) throw new NotFoundError("Modelo");
  await write((db) => {
    ownedTrip(db, userId, tripId);
    const items = db.packingItems.filter((p) => p.tripId === tripId);
    let order = items.length ? Math.max(...items.map((i) => i.sortOrder)) + 1 : 0;
    const existing = new Set(items.map((i) => i.label.toLowerCase()));
    for (const [label, category] of tpl.items) {
      if (existing.has(label.toLowerCase())) continue;
      db.packingItems.push({
        id: crypto.randomUUID(),
        tripId,
        label,
        category,
        completed: false,
        sortOrder: order++,
        createdAt: now(),
      });
    }
  });
}

export async function togglePackingItem(userId: string, tripId: string, id: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    const p = db.packingItems.find((x) => x.id === id && x.tripId === tripId);
    if (p) p.completed = !p.completed;
  });
}

export async function deletePackingItem(userId: string, tripId: string, id: string) {
  await write((db) => {
    ownedTrip(db, userId, tripId);
    db.packingItems = db.packingItems.filter((x) => !(x.id === id && x.tripId === tripId));
  });
}

/* ---------- Documentos ---------- */

export interface DocumentInput {
  name: string;
  category: DocumentCategory;
  expiresOn?: string;
  notes?: string;
  file?: TravelDocumentRow["file"];
}

export async function addDocument(userId: string, tripId: string, input: DocumentInput) {
  return write((db) => {
    ownedTrip(db, userId, tripId);
    const d: TravelDocumentRow = {
      id: crypto.randomUUID(),
      userId,
      tripId,
      ...input,
      createdAt: now(),
    };
    db.travelDocuments.push(d);
    return d;
  });
}

export async function deleteDocument(
  userId: string,
  id: string,
): Promise<TravelDocumentRow | null> {
  return write((db) => {
    const d = db.travelDocuments.find((x) => x.id === id && x.userId === userId) ?? null;
    if (d) db.travelDocuments = db.travelDocuments.filter((x) => x.id !== id);
    return d;
  });
}

export async function getDocument(userId: string, id: string) {
  return read((db) => db.travelDocuments.find((x) => x.id === id && x.userId === userId) ?? null);
}
