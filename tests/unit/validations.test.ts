import { describe, expect, it } from "vitest";
import { expenseSchema, itinerarySchema, signUpSchema, tripSchema } from "@/lib/validations";

describe("validações", () => {
  const trip = {
    title: "Lisboa",
    destination: "Lisboa",
    startDate: "2026-12-10",
    endDate: "2026-12-20",
    currency: "BRL",
    budget: "12.000,00",
  };
  it("aceita viagem válida e converte orçamento", () => {
    const r = tripSchema.safeParse(trip);
    expect(r.success && r.data.budget).toBe(1200000);
  });
  it("recusa volta antes da ida", () => {
    const r = tripSchema.safeParse({ ...trip, endDate: "2026-12-01" });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].path).toEqual(["endDate"]);
  });
  it("recusa capa que não seja https", () => {
    expect(tripSchema.safeParse({ ...trip, coverUrl: "javascript:alert(1)" }).success).toBe(false);
  });
  it("valida horários do roteiro", () => {
    expect(
      itinerarySchema.safeParse({
        date: "2026-12-11",
        title: "Museu",
        category: "tour",
        startTime: "14:00",
        endTime: "13:00",
      }).success,
    ).toBe(false);
    expect(
      itinerarySchema.safeParse({
        date: "2026-12-11",
        title: "Museu",
        category: "tour",
        startTime: "25:00",
      }).success,
    ).toBe(false);
    expect(
      itinerarySchema.safeParse({
        date: "2026-12-11",
        title: "Museu",
        category: "tour",
        startTime: "09:30",
      }).success,
    ).toBe(true);
  });
  it("despesa exige ao menos um valor", () => {
    expect(
      expenseSchema.safeParse({ category: "food", description: "Jantar", currency: "BRL" }).success,
    ).toBe(false);
    expect(
      expenseSchema.safeParse({
        category: "food",
        description: "Jantar",
        currency: "BRL",
        actual: "120,50",
      }).success,
    ).toBe(true);
  });
  it("cadastro exige consentimento e senha forte", () => {
    const ok = {
      displayName: "Ana",
      email: "ana@exemplo.com",
      password: "senhaforte123",
      consent: "on",
    };
    expect(signUpSchema.safeParse(ok).success).toBe(true);
    expect(signUpSchema.safeParse({ ...ok, consent: undefined }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...ok, password: "curta1" }).success).toBe(false);
  });
});
