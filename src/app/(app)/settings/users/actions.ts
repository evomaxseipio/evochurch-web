"use server";

import {
  isPastorRole,
  projectRoleToAppRoleId,
} from "@/lib/admin-users/roles";
import type { AdminUserInput } from "@/lib/admin-users/types";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import {
  registerChurchAuthUser,
  updateChurchAuthUser,
} from "@/lib/services/admin-users";
import {
  fetchMemberById,
  fetchMembersPage,
  saveMembership,
  updateMember,
} from "@/lib/services/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";

export type AdminUserActionResult =
  | { ok: true; tempPassword?: string }
  | { ok: false; error: string };

async function adminSessionContext() {
  const session = await requireAdminSession();
  const supabase = await createClient();
  return { supabase, session };
}

function parseAdminUserInput(formData: FormData): AdminUserInput {
  const roleLabel = String(formData.get("roleLabel") ?? "").trim();
  return {
    authUserId: String(formData.get("authUserId") ?? "").trim() || null,
    profileId: String(formData.get("profileId") ?? "").trim(),
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    roleLabel,
    appRoleId: projectRoleToAppRoleId(roleLabel),
    isActive: formData.get("isActive") === "true",
  };
}

function generateTempPassword(): string {
  return randomBytes(9).toString("base64url");
}

async function resolveProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  churchId: number,
  input: AdminUserInput,
): Promise<string | null> {
  if (input.profileId) return input.profileId;

  const { members } = await fetchMembersPage(supabase, {
    churchId,
    page: 1,
    pageSize: null,
  });

  const email = input.email.toLowerCase();
  const byEmail = members.find(
    (m) => m.contact.email?.trim().toLowerCase() === email,
  );
  if (byEmail) return byEmail.memberId;

  const full = `${input.firstName} ${input.lastName}`.trim().toLowerCase();
  const byName = members.find(
    (m) =>
      `${m.firstName} ${m.lastName}`.trim().toLowerCase() === full &&
      m.contact.email?.trim().toLowerCase() === email,
  );
  return byName?.memberId ?? null;
}

async function syncProfileAndMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  churchId: number,
  profileId: string,
  input: AdminUserInput,
): Promise<void> {
  const member = await fetchMemberById(supabase, churchId, profileId);
  if (!member) return;

  await updateMember(supabase, profileId, {
    firstName: input.firstName,
    lastName: input.lastName,
    nickName: member.nickName,
    dateOfBirth: member.dateOfBirth,
    gender: member.gender,
    maritalStatus: member.maritalStatus,
    nationality: member.nationality,
    idType: member.idType,
    idNumber: member.idNumber,
    isActive: member.isActive,
    isMember: member.isMember,
    bio: member.bio,
    membershipRole: member.membershipRole,
    streetAddress: member.address.streetAddress,
    stateProvince: member.address.stateProvince,
    cityState: member.address.cityState,
    country: member.address.country,
    phone: member.contact.phone,
    mobilePhone: member.contact.mobilePhone,
    email: input.email,
  });

  if (isPastorRole(input.roleLabel)) {
    await saveMembership(supabase, {
      profileId,
      baptismDate: "",
      baptismChurch: "",
      baptismPastor: "",
      membershipRole: "Pastor",
      baptismChurchCity: "",
      baptismChurchCountry: "",
      hasCredential: false,
      isBaptizedInSpirit: false,
    });
  }
}

function validateAdminUserInput(input: AdminUserInput): string | null {
  if (!input.firstName) return "El nombre es obligatorio.";
  if (!input.lastName) return "El apellido es obligatorio.";
  if (!input.email) return "El correo es obligatorio.";
  if (!input.email.includes("@")) return "Correo electrónico no válido.";
  if (!input.roleLabel) return "Selecciona un rol.";
  return null;
}

export async function saveAdminUserAction(
  _prev: AdminUserActionResult | null,
  formData: FormData,
): Promise<AdminUserActionResult> {
  try {
    const mode = String(formData.get("mode") ?? "create") as "create" | "update";
    const input = parseAdminUserInput(formData);
    const validationError = validateAdminUserInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, session } = await adminSessionContext();
    const admin = createAdminClient();

    const profileId = await resolveProfileId(
      supabase,
      session.churchId,
      input,
    );
    if (!profileId) {
      return {
        ok: false,
        error:
          "No hay un miembro con ese correo. Agrégalo primero en Miembros.",
      };
    }
    input.profileId = profileId;

    if (mode === "create") {
      if (!admin) {
        return {
          ok: false,
          error:
            "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para crear cuentas.",
        };
      }

      const password = input.password || generateTempPassword();

      const { data: created, error: createError } =
        await admin.auth.admin.createUser({
          email: input.email,
          password,
          email_confirm: true,
          app_metadata: {
            church_id: session.churchId,
            profile_id: profileId,
            app_role_id: input.appRoleId,
          },
        });

      if (createError || !created.user) {
        return {
          ok: false,
          error: createError?.message ?? "No se pudo crear la cuenta de acceso.",
        };
      }

      await registerChurchAuthUser(supabase, session.churchId, {
        authUserId: created.user.id,
        profileId,
        email: input.email,
        appRoleId: input.appRoleId,
        isActive: input.isActive,
      });

      await syncProfileAndMembership(supabase, session.churchId, profileId, input);

      revalidatePath("/settings/users");
      return input.password ? { ok: true } : { ok: true, tempPassword: password };
    }

    if (!input.authUserId) {
      return { ok: false, error: "Usuario no válido." };
    }

    if (input.authUserId === session.authUserId && input.appRoleId !== 1) {
      return {
        ok: false,
        error:
          "No puedes quitarte el rol de Administrador General mientras gestionas usuarios.",
      };
    }

    await syncProfileAndMembership(supabase, session.churchId, profileId, input);

    await updateChurchAuthUser(supabase, session.churchId, {
      ...input,
      clearAppRole: input.appRoleId == null,
    });

    if (admin) {
      const authUpdates: {
        email?: string;
        password?: string;
        app_metadata?: {
          church_id: number;
          profile_id: string;
          app_role_id: number | null;
        };
      } = {
        email: input.email,
        app_metadata: {
          church_id: session.churchId,
          profile_id: profileId,
          app_role_id: input.appRoleId,
        },
      };

      if (input.password) authUpdates.password = input.password;

      const { error: authError } = await admin.auth.admin.updateUserById(
        input.authUserId,
        authUpdates,
      );

      if (authError) {
        return {
          ok: false,
          error: authError.message ?? "No se pudo actualizar la cuenta Auth.",
        };
      }
    }

    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo guardar el usuario.",
    };
  }
}

export async function deactivateAdminUserAction(
  _prev: AdminUserActionResult | null,
  formData: FormData,
): Promise<AdminUserActionResult> {
  try {
    const authUserId = String(formData.get("authUserId") ?? "").trim();
    if (!authUserId) return { ok: false, error: "Usuario no válido." };

    const { supabase, session } = await adminSessionContext();

    if (authUserId === session.authUserId) {
      return {
        ok: false,
        error: "No puedes eliminar tu propia cuenta mientras estás conectado.",
      };
    }

    const { error: updateError } = await supabase.rpc(
      "sp_update_church_auth_user",
      {
        p_church_id: session.churchId,
        p_auth_user_id: authUserId,
        p_is_active: false,
        p_clear_app_role: false,
      },
    );
    if (updateError) throw updateError;

    revalidatePath("/settings/users");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar el usuario.",
    };
  }
}
