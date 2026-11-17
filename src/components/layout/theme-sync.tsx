"use client";

import { useEffect } from "react";

/** Mantém o tema da conta aplicado e salvo localmente (evita flash na próxima visita). */
export function ThemeSync({ theme }: { theme: "system" | "light" | "dark" }) {
  useEffect(() => {
    try {
      if (theme === "system") {
        localStorage.removeItem("sv-theme");
        delete document.documentElement.dataset.theme;
      } else {
        localStorage.setItem("sv-theme", theme);
        document.documentElement.dataset.theme = theme;
      }
    } catch {
      /* sem armazenamento local */
    }
  }, [theme]);
  return null;
}
