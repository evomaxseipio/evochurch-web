import { ExpenseTypesListView } from "@/components/catalog/expense-types-list-view";
import { computeCatalogStats } from "@/lib/catalog/parse";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchAllExpenseTypes } from "@/lib/services/expense-types-catalog";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ExpensesSettingsPage() {
  const session = await requirePageAccess("/settings/expenses");

  const supabase = await createClient();
  let error: string | null = null;
  let rows: Awaited<ReturnType<typeof fetchAllExpenseTypes>> = [];

  try {
    rows = await fetchAllExpenseTypes(supabase, session.churchId);
  } catch (e) {
    error =
      e instanceof Error ? e.message : "No se pudieron cargar los tipos de gasto.";
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
    />
  );
}
