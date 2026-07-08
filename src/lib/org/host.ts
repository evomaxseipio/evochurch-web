/** Host detection for concilio / organization portal (Fase 3). */

const DEFAULT_ORG_HOST_PREFIXES = ["concilio.", "org."];

function orgHostPrefixes(): string[] {
  const fromEnv = process.env.ORG_PORTAL_HOST_PREFIXES?.trim();
  if (!fromEnv) return DEFAULT_ORG_HOST_PREFIXES;
  return fromEnv
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

export function isOrgPortalHost(host: string | null | undefined): boolean {
  if (!host) return false;
  const normalized = host.toLowerCase().split(":")[0] ?? "";
  const prefixes = orgHostPrefixes();
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

export const ORG_ROUTE_PREFIX = "/org";

export function isOrgAppPath(pathname: string): boolean {
  return (
    pathname === ORG_ROUTE_PREFIX ||
    pathname.startsWith(`${ORG_ROUTE_PREFIX}/`)
  );
}
