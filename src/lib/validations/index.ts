import { z } from "zod";
import { parseMoneyToCents } from "@/lib/currency";
import { isIsoDate } from "@/lib/dates";
import {
  DOCUMENT_CATEGORIES,
  EXPENSE_CATEGORIES,
  ITINERARY_CATEGORIES,
  PACKING_CATEGORIES,
} from "@/server/db/schema";

export type FormState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Eco dos valores enviados para repreencher o formulário após erro. */
  values?: Record<string, string>;
};

export function fieldErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const i of err.issues) {
    const k = String(i.path[0] ?? "_");
    if (!out[k]) out[k] = i.message;
  }
  return out;
}

export function formValues(fd: FormData, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of keys) {
    const v = fd.get(k);
    if (typeof v === "string") o[k] = v;
  }
  return o;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Use no máximo ${max} caracteres.`)
    .optional()
    .transform((v) => (v ? v : undefined));

const isoDate = z.string().refine(isIsoDate, "Informe uma data válida.");
const optionalIsoDate = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine((v) => v === undefined || isIsoDate(v), "Informe uma data válida.");
const optionalTime = z
  .string()
  .optional()
  .transform((v) => (v ? v : undefined))
  .refine(
    (v) => v === undefined || /^([01]\d|2[0-3]):[0-5]\d$/.test(v),
    "Use o formato 24 h, como 14:30.",
  );

const money = z
  .string()
  .optional()
  .transform((v, ctx) => {
    if (!v || !v.trim()) return null;
    const c = parseMoneyToCents(v);
    if (c == null) {
      ctx.addIssue({ code: "custom", message: "Valor inválido. Use, por exemplo, 1.250,00." });
      return z.NEVER;
    }
    if (c > 100_000_000_00) {
      ctx.addIssue({ code: "custom", message: "Valor alto demais." });
      return z.NEVER;
    }
    return c;
  });

const currency = z.enum(["BRL", "USD", "EUR", "ARS", "CLP", "GBP"], {
  message: "Moeda não suportada.",
});

export const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Como podemos te chamar? Use ao menos 2 letras.").max(60),
  email: z.email("Informe um e-mail válido.").max(200),
  password: z
    .string()
    .min(10, "A senha precisa ter ao menos 10 caracteres.")
    .max(200)
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), "Use letras e números na senha."),
  consent: z.literal("on", { message: "É preciso aceitar os termos e a política de privacidade." }),
});

export const signInSchema = z.object({
  email: z.email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export const tripSchema = z
  .object({
    title: z.string().trim().min(2, "Dê um nome à viagem.").max(80),
    destination: z.string().trim().min(2, "Informe o destino principal.").max(80),
    country: optionalText(60),
    startDate: isoDate,
    endDate: isoDate,
    description: optionalText(500),
    coverUrl: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine(
        (v) => v === undefined || /^https:\/\/[^\s]+$/.test(v),
        "Use um endereço https:// de imagem.",
      ),
    participants: z
      .string()
      .optional()
      .transform((v) =>
        (v ?? "")
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean)
          .slice(0, 20),
      ),
    budget: money,
    currency,
  })
  .refine((v) => v.endDate >= v.startDate, {
    message: "A volta precisa ser no mesmo dia ou depois da ida.",
    path: ["endDate"],
  })
  .refine((v) => v.endDate <= v.startDate.replace(/^\d{4}/, (y) => String(Number(y) + 1)), {
    message: "Viagens de até um ano.",
    path: ["endDate"],
  });

export const itinerarySchema = z
  .object({
    date: isoDate,
    startTime: optionalTime,
    endTime: optionalTime,
    title: z.string().trim().min(1, "Dê um título à atividade.").max(120),
    category: z.enum(
      Object.keys(ITINERARY_CATEGORIES) as [
        keyof typeof ITINERARY_CATEGORIES,
        ...(keyof typeof ITINERARY_CATEGORIES)[],
      ],
    ),
    description: optionalText(500),
    location: optionalText(160),
  })
  .refine((v) => !v.startTime || !v.endTime || v.endTime >= v.startTime, {
    message: "O término precisa ser depois do início.",
    path: ["endTime"],
  });

export const expenseSchema = z
  .object({
    category: z.enum(
      Object.keys(EXPENSE_CATEGORIES) as [
        keyof typeof EXPENSE_CATEGORIES,
        ...(keyof typeof EXPENSE_CATEGORIES)[],
      ],
    ),
    description: z.string().trim().min(1, "Descreva a despesa.").max(120),
    planned: money,
    actual: money,
    currency,
    date: optionalIsoDate,
  })
  .refine((v) => v.planned != null || v.actual != null, {
    message: "Informe o valor previsto, o gasto, ou ambos.",
    path: ["planned"],
  });

export const packingSchema = z.object({
  label: z.string().trim().min(1, "Escreva o item.").max(100),
  category: z.enum(
    Object.keys(PACKING_CATEGORIES) as [
      keyof typeof PACKING_CATEGORIES,
      ...(keyof typeof PACKING_CATEGORIES)[],
    ],
  ),
});

export const documentSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome ao documento.").max(120),
  category: z.enum(
    Object.keys(DOCUMENT_CATEGORIES) as [
      keyof typeof DOCUMENT_CATEGORIES,
      ...(keyof typeof DOCUMENT_CATEGORIES)[],
    ],
  ),
  expiresOn: optionalIsoDate,
  notes: optionalText(500),
});

export const preferencesSchema = z.object({
  displayName: z.string().trim().min(2, "Use ao menos 2 letras.").max(60),
  theme: z.enum(["system", "light", "dark"]),
  emailAlerts: z
    .string()
    .optional()
    .transform((v) => v === "on"),
  homeAirport: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .transform((v) => (v ? v : undefined))
    .refine((v) => v === undefined || /^[A-Z]{3}$/.test(v), "Use o código IATA de 3 letras."),
});
