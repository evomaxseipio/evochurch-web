"use client";

import {
  deleteMinistryAction,
  saveMinistryAction,
} from "@/app/(app)/ministerios/actions";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  canCreateMinistryWith,
  canEditMinistryWith,
  canReadMembersWith,
  canWriteContributionsWith,
  canWriteFundsWith,
} from "@/lib/auth/permissions";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { MinistryCard } from "@/components/ministries/ministry-card";
import { MinistryFormDrawer } from "@/components/ministries/ministry-form-drawer";
import { MinistryFundsDialog } from "@/components/ministries/ministry-funds-dialog";
import { MinistryMembersDialog } from "@/components/ministries/ministry-members-dialog";
import {
  MemberAvatarStack,
  MinistryActionMenu,
  MinistryFeaturedBadge,
  MinistryIcon,
  MinistryLeaderRow,
  MinistryStatusChip,
} from "@/components/ministries/ministry-ui";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import { useActionToast } from "@/hooks/use-action-toast";
import type { Member } from "@/lib/members/types";
import {
  filterMinistries,
  formatMinistryDate,
  sortMinistriesForDisplay,
} from "@/lib/ministries/parse";
import type {
  Ministry,
  MinistryStats,
  MinistryStatusFilter,
  MinistryViewMode,
} from "@/lib/ministries/types";
import type { Fund } from "@/lib/funds/types";
import type { IconName } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState, startTransition, useActionState } from "react";

const PAGE_SIZE_OPTIONS = [10, 15, 25, 50] as const;
type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

const STATUS_FILTERS: { key: MinistryStatusFilter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "active", label: "Activos" },
  { key: "inactive", label: "Inactivos" },
];

const STAT_CARDS: {
  key: keyof MinistryStats;
  label: string;
  color: string;
  icon: IconName;
}[] = [
  { key: "total", label: "Ministerios", color: "var(--accent)", icon: "users" },
  { key: "active", label: "Activos", color: "var(--success)", icon: "check" },
  { key: "leaders", label: "Líderes", color: "var(--lila)", icon: "pin" },
  {
    key: "members",
    label: "Hermanos en ministerios",
    color: "var(--accent)",
    icon: "users",
  },
];

export function MinistriesListView({
  ministries,
  stats,
  members,
  funds,
  permissions,
  profileId,
}: {
  ministries: Ministry[];
  stats: MinistryStats;
  members: Member[];
  funds: Fund[];
  permissions: PermissionKey[];
  profileId: string;
}) {
  const t = useTranslations("ministerios");
  const tCommon = useTranslations("common");
  const canCreate = canCreateMinistryWith(permissions);
  const canViewProfiles = canReadMembersWith(permissions);
  const canManageFunds = canWriteFundsWith(permissions);
  const canRecordContribution = canWriteContributionsWith(permissions);
  const router = useRouter();
  const deleteInitial = null;
  const [deleteState, deleteFormAction, deletePending] = useActionState(
    deleteMinistryAction,
    deleteInitial,
  );

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<MinistryStatusFilter>("all");
  const [view, setView] = useState<MinistryViewMode>("grid");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    ministry: Ministry | null;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Ministry | null>(null);
  const [membersDialogTarget, setMembersDialogTarget] = useState<Ministry | null>(
    null,
  );
  const [fundsDialogTarget, setFundsDialogTarget] = useState<Ministry | null>(
    null,
  );

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter, pageSize, view]);

  useActionToast(deleteState, {
    successMessage: t("deleted"),
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
  });

  const filtered = useMemo(
    () => filterMinistries(ministries, query, statusFilter, members),
    [ministries, query, statusFilter, members],
  );

  const sorted = useMemo(
    () => sortMinistriesForDisplay(filtered),
    [filtered],
  );

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);

  const pageRows = useMemo(
    () => sorted.slice(pageStart, pageEnd),
    [sorted, pageStart, pageEnd],
  );

  const confirmDelete = () => {
    if (!deleteTarget || deletePending) return;
    const fd = new FormData();
    fd.set("id", deleteTarget.id);
    startTransition(() => deleteFormAction(fd));
  };

  const menuHandlers = (ministry: Ministry) => {
    const editable = canEditMinistryWith(
      permissions,
      profileId,
      ministry.leaderProfileIds,
    );
    const noop = () => {};
    return {
      onEdit: editable ? () => setFormState({ mode: "edit", ministry }) : noop,
      onViewMembers: () => setMembersDialogTarget(ministry),
      onViewFunds: () => setFundsDialogTarget(ministry),
      onAssignLeader: editable ? () => setFormState({ mode: "edit", ministry }) : noop,
      onViewEvents: () => router.push("/eventos"),
      onDelete: editable ? () => setDeleteTarget(ministry) : noop,
    };
  };

  return (
    <div>
      <div
        className="row between"
        style={{ flexWrap: "wrap", gap: 16, marginBottom: 24 }}
      >
        <div>
          <div className="eyebrow">{t("eyebrow")}</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {t("title")}{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              {t("teamsSuffix")}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("subtitle")}
          </p>
        </div>
      </div>

      <div className="grid-12" style={{ marginBottom: 22 }}>
        {STAT_CARDS.map((card) => (
          <div key={card.key} className="span-3">
            <KpiCard
              label={card.label}
              value={String(stats[card.key])}
              icon={card.icon}
              accent={card.color}
            />
          </div>
        ))}
      </div>

      <FilterToolbar
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder={t("searchPlaceholder")}
        searchWidthPercent={40}
        filters={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        trailing={
          <>
            <div
              className="row"
              style={{
                gap: 4,
                padding: 4,
                background: "var(--surface-2)",
                borderRadius: 10,
              }}
            >
              {(
                [
                  ["grid", <Icons.grid key="grid" size={16} />],
                  ["list", <Icons.list key="list" size={16} />],
                ] as const
              ).map(([mode, icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className="btn sm icon-only"
                  title={mode === "grid" ? tCommon("gridView") : tCommon("listView")}
                  style={{
                    background:
                      view === mode ? "var(--surface)" : "transparent",
                    color: view === mode ? "var(--accent)" : "var(--ink-3)",
                    boxShadow: view === mode ? "var(--shadow-1)" : "none",
                    padding: 7,
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
            {canCreate ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setFormState({ mode: "new", ministry: null })}
            >
              <Icons.plus size={14} /> {t("addMinistry")}
            </button>
            ) : null}
          </>
        }
      />

      {view === "grid" ? (
        <div className="grid-12">
          {pageRows.map((ministry) => (
            <MinistryCard
              key={ministry.id}
              ministry={ministry}
              members={members}
              {...menuHandlers(ministry)}
            />
          ))}
          {total === 0 ? (
            <div className="card span-12" style={{ padding: 40, textAlign: "center" }}>
              <div className="muted">
                {t("noMatches")}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <DataTable
          rows={pageRows}
          rowKey={(row) => row.id}
          actions={(row) => (
            <MinistryActionMenu ministry={row} {...menuHandlers(row)} />
          )}
          empty={
            <tr>
              <td colSpan={6} style={{ textAlign: "center", padding: 40 }} className="muted">
                {t("noMatches")}
              </td>
            </tr>
          }
          columns={[
            {
              key: "name",
              label: tCommon("name"),
              render: (row) => (
                <div className="row" style={{ gap: 10, alignItems: "center" }}>
                  <MinistryIcon
                    name={row.name}
                    color={row.color}
                    size={28}
                    radius={7}
                    fontSize={11}
                  />
                  <div>
                    <span style={{ fontWeight: 600 }}>{row.name}</span>
                    {row.isFeatured ? (
                      <span style={{ marginLeft: 6 }}>
                        <MinistryFeaturedBadge />
                      </span>
                    ) : null}
                  </div>
                </div>
              ),
            },
            {
              key: "status",
              label: tCommon("status"),
              render: (row) => <MinistryStatusChip active={row.isActive} />,
            },
            {
              key: "leader",
              label: t("leader"),
              render: (row) => (
                <MinistryLeaderRow
                  ministry={row}
                  members={members}
                  onClick={() => setMembersDialogTarget(row)}
                />
              ),
            },
            {
              key: "members",
              label: t("members"),
              render: (row) => (
                <MemberAvatarStack
                  memberIds={row.memberProfileIds}
                  members={members}
                  max={3}
                  onClick={() => setMembersDialogTarget(row)}
                />
              ),
            },
            {
              key: "createdAt",
              label: t("activeSince"),
              render: (row) => (
                <span className="muted tnum">{formatMinistryDate(row.createdAt)}</span>
              ),
            },
          ]}
        />
      )}

      {total > 0 ? (
        <PaginationBar
          page={safePage}
          totalPages={totalPages}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => setPageSize(size as PageSize)}
          noun={t("title").toLowerCase()}
          sizeOptions={PAGE_SIZE_OPTIONS}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={t("deleteMinistry")}
          message={t("deleteMinistryMessage")}
          itemName={deleteTarget.name}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}

      <MinistryFormDrawer
        mode={formState?.mode ?? "new"}
        ministry={formState?.ministry ?? null}
        members={members}
        open={formState != null}
        onClose={() => setFormState(null)}
        saveAction={saveMinistryAction}
      />

      <MinistryMembersDialog
        ministry={membersDialogTarget}
        members={members}
        canViewProfiles={canViewProfiles}
        open={membersDialogTarget != null}
        onClose={() => setMembersDialogTarget(null)}
      />

      <MinistryFundsDialog
        ministry={fundsDialogTarget}
        funds={funds}
        canManageFunds={canManageFunds}
        canRecordContribution={canRecordContribution}
        open={fundsDialogTarget != null}
        onClose={() => setFundsDialogTarget(null)}
      />
    </div>
  );
}
