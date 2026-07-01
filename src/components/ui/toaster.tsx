"use client";

import { useEffect, useState } from "react";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setTheme(root.classList.contains("dark") ? "dark" : "light");
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      position="top-right"
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            "rounded-xl border border-border bg-surface text-foreground shadow-lg",
          title: "font-semibold",
          description: "text-muted",
        },
      }}
    />
  );
}
