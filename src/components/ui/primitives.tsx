import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconAlert, IconInfo } from "./icons";

/* ---------- Botões ---------- */

type Variant = "primary" | "secondary" | "ghost" | "danger" | "inverse" | "inverseOutline";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 font-medium whitespace-nowrap transition-[background-color,border-color,color,box-shadow,transform] duration-150 active:translate-y-px disabled:opacity-50 disabled:pointer-events-none select-none";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-canvas hover:bg-ink-2",
  secondary: "bg-surface text-ink border border-line-strong hover:border-ink-2",
  ghost: "text-ink-2 hover:bg-subtle hover:text-ink",
  danger: "bg-surface text-critical border border-line-strong hover:border-critical",
  inverse: "bg-navy-ink text-navy hover:bg-white",
  inverseOutline: "border border-navy-ink/30 text-navy-ink hover:border-navy-ink/70",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-md",
  md: "h-10 px-4 text-sm rounded-md",
  lg: "h-12 px-5 text-[15px] rounded-md",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...rest} />;
}

/* ---------- Campos ---------- */

export const inputClass =
  "block w-full h-11 rounded-md border border-line-strong bg-surface px-3 text-[15px] text-ink placeholder:text-muted/80 transition-colors hover:border-ink-2/50 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 aria-[invalid=true]:border-critical";

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
  className,
  optional,
}: {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
  optional?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-medium text-ink-2">
        {label}
        {optional && (
          <>
            {" "}
            <span className="font-normal text-muted">(opcional)</span>
          </>
        )}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-[13px] text-critical" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(inputClass, className)} {...rest} />;
}

export function Select({ className, ...rest }: ComponentProps<"select">) {
  return <select className={cn(inputClass, "pr-8", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(inputClass, "h-auto min-h-24 py-2.5", className)} {...rest} />;
}

/* ---------- Estrutura ---------- */

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  as: Tag = "h2",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0 max-w-2xl">
        {eyebrow && <p className="t-label mb-2">{eyebrow}</p>}
        <Tag className={Tag === "h1" ? "t-title" : "t-heading"}>{title}</Tag>
        {description && <p className="mt-1.5 text-[15px] text-muted">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-dashed border-line-strong px-6 py-10 text-center",
        className,
      )}
    >
      <p className="font-medium text-ink">{title}</p>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function InlineNotification({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "critical" | "positive";
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: "border-line bg-subtle text-ink-2",
    warning: "border-warning-mark/40 bg-warning-soft text-ink",
    critical: "border-critical/40 bg-critical-soft text-ink",
    positive: "border-positive/30 bg-positive-soft text-ink",
  }[tone];
  const iconColor = {
    info: "text-muted",
    warning: "text-warning",
    critical: "text-critical",
    positive: "text-positive",
  }[tone];
  const Icon = tone === "info" || tone === "positive" ? IconInfo : IconAlert;
  return (
    <div
      className={cn("flex gap-3 rounded-md border px-3.5 py-3 text-sm", styles, className)}
      role={tone === "critical" ? "alert" : "status"}
    >
      <Icon size={17} className={cn("mt-px shrink-0", iconColor)} />
      <div className="min-w-0 space-y-0.5">
        {title && <p className="font-medium text-ink">{title}</p>}
        {children && (
          <div className="text-ink-2 [&_a]:underline [&_a]:underline-offset-2">{children}</div>
        )}
      </div>
    </div>
  );
}

/** Marcador de demonstração: aparece sempre que um dado é sintético. */
export function DemoTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border border-warning-mark/50 px-1.5 py-px text-[11px] font-medium uppercase tracking-wide text-warning",
        className,
      )}
      title="Dados sintéticos de demonstração — não representam voos reais."
    >
      Demonstração
    </span>
  );
}

export function Container({ className, ...rest }: ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...rest} />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden="true" />;
}
