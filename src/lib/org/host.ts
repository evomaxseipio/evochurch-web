/** Host detection for concilio / organization portal (Fase 3). */

export { isOrgAppPath, ORG_APP_PREFIX as ORG_ROUTE_PREFIX } from "@/lib/apps/org-routes";

const DEFAULT_ORG_HOST_PREFIXES = ["concilio.", "org."];

function orgHostPrefixes(): string[] {
  const fromEnv = process.env.ORG_PORTAL_HOST_PREFIXES?.trim();
  if (!fromEnv) return DEFAULT_ORG_HOST_PREFIXES;
  return fromEnv
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function normalizedHost(host: string | null | undefined): string {
  return host?.toLowerCase().split(":")[0] ?? "";
}

export function isOrgPortalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const normalized = normalizedHost(host);
  const prefixes = orgHostPrefixes();
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

/** Allow /org/* on subdomain, localhost, or ORG_PORTAL_ALLOW_PATH_PREFIX=1. */
export function isOrgPathPrefixAllowed(host: string | null | undefined): boolean {
  if (isOrgPortalHost(host)) return true;

  const normalized = normalizedHost(host);
  if (
    normalized === "localhost" ||
    normalized === "127.0.0.1" ||
    normalized.endsWith(".localhost")
  ) {
    return true;
  }

  const fromEnv = process.env.ORG_PORTAL_ALLOW_PATH_PREFIX?.trim().toLowerCase();
  return fromEnv === "1" || fromEnv === "true" || fromEnv === "yes";
}
