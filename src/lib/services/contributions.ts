import { parseIncomeEntriesPageResponse } from "@/lib/contributions/parse";
import type {
  Contribution,
  ContributionCategoryFilter,
  ContributionInput,
  ContributionsStats,
  DonorKind,
  IncomeType,
} from "@/lib/contributions/types";
import { catalogTags } from "@/lib/cache/catalog-tags";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export type IncomeEntriesPageResult = {
  entries: Contribution[];
  totalCount: number;
  periodStats: ContributionsStats;
};

export type FetchIncomeEntriesPageParams = {
  churchId: number;
  fundId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  category?: ContributionCategoryFilter;
  page: number;
  pageSize: number;
};

function parseIncomeTypeRow(row: Record<string, unknown>): IncomeType | null {
  const id = Number(row.id);
  if (!Number.isFinite(id)) return null;

  const category = String(row.category ?? "").toLowerCase();
  if (category !== "tithe" && category !== "offering" && category !== "donation") {
    return null;
  }

  return {
    id,
    typeName: String(row.type_name ?? ""),
    category,
  };
}

export async function fetchIncomeEntriesPage(
  supabase: SupabaseClient,
  params: FetchIncomeEntriesPageParams,
): Promise<IncomeEntriesPageResult> {
  const category =
    params.category && params.category !== "all" ? params.category : null;

  const { data, error } = await supabase.rpc("sp_get_income_entries", {
    p_church_id: params.churchId,
    p_fund_id: params.fundId || null,
    p_date_from: params.dateFrom || null,
    p_date_to: params.dateTo || null,
    p_category: category,
    p_page: params.page,
    p_page_size: params.pageSize,
  });

  if (error) throw error;
  return parseIncomeEntriesPageResponse(data);
}

/** Sin paginación — compatibilidad interna (p_page NULL en RPC). */
export async function fetchIncomeEntries(
  supabase: SupabaseClient,
  churchId: number,
  fundId?: string | null,
): Promise<Contribution[]> {
  const { data, error } = await supabase.rpc("sp_get_income_entries", {
    p_church_id: churchId,
    p_fund_id: fundId || null,
  });

  if (error) throw error;
  const parsed = parseIncomeEntriesPageResponse(data);
  return parsed.entries;
}

export async function fetchIncomeTypes(
  supabase: SupabaseClient,
  churchId: number,
): Promise<IncomeType[]> {
  return unstable_cache(
    async () => {
      const { data, error } = await supabase
        .from("income_type_catalog")
        .select("id, type_name, category")
        .eq("church_id", churchId)
        .eq("is_operational", false)
        .order("id");

      if (error) throw error;

      return (data ?? [])
        .map((row) => parseIncomeTypeRow(row as Record<string, unknown>))
        .filter((t): t is IncomeType => t !== null);
    },
    ["catalog:income-types", String(churchId)],
    { tags: [catalogTags.incomeTypes(churchId)], revalidate: 300 },
  )();
}

async function findOrCreateContributor(
  supabase: SupabaseClient,
  churchId: number,
  input: ContributionInput,
): Promise<string> {
  const donorKind = input.donorKind ?? "member";

  if (donorKind === "anonymous") {
    const { data: existing, error: findError } = await supabase
      .from("contributors")
      .select("contributor_id")
      .eq("church_id", churchId)
      .eq("contributor_type", "anonymous")
      .maybeSingle();

    if (findError) throw findError;
    if (existing?.contributor_id) return String(existing.contributor_id);

    const { data, error } = await supabase
      .from("contributors")
      .insert({
        church_id: churchId,
        contributor_type: "anonymous",
        is_anonymous: true,
      })
      .select("contributor_id")
      .single();

    if (error) throw error;
    return String(data.contributor_id);
  }

  if (donorKind === "company") {
    const companyName = input.companyName?.trim();
    if (!companyName) throw new Error("El nombre de la empresa es obligatorio.");

    const { data, error } = await supabase
      .from("contributors")
      .insert({
        church_id: churchId,
        contributor_type: "company",
        company_name: companyName,
        is_anonymous: false,
      })
      .select("contributor_id")
      .single();

    if (error) throw error;
    return String(data.contributor_id);
  }

  const profileId = input.profileId?.trim();
  if (!profileId) {
    throw new Error("Selecciona un miembro o visitante.");
  }

  const contributorType: DonorKind =
    donorKind === "visitor" ? "visitor" : "member";

  const { data: existing, error: findError } = await supabase
    .from("contributors")
    .select("contributor_id")
    .eq("church_id", churchId)
    .eq("profile_id", profileId)
    .maybeSingle();

  if (findError) throw findError;
  if (existing?.contributor_id) return String(existing.contributor_id);

  const { data, error } = await supabase
    .from("contributors")
    .insert({
      church_id: churchId,
      contributor_type: contributorType,
      profile_id: profileId,
      is_anonymous: false,
    })
    .select("contributor_id")
    .single();

  if (error) throw error;
  return String(data.contributor_id);
}

async function syncContributors(
  supabase: SupabaseClient,
  churchId: number,
  incomeId: string,
  input: ContributionInput,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("income_contributors")
    .delete()
    .eq("income_id", incomeId);

  if (deleteError) throw deleteError;

  if (input.collectionMode !== "individual") return;

  const contributorId = await findOrCreateContributor(
    supabase,
    churchId,
    input,
  );

  const { error: linkError } = await supabase
    .from("income_contributors")
    .insert({
      income_id: incomeId,
      contributor_id: contributorId,
      amount: input.amount,
      is_primary: true,
    });

  if (linkError) throw linkError;
}

function entryPayload(
  churchId: number,
  userId: string,
  input: ContributionInput,
) {
  const isAnonymous =
    input.collectionMode === "individual" && input.donorKind === "anonymous";

  return {
    church_id: churchId,
    fund_id: input.fundId,
    income_type_id: input.incomeTypeId,
    collection_mode: input.collectionMode,
    contribution_kind: "monetary",
    amount: input.amount,
    payment_date: input.paymentDate,
    payment_method: input.paymentMethod,
    is_anonymous: isAnonymous,
    notes: input.notes?.trim() || null,
    recorded_by: userId,
  };
}

function validateContributionInput(input: ContributionInput): void {
  if (!input.fundId) throw new Error("Selecciona un fondo destino.");
  if (!input.incomeTypeId) throw new Error("Selecciona un tipo de ingreso.");
  if (!input.amount || input.amount <= 0) {
    throw new Error("El monto debe ser mayor que cero.");
  }
  if (!input.paymentDate) throw new Error("La fecha es obligatoria.");
  if (!input.paymentMethod) throw new Error("Selecciona un método de pago.");
}

export async function saveContribution(
  supabase: SupabaseClient,
  churchId: number,
  userId: string,
  input: ContributionInput,
): Promise<string> {
  validateContributionInput(input);

  const { data: entry, error: entryError } = await supabase
    .from("income_entries")
    .insert(entryPayload(churchId, userId, input))
    .select("income_id")
    .single();

  if (entryError) throw entryError;

  const incomeId = String(entry.income_id);
  await syncContributors(supabase, churchId, incomeId, input);
  return incomeId;
}

export async function updateContribution(
  supabase: SupabaseClient,
  churchId: number,
  userId: string,
  input: ContributionInput,
): Promise<void> {
  const incomeId = input.incomeId?.trim();
  if (!incomeId) throw new Error("Registro no válido.");

  validateContributionInput(input);

  const { data: existing, error: findError } = await supabase
    .from("income_entries")
    .select("church_id")
    .eq("income_id", incomeId)
    .maybeSingle();

  if (findError) throw findError;

  const row = asRecord(existing);
  if (!row || Number(row.church_id) !== churchId) {
    throw new Error("Contribución no encontrada.");
  }

  const { error: updateError } = await supabase
    .from("income_entries")
    .update(entryPayload(churchId, userId, input))
    .eq("income_id", incomeId);

  if (updateError) throw updateError;

  await syncContributors(supabase, churchId, incomeId, input);
}

export async function deleteContribution(
  supabase: SupabaseClient,
  churchId: number,
  incomeId: string,
): Promise<void> {
  const { data: entry, error: findError } = await supabase
    .from("income_entries")
    .select("church_id")
    .eq("income_id", incomeId)
    .maybeSingle();

  if (findError) throw findError;

  const row = asRecord(entry);
  if (!row || Number(row.church_id) !== churchId) {
    throw new Error("Contribución no encontrada.");
  }

  const { error: linkError } = await supabase
    .from("income_contributors")
    .delete()
    .eq("income_id", incomeId);

  if (linkError) throw linkError;

  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("income_id", incomeId);

  if (error) throw error;
}
