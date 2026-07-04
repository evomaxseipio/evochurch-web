"use server";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import type { FundInput, FundKind } from "@/lib/funds/types";
import { validateFundInputForKind } from "@/lib/ministries/funds";
import {
  deleteFund,
  saveFund,
  setPrimaryFund,
} from "@/lib/services/funds";
import {
  revalidateFundsCatalog,
  revalidateMinistriesCatalog,
} from "@/lib/cache/catalog-tags";
import { revalidatePath } from "next/cache";

export type FundActionResult =
  | { ok: true }
  | { ok: false; error: string; errorKey?: string };

async function writeSessionContext() {
  const { supabase, session } = await getActionSessionWith("finances:funds:write");
  return { supabase, churchId: session.churchId };
}

async function deleteSessionContext() {
  const { supabase, session } = await getActionSessionWith("finances:funds:delete");
  return { supabase, churchId: session.churchId };
}

const FUND_KINDS = new Set<FundKind>(["operating", "project", "event"]);

function parseFundKind(raw: string): FundKind {
  return FUND_KINDS.has(raw as FundKind) ? (raw as FundKind) : "operating";
}

function parseFundInput(formData: FormData): FundInput {
  const fundId = String(formData.get("fundId") ?? "").trim();
  const targetRaw = String(formData.get("targetAmount") ?? "").trim();
  const balanceRaw = String(formData.get("totalContributions") ?? "").trim();
  const endDate = String(formData.get("endDate") ?? "").trim();
  const ministryId = String(formData.get("ministryId") ?? "").trim();

  return {
    fundId: fundId || null,
    name: String(formData.get("name") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
    targetAmount: Number.parseFloat(targetRaw) || 0,
    totalContributions: Number.parseFloat(balanceRaw) || 0,
    startDate: String(formData.get("startDate") ?? "").trim(),
    endDate: endDate || null,
    isActive: formData.get("isActive") === "true",
    isPrimary: formData.get("isPrimary") === "true",
    ministryId: ministryId || null,
    fundKind: parseFundKind(String(formData.get("fundKind") ?? "operating")),
  };
}

function validateFundInput(input: FundInput): string | null {
  return validateFundInputForKind({
    name: input.name,
    startDate: input.startDate,
    targetAmount: input.targetAmount,
    fundKind: input.fundKind,
  });
}

export async function saveFundAction(
  _prev: FundActionResult | null,
  formData: FormData,
): Promise<FundActionResult> {
  try {
    const input = parseFundInput(formData);
    const validationError = validateFundInput(input);
    if (validationError)
      return { ok: false, error: validationError, errorKey: validationError };

    const { supabase, churchId } = await writeSessionContext();
    await saveFund(supabase, churchId, input);
    revalidateFundsCatalog(churchId);
    if (input.ministryId) revalidateMinistriesCatalog(churchId);
    revalidatePath("/finances/funds");
    revalidatePath("/ministerios");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "errors.saveFailed",
      errorKey: "errors.saveFailed",
    };
  }
}

export async function deleteFundAction(
  _prev: FundActionResult | null,
  formData: FormData,
): Promise<FundActionResult> {
  try {
    const fundId = String(formData.get("fundId") ?? "").trim();
    if (!fundId)
      return {
        ok: false,
        error: "errors.invalidFormat",
        errorKey: "errors.invalidFormat",
      };

    const { supabase, churchId } = await deleteSessionContext();
    await deleteFund(supabase, churchId, fundId);
    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "errors.deleteFailed",
      errorKey: "errors.deleteFailed",
    };
  }
}

export async function setPrimaryFundAction(
  _prev: FundActionResult | null,
  formData: FormData,
): Promise<FundActionResult> {
  try {
    const fundId = String(formData.get("fundId") ?? "").trim();
    if (!fundId)
      return {
        ok: false,
        error: "errors.invalidFormat",
        errorKey: "errors.invalidFormat",
      };

    const { supabase, churchId } = await writeSessionContext();
    await setPrimaryFund(supabase, churchId, fundId);
    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? e.message
          : "errors.saveFailed",
      errorKey: "errors.saveFailed",
    };
  }
}
