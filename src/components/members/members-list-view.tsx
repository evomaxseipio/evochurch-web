"use client";

import {
  fetchContributionCatalogAction,
} from "@/app/(app)/members/actions";
import {
  getMemberSystemAccessContextAction,
  resetMemberAccessPasswordAction,
} from "@/app/(app)/settings/users/actions";
import { SYSTEM_ACCESS_MESSAGES } from "@/lib/admin-users/eligibility";
import type { AdminUserRow } from "@/lib/admin-users/types";
import type { PresetContributor } from "@/components/contributions/contribution-form-drawer";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import {
  MemberAvatar,
  RoleChip,
  StatusChip,
} from "@/components/members/member-ui";
import { Icons } from "@/components/icons";
import { CopyPasswordDialog } from "@/components/ui/copy-password-dialog";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import {
  buildMembersListUrl,
  DEFAULT_MEMBERS_PAGE_SIZE,
  MEMBERS_PAGE_SIZE_OPTIONS,
  type MembersPageSize,
} from "@/lib/members/pagination";
import { formatNumber } from "@/lib/i18n/format";
import { memberFullName } from "@/lib/members/parse";
import type {
  Member,
  MemberFilterKey,
  MembersListStats,
  MembersPagination,
} from "@/lib/members/types";
import type { AssignableRole } from "@/lib/roles/types";
import type { IncomeType } from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import Link from "next/link";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import dynamic from "next/dynamic";
import { type Locale } from "@/i18n/config";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

const AddMemberModal = dynamic(
  () =>
    import("@/components/members/add-member-modal").then((m) => m.AddMemberModal),
  { ssr: false },
);

const ContributionFormDrawer = dynamic(
  () =>
    import("@/components/contributions/contribution-form-drawer").then(
      (m) => m.ContributionFormDrawer,
    ),
  { ssr: false },
);

const AdminUserFormDrawer = dynamic(
  () =>
    import("@/components/admin-users/admin-user-form-drawer").then(
      (m) => m.AdminUserFormDrawer,
    ),
  { ssr: false },
);

const FILTERS: MemberFilterKey[] = ["all", "members", "visits", "active", "inactive"];

const MINI_STATS: {
  key: MemberFilterKey;
  labelKey: string;
  delta: string;
  dir: "up" | "dn";
  color: string;
  icon: keyof typeof Icons;
}[] = [
  { key: "members", labelKey: "membersFilter", delta: "+12.4%", dir: "up", color: "var(--success)", icon: "users" },
  { key: "visits", labelKey: "totalVisits", delta: "+8.2%", dir: "up", color: "var(--info)", icon: "pin" },
  { key: "inactive", labelKey: "statusInactive", delta: "-3.1%", dir: "dn", color: "var(--muted)", icon: "arrowDn" },
  { key: "active", labelKey: "statusActive", delta: "+2", dir: "up", color: "var(--accent-600)", icon: "users" },
];

export function MembersListView({
  members,
  roles,
  stats,
  pagination,
  filter,
  query: queryFromServer,
  canManageUsers,
  canWriteMembers,
  canDeleteMembers,
  canWriteContributions,
  systemAccessProfileIds = [],
  assignableRoles = [],
}: {
  members: Member[];
  roles: MemberRoleCatalog[];
  stats: MembersListStats;
  pagination: MembersPagination;
  filter: MemberFilterKey;
  query: string;
  canManageUsers: boolean;
  canWriteMembers: boolean;
  canDeleteMembers: boolean;
  canWriteContributions: boolean;
  systemAccessProfileIds?: string[];
  assignableRoles?: AssignableRole[];
}) {
  const t = useTranslations("members");
  const tErrors = useTranslations("errors");
  const tValidation = useTranslations("validation");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(queryFromServer);
  const [addOpen, setAddOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [contributionMember, setContributionMember] = useState<Member | null>(null);
  const [contributionCatalogs, setContributionCatalogs] = useState<{
    funds: Fund[];
    incomeTypes: IncomeType[];
  }>({ funds: [], incomeTypes: [] });
  const [contributionCatalogsLoading, setContributionCatalogsLoading] =
    useState(false);
  const [systemUserDrawer, setSystemUserDrawer] = useState<{
    mode: "new" | "edit";
    member: Member;
    user: AdminUserRow | null;
    initialTempPassword: string | null;
  } | null>(null);
  const [systemUserPending, setSystemUserPending] = useState(false);
  const [resetAccessPending, setResetAccessPending] = useState(false);
  const [passwordDialog, setPasswordDialog] = useState<{
    title: string;
    message: string;
    email: string;
    password: string;
  } | null>(null);
  const isDesktop = useIsDesktop();
  const numberFmt = (value: number) => formatNumber(value, locale);

  function resolveErrorMessage(errorKey?: string) {
    if (!errorKey) return tErrors("serverError");
    if (errorKey.startsWith("errors.")) return tErrors(errorKey.slice(7));
    if (errorKey.startsWith("validation.")) return tValidation(errorKey.slice(11));
    if (errorKey.startsWith("members.")) return t(errorKey.slice(8));
    return tErrors("serverError");
  }

  function filterLabel(key: MemberFilterKey) {
    if (key === "all") return t("allFilter");
    if (key === "members") return t("membersFilter");
    if (key === "visits") return t("visitsFilter");
    if (key === "active") return t("statusActivePlural");
    return t("statusInactivePlural");
  }

  const systemAccessSet = useMemo(
    () => new Set(systemAccessProfileIds),
    [systemAccessProfileIds],
  );

  const page = pagination.page;
  const pageSize: MembersPageSize = MEMBERS_PAGE_SIZE_OPTIONS.includes(
    pagination.pageSize as MembersPageSize,
  )
    ? (pagination.pageSize as MembersPageSize)
    : DEFAULT_MEMBERS_PAGE_SIZE;
  const totalPages = Math.max(1, pagination.totalPages);
  const total = pagination.total;
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + members.length, total);
  const filterChips = FILTERS.map((key) => ({ key, label: filterLabel(key) }));

  useEffect(() => {
    if (searchInput === queryFromServer) return;
    const timer = window.setTimeout(() => {
      router.push(
        buildMembersListUrl({
          filter,
          query: searchInput,
          page: 1,
          pageSize,
        }),
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, queryFromServer, filter, pageSize, router]);

  function listUrl(next: {
    filter?: MemberFilterKey;
    query?: string;
    page?: number;
    pageSize?: number;
  }) {
    return buildMembersListUrl({
      filter: next.filter ?? filter,
      query: next.query ?? searchInput,
      page: next.page ?? page,
      pageSize: next.pageSize ?? pageSize,
    });
  }

  function onFilterChange(key: MemberFilterKey) {
    router.push(listUrl({ filter: key, page: 1 }));
  }

  function onPage(next: number) {
    router.push(listUrl({ page: next }));
  }

  function onPageSize(next: MembersPageSize) {
    router.push(listUrl({ pageSize: next, page: 1 }));
  }

  function statCount(key: MemberFilterKey): number {
    if (key === "all") return stats.total;
    if (key === "members") return stats.members;
    if (key === "visits") return stats.visits;
    if (key === "active") return stats.active;
    return stats.inactive;
  }

  function memberPresetContributor(member: Member): PresetContributor {
    return {
      profileId: member.memberId,
      profileName: memberFullName(member),
      donorKind: member.isMember ? "member" : "visitor",
    };
  }

  async function openContributionDrawer(member: Member) {
    setContributionMember(member);
    if (
      contributionCatalogs.funds.length > 0 &&
      contributionCatalogs.incomeTypes.length > 0
    ) {
      return;
    }

    setContributionCatalogsLoading(true);
    try {
      const result = await fetchContributionCatalogAction();
      if (!result.ok) {
        toast.error(t("contributionsTitle"), resolveErrorMessage(result.errorKey));
        setContributionMember(null);
        return;
      }
      setContributionCatalogs({
        funds: result.funds,
        incomeTypes: result.incomeTypes,
      });
    } finally {
      setContributionCatalogsLoading(false);
    }
  }

  async function handleConfigureSystemUser(member: Member) {
    if (!canManageUsers) {
      toast.error(
        t("accessDenied"),
        t("onlyGeneralAdminUsers"),
      );
      return;
    }

    if (!member.isMember) {
      toast.error(t("accessNotAllowed"), SYSTEM_ACCESS_MESSAGES.visit);
      return;
    }

    setSystemUserPending(true);
    try {
      const result = await getMemberSystemAccessContextAction(member.memberId);
      if (!result.ok) {
        toast.error(t("accessNotAllowed"), result.error);
        return;
      }

      setSystemUserDrawer({
        mode: result.existingUser ? "edit" : "new",
        member,
        user: result.existingUser,
        initialTempPassword: result.tempPassword,
      });
    } finally {
      setSystemUserPending(false);
    }
  }

  async function handleResetAccess(member: Member) {
    if (!canManageUsers) {
      toast.error(
        t("accessDenied"),
        t("onlyGeneralAdminReset"),
      );
      return;
    }

    if (!member.isMember) {
      toast.error(t("accessNotAllowed"), SYSTEM_ACCESS_MESSAGES.visit);
      return;
    }

    setResetAccessPending(true);
    try {
      const result = await resetMemberAccessPasswordAction(member.memberId);
      if (!result.ok) {
        toast.error(t("resetFailed"), result.error);
        return;
      }

      setPasswordDialog({
        title: t("accessReset"),
        message: t("tempPasswordResetHint"),
        email: result.email,
        password: result.tempPassword,
      });
      router.refresh();
    } finally {
      setResetAccessPending(false);
    }
  }

  return (
    <>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("community")}</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            {t("title")} <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>{t("familyMembers")}</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("registeredCount", { total: numberFmt(stats.total), view: numberFmt(total) })}
          </p>
        </div>
        <div className="row">
          <Link
            href="/reports?report=membership-directory"
            className="btn outline"
          >
            <Icons.download size={16} /> {t("exportInReports")}
          </Link>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "2fr 1fr 1fr 1fr 1fr" : "1fr",
          gap: 14,
          marginTop: 22,
        }}
      >
        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div className="eyebrow">{t("totalMembers")}</div>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "var(--accent-soft)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icons.users size={18} stroke="var(--accent)" />
            </div>
          </div>
          <div className="row" style={{ alignItems: "center", gap: 14 }}>
            <div className="display" style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--primary)" }}>
              {stats.total}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>▲ activos {stats.active}</span>
              <span className="tiny muted">{t("inChurch")}</span>
            </div>
          </div>
        </div>

        {isDesktop
          ? MINI_STATS.map((s) => {
              const Icon = Icons[s.icon];
              const v = statCount(s.key);
              return (
                <div key={s.key} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
                  <div className="row between" style={{ alignItems: "center" }}>
                    <div className="eyebrow">{t(s.labelKey)}</div>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: `color-mix(in oklab, ${s.color} 16%, transparent)`,
                        display: "grid",
                        placeItems: "center",
                        color: s.color,
                      }}
                    >
                      <Icon size={16} />
                    </div>
                  </div>
                  <div className="row" style={{ alignItems: "center", gap: 12 }}>
                    <div className="display" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", color: s.color }}>
                      {v}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: s.dir === "up" ? "var(--success)" : "var(--danger)" }}>
                        {s.dir === "up" ? "▲" : "▼"} {s.delta}
                      </span>
                      <span className="tiny muted">{t("vsPrevious")}</span>
                    </div>
                  </div>
                </div>
              );
            })
          : null}
      </div>

      {!isDesktop ? (
        <div className="row" style={{ gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          {FILTERS.map((key) => (
            <button
              key={key}
              type="button"
              className={`btn sm${filter === key ? " primary" : ""}`}
              onClick={() => onFilterChange(key)}
            >
              {filterLabel(key)} ({statCount(key)})
            </button>
          ))}
        </div>
      ) : null}

      <FilterToolbar
        style={{ marginTop: 18 }}
        query={searchInput}
        onQueryChange={setSearchInput}
        queryPlaceholder={t("searchPlaceholder")}
        searchWidthPercent={50}
        filters={isDesktop ? filterChips : undefined}
        activeFilter={filter}
        onFilterChange={onFilterChange}
        trailing={
          canWriteMembers ? (
            <button type="button" className="btn primary" onClick={() => setAddOpen(true)}>
              <Icons.plus size={14} /> {t("newMemberButton")}
            </button>
          ) : null
        }
      />

      {isDesktop ? (
        <DataTable
          style={{ marginTop: 18, position: "relative" }}
          columns={[
            {
              key: "member",
              label: t("member"),
              render: (m) => (
                <div className="row" style={{ gap: 12 }}>
                  <MemberAvatar member={m} size="md" square />
                  <div>
                    <div style={{ fontWeight: 600 }}>{memberFullName(m)}</div>
                    <div className="tiny muted">
                      {m.contact.phone || m.contact.mobilePhone || "—"}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              label: t("role"),
              className: "muted",
              render: (m) => m.membershipRole || "—",
            },
            {
              key: "ministry",
              label: t("ministry"),
              className: "muted",
              render: () => "—",
            },
            {
              key: "sector",
              label: t("sector"),
              className: "muted",
              render: (m) =>
                m.address.stateProvince || m.address.cityState || "—",
            },
            {
              key: "nationality",
              label: t("nationality"),
              className: "muted",
              render: (m) => m.nationality || "—",
            },
            {
              key: "status",
              label: t("status"),
              render: (m) => <StatusChip member={m} />,
            },
          ]}
          rows={members}
          rowKey={(m) => m.memberId}
          onRowClick={(m) => router.push(`/members/profile?id=${m.memberId}`)}
          actions={(m) => (
            <RowMenu
              open={menuId === m.memberId}
              onToggle={() =>
                setMenuId((current) =>
                  current === m.memberId ? null : m.memberId,
                )
              }
              onClose={() => setMenuId(null)}
              member={m}
              canManageUsers={canManageUsers}
              canWriteMembers={canWriteMembers}
              canWriteContributions={canWriteContributions}
              canDeleteMembers={canDeleteMembers}
              hasSystemAccess={systemAccessSet.has(m.memberId)}
              onAddContribution={() => void openContributionDrawer(m)}
              onConfigureSystemUser={() => handleConfigureSystemUser(m)}
              onResetAccess={() => handleResetAccess(m)}
              configureUserPending={systemUserPending}
              resetAccessPending={resetAccessPending}
            />
          )}
          empty={
            <>
              <div className="display" style={{ fontSize: 22 }}>
                {t("noResults")}
              </div>
              <div className="tiny muted">
                {t("noResultsHint")}
              </div>
            </>
          }
        />
      ) : (
        <div className="col" style={{ gap: 10, marginTop: 18 }}>
          {members.length === 0 ? (
            <div className="card" style={{ padding: 40, textAlign: "center" }}>
              <div className="display" style={{ fontSize: 22 }}>{t("noResults")}</div>
              <div className="tiny muted">{t("tryAnotherSearch")}</div>
            </div>
          ) : (
            members.map((m) => (
              <div key={m.memberId} className="card" style={{ padding: 14, position: "relative" }}>
                <div style={{ position: "absolute", top: 12, right: 12 }}>
                  <RowMenu
                    open={menuId === m.memberId}
                    onToggle={() =>
                      setMenuId((current) =>
                        current === m.memberId ? null : m.memberId,
                      )
                    }
                    onClose={() => setMenuId(null)}
                    member={m}
                    canManageUsers={canManageUsers}
                    canWriteMembers={canWriteMembers}
                    canWriteContributions={canWriteContributions}
                    canDeleteMembers={canDeleteMembers}
                    hasSystemAccess={systemAccessSet.has(m.memberId)}
                    onAddContribution={() => void openContributionDrawer(m)}
                    onConfigureSystemUser={() => handleConfigureSystemUser(m)}
                    onResetAccess={() => handleResetAccess(m)}
                    configureUserPending={systemUserPending}
                    resetAccessPending={resetAccessPending}
                  />
                </div>
                <Link href={`/members/profile?id=${m.memberId}`} className="row" style={{ gap: 12, textDecoration: "none", color: "inherit" }}>
                  <MemberAvatar member={m} size="md" square />
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 36 }}>
                    <div style={{ fontWeight: 600 }}>{memberFullName(m)}</div>
                    <div className="tiny muted">{m.contact.email || m.contact.phone}</div>
                    <div className="row" style={{ gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                      <RoleChip role={m.membershipRole} />
                      <StatusChip member={m} />
                    </div>
                  </div>
                </Link>
              </div>
            ))
          )}
        </div>
      )}

      {total > 0 ? (
        <Pagination
          page={page}
          pageSize={pageSize}
          totalPages={totalPages}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
          onPage={onPage}
          onPageSize={onPageSize}
        />
      ) : null}

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} roles={roles} />

      <ContributionFormDrawer
        mode="new"
        entry={null}
        open={contributionMember !== null && !contributionCatalogsLoading}
        onClose={() => setContributionMember(null)}
        funds={contributionCatalogs.funds}
        incomeTypes={contributionCatalogs.incomeTypes}
        presetContributor={
          contributionMember ? memberPresetContributor(contributionMember) : null
        }
      />

      <AdminUserFormDrawer
        open={systemUserDrawer !== null}
        mode={systemUserDrawer?.mode ?? "new"}
        user={systemUserDrawer?.user ?? null}
        assignableRoles={assignableRoles}
        presetMember={systemUserDrawer?.member ?? null}
        initialTempPassword={systemUserDrawer?.initialTempPassword ?? null}
        onClose={() => setSystemUserDrawer(null)}
        onSaved={() => router.refresh()}
        onPasswordIssued={({ email, tempPassword }) =>
          setPasswordDialog({
            title: t("systemAccessTitle"),
            message: t("tempPasswordCreatedHint"),
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
    </>
  );
}

function RowMenu({
  open,
  onToggle,
  onClose,
  member,
  canManageUsers,
  canWriteMembers,
  canWriteContributions,
  canDeleteMembers,
  hasSystemAccess,
  onAddContribution,
  onConfigureSystemUser,
  onResetAccess,
  configureUserPending,
  resetAccessPending,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  member: Member;
  canManageUsers: boolean;
  canWriteMembers: boolean;
  canWriteContributions: boolean;
  canDeleteMembers: boolean;
  hasSystemAccess: boolean;
  onAddContribution: () => void;
  onConfigureSystemUser: () => void;
  onResetAccess: () => void;
  configureUserPending: boolean;
  resetAccessPending: boolean;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const btnRef = useRef<HTMLButtonElement>(null);
  const [menuPos, setMenuPos] = useState<{
    top: number | "auto";
    bottom: number | "auto";
    left: number | "auto";
    right: number | "auto";
  }>({ top: 0, bottom: "auto", left: 0, right: "auto" });
  const profileHref = `/members/profile?id=${member.memberId}`;
  const name = memberFullName(member);

  const menu = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      icon: ReactNode;
      on?: () => void;
      href?: string;
      disabled?: boolean;
      danger?: boolean;
    }> = [
      {
        id: "edit",
        label: canWriteMembers ? t("editProfile") : t("viewProfile"),
        icon: <Icons.edit size={15} />,
        href: profileHref,
      },
    ];

    if (canWriteContributions) {
      items.push({
        id: "contribution",
        label: t("registerContribution"),
        icon: <Icons.wallet size={15} />,
        on: onAddContribution,
      });
    }

    items.push({
      id: "msg",
      label: t("messages"),
      icon: <Icons.chat size={15} />,
      on: () => toast.info(t("messages"), t("chatSoon", { name })),
      disabled: true,
    });

    if (canManageUsers && member.isMember) {
      items.push({
        id: "userapp",
        label: t("configureUser"),
        icon: <Icons.users size={15} />,
        on: onConfigureSystemUser,
        disabled: configureUserPending,
      });
      if (hasSystemAccess) {
        items.push({
          id: "reset",
          label: t("resetAccess"),
          icon: <Icons.settings size={15} />,
          on: onResetAccess,
          disabled: resetAccessPending,
        });
      }
    }

    if (canDeleteMembers) {
      items.push({
        id: "del",
        label: t("deleteAction"),
        icon: <Icons.trash size={15} />,
        danger: true,
        on: () =>
          toast.error(t("confirmDelete"), t("confirmDeleteHint")),
      });
    }

    return items;
  }, [
    profileHref,
    name,
    member.isMember,
    onAddContribution,
    canWriteMembers,
    canWriteContributions,
    canDeleteMembers,
    canManageUsers,
    onConfigureSystemUser,
    configureUserPending,
    hasSystemAccess,
    onResetAccess,
    resetAccessPending,
    t,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const menuW = 200;
    const menuH = menu.length * 38 + 24;
    const openUp = window.innerHeight - r.bottom < menuH + 16;
    const openLeft = window.innerWidth - r.left < menuW + 8;
    setMenuPos({
      top: openUp ? "auto" : r.bottom + 6,
      bottom: openUp ? window.innerHeight - r.top + 6 : "auto",
      left: openLeft ? "auto" : r.left,
      right: openLeft ? window.innerWidth - r.right : "auto",
    });
  }, [open, menu.length]);

  return (
    <div style={{ display: "inline-block" }}>
      <button
        ref={btnRef}
        type="button"
        className="btn ghost icon-only sm"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={tCommon("actions")}
        aria-label={tCommon("actions")}
        aria-expanded={open}
      >
        <Icons.menu size={16} />
      </button>
      {open ? (
        <>
          <div
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 200 }}
            aria-hidden
          />
          <div
            role="menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              right: menuPos.right,
              zIndex: 201,
              minWidth: 200,
              background: "var(--bg-1)",
              border: "1px solid var(--line)",
              borderRadius: 10,
              boxShadow: "var(--shadow-3)",
              padding: 6,
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
          {menu.map((item, index) => (
            <div key={item.id}>
              {index === menu.length - 1 ? (
                <div style={{ height: 1, background: "var(--line)", margin: "4px 4px" }} />
              ) : null}
              {"href" in item && item.href ? (
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="action-menu-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 7,
                    color: "var(--fg)",
                    fontSize: 13,
                    fontWeight: 500,
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      display: "inline-grid",
                      placeItems: "center",
                      color: "var(--muted)",
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={"disabled" in item && item.disabled}
                  onClick={() => {
                    if ("disabled" in item && item.disabled) return;
                    item.on?.();
                    onClose();
                  }}
                  className="action-menu-item"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 7,
                    background: "transparent",
                    border: 0,
                    color:
                      "danger" in item && item.danger
                        ? "var(--danger)"
                        : "disabled" in item && item.disabled
                          ? "var(--muted)"
                          : "var(--fg)",
                    fontSize: 13,
                    fontWeight: 500,
                    fontFamily: "inherit",
                    cursor:
                      "disabled" in item && item.disabled ? "not-allowed" : "pointer",
                    textAlign: "left",
                    opacity: "disabled" in item && item.disabled ? 0.5 : 1,
                  }}
                >
                  <span
                    style={{
                      width: 16,
                      display: "inline-grid",
                      placeItems: "center",
                      color:
                        "danger" in item && item.danger
                          ? "var(--danger)"
                          : "var(--muted)",
                    }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              )}
            </div>
          ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function Pagination({
  page,
  pageSize,
  totalPages,
  total,
  pageStart,
  pageEnd,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: MembersPageSize;
  totalPages: number;
  total: number;
  pageStart: number;
  pageEnd: number;
  onPage: (p: number) => void;
  onPageSize: (size: MembersPageSize) => void;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const pageButtons = useMemo(() => {
    const set = new Set([1, totalPages, page, page - 1, page + 1]);
    const list = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out: (number | "…")[] = [];
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i] - list[i - 1] > 1) out.push("…");
      out.push(list[i]);
    }
    return out;
  }, [page, totalPages]);

  return (
    <div
      className="card flat"
      style={{
        marginTop: 14,
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        flexWrap: "wrap",
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <span className="tiny muted">
          Mostrando{" "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{pageStart + 1}</b>
          {" – "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{pageEnd}</b>
          {" de "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>
            {formatNumber(total, locale)}
          </b>{" "}
          {t("membersFilter").toLowerCase()}
        </span>
        <span style={{ width: 1, height: 18, background: "var(--line)" }} />
        <label className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}>
          {tCommon("rows")}
          <select
            className="select"
            style={{ padding: "4px 8px", width: "auto", fontSize: 12 }}
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value) as MembersPageSize)}
            aria-label={tCommon("recordsPerPage")}
          >
            {MEMBERS_PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="row" style={{ gap: 4 }}>
        <button
          type="button"
          className="btn outline sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          <span style={{ display: "inline-block", transform: "rotate(90deg)" }}>
            <Icons.arrowDn size={12} />
          </span>
          {tCommon("previous")}
        </button>
        {pageButtons.map((b, i) =>
          b === "…" ? (
            <span
              key={`ellipsis-${i}`}
              style={{ padding: "0 6px", color: "var(--dim)", fontFamily: "var(--font-mono)" }}
            >
              …
            </span>
          ) : (
            <button
              key={b}
              type="button"
              onClick={() => onPage(b)}
              className={`btn sm ${b === page ? "primary" : "outline"}`}
              style={{ minWidth: 32, padding: "5px 0", fontFamily: "var(--font-mono)" }}
            >
              {b}
            </button>
          ),
        )}
        <button
          type="button"
          className="btn outline sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          {tCommon("next")}
          <span style={{ display: "inline-block", transform: "rotate(-90deg)" }}>
            <Icons.arrowDn size={12} />
          </span>
        </button>
      </div>
    </div>
  );
}
