/**
 * Dinheiro é armazenado em centavos (inteiros) para evitar erro de ponto flutuante.
 * Não há conversão de câmbio: cada despesa mantém sua moeda e os totais
 * são agrupados por moeda. Conversão exigiria fonte e data de referência.
 */

export const CURRENCIES = ["BRL", "USD", "EUR", "ARS", "CLP", "GBP"] as const;
export type CurrencyCode = (typeof CURRENCIES)[number];

export function formatMoney(cents: number, currency: string = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(cents / 100);
}

/** Aceita "1.234,56", "1234,56", "1234.56", "R$ 1.234". Retorna centavos ou null. */
export function parseMoneyToCents(input: string): number | null {
  let s = input.trim().replace(/[^\d,.\-]/g, "");
  if (!s) return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, "");
  } else if (lastComma === -1 && lastDot !== -1) {
    // "1.234" (milhar pt-BR) vs "12.50" (decimal): 3 dígitos após o ponto => milhar.
    const after = s.length - lastDot - 1;
    if (after === 3 && (s.match(/\./g) ?? []).length >= 1) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export interface ExpenseLike {
  category: string;
  currency: string;
  plannedCents: number | null;
  actualCents: number | null;
}

export interface CurrencyTotals {
  currency: string;
  plannedCents: number;
  actualCents: number;
  byCategory: { category: string; plannedCents: number; actualCents: number }[];
}

/** Totais por moeda e categoria. */
export function summarizeExpenses(items: ExpenseLike[]): CurrencyTotals[] {
  const map = new Map<string, CurrencyTotals>();
  for (const it of items) {
    let t = map.get(it.currency);
    if (!t) {
      t = { currency: it.currency, plannedCents: 0, actualCents: 0, byCategory: [] };
      map.set(it.currency, t);
    }
    t.plannedCents += it.plannedCents ?? 0;
    t.actualCents += it.actualCents ?? 0;
    let c = t.byCategory.find((x) => x.category === it.category);
    if (!c) {
      c = { category: it.category, plannedCents: 0, actualCents: 0 };
      t.byCategory.push(c);
    }
    c.plannedCents += it.plannedCents ?? 0;
    c.actualCents += it.actualCents ?? 0;
  }
  for (const t of map.values())
    t.byCategory.sort((a, b) => b.actualCents + b.plannedCents - (a.actualCents + a.plannedCents));
  return [...map.values()];
}

/** Saldo do orçamento (pode ser negativo). */
export function budgetBalance(budgetCents: number | null, spentCents: number): number | null {
  if (budgetCents == null) return null;
  return budgetCents - spentCents;
}
