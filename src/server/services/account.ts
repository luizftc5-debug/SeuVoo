import "server-only";
import type { Preferences } from "../db/schema";
import { read, write } from "../db/store";
import { deleteUserUploads } from "../storage";

export async function updateProfile(userId: string, displayName: string, preferences: Preferences) {
  await write((db) => {
    const p = db.profiles.find((x) => x.userId === userId);
    if (!p) return;
    p.displayName = displayName;
    p.preferences = preferences;
  });
}

export async function getEntitlement(userId: string) {
  return read(
    (db) =>
      db.entitlements.find((e) => e.userId === userId) ?? {
        userId,
        plan: "free" as const,
        status: "active" as const,
      },
  );
}

/** Exportação dos dados pessoais (LGPD, art. 18). Sem hashes de senha ou tokens. */
export async function exportUserData(userId: string) {
  return read((db) => {
    const trips = db.trips.filter((t) => t.userId === userId);
    const tripIds = new Set(trips.map((t) => t.id));
    const user = db.users.find((u) => u.id === userId);
    return {
      exportedAt: new Date().toISOString(),
      account: user ? { email: user.email, createdAt: user.createdAt } : null,
      profile: db.profiles.find((p) => p.userId === userId) ?? null,
      trackedFlights: db.trackedFlights
        .filter((t) => t.userId === userId)
        .map((t) => ({
          ...t,
          flight: db.flightOccurrences.find((o) => o.id === t.occurrenceId)?.snapshot ?? null,
        })),
      trips,
      itinerary: db.itineraryItems.filter((i) => tripIds.has(i.tripId)),
      expenses: db.expenses.filter((e) => tripIds.has(e.tripId)),
      packing: db.packingItems.filter((p) => tripIds.has(p.tripId)),
      documents: db.travelDocuments
        .filter((d) => d.userId === userId)
        .map(({ file, ...d }) => ({ ...d, hasFile: !!file })),
      notifications: db.notifications.filter((n) => n.userId === userId),
      shareLinks: db.shareLinks
        .filter((s) => s.userId === userId)
        .map((s) => ({
          id: s.id,
          resourceType: s.resourceType,
          resourceId: s.resourceId,
          scope: s.scope,
          expiresAt: s.expiresAt,
          revokedAt: s.revokedAt,
          createdAt: s.createdAt,
        })),
    };
  });
}

/** Exclusão definitiva da conta e de todos os dados associados. */
export async function deleteAccount(userId: string) {
  await write((db) => {
    const tripIds = new Set(db.trips.filter((t) => t.userId === userId).map((t) => t.id));
    db.users = db.users.filter((u) => u.id !== userId);
    db.profiles = db.profiles.filter((p) => p.userId !== userId);
    db.sessions = db.sessions.filter((s) => s.userId !== userId);
    db.passwordResets = db.passwordResets.filter((s) => s.userId !== userId);
    db.trackedFlights = db.trackedFlights.filter((t) => t.userId !== userId);
    db.trips = db.trips.filter((t) => t.userId !== userId);
    db.tripSegments = db.tripSegments.filter((s) => !tripIds.has(s.tripId));
    db.itineraryItems = db.itineraryItems.filter((i) => !tripIds.has(i.tripId));
    db.expenses = db.expenses.filter((e) => !tripIds.has(e.tripId));
    db.packingItems = db.packingItems.filter((p) => !tripIds.has(p.tripId));
    db.travelDocuments = db.travelDocuments.filter((d) => d.userId !== userId);
    db.notifications = db.notifications.filter((n) => n.userId !== userId);
    db.shareLinks = db.shareLinks.filter((s) => s.userId !== userId);
    db.entitlements = db.entitlements.filter((e) => e.userId !== userId);
    // Instantâneos de voos sem nenhum acompanhante deixam de ser necessários.
    const stillTracked = new Set(db.trackedFlights.map((t) => t.occurrenceId));
    const inTrips = new Set(db.tripSegments.map((s) => s.occurrenceId));
    db.flightOccurrences = db.flightOccurrences.filter(
      (o) => stillTracked.has(o.id) || inTrips.has(o.id),
    );
    db.flightEvents = db.flightEvents.filter(
      (e) => stillTracked.has(e.occurrenceId) || inTrips.has(e.occurrenceId),
    );
  });
  await deleteUserUploads(userId);
}
