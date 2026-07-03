import {
  getAppSession,
  requireAppSession,
  type AppSession,
} from "@/lib/auth/app-session";
import { canManageAdminUsers as hasAdminPerm } from "@/lib/auth/permissions";

export function canManageAdminUsers(session: AppSession): boolean {
  return hasAdminPerm(session);
}

export async function requireAdminSession(): Promise<AppSession> {
  const session = await requireAppSession();
  if (!canManageAdminUsers(session)) {
    throw new Error(
      "Acceso denegado: se requiere rol de Administrador General.",
    );
  }
  return session;
}

export async function getAdminSessionOrNull(): Promise<AppSession | null> {
  const session = await getAppSession();
  if (!session || !canManageAdminUsers(session)) return null;
  return session;
}
