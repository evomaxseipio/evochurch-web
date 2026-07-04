"use server";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import type {
  ContributionInput,
  DonorKind,
} from "@/lib/contributions/types";
import { fetchMembersPage } from "@/lib/services/members";
import {
  deleteContribution,
  saveContribution,
  updateContribution,
} from "@/lib/services/contributions";
import { revalidateFundsCatalog } from "@/lib/cache/catalog-tags";
import { revalidatePath } from "next/cache";

export type ContributionActionResult =
  | { ok: true }
  | { ok: false; error: string; errorKey?: string };

async function writeSessionContext() {
  const { supabase, session } = await getActionSessionWith(
    "finances:contributions:write",
  );
  return {
    supabase,
    churchId: session.churchId,
    userId: session.authUserId,
  };
}

async function deleteSessionContext() {
  const { supabase, session } = await getActionSessionWith(
    "finances:contributions:delete",
  );
  return { supabase, churchId: session.churchId };
}

function parseContributionInput(formData: FormData): ContributionInput {
  const amountRaw = String(formData.get("amount") ?? "").trim();
  const collectionMode = String(formData.get("collectionMode") ?? "individual");
  const donorKind = String(formData.get("donorKind") ?? "member") as DonorKind;

  return {
    incomeId: String(formData.get("incomeId") ?? "").trim() || null,
    incomeTypeId: Number.parseInt(String(formData.get("incomeTypeId") ?? ""), 10),
    fundId: String(formData.get("fundId") ?? "").trim(),
    collectionMode:
      collectionMode === "collective" ? "collective" : "individual",
    amount: Number.parseFloat(amountRaw) || 0,
    paymentDate: String(formData.get("paymentDate") ?? "").trim(),
    paymentMethod: String(formData.get("paymentMethod") ?? "").trim(),
    notes: String(formData.get("notes") ?? "").trim(),
    donorKind,
    profileId: String(formData.get("profileId") ?? "").trim() || null,
    companyName: String(formData.get("companyName") ?? "").trim() || null,
  };
}

function validateContributionInput(input: ContributionInput): string | null {
  if (!input.incomeTypeId) return "errors.requiredFields";
  if (!input.fundId) return "errors.requiredFields";
  if (!input.amount || input.amount <= 0) return "finances.invalidAmount";
  if (!input.paymentDate) return "errors.requiredFields";
  if (!input.paymentMethod) return "errors.requiredFields";

  if (input.collectionMode === "individual") {
    if (input.donorKind === "anonymous") return null;
    if (input.donorKind === "company" && !input.companyName?.trim()) {
      return "errors.requiredFields";
    }
    if (
      (input.donorKind === "member" || input.donorKind === "visitor") &&
      !input.profileId
    ) {
      return "contributions.errors.selectContributor";
    }
  }

  return null;
}

export async function saveContributionAction(
  _prev: ContributionActionResult | null,
  formData: FormData,
): Promise<ContributionActionResult> {
  try {
    const input = parseContributionInput(formData);
    const validationError = validateContributionInput(input);
    if (validationError)
      return { ok: false, error: validationError, errorKey: validationError };

    const { supabase, churchId, userId } = await writeSessionContext();

    if (input.incomeId) {
      await updateContribution(supabase, churchId, userId, input);
    } else {
      await saveContribution(supabase, churchId, userId, input);
    }

    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/contributions");
    revalidatePath("/finances/funds");
    revalidatePath("/members");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "errors.saveFailed",
      errorKey: "errors.saveFailed",
    };
  }
}

export async function deleteContributionAction(
  _prev: ContributionActionResult | null,
  formData: FormData,
): Promise<ContributionActionResult> {
  try {
    const incomeId = String(formData.get("incomeId") ?? "").trim();
    if (!incomeId)
      return {
        ok: false,
        error: "errors.invalidFormat",
        errorKey: "errors.invalidFormat",
      };

    const { supabase, churchId } = await deleteSessionContext();
    await deleteContribution(supabase, churchId, incomeId);
    revalidateFundsCatalog(churchId);
    revalidatePath("/finances/contributions");
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "errors.deleteFailed",
      errorKey: "errors.deleteFailed",
    };
  }
}

export async function searchMembersForContributionAction(
  query: string,
): Promise<{ id: string; name: string }[]> {
  try {
    const { supabase, churchId } = await writeSessionContext();
    const result = await fetchMembersPage(supabase, {
      churchId,
      page: 1,
      pageSize: 8,
      search: query.trim() || null,
    });

    return result.members.map((m) => ({
      id: m.memberId,
      name: `${m.firstName} ${m.lastName}`.trim(),
    }));
  } catch {
    return [];
  }
}
