"use client";

import type { CatalogActionResult } from "@/app/(app)/settings/expenses/actions";
import { CatalogFormDrawer } from "@/components/catalog/catalog-form-drawer";
import { CatalogStatusChip } from "@/components/catalog/catalog-status-chip";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CrudActionMenu } from "@/components/ui/crud-action-menu";
import { CrudPagination } from "@/components/ui/crud-pagination";
import { useActionToast } from "@/hooks/use-action-toast";
import type { CatalogStats } from "@/lib/catalog/types";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

type CatalogRow = {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  isLocked: boolean;
};

type StatCardConfig = {
  key: keyof CatalogStats;
  label: string;
  color: string;
  icon: keyof typeof Icons;
};

export function CatalogTypesListView({
  rows,
  stats,
  eyebrow,
  title,
  titleAccent,
  subtitle,
  statCards,
  entityLabel,
  newLabel,
  exportPrefix,
  saveAction,
  deleteAction,
  activeHint,
  canWrite = false,
  canDelete = false,
}: {
  rows: CatalogRow[];
  stats: CatalogStats;
  eyebrow: string;
  title: string;
  titleAccent: string;
  subtitle: string;
  statCards: StatCardConfig[];
  entityLabel: string;
  newLabel: string;
  exportPrefix: string;
  saveAction: (
    prev: CatalogActionResult | null,
    formData: FormData,
  ) => Promise<CatalogActionResult>;
  deleteAction: (
    prev: CatalogActionResult | null,
    formData: FormData,
  ) => Promise<CatalogActionResult>;
  activeHint: string;
  canWrite?: boolean;
  canDelete?: boolean;
}) {
  const tCommon = useTranslations("common");
  const tCatalogs = useTranslations("catalogs");
  const router = useRouter();
  const deleteInitial: CatalogActionResult | null = null;

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawer, setDrawer] = useState<{
    mode: "new" | "edit";
    row: CatalogRow | null;
  } | null>(null);
  const [confirm, setConfirm] = useState<CatalogRow | null>(null);

  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteAction,
    deleteInitial,
  );

  const filtered = useMemo(() => {
    let arr = rows;
    if (activeFilter !== "all") {
      const active = activeFilter === "true";
      arr = arr.filter((it) => it.isActive === active);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((it) =>
        ["name", "description"].some((k) =>
          String(it[k as keyof CatalogRow] ?? "")
            .toLowerCase()
            .includes(q),
        ),
      );
    }
    return arr;
  }, [rows, query, activeFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, activeFilter, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  useActionToast(deleteState, {
    successMessage: `${entityLabel} eliminado.`,
    onSuccess: () => {
      setConfirm(null);
      router.refresh();
    },
  });

  function handleDeleteConfirm() {
    if (!confirm) return;
    const fd = new FormData();
    fd.set("id", String(confirm.id));
    fd.set("isLocked", confirm.isLocked ? "true" : "false");
    startTransition(() => deleteFormAction(fd));
  }

  function exportLabel() {
    const now = new Date();
    const months = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
    ];
    return `${exportPrefix}_${months[now.getMonth()]}${now.getFullYear()}`;
  }

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{eyebrow}</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {title}{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              {titleAccent}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {subtitle}
          </p>
        </div>
        <div className="row">
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel()}.pdf descargado`)
            }
          >
            <Icons.download width={16} /> PDF
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel()}.xlsx descargado`)
            }
          >
            <Icons.download width={16} /> Excel
          </button>
        </div>
      </div>

      <div className="catalog-stats-grid" style={{ gap: 14, marginTop: 22 }}>
        {statCards.map((s) => {
          const Icon = Icons[s.icon];
          return (
            <div
              key={s.key}
              className="card"
              style={{
                padding: "16px 18px",
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div className="row between" style={{ alignItems: "center" }}>
                <div className="eyebrow">{s.label}</div>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 10,
                    flexShrink: 0,
                    background: `color-mix(in oklab, ${s.color} 16%, transparent)`,
                    display: "grid",
                    placeItems: "center",
                    color: s.color,
                  }}
                >
                  <Icon width={16} />
                </div>
              </div>
              <div
                className="display"
                style={{
                  fontSize: 36,
                  lineHeight: 1,
                  letterSpacing: "-0.02em",
                  color: s.color,
                }}
              >
                {stats[s.key]}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <div
          className="card flat"
          style={{
            padding: 12,
            marginBottom: 12,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div className="search" style={{ flex: 1, minWidth: 220, width: "auto" }}>
            <Icons.search width={14} stroke="var(--muted)" />
            <input
              placeholder={tCommon("searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div
            className="row"
            style={{
              gap: 2,
              padding: 3,
              background: "var(--bg-2)",
              borderRadius: 8,
              border: "1px solid var(--line)",
            }}
          >
            {[
              { value: "all" as const, label: tCommon("all") },
              { value: "true" as const, label: tCommon("active") },
              { value: "false" as const, label: tCommon("inactive") },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="btn sm"
                style={{
                  background:
                    activeFilter === opt.value ? "var(--bg-1)" : "transparent",
                  color:
                    activeFilter === opt.value ? "var(--fg)" : "var(--muted)",
                  border: `1px solid ${activeFilter === opt.value ? "var(--line)" : "transparent"}`,
                  fontWeight: 500,
                  padding: "4px 10px",
                }}
                onClick={() => setActiveFilter(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {canWrite ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setDrawer({ mode: "new", row: null })}
            >
              <Icons.plus width={14} /> {newLabel}
            </button>
          ) : null}
        </div>

        {filtered.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  {canWrite || canDelete ? (
                    <th className="col-actions" style={{ width: 44 }}>
                      {tCommon("actions")}
                    </th>
                  ) : null}
                  <th>{tCommon("type")}</th>
                  <th>{tCommon("description")}</th>
                  <th>{tCommon("status")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((it) => (
                  <tr key={it.id}>
                    {canWrite || canDelete ? (
                      <td className="col-actions">
                        <CrudActionMenu
                          onEdit={
                            canWrite
                              ? () => setDrawer({ mode: "edit", row: it })
                              : undefined
                          }
                          onDelete={
                            canDelete && !it.isLocked
                              ? () => setConfirm(it)
                              : undefined
                          }
                        />
                      </td>
                    ) : null}
                    <td>
                      <span style={{ fontWeight: 600 }}>{it.name}</span>
                      {it.isLocked ? (
                        <span
                          className="chip info"
                          style={{ marginLeft: 8, fontSize: 10 }}
                        >
                          {tCommon("system")}
                        </span>
                      ) : null}
                    </td>
                    <td>
                      <span className="muted" style={{ fontSize: 13 }}>
                        {it.description || tCatalogs("dash")}
                      </span>
                    </td>
                    <td>
                      <CatalogStatusChip active={it.isActive} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div className="muted" style={{ marginBottom: 12 }}>
              {tCatalogs("noRecords")}
            </div>
            {canWrite ? (
              <button
                type="button"
                className="btn primary"
                onClick={() => setDrawer({ mode: "new", row: null })}
              >
                <Icons.plus width={14} /> {newLabel}
              </button>
            ) : null}
          </div>
        )}

        {filtered.length > 0 ? (
          <CrudPagination
            page={safePage}
            totalPages={totalPages}
            total={total}
            pageStart={pageStart}
            pageEnd={pageEnd}
            pageSize={pageSize}
            onPage={setPage}
            onPageSize={setPageSize}
          />
        ) : null}
      </div>

      <CatalogFormDrawer
        mode={drawer?.mode ?? "new"}
        row={drawer?.row ?? null}
        open={drawer != null}
        onClose={() => setDrawer(null)}
        entityLabel={entityLabel}
        saveAction={saveAction}
        activeHint={activeHint}
      />

      {confirm ? (
        <ConfirmDialog
          title={tCatalogs("deleteEntityTitle", { entity: entityLabel.toLowerCase() })}
          message={tCatalogs("deleteEntityMessage", { name: confirm.name })}
          itemName={confirm.name}
          onConfirm={handleDeleteConfirm}
          onClose={() => setConfirm(null)}
          pending={deletePending}
        />
      ) : null}
    </div>
  );
}
