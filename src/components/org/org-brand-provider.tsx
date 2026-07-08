"use client";

import type { OrgBranding } from "@/lib/auth/org-session";
import { normalizeChurchHexColor } from "@/lib/brand/church-defaults";
import { useEffect } from "react";

const ORG_BRAND_DEFAULTS = {
  primaryColor: "#1E0A4C",
  secondaryColor: "#4C1D95",
  accentColor: "#5B21B6",
};

function applyOrgBrandVariables(branding: OrgBranding | null | undefined) {
  const root = document.documentElement;
  const primary = normalizeChurchHexColor(
    branding?.primaryColor,
    ORG_BRAND_DEFAULTS.primaryColor,
  );
  const secondary = normalizeChurchHexColor(
    branding?.secondaryColor,
    ORG_BRAND_DEFAULTS.secondaryColor,
  );
  const accent = normalizeChurchHexColor(
    branding?.accentColor,
    ORG_BRAND_DEFAULTS.accentColor,
  );

  root.style.setProperty("--brand-primary", primary);
  root.style.setProperty("--brand-secondary", secondary);
  root.style.setProperty("--brand-accent", accent);
  root.style.setProperty("--accent", primary);
  root.style.setProperty("--sb-brand", primary);
  root.style.setProperty("--sb-bg", primary);
}

function clearOrgBrandVariables() {
  const root = document.documentElement;
  for (const key of [
    "--brand-primary",
    "--brand-secondary",
    "--brand-accent",
    "--accent",
    "--sb-brand",
    "--sb-bg",
  ]) {
    root.style.removeProperty(key);
  }
}

export function OrgBrandProvider({
  branding,
  children,
}: {
  branding?: OrgBranding | null;
  children: React.ReactNode;
}) {
  useEffect(() => {
    applyOrgBrandVariables(branding);
    return () => clearOrgBrandVariables();
  }, [branding]);

  return children;
}
