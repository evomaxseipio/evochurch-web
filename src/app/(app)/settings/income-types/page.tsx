import { IncomeTypesListView } from "@/components/catalog/income-types-list-view";
import { computeCatalogStats } from "@/lib/catalog/parse";
import {
  canDeleteSettingsCatalog,
  canWriteSettingsCatalog,
} from "@/lib/auth/settings-catalog-permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchOperationalIncomeTypeCatalog } from "@/lib/services/income-types-catalog";
import { createClient } from "@/lib/supabase/server";

export default async function IncomeTypesPage() {
  const session = await requirePageAccess("/settings/income-types");

  const supabase = await createClient();
  let error: string | null = null;
  let rows: Awaited<ReturnType<typeof fetchOperationalIncomeTypeCatalog>> = [];

  try {
    rows = await fetchOperationalIncomeTypeCatalog(supabase, session.churchId);
  } catch (e) {
    error =
      e instanceof Error
        ? e.message
        : "No se pudieron cargar los tipos de ingreso.";
  }

  if (error) {
    return (
      <p
        className="rounded-xl px-4 py-3 text-sm"
        style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
      >
        {error}
      </p>
    );
  }

  return (
    <IncomeTypesListView
      rows={rows}
      stats={computeCatalogStats(rows)}
      canWrite={canWriteSettingsCatalog(session.permissions, "income_types")}
      canDelete={canDeleteSettingsCatalog(session.permissions, "income_types")}
    />
  );
}
