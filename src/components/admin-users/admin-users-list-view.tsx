"use client";

import {
  deactivateAdminUserAction,
  resetAuthUserAccessPasswordAction,
  type AdminUserActionResult,
} from "@/app/apps/church/(console)/settings/users/actions";
import { AdminUserFormDrawer } from "@/components/admin-users/admin-user-form-drawer";
import {
  AdminUserAvatar,
  AdminUserRoleChip,
  AdminUserStatusChip,
} from "@/components/admin-users/admin-user-ui";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CopyPasswordDialog } from "@/components/ui/copy-password-dialog";
import { CrudActionMenu } from "@/components/ui/crud-action-menu";
import { CrudPagination } from "@/components/ui/crud-pagination";
import { useActionToast } from "@/hooks/use-action-toast";
import type {
  AdminUserRow,
  ChurchAuthUsersStats,
} from "@/lib/admin-users/types";
import type { AssignableRole } from "@/lib/roles/types";
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

const deactivateInitial: AdminUserActionResult | null = null;

const STAT_CARDS = [
  {
    key: "total" as const,
    label: "Total de usuarios",
    color: "var(--primary)",
    icon: "users" as const,
  },
  {
    key: "active" as const,
    label: "Usuarios activos",
    color: "var(--success)",
    icon: "check" as const,
  },
  {
    key: "inactive" as const,
    label: "Inactivos",
    color: "var(--muted)",
    icon: "x" as const,
  },
  {
    key: "connectedToday" as const,
    label: "Conectados hoy",
    color: "var(--info)",
    icon: "bell" as const,
  },
];

function exportLabel() {
  const now = new Date();
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `Usuarios_${months[now.getMonth()]}${now.getFullYear()}`;
}

export function AdminUsersListView({
  rows,
  stats,
  assignableRoles,
}: {
  rows: AdminUserRow[];
  stats: ChurchAuthUsersStats;
  assignableRoles: AssignableRole[];
}) {
  const tAdmin = useTranslations("adminUsers");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "true" | "false">(
    "all",
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [drawer, setDrawer] = useState<{
    mode: "new" | "edit";
    user: AdminUserRow | null;
  } | null>(null);
  const [confirm, setConfirm] = useState<AdminUserRow | null>(null);
  const [passwordDialog, setPasswordDialog] = useState<{
    title: string;
    message: string;
    email: string;
    password: string;
  } | null>(null);
  const [resetAccessPending, setResetAccessPending] = useState(false);

  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateAdminUserAction,
    deactivateInitial,
  );

  const filtered = useMemo(() => {
    let arr = rows;
    if (activeFilter !== "all") {
      const active = activeFilter === "true";
      arr = arr.filter((it) => it.active === active);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      arr = arr.filter((it) =>
        ["email", "firstName", "lastName", "role"].some((k) =>
          String(it[k as keyof AdminUserRow] ?? "")
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

  useActionToast(deactivateState, {
    successMessage: "Usuario eliminado.",
    onSuccess: () => {
      setConfirm(null);
      router.refresh();
    },
  });

  async function handleResetAccess(user: AdminUserRow) {
    setResetAccessPending(true);
    try {
      const result = await resetAuthUserAccessPasswordAction(user.authUserId);
      if (!result.ok) {
        toast.error(tAdmin("resetFailed"), result.error ?? tErrors("saveFailed"));
        return;
      }

      setPasswordDialog({
        title: tAdmin("accessReset"),
        message: tAdmin("tempPasswordGenerated"),
        email: result.email,
        password: result.tempPassword,
      });
      router.refresh();
    } finally {
      setResetAccessPending(false);
    }
  }

  return (
    <div data-testid="admin-users-list">
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{tAdmin("settingsAccessEyebrow")}</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {tAdmin("users")}{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              {tAdmin("systemSuffix")}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {rows.length} cuentas con acceso administrativo · {stats.active}{" "}
            {tAdmin("activeNow")}
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
            <Icons.download width={16} /> {tCommon("preview")}
          </button>
          <button
            type="button"
            className="btn outline"
            onClick={() =>
              toast.success("Reporte generado", `${exportLabel()}.xlsx descargado`)
            }
          >
            <Icons.download width={16} /> {tCommon("export")}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 14,
          marginTop: 22,
        }}
      >
        {STAT_CARDS.map((s) => {
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
          <button
            type="button"
            className="btn primary"
            onClick={() => setDrawer({ mode: "new", user: null })}
          >
            <Icons.plus width={14} /> {tAdmin("newUser")}
          </button>
        </div>

        {filtered.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th className="col-actions" style={{ width: 44 }}>
                    {tCommon("actions")}
                  </th>
                  <th>{tCommon("user")}</th>
                  <th>{tAdmin("role")}</th>
                  <th>{tAdmin("lastLogin")}</th>
                  <th>{tCommon("status")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((it) => (
                  <tr key={it.id}>
                    <td className="col-actions">
                      <CrudActionMenu
                        onEdit={() => setDrawer({ mode: "edit", user: it })}
                        onResetAccess={() => handleResetAccess(it)}
                        resetAccessPending={resetAccessPending}
                        onDelete={() => setConfirm(it)}
                      />
                    </td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <AdminUserAvatar row={it} />
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {it.firstName} {it.lastName}
                          </div>
                          <div className="tiny muted">{it.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <AdminUserRoleChip role={it.role} />
                    </td>
                    <td>
                      <span className="tiny muted">{it.lastLogin || tCommon("never")}</span>
                    </td>
                    <td>
                      <AdminUserStatusChip active={it.active} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="card" style={{ padding: 48, textAlign: "center" }}>
            <div className="muted" style={{ marginBottom: 12 }}>
              {tAdmin("noRecords")}
            </div>
            <button
              type="button"
              className="btn primary"
              onClick={() => setDrawer({ mode: "new", user: null })}
            >
              <Icons.plus width={14} /> {tAdmin("newUser")}
            </button>
          </div>
        )}

        {total > 0 ? (
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

      <AdminUserFormDrawer
        open={drawer != null}
        mode={drawer?.mode ?? "new"}
        user={drawer?.user ?? null}
        assignableRoles={assignableRoles}
        onClose={() => setDrawer(null)}
        onSaved={() => router.refresh()}
        onPasswordIssued={({ email, tempPassword }) =>
          setPasswordDialog({
            title: tAdmin("systemAccess"),
            message: tAdmin("tempPasswordGenerated"),
            email,
            password: tempPassword,
          })
        }
      />

      <CopyPasswordDialog
        open={passwordDialog !== null}
        title={passwordDialog?.title ?? ""}
        message={passwordDialog?.message ?? ""}
        email={passwordDialog?.email ?? ""}
        password={passwordDialog?.password ?? ""}
        onClose={() => setPasswordDialog(null)}
      />

      {confirm ? (
        <ConfirmDialog
          title={tAdmin("deleteRecord")}
          message={tCommon("cannotUndo")}
          itemName={confirm.email}
          onConfirm={() => {
            const fd = new FormData();
            fd.set("authUserId", confirm.authUserId);
            startTransition(() => deactivateAction(fd));
          }}
          onClose={() => setConfirm(null)}
          pending={deactivatePending}
        />
      ) : null}
    </div>
  );
}
