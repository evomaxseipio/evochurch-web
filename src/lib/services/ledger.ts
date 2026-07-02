import { catalogTags } from "@/lib/cache/catalog-tags";
import { monthDateBounds, type YearMonth } from "@/lib/finance/month-period";
import {
  parseExpenseTypesResponse,
  parseLedgerPageResponse,
  parseLedgerResponse,
  parseOperationalIncomeTypes,
} from "@/lib/ledger/parse";
import type {
  ExpenseType,
  LedgerEntry,
  LedgerStats,
  LedgerStatusFilter,
  OperationalIncomeInput,
  OperationalIncomeType,
} from "@/lib/ledger/types";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";

export type FinanceLedgerPageResult = {
  entries: LedgerEntry[];
  totalCount: number;
  periodStats: LedgerStats;
  pendingAuthorization: number;
};

export type FetchFinanceLedgerPageParams = {
  churchId: number;
  fundId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  status?: LedgerStatusFilter;
  page: number;
  pageSize: number;
};

export async function fetchFinanceLedgerPage(
  supabase: SupabaseClient,
  params: FetchFinanceLedgerPageParams,
): Promise<FinanceLedgerPageResult> {
  const status =
    params.status && params.status !== "all" ? params.status : null;

  const { data, error } = await supabase.rpc("sp_get_finance_ledger", {
    p_church_id: params.churchId,
    p_fund_id: params.fundId || null,
    p_date_from: params.dateFrom || null,
    p_date_to: params.dateTo || null,
    p_status: status,
    p_page: params.page,
    p_page_size: params.pageSize,
  });

  if (error) throw error;
  return parseLedgerPageResponse(data);
}

export async function fetchFinanceLedger(
  supabase: SupabaseClient,
  churchId: number,
  options?: {
    fundId?: string | null;
    period?: YearMonth | null;
  },
): Promise<{ entries: LedgerEntry[]; pendingAuthorization: number }> {
  let dateFrom: string | null = null;
  let dateTo: string | null = null;

  if (options?.period) {
    const bounds = monthDateBounds(options.period);
    dateFrom = bounds.from;
    dateTo = bounds.to;
  }

  const { data, error } = await supabase.rpc("sp_get_finance_ledger", {
    p_church_id: churchId,
    p_fund_id: options?.fundId || null,
    p_date_from: dateFrom,
    p_date_to: dateTo,
  });

  if (error) throw error;
  return parseLedgerResponse(data);
}

export async function fetchExpenseTypes(
  _supabase: SupabaseClient,
  churchId: number,
): Promise<ExpenseType[]> {
  return unstable_cache(
    () => fetchExpenseTypesFromDb(churchId),
    ["catalog:expense-types-ledger", String(churchId)],
    { tags: [catalogTags.expenseTypes(churchId)], revalidate: 300 },
  )();
}

async function fetchExpenseTypesFromDb(churchId: number): Promise<ExpenseType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("spgetexpensestypes", {
    p_church_id: churchId,
  });

  if (error) throw error;
  return parseExpenseTypesResponse(data);
}

export async function fetchOperationalIncomeTypes(
  _supabase: SupabaseClient,
  churchId: number,
): Promise<OperationalIncomeType[]> {
  return unstable_cache(
    () => fetchOperationalIncomeTypesFromDb(churchId),
    ["catalog:income-types-operational-ledger", String(churchId)],
    { tags: [catalogTags.incomeTypesOperational(churchId)], revalidate: 300 },
  )();
}

async function fetchOperationalIncomeTypesFromDb(
  churchId: number,
): Promise<OperationalIncomeType[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("income_type_catalog")
    .select("id, type_name, description, is_active")
    .eq("church_id", churchId)
    .eq("is_operational", true)
    .order("id");

  if (error) throw error;
  return parseOperationalIncomeTypes(data);
}

const DESCRIPTION_MAX_LENGTH = 250;

function validateOperationalInput(input: OperationalIncomeInput): void {
  if (!input.fundId) throw new Error("Selecciona un fondo.");
  if (!input.incomeTypeId) throw new Error("Selecciona una categoría.");
  if (!input.amount || input.amount <= 0) {
    throw new Error("El monto debe ser mayor que cero.");
  }
  if (!input.description.trim()) {
    throw new Error("La descripción es obligatoria.");
  }
  if (input.description.trim().length > DESCRIPTION_MAX_LENGTH) {
    throw new Error(`La descripción no puede superar ${DESCRIPTION_MAX_LENGTH} caracteres.`);
  }
  if (!input.paymentMethod) throw new Error("Selecciona un método de pago.");
  if (!input.paymentDate) throw new Error("La fecha es obligatoria.");
}

async function syncOperationalContributor(
  supabase: SupabaseClient,
  churchId: number,
  incomeId: string,
  amount: number,
  contributorName?: string | null,
): Promise<void> {
  const { error: deleteError } = await supabase
    .from("income_contributors")
    .delete()
    .eq("income_id", incomeId);

  if (deleteError) throw deleteError;

  const name = contributorName?.trim();
  if (!name) return;

  const { data, error } = await supabase
    .from("contributors")
    .insert({
      church_id: churchId,
      contributor_type: "visitor",
      contact_name: name,
      is_anonymous: false,
    })
    .select("contributor_id")
    .single();

  if (error) throw error;

  const { error: linkError } = await supabase.from("income_contributors").insert({
    income_id: incomeId,
    contributor_id: data.contributor_id,
    amount,
    is_primary: true,
  });

  if (linkError) throw linkError;
}

function operationalEntryPayload(
  churchId: number,
  userId: string,
  input: OperationalIncomeInput,
) {
  const hasContributor = Boolean(input.contributorName?.trim());

  return {
    church_id: churchId,
    fund_id: input.fundId,
    income_type_id: input.incomeTypeId,
    collection_mode: hasContributor ? "individual" : "collective",
    contribution_kind: "monetary",
    amount: input.amount,
    payment_date: input.paymentDate,
    payment_method: input.paymentMethod,
    is_anonymous: !hasContributor,
    notes: input.description.trim(),
    recorded_by: userId,
  };
}

export async function createOperationalIncome(
  supabase: SupabaseClient,
  churchId: number,
  userId: string,
  input: OperationalIncomeInput,
): Promise<void> {
  validateOperationalInput(input);

  const { data, error } = await supabase
    .from("income_entries")
    .insert(operationalEntryPayload(churchId, userId, input))
    .select("income_id")
    .single();

  if (error) throw error;

  await syncOperationalContributor(
    supabase,
    churchId,
    String(data.income_id),
    input.amount,
    input.contributorName,
  );
}

export async function updateOperationalIncome(
  supabase: SupabaseClient,
  churchId: number,
  userId: string,
  input: OperationalIncomeInput,
): Promise<void> {
  const incomeId = input.incomeId?.trim();
  if (!incomeId) throw new Error("Registro no válido.");

  validateOperationalInput(input);

  const { data: existing, error: findError } = await supabase
    .from("income_entries")
    .select("church_id, income_type_id, income_type_catalog(is_operational)")
    .eq("income_id", incomeId)
    .maybeSingle();

  if (findError) throw findError;

  const row = existing as Record<string, unknown> | null;
  if (!row || Number(row.church_id) !== churchId) {
    throw new Error("Ingreso no encontrado.");
  }

  const catalog = row.income_type_catalog as Record<string, unknown> | null;
  if (catalog?.is_operational !== true) {
    throw new Error("Solo se pueden editar ingresos operacionales.");
  }

  const { error } = await supabase
    .from("income_entries")
    .update(operationalEntryPayload(churchId, userId, input))
    .eq("income_id", incomeId)
    .eq("church_id", churchId);

  if (error) throw error;

  await syncOperationalContributor(
    supabase,
    churchId,
    incomeId,
    input.amount,
    input.contributorName,
  );
}

export async function deleteOperationalIncome(
  supabase: SupabaseClient,
  churchId: number,
  incomeId: string,
): Promise<void> {
  const { data: existing, error: findError } = await supabase
    .from("income_entries")
    .select("church_id, income_type_catalog(is_operational)")
    .eq("income_id", incomeId)
    .maybeSingle();

  if (findError) throw findError;

  const row = existing as Record<string, unknown> | null;
  if (!row || Number(row.church_id) !== churchId) {
    throw new Error("Ingreso no encontrado.");
  }

  const catalog = row.income_type_catalog as Record<string, unknown> | null;
  if (catalog?.is_operational !== true) {
    throw new Error("Solo se pueden eliminar ingresos operacionales.");
  }

  const { error: linkError } = await supabase
    .from("income_contributors")
    .delete()
    .eq("income_id", incomeId);

  if (linkError) throw linkError;

  const { error } = await supabase
    .from("income_entries")
    .delete()
    .eq("income_id", incomeId)
    .eq("church_id", churchId);

  if (error) throw error;
}
