"use client";

import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { AIRLINES } from "@/lib/aviation/airlines";
import { AIRPORTS } from "@/lib/aviation/airports";
import { parseDesignator } from "@/lib/aviation/airlines";
import { cn } from "@/lib/cn";
import { IconSearch, IconX } from "@/components/ui/icons";
import { Button, inputClass } from "@/components/ui/primitives";

const RECENT_KEY = "sv-recent-searches";
type Recent = { designator: string; date: string };

const RECENT_EVENT = "sv-recent-change";

function readRecentRaw(): string {
  try {
    return localStorage.getItem(RECENT_KEY) ?? "[]";
  } catch {
    return "[]";
  }
}

function parseRecent(raw: string): Recent[] {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.slice(0, 5) : [];
  } catch {
    return [];
  }
}

function readRecent(): Recent[] {
  return parseRecent(readRecentRaw());
}

function subscribeRecent(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(RECENT_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(RECENT_EVENT, cb);
  };
}

function saveRecent(r: Recent) {
  try {
    const list = [
      r,
      ...readRecent().filter((x) => !(x.designator === r.designator && x.date === r.date)),
    ].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(RECENT_EVENT));
  } catch {
    /* armazenamento indisponível: segue sem histórico */
  }
}

/**
 * Busca de voos: por número (padrão) ou por rota.
 * Valida no cliente para resposta imediata; o servidor valida de novo.
 */
export function FlightSearch({
  defaultDesignator = "",
  defaultDate,
  defaultMode = "number",
  defaultOrigin = "",
  defaultDestination = "",
  today,
  variant = "hero",
}: {
  defaultDesignator?: string;
  defaultDate?: string;
  defaultMode?: "number" | "route";
  defaultOrigin?: string;
  defaultDestination?: string;
  /** Data de hoje (America/Sao_Paulo) calculada no servidor. */
  today: string;
  variant?: "hero" | "compact";
}) {
  const router = useRouter();
  const id = useId();
  const [mode, setMode] = useState<"number" | "route">(defaultMode);
  const [designator, setDesignator] = useState(defaultDesignator);
  const [origin, setOrigin] = useState(defaultOrigin);
  const [destination, setDestination] = useState(defaultDestination);
  const [date, setDate] = useState(defaultDate ?? today);
  const [error, setError] = useState<string | null>(null);
  const recentRaw = useSyncExternalStore(subscribeRecent, readRecentRaw, () => "[]");
  const recent = useMemo(() => parseRecent(recentRaw), [recentRaw]);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return setError("Escolha a data do voo.");
    if (mode === "number") {
      const p = parseDesignator(designator);
      if (!p)
        return setError("Use o código da companhia e o número, por exemplo LA3456 ou G31234.");
      saveRecent({ designator: p.designator, date });
      startTransition(() => router.push(`/voos?numero=${p.designator}&data=${date}`));
    } else {
      const o = origin.trim().toUpperCase();
      const d = destination.trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(o) || !/^[A-Z]{3}$/.test(d))
        return setError("Informe origem e destino pelo código IATA de 3 letras, como GRU e SDU.");
      if (o === d) return setError("Origem e destino precisam ser diferentes.");
      startTransition(() => router.push(`/voos?origem=${o}&destino=${d}&data=${date}`));
    }
  }

  const hero = variant === "hero";
  const errId = `${id}-err`;

  return (
    <div
      className={cn(
        hero &&
          "rounded-lg border border-line bg-surface p-2 shadow-[0_1px_0_rgb(0_0_0/0.02),0_12px_32px_-20px_rgb(21_44_61/0.35)]",
      )}
    >
      <div
        className={cn("flex gap-1 text-[13px]", hero ? "px-2 pb-2 pt-1" : "mb-3")}
        role="tablist"
        aria-label="Tipo de busca"
      >
        {(["number", "route"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m);
              setError(null);
            }}
            className={cn(
              "rounded-md px-2.5 py-1.5 font-medium transition-colors",
              mode === m ? "bg-subtle text-ink" : "text-muted hover:text-ink",
            )}
          >
            {m === "number" ? "Número do voo" : "Origem e destino"}
          </button>
        ))}
      </div>
      <form onSubmit={submit} noValidate aria-describedby={error ? errId : undefined}>
        <div
          className={cn(
            "grid gap-2",
            mode === "number" ? "sm:grid-cols-[1.4fr_1fr_auto]" : "sm:grid-cols-[1fr_1fr_1fr_auto]",
          )}
        >
          {mode === "number" ? (
            <div>
              <label htmlFor={`${id}-num`} className="sr-only">
                Número do voo
              </label>
              <input
                id={`${id}-num`}
                name="numero"
                value={designator}
                onChange={(e) => setDesignator(e.target.value)}
                placeholder="Número do voo, ex. LA3456"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                list={`${id}-airlines`}
                inputMode="text"
                aria-invalid={!!error}
                className={cn(
                  inputClass,
                  "t-data h-12 uppercase placeholder:normal-case placeholder:font-sans",
                )}
              />
              <datalist id={`${id}-airlines`}>
                {AIRLINES.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.name}
                  </option>
                ))}
              </datalist>
            </div>
          ) : (
            <>
              {[
                { v: origin, set: setOrigin, label: "Origem", ph: "Origem (GRU)", key: "o" },
                {
                  v: destination,
                  set: setDestination,
                  label: "Destino",
                  ph: "Destino (SDU)",
                  key: "d",
                },
              ].map((f) => (
                <div key={f.key}>
                  <label htmlFor={`${id}-${f.key}`} className="sr-only">
                    {f.label}
                  </label>
                  <input
                    id={`${id}-${f.key}`}
                    value={f.v}
                    onChange={(e) => f.set(e.target.value)}
                    placeholder={f.ph}
                    maxLength={3}
                    autoComplete="off"
                    autoCapitalize="characters"
                    list={`${id}-airports`}
                    aria-invalid={!!error}
                    className={cn(
                      inputClass,
                      "t-data h-12 uppercase placeholder:normal-case placeholder:font-sans",
                    )}
                  />
                </div>
              ))}
              <datalist id={`${id}-airports`}>
                {AIRPORTS.map((a) => (
                  <option key={a.iata} value={a.iata}>
                    {a.city} — {a.name}
                  </option>
                ))}
              </datalist>
            </>
          )}
          <div>
            <label htmlFor={`${id}-date`} className="sr-only">
              Data do voo
            </label>
            <input
              id={`${id}-date`}
              type="date"
              name="data"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(inputClass, "t-data h-12")}
            />
          </div>
          <Button type="submit" size="lg" disabled={pending} aria-busy={pending} className="h-12">
            <IconSearch size={17} />
            {pending ? "Buscando…" : "Buscar"}
          </Button>
        </div>
        {error && (
          <p id={errId} role="alert" className="mt-2 px-1 text-[13px] text-critical">
            {error}
          </p>
        )}
      </form>
      {mode === "number" && recent.length > 0 && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-1.5 text-[13px]",
            hero ? "px-2 pb-1 pt-3" : "mt-3",
          )}
        >
          <span className="text-muted">Recentes</span>
          {recent.map((r) => (
            <button
              key={`${r.designator}-${r.date}`}
              type="button"
              onClick={() => {
                setDesignator(r.designator);
                setDate(r.date);
              }}
              className="t-data rounded-md border border-line px-2 py-0.5 text-ink-2 hover:border-line-strong hover:text-ink"
            >
              {r.designator} · {r.date.slice(8)}/{r.date.slice(5, 7)}
            </button>
          ))}
          <button
            type="button"
            aria-label="Limpar buscas recentes"
            onClick={() => {
              localStorage.removeItem(RECENT_KEY);
              window.dispatchEvent(new Event(RECENT_EVENT));
            }}
            className="grid size-6 place-items-center rounded text-muted hover:bg-subtle hover:text-ink"
          >
            <IconX size={14} />
          </button>
        </div>
      )}
    </div>
  );
}
