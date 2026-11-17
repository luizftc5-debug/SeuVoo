import Link from "next/link";
import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="px-5 py-5 sm:px-8">
        <Link href="/" aria-label="SeuVoo — início" className="inline-block rounded-md">
          <Logo />
        </Link>
      </header>
      <main
        id="conteudo"
        className="flex flex-1 items-start justify-center px-5 pb-16 pt-6 sm:pt-16"
      >
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}
