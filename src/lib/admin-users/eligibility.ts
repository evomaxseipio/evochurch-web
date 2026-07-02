import type { MembershipRecord } from "@/lib/members/types";

export type SystemAccessBlockReason =
  | "visit"
  | "not_baptized"
  | "no_email";

export type SystemAccessEligibility =
  | { ok: true }
  | { ok: false; reason: SystemAccessBlockReason; message: string };

export const SYSTEM_ACCESS_MESSAGES: Record<SystemAccessBlockReason, string> = {
  visit:
    "No se puede crear acceso al sistema para una visita. Primero debe registrarse como miembro bautizado de la iglesia (actualice el perfil y la membresía).",
  not_baptized:
    "No se puede crear acceso al sistema porque no hay bautismo registrado para este hermano. Complete la fecha de bautismo en la pestaña de membresía del perfil e intente de nuevo.",
  no_email:
    "El miembro debe tener un correo electrónico registrado para crear acceso al sistema. Actualice el contacto en el perfil e intente de nuevo.",
};

export function evaluateSystemAccessEligibility(input: {
  isMember: boolean;
  email?: string | null;
  membership: MembershipRecord | null;
}): SystemAccessEligibility {
  if (!input.isMember) {
    return { ok: false, reason: "visit", message: SYSTEM_ACCESS_MESSAGES.visit };
  }

  const baptismDate = input.membership?.baptismDate?.trim() ?? "";
  if (!baptismDate) {
    return {
      ok: false,
      reason: "not_baptized",
      message: SYSTEM_ACCESS_MESSAGES.not_baptized,
    };
  }

  const email = input.email?.trim() ?? "";
  if (!email) {
    return {
      ok: false,
      reason: "no_email",
      message: SYSTEM_ACCESS_MESSAGES.no_email,
    };
  }

  return { ok: true };
}
