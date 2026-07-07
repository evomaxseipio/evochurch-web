"use client";

import type { ChurchBranding } from "@/lib/auth/app-session";
import { useEffect } from "react";

const DEFAULT_PRIMARY = "#5B21B6";
const DEFAULT_SECONDARY = "#4C1D95";
const DEFAULT_ACCENT = "#1E0A4C";

function applyBrandVariables(branding: ChurchBranding | null | undefined) {
  const root = document.documentElement;
  const primary = branding?.primaryColor ?? DEFAULT_PRIMARY;
  const secondary = branding?.secondaryColor ?? DEFAULT_SECONDARY;
  const accent = branding?.accentColor ?? DEFAULT_ACCENT;

  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--brand-accent", accent);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-strong", secondary);
  root.style.setProperty(
    "--accent-soft",
    `color-mix(in oklab, ${primary} 16%, transparent)`,
  );
  root.style.setProperty("--sb-brand", secondary);
  root.style.setProperty("--sb-bg", secondary);
}

function clearBrandVariables() {
  const root = document.documentElement;
  for (const key of [
    "--brand-primary",
    "--brand-secondary",
    "--brand-accent",
    "--accent",
    "--accent-strong",
    "--accent-soft",
    "--sb-brand",
    "--sb-bg",
  ]) {
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
  useEffect(() => {
    applyBrandVariables(branding);
    return () => clearBrandVariables();
  }, [branding]);

  return children;
}
