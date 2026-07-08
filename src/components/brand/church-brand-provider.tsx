"use client";

import type { ChurchBranding } from "@/lib/auth/app-session";
import {
  CHURCH_BRAND_DEFAULTS,
  normalizeChurchHexColor,
} from "@/lib/brand/church-defaults";
import { useEffect } from "react";

function applyBrandVariables(branding: ChurchBranding | null | undefined) {
  const root = document.documentElement;
  const primary = normalizeChurchHexColor(
    branding?.primaryColor,
    CHURCH_BRAND_DEFAULTS.primaryColor,
  );
  const secondary = normalizeChurchHexColor(
    branding?.secondaryColor,
    CHURCH_BRAND_DEFAULTS.secondaryColor,
  );
  const accent = normalizeChurchHexColor(
    branding?.accentColor,
    CHURCH_BRAND_DEFAULTS.accentColor,
  );

  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--brand-accent", accent);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--accent-strong", secondary);
  root.style.setProperty(
    "--accent-soft",
    `color-mix(in oklab, ${primary} 16%, transparent)`,
  );
  /* Sidebar y superficies de marca usan el color primario (#5B21B6 por defecto). */
  root.style.setProperty("--sb-brand", primary);
  root.style.setProperty("--sb-bg", primary);
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
