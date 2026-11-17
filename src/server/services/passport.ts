import "server-only";
import { computePassport, type PassportStats } from "@/lib/passport";
import { DEFAULT_TZ, todayIn } from "@/lib/dates";
import { read } from "../db/store";

export async function getPassport(
  userId: string,
  year?: number,
): Promise<PassportStats & { years: number[] }> {
  const data = await read((db) => {
    const ids = new Set(
      db.trackedFlights.filter((t) => t.userId === userId).map((t) => t.occurrenceId),
    );
    return {
      flights: db.flightOccurrences.filter((o) => ids.has(o.id)).map((o) => o.snapshot),
      trips: db.trips.filter((t) => t.userId === userId),
    };
  });
  const today = todayIn(DEFAULT_TZ);
  const all = computePassport(data.flights, data.trips, today);
  const years = all.tripsByYear.map((y) => y.year);
  const stats = year
    ? computePassport(data.flights, data.trips, today, {
        from: `${year}-01-01`,
        to: `${year}-12-31`,
      })
    : all;
  return { ...stats, years };
}
