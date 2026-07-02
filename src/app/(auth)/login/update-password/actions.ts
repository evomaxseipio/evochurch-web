"use server";

import { getAppSession } from "@/lib/auth/app-session";
import { syncAuthAppMetadata } from "@/lib/auth/sync-app-metadata";
import {
  sessionRequiresPasswordChange,
  validateNewPassword,
} from "@/lib/auth/temp-password-flow";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ChangeTempPasswordState = { error?: string };

export async function changeTempPasswordAction(
  _prev: ChangeTempPasswordState,
  formData: FormData,
): Promise<ChangeTempPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const validationError = validateNewPassword(password, confirm);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createClient();
  const session = await getAppSession();

  if (!session) {
    return {
      error:
        "Tu cuenta no está vinculada a una iglesia. Contacta al administrador.",
    };
  }

  if (!sessionRequiresPasswordChange(session)) {
    redirect("/dashboard");
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    return {
      error:
        updateError.message === "New password should be different from the old password."
          ? "La nueva contraseña debe ser distinta a la temporal."
          : updateError.message || "No se pudo actualizar la contraseña.",
    };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "sp_clear_my_temp_password",
  );
  if (rpcError) {
    return { error: rpcError.message };
  }

  try {
    assertRpcSuccess(data, "No se pudo confirmar el cambio de contraseña.");
  } catch (e) {
    return {
      error:
        e instanceof Error ? e.message : "No se pudo confirmar el cambio.",
    };
  }

  await syncAuthAppMetadata(session, supabase);
  await supabase.auth.refreshSession();
  redirect("/dashboard");
}
