"use client";

import { useEffect } from "react";
import { Button, ButtonLink } from "@/components/ui/primitives";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const notFound = /não encontrad/i.test(error.message);
  return (
    <main
      id="conteudo"
      className="mx-auto flex min-h-[60dvh] max-w-md flex-col justify-center px-6 py-16"
    >
      <h1 className="t-title">
        {notFound ? "Não encontramos isso" : "Algo não saiu como esperado"}
      </h1>
      <p className="mt-3 text-ink-2">
        {notFound
          ? "O item pode ter sido removido ou você não tem acesso a ele."
          : "Não foi possível concluir esta ação agora. Seus dados salvos não foram afetados. Tente novamente."}
      </p>
      {error.digest && <p className="t-data mt-2 text-[12px] text-muted">Código: {error.digest}</p>}
      <div className="mt-8 flex gap-2">
        <Button onClick={reset}>Tentar novamente</Button>
        <ButtonLink href="/" variant="secondary">
          Início
        </ButtonLink>
      </div>
    </main>
  );
}
