"use client";

import type { ChurchBranding } from "@/lib/auth/app-session";
import { resolveChurchBrandCssVars } from "@/lib/brand/church-defaults";
import { useLayoutEffect, useMemo } from "react";

const BRAND_VAR_KEYS = [
  "--brand-primary",
  "--brand-secondary",
  "--brand-accent",
  "--accent",
  "--accent-strong",
  "--accent-soft",
  "--accent-ink",
  "--primary",
  "--primary-500",
  "--primary-600",
  "--primary-50",
  "--primary-100",
  "--sb-brand",
  "--sb-bg",
] as const;

function applyBrandVariables(cssVars: Record<string, string>) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(cssVars)) {
    root.style.setProperty(key, value);
  }
}

function clearBrandVariables() {
  const root = document.documentElement;
  for (const key of BRAND_VAR_KEYS) {
    root.style.removeProperty(key);
  }
}

export function ChurchBrandProvider({
  branding,
  children,
}: {
  branding?: ChurchBranding | null;
  children: React.ReactNode;
}) {
  const cssVars = useMemo(
    () => resolveChurchBrandCssVars(branding),
    [branding],
  );

  useLayoutEffect(() => {
    applyBrandVariables(cssVars);
    return () => clearBrandVariables();
  }, [cssVars]);

  return (
    <div
      className="church-brand-scope flex min-h-full min-w-0 flex-1 flex-col"
      style={cssVars as React.CSSProperties}
    >
      {children}
    </div>
  );
}
