import type { AppSession } from "@/lib/auth/app-session";

export const UPDATE_PASSWORD_PATH = "/login/update-password";

export function sessionRequiresPasswordChange(
  session: AppSession | null | undefined,
): boolean {
  return session?.isTempPassword === true;
}

export function validateNewPassword(
  password: string,
  confirm: string,
): string | null {
  if (!password) return "La nueva contraseña es obligatoria.";
  if (password.length < 8) {
    return "Usa al menos 8 caracteres.";
  }
  if (password !== confirm) {
    return "Las contraseñas no coinciden.";
  }
  return null;
}
