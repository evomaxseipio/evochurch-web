/** Route prefix for the church SaaS console (tenant app). */

export const CHURCH_APP_PREFIX = "/apps/church";

export const CHURCH_DASHBOARD_PATH = `${CHURCH_APP_PREFIX}/dashboard`;

const LEGACY_CHURCH_ROOTS = [
  "/dashboard",
  "/members",
  "/ministerios",
  "/finances",
  "/eventos",
  "/attendance",
  "/comunicacion",
  "/settings",
  "/network",
  "/reports",
] as const;

export function churchPath(subpath = ""): string {
  if (!subpath || subpath === "/") return CHURCH_APP_PREFIX;
  const normalized = subpath.startsWith("/") ? subpath : `/${subpath}`;
  if (
    normalized === CHURCH_APP_PREFIX ||
    normalized.startsWith(`${CHURCH_APP_PREFIX}/`)
  ) {
    return normalized;
  }
  return `${CHURCH_APP_PREFIX}${normalized}`;
}

export function isChurchAppPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return path === CHURCH_APP_PREFIX || path.startsWith(`${CHURCH_APP_PREFIX}/`);
}

/** Path after `/apps/church` for permission maps and nav matching. */
export function churchPathSuffix(pathname: string): string {
  const path = pathname.split("?")[0] ?? pathname;
  if (!isChurchAppPath(path)) return path;
  const suffix = path.slice(CHURCH_APP_PREFIX.length);
  return suffix || "/";
}

export function legacyChurchRedirect(pathname: string): string | null {
  const path = pathname.split("?")[0] ?? pathname;
  const search = pathname.includes("?") ? pathname.slice(pathname.indexOf("?")) : "";
  for (const root of LEGACY_CHURCH_ROOTS) {
    if (path === root || path.startsWith(`${root}/`)) {
      return `${churchPath(path)}${search}`;
    }
  }
  return null;
}

export function normalizeChurchPermissionPath(pathname: string): string {
  return churchPathSuffix(pathname);
}
