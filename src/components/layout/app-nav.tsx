"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconBell,
  IconGlobe,
  IconHome,
  IconPlane,
  IconSettings,
  IconSuitcase,
} from "@/components/ui/icons";
import { cn } from "@/lib/cn";

const items = [
  { href: "/app", label: "Visão geral", short: "Início", Icon: IconHome, exact: true },
  { href: "/app/voos", label: "Voos", short: "Voos", Icon: IconPlane },
  { href: "/app/viagens", label: "Viagens", short: "Viagens", Icon: IconSuitcase },
  { href: "/app/alertas", label: "Alertas", short: "Alertas", Icon: IconBell },
  { href: "/app/passaporte", label: "Meu Passaporte", short: "Passaporte", Icon: IconGlobe },
];

function useActive() {
  const pathname = usePathname();
  return (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function SideNav({ unread }: { unread: number }) {
  const isActive = useActive();
  return (
    <nav aria-label="Área pessoal" className="flex flex-col gap-0.5">
      {[
        ...items,
        {
          href: "/app/configuracoes",
          label: "Configurações",
          short: "Ajustes",
          Icon: IconSettings,
        },
      ].map((i) => {
        const active = isActive(i.href, "exact" in i ? i.exact : false);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
              active
                ? "bg-surface font-medium text-ink shadow-[inset_0_0_0_1px_var(--line)]"
                : "text-ink-2 hover:bg-subtle hover:text-ink",
            )}
          >
            <i.Icon size={17} className={active ? "text-ink" : "text-muted"} />
            <span className="flex-1">{i.label}</span>
            {i.href === "/app/alertas" && unread > 0 && (
              <span
                className="t-data rounded-sm bg-ink px-1.5 text-[11px] text-canvas"
                aria-label={`${unread} não lidos`}
              >
                {unread}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomTabs({ unread }: { unread: number }) {
  const isActive = useActive();
  return (
    <nav
      aria-label="Área pessoal"
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 backdrop-blur-[2px] md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map((i) => {
          const active = isActive(i.href, i.exact);
          return (
            <li key={i.href}>
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-1 pb-1 pt-2 text-[11px]",
                  active ? "text-ink" : "text-muted",
                )}
              >
                <i.Icon size={21} />
                {i.short}
                {i.href === "/app/alertas" && unread > 0 && (
                  <span
                    className="absolute right-[calc(50%-16px)] top-1.5 size-2 rounded-full bg-critical"
                    aria-label={`${unread} não lidos`}
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
