"use server";

import { getActionSession } from "@/lib/auth/app-session";
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
import { revalidatePath } from "next/cache";

export type ContributionActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function sessionContext() {
  const { supabase, session } = await getActionSession();
  return {
    supabase,
    churchId: session.churchId,
    userId: session.authUserId,
  };
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
  if (!input.incomeTypeId) return "Selecciona un tipo de ingreso.";
  if (!input.fundId) return "Selecciona un fondo destino.";
  if (!input.amount || input.amount <= 0) return "El monto debe ser mayor que cero.";
  if (!input.paymentDate) return "La fecha es obligatoria.";
  if (!input.paymentMethod) return "Selecciona un método de pago.";

  if (input.collectionMode === "individual") {
    if (input.donorKind === "anonymous") return null;
    if (input.donorKind === "company" && !input.companyName?.trim()) {
      return "Indica el nombre de la empresa.";
    }
    if (
      (input.donorKind === "member" || input.donorKind === "visitor") &&
      !input.profileId
    ) {
      return "Selecciona un contribuyente.";
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
    if (validationError) return { ok: false, error: validationError };

    const { supabase, churchId, userId } = await sessionContext();

    if (input.incomeId) {
      await updateContribution(supabase, churchId, userId, input);
    } else {
      await saveContribution(supabase, churchId, userId, input);
    }

    revalidatePath("/finances/contributions");
    revalidatePath("/finances/funds");
    revalidatePath("/members");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo registrar el ingreso.",
    };
  }
}

export async function deleteContributionAction(
  _prev: ContributionActionResult | null,
  formData: FormData,
): Promise<ContributionActionResult> {
  try {
    const incomeId = String(formData.get("incomeId") ?? "").trim();
    if (!incomeId) return { ok: false, error: "Registro no válido." };

    const { supabase, churchId } = await sessionContext();
    await deleteContribution(supabase, churchId, incomeId);
    revalidatePath("/finances/contributions");
    revalidatePath("/finances/funds");
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo eliminar la contribución.",
    };
  }
}

export async function searchMembersForContributionAction(
  query: string,
): Promise<{ id: string; name: string }[]> {
  try {
    const { supabase, churchId } = await sessionContext();
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
