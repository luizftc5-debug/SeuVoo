import { describe, expect, it } from "vitest";
import { budgetBalance, formatMoney, parseMoneyToCents, summarizeExpenses } from "@/lib/currency";

describe("valores monetários", () => {
  it.each([
    ["1.234,56", 123456],
    ["1234,5", 123450],
    ["R$ 12.000", 1200000],
    ["12.50", 1250],
    ["1,234.56", 123456],
    ["0", 0],
  ])("interpreta %s", (input, cents) => expect(parseMoneyToCents(input)).toBe(cents));
  it("rejeita entradas inválidas", () => {
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNull();
    expect(parseMoneyToCents("-10")).toBeNull();
  });
  it("formata em pt-BR", () => expect(formatMoney(123456).replace(/\s/g, " ")).toBe("R$ 1.234,56"));
});

describe("resumo do orçamento", () => {
  const items = [
    { category: "food", currency: "BRL", plannedCents: 10000, actualCents: 8000 },
    { category: "food", currency: "BRL", plannedCents: null, actualCents: 2500 },
    { category: "lodging", currency: "BRL", plannedCents: 50000, actualCents: 50000 },
    { category: "tours", currency: "EUR", plannedCents: 3000, actualCents: null },
  ];
  it("agrupa por moeda sem somar moedas diferentes", () => {
    const s = summarizeExpenses(items);
    const brl = s.find((x) => x.currency === "BRL")!;
    expect(brl.plannedCents).toBe(60000);
    expect(brl.actualCents).toBe(60500);
    expect(brl.byCategory.find((c) => c.category === "food")).toEqual({
      category: "food",
      plannedCents: 10000,
      actualCents: 10500,
    });
    expect(s.find((x) => x.currency === "EUR")!.plannedCents).toBe(3000);
  });
  it("calcula saldo, inclusive negativo", () => {
    expect(budgetBalance(100000, 60500)).toBe(39500);
    expect(budgetBalance(50000, 60500)).toBe(-10500);
    expect(budgetBalance(null, 1)).toBeNull();
  });
});
