/** Route prefix for the council / organization portal (Fase 3). */

export const ORG_APP_PREFIX = "/org";

export const ORG_MODULES = [
  "dashboard",
  "churches",
  "reports",
  "settings",
] as const;

export type OrgModule = (typeof ORG_MODULES)[number];

export function orgPath(subpath: OrgModule | "login" | (string & {})): string {
  const segment = String(subpath).replace(/^\//, "");
  if (!segment) return ORG_APP_PREFIX;
  return `${ORG_APP_PREFIX}/${segment}`;
}

export function isOrgAppPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return path === ORG_APP_PREFIX || path.startsWith(`${ORG_APP_PREFIX}/`);
}
