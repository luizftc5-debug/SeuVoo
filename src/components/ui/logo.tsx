import { cn } from "@/lib/cn";

/**
 * Marca SeuVoo: um arco ascendente sobre uma linha de horizonte —
 * decolagem lida como trajetória, não como avião ilustrado.
 */
export function LogoMark({ className, size = 22 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="6" fill="currentColor" />
      <path
        d="M5.5 16.5h13"
        stroke="var(--canvas)"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M6 15c3.2-.4 7.6-2.6 11.8-8.3"
        stroke="var(--canvas)"
        strokeWidth="1.9"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="17.8" cy="6.7" r="1.7" fill="var(--canvas)" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-ink", className)}>
      <LogoMark />
      <span className="text-[17px] font-semibold tracking-[-0.02em]">SeuVoo</span>
    </span>
  );
}
