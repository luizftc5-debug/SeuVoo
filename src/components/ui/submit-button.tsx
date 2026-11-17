"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps } from "react";
import { Button } from "./primitives";

/** Botão de envio com estado pendente real (desabilita e troca o rótulo). */
export function SubmitButton({
  children,
  pendingLabel,
  ...rest
}: ComponentProps<typeof Button> & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || rest.disabled} aria-busy={pending} {...rest}>
      {pending ? (pendingLabel ?? "Salvando…") : children}
    </Button>
  );
}
