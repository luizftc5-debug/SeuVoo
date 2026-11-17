import { describe, expect, it } from "vitest";
import {
  addDays,
  countdownLabel,
  daysBetween,
  eachDay,
  formatDuration,
  formatIsoDate,
  formatTime,
  isIsoDate,
  localDate,
  tripPhase,
  utcOffsetLabel,
  zonedToUtc,
} from "@/lib/dates";

describe("fusos horários", () => {
  it("converte horário local de São Paulo para UTC (UTC−3, sem horário de verão)", () => {
    expect(zonedToUtc("2026-11-17", "09:00", "America/Sao_Paulo")).toBe("2026-11-17T12:00:00.000Z");
  });
  it("converte horário de Lisboa no inverno (UTC+0) e no verão (UTC+1)", () => {
    expect(zonedToUtc("2026-12-01", "11:40", "Europe/Lisbon")).toBe("2026-12-01T11:40:00.000Z");
    expect(zonedToUtc("2026-07-01", "11:40", "Europe/Lisbon")).toBe("2026-07-01T10:40:00.000Z");
  });
  it("exibe o instante no fuso do aeroporto, em 24 h", () => {
    const iso = "2026-11-18T01:15:00.000Z";
    expect(formatTime(iso, "America/Sao_Paulo")).toBe("22:15");
    expect(localDate(iso, "America/Sao_Paulo")).toBe("2026-11-17");
    expect(localDate(iso, "Europe/Lisbon")).toBe("2026-11-18");
  });
  it("rotula o deslocamento UTC", () => {
    expect(utcOffsetLabel("2026-11-17T12:00:00Z", "America/Sao_Paulo")).toBe("UTC−3");
    expect(utcOffsetLabel("2026-07-01T12:00:00Z", "Europe/Lisbon")).toBe("UTC+1");
  });
});

describe("datas sem fuso", () => {
  it("valida AAAA-MM-DD reais", () => {
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("17/11/2026")).toBe(false);
  });
  it("formata em DD/MM/AAAA", () => expect(formatIsoDate("2026-11-07")).toBe("07/11/2026"));
  it("calcula dias e intervalos", () => {
    expect(daysBetween("2026-11-17", "2026-12-01")).toBe(14);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(eachDay("2026-11-30", "2026-12-02")).toEqual(["2026-11-30", "2026-12-01", "2026-12-02"]);
    expect(eachDay("2026-12-02", "2026-11-30")).toEqual([]);
  });
  it("contagem regressiva e fase da viagem", () => {
    expect(countdownLabel("2026-11-20", "2026-11-17")).toBe("Faltam 3 dias");
    expect(countdownLabel("2026-11-18", "2026-11-17")).toBe("Começa amanhã");
    expect(countdownLabel("2026-11-17", "2026-11-17")).toBe("Começa hoje");
    expect(tripPhase("2026-11-20", "2026-11-25", "2026-11-17")).toBe("upcoming");
    expect(tripPhase("2026-11-10", "2026-11-17", "2026-11-17")).toBe("ongoing");
    expect(tripPhase("2026-11-01", "2026-11-05", "2026-11-17")).toBe("past");
  });
  it("formata durações", () => {
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(125)).toBe("2 h 05 min");
  });
});
