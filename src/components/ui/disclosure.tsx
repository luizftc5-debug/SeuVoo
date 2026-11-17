"use client";

import { useState } from "react";
import { IconChevronDown } from "./icons";

/** Painel expansível cujo estado aberto/fechado pertence ao usuário (não muda com novos dados). */
export function Disclosure({
  summary,
  defaultOpen = false,
  children,
}: {
  summary: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <details
      className="group rounded-lg border border-line bg-surface"
      open={open}
      onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-3.5 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
        {summary}
        <IconChevronDown
          size={16}
          className="text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="border-t border-line px-5 py-5">{children}</div>
    </details>
  );
}
