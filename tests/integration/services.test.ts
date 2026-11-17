import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { authenticate, registerUser } from "@/server/auth";
import { read, resetStoreCache } from "@/server/db/store";
import { buildDemoOccurrence, DEMO_FIXTURES } from "@/server/providers/demo";
import { deleteAccount, exportUserData } from "@/server/services/account";
import { listNotifications } from "@/server/services/notifications";
import { getPassport } from "@/server/services/passport";
import { createShareLink, resolveShare, revokeShareLink } from "@/server/services/sharing";
import { applySnapshot, listTracked, trackFlight, untrackFlight } from "@/server/services/tracking";
import * as trips from "@/server/services/trips";
import { write } from "@/server/db/store";

const dir = mkdtempSync(path.join(os.tmpdir(), "seuvoo-test-"));
process.env.SEUVOO_DATA_DIR = dir;
afterAll(() => rmSync(dir, { recursive: true, force: true }));

let n = 0;
async function newUser() {
  const r = await registerUser({
    email: `u${++n}@exemplo.com`,
    password: "senhaforte123",
    displayName: "Teste",
  });
  if (!r.ok) throw new Error(r.error);
  return r.user.id;
}
const NOW = new Date("2026-11-17T15:00:00Z");
const occ = (num: string, date = "2026-11-17") =>
  buildDemoOccurrence(
    DEMO_FIXTURES.find((f) => f.number === num)!,
    date,
    NOW,
  );
const tripInput: trips.TripInput = {
  title: "Lisboa",
  destination: "Lisboa",
  country: "Portugal",
  startDate: "2026-12-10",
  endDate: "2026-12-14",
  participants: [],
  budgetCents: 1_000_000,
  currency: "BRL",
};

beforeEach(() => resetStoreCache());

describe("autenticação local", () => {
  it("cadastra, recusa e-mail duplicado e autentica", async () => {
    await registerUser({ email: "Ana@Exemplo.com", password: "senhaforte123", displayName: "Ana" });
    const dup = await registerUser({
      email: "ana@exemplo.com",
      password: "outrasenha123",
      displayName: "Ana",
    });
    expect(dup.ok).toBe(false);
    expect(await authenticate("ana@exemplo.com", "senhaforte123")).not.toBeNull();
    expect(await authenticate("ana@exemplo.com", "errada")).toBeNull();
    expect(await authenticate("ninguem@exemplo.com", "senhaforte123")).toBeNull();
    const stored = await read(
      (db) => db.users.find((u) => u.email === "ana@exemplo.com")!.passwordHash,
    );
    expect(stored).not.toContain("senhaforte123");
  });
});

describe("viagens: persistência e permissões", () => {
  it("cria viagem e persiste roteiro, despesas e bagagem", async () => {
    const u = await newUser();
    const t = await trips.createTrip(u, tripInput);
    const a = await trips.addItineraryItem(u, t.id, {
      date: "2026-12-11",
      title: "Jerónimos",
      category: "tour",
    });
    const b = await trips.addItineraryItem(u, t.id, {
      date: "2026-12-11",
      title: "Almoço",
      category: "food",
    });
    await trips.moveItineraryItem(u, t.id, b.id, "up");
    await trips.addExpense(u, t.id, {
      category: "food",
      description: "Jantar",
      plannedCents: 20000,
      actualCents: 18000,
      currency: "BRL",
    });
    const p = await trips.addPackingItem(u, t.id, "Passaporte", "documents");
    await trips.togglePackingItem(u, t.id, p.id);
    await trips.applyPackingTemplate(u, t.id, "internacional"); // não duplica "Passaporte"

    resetStoreCache(); // força releitura do arquivo
    const ws = await trips.getTripWorkspace(u, t.id);
    expect(ws?.itinerary.map((i) => i.title)).toEqual(["Almoço", "Jerónimos"]);
    expect(ws?.expenses[0].actualCents).toBe(18000);
    expect(ws?.packing.filter((x) => x.label === "Passaporte")).toHaveLength(1);
    expect(ws?.packing.find((x) => x.id === p.id)?.completed).toBe(true);
    expect(a.id).toBeTruthy();
  });

  it("impede acesso a viagens de outra pessoa", async () => {
    const owner = await newUser();
    const other = await newUser();
    const t = await trips.createTrip(owner, tripInput);
    expect(await trips.getTripWorkspace(other, t.id)).toBeNull();
    await expect(
      trips.addItineraryItem(other, t.id, { date: "2026-12-11", title: "x", category: "tour" }),
    ).rejects.toThrow(/não encontrad/);
    await expect(trips.deleteTrip(other, t.id)).rejects.toThrow();
    expect(await trips.getTripWorkspace(owner, t.id)).not.toBeNull();
  });

  it("exclui viagem em cascata", async () => {
    const u = await newUser();
    const t = await trips.createTrip(u, tripInput);
    await trips.addExpense(u, t.id, {
      category: "other",
      description: "x",
      plannedCents: 1,
      actualCents: null,
      currency: "BRL",
    });
    await trips.deleteTrip(u, t.id);
    expect(await read((db) => db.expenses.filter((e) => e.tripId === t.id).length)).toBe(0);
  });
});

describe("acompanhamento de voos e alertas", () => {
  it("acompanha, gera alerta inicial uma vez e vincula à viagem", async () => {
    const u = await newUser();
    const f = occ("1002");
    await trackFlight(u, f);
    await trackFlight(u, f); // idempotente
    expect(await listTracked(u)).toHaveLength(1);
    let alerts = await listNotifications(u);
    expect(alerts.map((a) => a.title)).toEqual([
      "ZZ1002 · Partida prevista após o horário programado",
    ]);

    // nova consulta com mudança de portão → 1 novo alerta; repetir não duplica
    const changed = structuredClone(f);
    changed.departure.gate = "11";
    await write((db) => void applySnapshot(db, changed));
    await write((db) => void applySnapshot(db, changed));
    alerts = await listNotifications(u);
    expect(alerts).toHaveLength(2);

    const t = await trips.createTrip(u, tripInput);
    await trips.linkFlight(u, t.id, f.id);
    expect((await trips.getTripWorkspace(u, t.id))?.flights[0].flight.departure.gate).toBe("11");
  });

  it("não deixa vincular voo que o usuário não acompanha", async () => {
    const u = await newUser();
    const t = await trips.createTrip(u, tripInput);
    await expect(trips.linkFlight(u, t.id, occ("1003").id)).rejects.toThrow();
  });

  it("deixar de acompanhar só remove o próprio registro", async () => {
    const a = await newUser();
    const b = await newUser();
    await trackFlight(a, occ("1001"));
    const [tb] = [await trackFlight(b, occ("1001"))];
    expect(await untrackFlight(a, tb.id)).toBe(false);
    expect(await untrackFlight(b, tb.id)).toBe(true);
  });
});

describe("compartilhamento", () => {
  it("cria, resolve sem dados pessoais e revoga", async () => {
    const u = await newUser();
    const f = occ("1003");
    await trackFlight(u, f);
    const { token, link } = await createShareLink(u, f.id, {
      expiresInHours: 48,
      showGates: false,
    });
    const v = await resolveShare(token);
    expect(v.state).toBe("ok");
    if (v.state === "ok") {
      expect(v.flight.designator).toBe("ZZ1003");
      expect(v.showGates).toBe(false);
      expect(JSON.stringify(v)).not.toContain("@exemplo.com");
    }
    const stored = await read((db) => db.shareLinks.find((s) => s.id === link.id)!);
    expect(stored.tokenHash).not.toBe(token);
    await revokeShareLink(u, link.id);
    expect((await resolveShare(token)).state).toBe("invalid");
    expect((await resolveShare("token-invalido-qualquer-123456")).state).toBe("invalid");
  });

  it("exige acompanhar o voo para compartilhar", async () => {
    const u = await newUser();
    await expect(
      createShareLink(u, occ("1004").id, { expiresInHours: 1, showGates: true }),
    ).rejects.toThrow();
  });
});

describe("Meu Passaporte e LGPD", () => {
  it("conta apenas voos com chegada confirmada", async () => {
    const u = await newUser();
    await trackFlight(u, occ("1001", "2026-11-10")); // passado → chegou
    await trackFlight(u, occ("1005", "2026-11-10")); // cancelado
    await trackFlight(u, occ("1004", "2026-12-01")); // futuro
    const p = await getPassport(u);
    expect(p.flights).toBe(1);
    expect(p.airports).toEqual(["GIG", "GRU"]);
    expect(p.countries).toEqual(["Brasil"]);
    expect(p.distanceKm).toBeGreaterThan(300);
  });

  it("exporta e exclui todos os dados da conta", async () => {
    const u = await newUser();
    const t = await trips.createTrip(u, tripInput);
    await trackFlight(u, occ("1002"));
    const data = await exportUserData(u);
    expect(data.trips).toHaveLength(1);
    expect(JSON.stringify(data)).not.toContain("scrypt$");
    await deleteAccount(u);
    const left = await read((db) => ({
      users: db.users.filter((x) => x.id === u).length,
      trips: db.trips.filter((x) => x.id === t.id).length,
      tracked: db.trackedFlights.filter((x) => x.userId === u).length,
      notes: db.notifications.filter((x) => x.userId === u).length,
    }));
    expect(left).toEqual({ users: 0, trips: 0, tracked: 0, notes: 0 });
  });
});
