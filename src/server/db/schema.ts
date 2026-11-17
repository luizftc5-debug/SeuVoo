import type { FlightEventType, FlightOccurrence } from "@/lib/aviation/types";

/**
 * Modelo de dados persistido. Espelha supabase/migrations/0001_init.sql
 * (nomes em camelCase aqui, snake_case no Postgres).
 */

export interface UserRow {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface Preferences {
  theme: "system" | "light" | "dark";
  emailAlerts: boolean;
  homeAirport?: string;
}

export interface ProfileRow {
  userId: string;
  displayName: string;
  preferences: Preferences;
  createdAt: string;
}

export interface SessionRow {
  /** SHA-256 do token; o token em si só existe no cookie. */
  tokenHash: string;
  userId: string;
  expiresAt: string;
  createdAt: string;
}

export interface PasswordResetRow {
  tokenHash: string;
  userId: string;
  expiresAt: string;
  usedAt?: string;
}

export interface FlightOccurrenceRow {
  id: string;
  snapshot: FlightOccurrence;
  updatedAt: string;
}

export interface TrackedFlightRow {
  id: string;
  userId: string;
  occurrenceId: string;
  createdAt: string;
  lastCheckedAt: string;
}

export interface FlightEventRow {
  id: string;
  occurrenceId: string;
  type: FlightEventType;
  previousValue?: string;
  currentValue?: string;
  occurredAt?: string;
  detectedAt: string;
  dedupeKey: string;
}

export interface TripRow {
  id: string;
  userId: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface TripSegmentRow {
  id: string;
  tripId: string;
  segmentType: "flight";
  occurrenceId: string;
  createdAt: string;
}

export const ITINERARY_CATEGORIES = {
  flight: "Voo",
  lodging: "Hospedagem",
  food: "Restaurante",
  tour: "Passeio",
  transport: "Transporte",
  appointment: "Compromisso",
  reservation: "Reserva",
} as const;
export type ItineraryCategory = keyof typeof ITINERARY_CATEGORIES;

export interface ItineraryItemRow {
  id: string;
  tripId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  title: string;
  category: ItineraryCategory;
  description?: string;
  location?: string;
  sortOrder: number;
  done: boolean;
  createdAt: string;
}

export const EXPENSE_CATEGORIES = {
  flights: "Passagens",
  lodging: "Hospedagem",
  food: "Alimentação",
  transport: "Transporte",
  tours: "Passeios",
  shopping: "Compras",
  other: "Outros",
} as const;
export type ExpenseCategory = keyof typeof EXPENSE_CATEGORIES;

export interface ExpenseRow {
  id: string;
  tripId: string;
  category: ExpenseCategory;
  description: string;
  plannedCents: number | null;
  actualCents: number | null;
  currency: string;
  date?: string;
  createdAt: string;
}

export const PACKING_CATEGORIES = {
  documents: "Documentos",
  clothing: "Vestuário",
  hygiene: "Higiene",
  electronics: "Eletrônicos",
  medicine: "Medicamentos",
  other: "Outros",
} as const;
export type PackingCategory = keyof typeof PACKING_CATEGORIES;

export interface PackingItemRow {
  id: string;
  tripId: string;
  label: string;
  category: PackingCategory;
  completed: boolean;
  sortOrder: number;
  createdAt: string;
}

export const DOCUMENT_CATEGORIES = {
  ticket: "Bilhete / cartão de embarque",
  booking: "Reserva",
  insurance: "Seguro viagem",
  identity: "Documento de identificação",
  visa: "Visto / autorização",
  health: "Saúde / vacinação",
  other: "Outro",
} as const;
export type DocumentCategory = keyof typeof DOCUMENT_CATEGORIES;

export interface TravelDocumentRow {
  id: string;
  userId: string;
  tripId: string | null;
  name: string;
  category: DocumentCategory;
  expiresOn?: string;
  notes?: string;
  file?: { storageKey: string; mime: string; size: number; originalName: string };
  createdAt: string;
}

export interface NotificationRow {
  id: string;
  userId: string;
  type: "flight_event";
  title: string;
  body: string;
  occurrenceId?: string;
  eventKey?: string;
  readAt?: string;
  createdAt: string;
}

export interface ShareLinkRow {
  id: string;
  userId: string;
  resourceType: "flight";
  resourceId: string;
  tokenHash: string;
  /** Campos autorizados na visualização pública. */
  scope: { showGates: boolean };
  expiresAt?: string;
  revokedAt?: string;
  createdAt: string;
}

export interface EntitlementRow {
  userId: string;
  plan: "free" | "plus";
  status: "active" | "inactive";
}

export interface Database {
  version: 1;
  users: UserRow[];
  profiles: ProfileRow[];
  sessions: SessionRow[];
  passwordResets: PasswordResetRow[];
  flightOccurrences: FlightOccurrenceRow[];
  trackedFlights: TrackedFlightRow[];
  flightEvents: FlightEventRow[];
  trips: TripRow[];
  tripSegments: TripSegmentRow[];
  itineraryItems: ItineraryItemRow[];
  expenses: ExpenseRow[];
  packingItems: PackingItemRow[];
  travelDocuments: TravelDocumentRow[];
  notifications: NotificationRow[];
  shareLinks: ShareLinkRow[];
  entitlements: EntitlementRow[];
}

export function emptyDatabase(): Database {
  return {
    version: 1,
    users: [],
    profiles: [],
    sessions: [],
    passwordResets: [],
    flightOccurrences: [],
    trackedFlights: [],
    flightEvents: [],
    trips: [],
    tripSegments: [],
    itineraryItems: [],
    expenses: [],
    packingItems: [],
    travelDocuments: [],
    notifications: [],
    shareLinks: [],
    entitlements: [],
  };
}
