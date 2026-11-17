import type { Metadata } from "next";
import Link from "next/link";
import { BottomTabs, SideNav } from "@/components/layout/app-nav";
import { Logo } from "@/components/ui/logo";
import { DemoTag } from "@/components/ui/primitives";
import { IconSettings } from "@/components/ui/icons";
import { signOutAction } from "@/app/actions/auth";
import { requireUser } from "@/server/auth";
import { isDemoMode } from "@/server/services/flights";
import { unreadCount } from "@/server/services/notifications";
import { ThemeSync } from "@/components/layout/theme-sync";

export const metadata: Metadata = {
  title: { default: "Minha área", template: "%s · SeuVoo" },
  robots: { index: false },
};

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const user = await requireUser("/app");
  const unread = await unreadCount(user.id);
  const demo = isDemoMode();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <ThemeSync theme={user.profile.preferences.theme} />
      <aside className="hidden border-r border-line md:flex md:h-dvh md:flex-col md:sticky md:top-0">
        <div className="px-5 py-5">
          <Link href="/" aria-label="SeuVoo — início" className="inline-block rounded-md">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3">
          <SideNav unread={unread} />
        </div>
        <div className="border-t border-line px-5 py-4">
          <p className="truncate text-sm font-medium text-ink">{user.profile.displayName}</p>
          <p className="truncate text-[12px] text-muted">{user.email}</p>
          {demo && <DemoTag className="mt-2" />}
          <form action={signOutAction} className="mt-3">
            <button className="text-[13px] text-muted hover:text-ink">Sair</button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-canvas/95 px-4 backdrop-blur-[2px] md:hidden">
          <Link href="/" aria-label="SeuVoo — início">
            <Logo />
          </Link>
          <Link
            href="/app/configuracoes"
            aria-label="Configurações"
            className="grid size-10 place-items-center rounded-md text-ink-2 hover:bg-subtle"
          >
            <IconSettings size={20} />
          </Link>
        </header>
        <main
          id="conteudo"
          className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 md:pb-16 md:pt-10 lg:px-10"
        >
          {children}
        </main>
      </div>
      <BottomTabs unread={unread} />
    </div>
  );
}
