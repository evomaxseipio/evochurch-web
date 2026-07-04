import { ExpenseTypesListView } from "@/components/catalog/expense-types-list-view";
import { computeCatalogStats } from "@/lib/catalog/parse";
import {
  canDeleteSettingsCatalog,
  canWriteSettingsCatalog,
} from "@/lib/auth/settings-catalog-permissions";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchAllExpenseTypes } from "@/lib/services/expense-types-catalog";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function ExpensesSettingsPage() {
  const tErrors = await getTranslations("errors");
  const session = await requirePageAccess("/settings/expenses");

  const supabase = await createClient();
  let error: string | null = null;
  let rows: Awaited<ReturnType<typeof fetchAllExpenseTypes>> = [];

  try {
    rows = await fetchAllExpenseTypes(supabase, session.churchId);
  } catch (e) {
    error =
      e instanceof Error ? e.message : tErrors("loadFailed");
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
    <ExpenseTypesListView
      rows={rows}
      stats={computeCatalogStats(rows)}
      canWrite={canWriteSettingsCatalog(session.permissions, "expense_types")}
      canDelete={canDeleteSettingsCatalog(session.permissions, "expense_types")}
    />
  );
}
