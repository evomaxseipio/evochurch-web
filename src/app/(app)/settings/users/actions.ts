"use server";

import { evaluateSystemAccessEligibility } from "@/lib/admin-users/eligibility";
import { ADMIN_APP_ROLE_ID } from "@/lib/roles/keys";
import { toAdminUserRow } from "@/lib/admin-users/parse";
import { isPastorRole } from "@/lib/admin-users/roles";
import { generateTempPassword } from "@/lib/admin-users/temp-password";
import type { AdminUserInput, AdminUserRow } from "@/lib/admin-users/types";
import {
  findMemberRoleByCode,
  PASTOR_ROLE_CODE,
} from "@/lib/members/roles";
import { requireAdminSession } from "@/lib/auth/require-admin-session";
import {
  fetchChurchAuthUserByProfile,
  fetchChurchAuthUsers,
  findProfileByEmail,
  getAuthUserTempPassword,
  registerChurchAuthUser,
  resetChurchAuthUserPassword,
  setAuthUserTempPassword,
  updateChurchAuthUser,
} from "@/lib/services/admin-users";
import {
  fetchMemberById,
  fetchMemberRoles,
  fetchMembership,
  saveMembership,
  updateMember,
} from "@/lib/services/members";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type AdminUserActionResult =
  | { ok: true; tempPassword?: string; email?: string }
  | { ok: false; error: string };

export type MemberSystemAccessContextResult =
  | {
      ok: true;
      existingUser: AdminUserRow | null;
      tempPassword: string | null;
    }
  | { ok: false; error: string };

export type ResetMemberAccessResult =
  | { ok: true; email: string; tempPassword: string }
  | { ok: false; error: string };

async function adminSessionContext() {
  const session = await requireAdminSession();
  const supabase = await createClient();
  return { supabase, session };
}

function parseAdminUserInput(formData: FormData): AdminUserInput {
  const roleLabel = String(formData.get("roleLabel") ?? "").trim();
  const appRoleIdRaw = String(formData.get("appRoleId") ?? "").trim();
  const appRoleId = appRoleIdRaw
    ? Number.parseInt(appRoleIdRaw, 10)
    : null;
  const roleKey = String(formData.get("roleKey") ?? "").trim() || null;

  return {
    authUserId: String(formData.get("authUserId") ?? "").trim() || null,
    profileId: String(formData.get("profileId") ?? "").trim(),
    firstName: String(formData.get("firstName") ?? "").trim(),
    lastName: String(formData.get("lastName") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    roleLabel,
    roleKey,
    appRoleId: appRoleId != null && Number.isFinite(appRoleId) ? appRoleId : null,
    isActive: formData.get("isActive") === "true",
  };
}

async function issueAccessPasswordReset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  churchId: number,
  authUserId: string,
  email: string,
): Promise<ResetMemberAccessResult> {
  const tempPassword = generateTempPassword();
  await resetChurchAuthUserPassword(
    supabase,
    churchId,
    authUserId,
    tempPassword,
  );
  revalidatePath("/settings/users");
  revalidatePath("/members");
  return { ok: true, email, tempPassword };
}

async function resolveProfileId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  churchId: number,
  input: AdminUserInput,
): Promise<string | null> {
  if (input.profileId) return input.profileId;
  return findProfileByEmail(supabase, churchId, input.email);
}

async function assertEligibleForSystemAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  churchId: number,
  profileId: string,
  email?: string | null,
): Promise<string | null> {
  const member = await fetchMemberById(supabase, churchId, profileId);
  if (!member) return "Miembro no encontrado.";

  const membership = await fetchMembership(supabase, churchId, profileId).catch(
    () => null,
  );

  const eligibility = evaluateSystemAccessEligibility({
    isMember: member.isMember,
    email: email ?? member.contact.email,
    membership,
  });

  return eligibility.ok ? null : eligibility.message;
}

export async function getMemberSystemAccessContextAction(
  profileId: string,
): Promise<MemberSystemAccessContextResult> {
  try {
    const { supabase, session } = await adminSessionContext();

    const eligibilityError = await assertEligibleForSystemAccess(
      supabase,
      session.churchId,
      profileId,
    );
    if (eligibilityError) {
      return { ok: false, error: eligibilityError };
    }

    const existing = await fetchChurchAuthUserByProfile(
      supabase,
      session.churchId,
      profileId,
    );
    let tempPassword: string | null = null;

    if (existing?.isTempPassword) {
      const temp = await getAuthUserTempPassword(
        supabase,
        session.churchId,
        existing.authUserId,
      );
      tempPassword = temp.tempPassword;
    }

    return {
      ok: true,
      existingUser: existing ? toAdminUserRow(existing) : null,
      tempPassword,
    };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "No se pudo verificar el acceso del miembro.",
    };
  }
}

export async function resetMemberAccessPasswordAction(
  profileId: string,
): Promise<ResetMemberAccessResult> {
  try {
    const { supabase, session } = await adminSessionContext();

    const eligibilityError = await assertEligibleForSystemAccess(
      supabase,
      session.churchId,
      profileId,
    );
    if (eligibilityError) {
      return { ok: false, error: eligibilityError };
    }

    const existing = await fetchChurchAuthUserByProfile(
      supabase,
      session.churchId,
      profileId,
    );
    if (!existing) {
      return {
        ok: false,
        error: "Este miembro aún no tiene acceso al sistema. Use Configurar usuario.",
      };
    }

    return await issueAccessPasswordReset(
      supabase,
      session.churchId,
      existing.authUserId,
      existing.email,
    );
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo restablecer el acceso.",
    };
  }
}

export async function resetAuthUserAccessPasswordAction(
  authUserId: string,
): Promise<ResetMemberAccessResult> {
  try {
    const { supabase, session } = await adminSessionContext();

    const users = await fetchChurchAuthUsers(supabase, session.churchId);
    const existing = users.find((u) => u.authUserId === authUserId);
    if (!existing) {
      return { ok: false, error: "Usuario no encontrado en esta iglesia." };
    }

    return await issueAccessPasswordReset(
      supabase,
      session.churchId,
      existing.authUserId,
      existing.email,
    );
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo restablecer el acceso.",
    };
  }
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
    membershipRoleId: member.membershipRoleId,
    membershipRole: member.membershipRole,
    streetAddress: member.address.streetAddress,
    stateProvince: member.address.stateProvince,
    cityState: member.address.cityState,
    country: member.address.country,
    phone: member.contact.phone,
    mobilePhone: member.contact.mobilePhone,
    email: input.email,
  });

  if (isPastorRole({ roleKey: input.roleKey, roleName: input.roleLabel })) {
    const roles = await fetchMemberRoles(supabase).catch(() => []);
    const pastorRole = findMemberRoleByCode(roles, PASTOR_ROLE_CODE);
    if (pastorRole) {
      await saveMembership(supabase, {
        profileId,
        baptismDate: "",
        baptismChurch: "",
        baptismPastor: "",
        membershipRoleId: pastorRole.id,
        baptismChurchCity: "",
        baptismChurchCountry: "",
        hasCredential: false,
        isBaptizedInSpirit: false,
      });
    }
  }
}

function validateAdminUserInput(input: AdminUserInput): string | null {
  if (!input.firstName) return "El nombre es obligatorio.";
  if (!input.lastName) return "El apellido es obligatorio.";
  if (!input.email) return "El correo es obligatorio.";
  if (!input.email.includes("@")) return "Correo electrónico no válido.";
  if (!input.roleLabel && input.appRoleId == null) return "Selecciona un rol.";
  if (input.appRoleId == null) return "Rol no válido.";
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

    const eligibilityError = await assertEligibleForSystemAccess(
      supabase,
      session.churchId,
      profileId,
      input.email,
    );
    if (eligibilityError) {
      return { ok: false, error: eligibilityError };
    }

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

      await setAuthUserTempPassword(
        supabase,
        session.churchId,
        created.user.id,
        password,
      );

      await syncProfileAndMembership(supabase, session.churchId, profileId, input);

      revalidatePath("/settings/users");
      revalidatePath("/members");
      return { ok: true, tempPassword: password, email: input.email };
    }

    if (!input.authUserId) {
      return { ok: false, error: "Usuario no válido." };
    }

    if (input.authUserId === session.authUserId && input.appRoleId !== ADMIN_APP_ROLE_ID) {
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

      let returnedTempPassword: string | undefined;

      if (input.password) {
        await resetChurchAuthUserPassword(
          supabase,
          session.churchId,
          input.authUserId,
          input.password,
        );
        returnedTempPassword = input.password;
      }

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

      revalidatePath("/settings/users");
      revalidatePath("/members");
      return returnedTempPassword
        ? { ok: true, tempPassword: returnedTempPassword, email: input.email }
        : { ok: true };
    }

    if (input.password) {
      await resetChurchAuthUserPassword(
        supabase,
        session.churchId,
        input.authUserId,
        input.password,
      );
      revalidatePath("/settings/users");
      revalidatePath("/members");
      return {
        ok: true,
        tempPassword: input.password,
        email: input.email,
      };
    }

    revalidatePath("/settings/users");
    revalidatePath("/members");
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
