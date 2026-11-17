import { describe, expect, it } from "vitest";
import { parseDesignator } from "@/lib/aviation/airlines";
import { findAirport, greatCircleKm } from "@/lib/aviation/airports";
import { dedupeEvents, diffSnapshots } from "@/lib/aviation/events";
import { occurrenceSlug, parseOccurrenceSlug } from "@/lib/aviation/ids";
import { deriveStatus, variance } from "@/lib/aviation/status";
import type { FlightOccurrence } from "@/lib/aviation/types";
import { buildDemoOccurrence, DEMO_FIXTURES } from "@/server/providers/demo";
import { normalizeAeroFlight } from "@/server/providers/aeroapi";

const NOW = new Date("2026-11-17T15:00:00Z");

describe("designadores", () => {
  it.each([
    ["la 3456", "LA3456"],
    ["G3-1234", "G31234"],
    ["TAM3456", "JJ3456"],
    ["AD0450", "AD450"],
    ["zz1002", "ZZ1002"],
  ])("normaliza %s → %s", (i, o) => expect(parseDesignator(i)?.designator).toBe(o));
  it("rejeita entradas inválidas", () => {
    expect(parseDesignator("XX")).toBeNull();
    expect(parseDesignator("1234")).toBeNull();
    expect(parseDesignator("LA12345")).toBeNull();
  });
});

describe("status", () => {
  const base = { departureGate: {}, departureRunway: {}, arrivalRunway: {}, arrivalGate: {} };
  it("não deduz decolagem pela passagem do horário", () => {
    expect(deriveStatus({ ...base, departureGate: { scheduled: "2020-01-01T10:00:00Z" } })).toBe(
      "scheduled",
    );
  });
  it("usa horários efetivos e flags", () => {
    expect(deriveStatus({ ...base, departureRunway: { actual: "2026-11-17T10:00:00Z" } })).toBe(
      "airborne",
    );
    expect(deriveStatus({ ...base, arrivalGate: { actual: "2026-11-17T10:00:00Z" } })).toBe(
      "arrived",
    );
    expect(deriveStatus({ ...base, cancelled: true, arrivalGate: { actual: "x" } })).toBe(
      "cancelled",
    );
  });
  it("marca atraso só com estimativa ≥ 15 min além do programado", () => {
    const d = (est: string) =>
      deriveStatus({
        ...base,
        departureGate: { scheduled: "2026-11-17T10:00:00Z", estimated: est },
      });
    expect(d("2026-11-17T10:10:00Z")).toBe("scheduled");
    expect(d("2026-11-17T10:20:00Z")).toBe("delayed");
  });
  it("calcula variação a partir do melhor horário conhecido", () => {
    expect(variance({ scheduled: "2026-11-17T10:00:00Z", estimated: "2026-11-17T10:50:00Z" })).toBe(
      50,
    );
    expect(variance({ scheduled: "2026-11-17T10:00:00Z" })).toBeNull();
  });
});

describe("provedor de demonstração", () => {
  const fx = (n: string) => DEMO_FIXTURES.find((f) => f.number === n)!;
  it("é determinístico e sinalizado como sintético", () => {
    const a = buildDemoOccurrence(fx("1002"), "2026-11-17", NOW);
    const b = buildDemoOccurrence(fx("1002"), "2026-11-17", NOW);
    expect(a).toEqual(b);
    expect(a.source.synthetic).toBe(true);
    expect(a.status).toBe("delayed");
    expect(a.departure.gateTimes.scheduled).toBe("2026-11-17T12:00:00.000Z");
  });
  it("datas futuras ficam apenas programadas", () => {
    expect(buildDemoOccurrence(fx("1001"), "2026-12-01", NOW).status).toBe("scheduled");
  });
  it("voo internacional chega no dia seguinte no fuso do destino", () => {
    const f = buildDemoOccurrence(fx("1004"), "2026-11-17", NOW);
    expect(f.arrival.gateTimes.scheduled).toBe("2026-11-18T11:40:00.000Z");
  });
  it("slug ida e volta", () => {
    const f = buildDemoOccurrence(fx("1002"), "2026-11-17", NOW);
    expect(parseOccurrenceSlug(occurrenceSlug(f.id))).toEqual({
      source: "demo",
      providerId: "ZZ1002-20261117",
    });
    expect(parseOccurrenceSlug("x.../../etc")).toBeNull();
  });
});

describe("adapter AeroAPI", () => {
  it("normaliza o formato do provedor para o contrato interno", () => {
    const f = normalizeAeroFlight(
      {
        fa_flight_id: "TAM3456-1763380800-schedule-0001",
        ident: "TAM3456",
        ident_iata: "LA3456",
        operator: "TAM",
        operator_iata: "JJ",
        flight_number: "3456",
        origin: {
          code: "SBGR",
          code_iata: "GRU",
          code_icao: "SBGR",
          timezone: "America/Sao_Paulo",
        },
        destination: {
          code: "SBRJ",
          code_iata: "SDU",
          code_icao: "SBRJ",
          timezone: "America/Sao_Paulo",
        },
        scheduled_out: "2026-11-17T12:00:00Z",
        estimated_out: "2026-11-17T12:30:00Z",
        actual_out: null,
        scheduled_in: "2026-11-17T13:05:00Z",
        gate_origin: "214",
        cancelled: false,
        diverted: false,
        status: "Scheduled / Delayed",
        aircraft_type: "A320",
      },
      "2026-11-17T11:00:00Z",
      false,
    );
    expect(f.id).toBe("aeroapi:TAM3456-1763380800-schedule-0001");
    expect(f.designator).toBe("LA3456");
    expect(f.operatingDate).toBe("2026-11-17");
    expect(f.status).toBe("delayed");
    expect(f.departure.gate).toBe("214");
    expect(f.arrival.gate).toBeUndefined();
    expect(f.departure.gateTimes.actual).toBeUndefined();
    expect(f.greatCircleKm).toBeGreaterThan(300);
  });
});

describe("motor de eventos", () => {
  const fx = DEMO_FIXTURES.find((f) => f.number === "1002")!;
  const base = buildDemoOccurrence(fx, "2026-11-17", NOW);
  const clone = (f: FlightOccurrence) => structuredClone(f);

  it("registra atraso no primeiro instantâneo", () => {
    const ev = diffSnapshots(null, base, "t");
    expect(ev.map((e) => e.type)).toEqual(["delay_detected"]);
  });
  it("detecta mudança de portão e horário", () => {
    const next = clone(base);
    next.departure.gate = "11";
    next.departure.gateTimes.estimated = "2026-11-17T13:10:00.000Z";
    const types = diffSnapshots(base, next)
      .map((e) => e.type)
      .sort();
    expect(types).toEqual(["departure_gate_changed", "departure_time_changed"]);
  });
  it("ignora variações menores que 5 minutos", () => {
    const next = clone(base);
    next.departure.gateTimes.estimated = new Date(
      new Date(base.departure.gateTimes.estimated!).getTime() + 3 * 60000,
    ).toISOString();
    expect(diffSnapshots(base, next)).toEqual([]);
  });
  it("não repete a mesma mudança (deduplicação)", () => {
    const next = clone(base);
    next.departure.gate = "11";
    const first = diffSnapshots(base, next);
    const again = diffSnapshots(base, next);
    expect(
      dedupeEvents(
        first.map((e) => e.dedupeKey),
        again,
      ),
    ).toEqual([]);
  });
  it("cancelamento gera evento específico", () => {
    const next = clone(base);
    next.status = "cancelled";
    expect(diffSnapshots(base, next).map((e) => e.type)).toContain("cancelled");
  });
});

describe("aeroportos", () => {
  it("encontra por IATA e ICAO", () => {
    expect(findAirport("gru")?.icao).toBe("SBGR");
    expect(findAirport("SBSV")?.iata).toBe("SSA");
  });
  it("distância ortodrômica GRU–LIS ≈ 7.950 km", () => {
    const km = greatCircleKm(findAirport("GRU")!, findAirport("LIS")!);
    expect(km).toBeGreaterThan(7850);
    expect(km).toBeLessThan(8050);
  });
});
