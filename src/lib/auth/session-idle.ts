const DEFAULT_IDLE_MS = 10 * 60 * 1000;
const WARN_BEFORE_MS = 60 * 1000;
const ACTIVITY_STORAGE_KEY = "evochurch-last-activity";

function parseIdleMs(value: string | undefined): number | null {
  if (value == null || value.trim() === "") return null;
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

/** Inactividad máxima antes de cerrar sesión. 0 desactiva el guard. */
export const SESSION_IDLE_MS =
  parseIdleMs(process.env.NEXT_PUBLIC_SESSION_IDLE_MS) ?? DEFAULT_IDLE_MS;

export const SESSION_IDLE_ENABLED = SESSION_IDLE_MS > 0;

/** Momento en que se muestra el aviso previo al cierre. */
export const SESSION_IDLE_WARN_MS = SESSION_IDLE_ENABLED
  ? Math.max(0, SESSION_IDLE_MS - WARN_BEFORE_MS)
  : 0;

export const SESSION_IDLE_WARN_BEFORE_MS = WARN_BEFORE_MS;

export { ACTIVITY_STORAGE_KEY };

export function clearSessionIdleActivity(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(ACTIVITY_STORAGE_KEY);
}
