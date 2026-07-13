/** Route prefix for the platform backoffice (internal admin). */

export const BACKOFFICE_APP_PREFIX = "/apps/backoffice";

export const BACKOFFICE_MODULES = [
  "sales",
  "organizations",
  "pipeline",
  "agenda",
  "subscriptions",
  "support",
  "billing",
] as const;

export type BackofficeModule = (typeof BACKOFFICE_MODULES)[number];

export function backofficePath(
  subpath: BackofficeModule | (string & {}),
): string {
  const segment = String(subpath).replace(/^\//, "");
  if (!segment) return BACKOFFICE_APP_PREFIX;
  return `${BACKOFFICE_APP_PREFIX}/${segment}`;
}

export function isBackofficeAppPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return (
    path === BACKOFFICE_APP_PREFIX ||
    path.startsWith(`${BACKOFFICE_APP_PREFIX}/`)
  );
}
