"use server";

import { CHURCH_DASHBOARD_PATH } from "@/lib/apps/church-routes";
import { getAppSession } from "@/lib/auth/app-session";
import { syncAuthAppMetadata } from "@/lib/auth/sync-app-metadata";
import {
  sessionRequiresPasswordChange,
  validateNewPassword,
} from "@/lib/auth/temp-password-flow";
import { assertRpcSuccess } from "@/lib/supabase/rpc-result";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type ChangeTempPasswordState = {
  error?: string;
  errorKey?: string;
};

export async function changeTempPasswordAction(
  _prev: ChangeTempPasswordState,
  formData: FormData,
): Promise<ChangeTempPasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  const validationError = validateNewPassword(password, confirm);
  if (validationError) {
    if (validationError.includes("8")) {
      return { errorKey: "auth.errors.minPassword" };
    }
    if (validationError.includes("coincid")) {
      return { errorKey: "validation.passwordMismatch" };
    }
    return { errorKey: "errors.requiredFields" };
  }

  const supabase = await createClient();
  const session = await getAppSession();

  if (!session) {
    return { errorKey: "auth.errors.no_church" };
  }

  if (!sessionRequiresPasswordChange(session)) {
    redirect(CHURCH_DASHBOARD_PATH);
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) {
    if (
      updateError.message ===
      "New password should be different from the old password."
    ) {
      return { errorKey: "auth.errors.tempPasswordSame" };
    }
    return { errorKey: "auth.errors.updateFailed" };
  }

  const { data, error: rpcError } = await supabase.rpc(
    "sp_clear_my_temp_password",
  );
  if (rpcError) {
    return { errorKey: "auth.errors.confirmFailed" };
  }

  try {
    assertRpcSuccess(data, "confirm_failed");
  } catch {
    return { errorKey: "auth.errors.confirmFailed" };
  }

  await syncAuthAppMetadata(session, supabase);
  await supabase.auth.refreshSession();
  redirect(CHURCH_DASHBOARD_PATH);
}
