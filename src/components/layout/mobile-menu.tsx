"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { IconMenu, IconX } from "@/components/ui/icons";
import { buttonClass } from "@/components/ui/primitives";

export function MobileMenu({
  items,
  signedIn,
}: {
  items: { href: string; label: string }[];
  signedIn: boolean;
}) {
  const pathname = usePathname();
  // O menu fica aberto apenas na rota em que foi aberto: navegar fecha.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (v: boolean | ((o: boolean) => boolean)) =>
    setOpenAt((typeof v === "function" ? v(open) : v) ? pathname : null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="ml-auto md:hidden">
      <button
        type="button"
        className="grid size-10 place-items-center rounded-md text-ink hover:bg-subtle"
        aria-expanded={open}
        aria-controls="menu-movel"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <IconX size={20} /> : <IconMenu size={20} />}
      </button>
      {open && (
        <div
          id="menu-movel"
          className="animate-enter fixed inset-x-0 top-16 z-40 border-b border-line bg-canvas px-4 pb-6 pt-2 shadow-[0_12px_24px_-16px_rgb(0_0_0/0.25)]"
        >
          <nav aria-label="Menu" className="flex flex-col">
            {items.map((i) => (
              <Link
                key={i.href}
                href={i.href}
                className="border-b border-line py-3.5 text-[17px] text-ink"
              >
                {i.label}
              </Link>
            ))}
          </nav>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {signedIn ? (
              <Link href="/app" className={buttonClass("primary", "lg", "col-span-2")}>
                Minha área
              </Link>
            ) : (
              <>
                <Link href="/entrar" className={buttonClass("secondary", "lg")}>
                  Entrar
                </Link>
                <Link href="/cadastro" className={buttonClass("primary", "lg")}>
                  Criar conta
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
