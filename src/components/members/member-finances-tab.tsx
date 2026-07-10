"use client";

import { fetchContributionCatalogAction } from "@/app/(app)/members/actions";
import type { PresetContributor } from "@/components/contributions/contribution-form-drawer";
import { SectionCard } from "@/components/members/member-ui";
import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import type { IncomeType } from "@/lib/contributions/types";
import type { Fund } from "@/lib/funds/types";
import { fmtRD } from "@/lib/format-currency";
import { memberFullName } from "@/lib/members/parse";
import type { Member } from "@/lib/members/types";
import { emptyMemberFinanceData } from "@/lib/services/member-finances";
import type {
  MemberCollectionRow,
  MemberFinanceChartPoint,
  MemberFinanceData,
} from "@/lib/members/types";
import { toast } from "@/lib/toast";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

const ContributionFormDrawer = dynamic(
  () =>
    import("@/components/contributions/contribution-form-drawer").then(
      (m) => m.ContributionFormDrawer,
    ),
  { ssr: false },
);

const PAGE_SIZE = 5;

const TYPE_STYLE_BASE: Record<
  number,
  { color: string; gradient: string }
> = {
  1: {
    color: "var(--d-tithe)",
    gradient: "from-blue-600 to-indigo-700",
  },
  2: {
    color: "var(--d-offering)",
    gradient: "from-emerald-600 to-teal-700",
  },
  3: {
    color: "var(--d-donation)",
    gradient: "from-orange-500 to-orange-700",
  },
};

function typeStyle(
  collectionType: number,
  labels: { tithe: string; offering: string; donation: string; other: string },
) {
  const base = TYPE_STYLE_BASE[collectionType];
  if (base) {
    const label =
      collectionType === 1
        ? labels.tithe
        : collectionType === 2
          ? labels.offering
          : labels.donation;
    return { label, ...base };
  }
  return {
    label: labels.other,
    color: "#64748b",
    gradient: "from-slate-500 to-slate-600",
  };
}

export function MemberFinancesTab({
  member,
  initialFinances = null,
  canWriteContributions = false,
}: {
  member: Member;
  initialFinances?: MemberFinanceData | null;
  canWriteContributions?: boolean;
}) {
  const memberId = member.memberId;
  const [finances, setFinances] = useState<MemberFinanceData | null>(
    initialFinances,
  );
  const [loading, setLoading] = useState(initialFinances == null);

  useEffect(() => {
    if (initialFinances != null) {
      setFinances(initialFinances);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/members/${memberId}/finances`);
        const data = (await res.json()) as MemberFinanceData;
        if (!cancelled) setFinances(data);
      } catch {
        if (!cancelled) setFinances(emptyMemberFinanceData());
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [memberId, initialFinances]);

  if (loading || !finances) {
    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-[84px] animate-pulse rounded-2xl bg-surface"
            />
          ))}
        </div>
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
        <div className="h-72 animate-pulse rounded-2xl bg-surface" />
      </div>
    );
  }

  return (
    <MemberFinancesContent
      member={member}
      finances={finances}
      canWriteContributions={canWriteContributions}
    />
  );
}

function memberPresetContributor(member: Member): PresetContributor {
  return {
    profileId: member.memberId,
    profileName: memberFullName(member),
    donorKind: member.isMember ? "member" : "visitor",
  };
}

function MemberFinancesContent({
  member,
  finances,
  canWriteContributions,
}: {
  member: Member;
  finances: MemberFinanceData;
  canWriteContributions: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("members");
  const tContributions = useTranslations("contributions");
  const tCommon = useTranslations("common");
  const { summary, chartData, collections, statusCode, message } = finances;
  const isEmpty = statusCode === 204 || collections.length === 0;
  const [contributionOpen, setContributionOpen] = useState(false);
  const [contributionCatalogs, setContributionCatalogs] = useState<{
    funds: Fund[];
    incomeTypes: IncomeType[];
  }>({ funds: [], incomeTypes: [] });
  const [contributionCatalogsLoading, setContributionCatalogsLoading] =
    useState(false);

  async function openContributionDrawer() {
    if (!canWriteContributions) return;

    setContributionOpen(true);

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
        toast.error(tContributions("title"), t("catalogLoadFailed"));
        setContributionOpen(false);
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

  function handleContributionClose() {
    setContributionOpen(false);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FundsKpi
          kind="elevated"
          label={t("tithes")}
          value={fmtRD(summary.tithesAmount)}
          icon={<Icons.wallet size={16} />}
          tone="d-funds"
        />
        <FundsKpi
          kind="elevated"
          label={t("offerings")}
          value={fmtRD(summary.offeringAmount)}
          icon={<Icons.check size={16} />}
          tone="d-income"
        />
        <FundsKpi
          kind="elevated"
          label={t("donations")}
          value={fmtRD(summary.donationAmount)}
          icon={<Icons.star size={16} />}
          tone="d-donation"
        />
        <FundsKpi
          kind="elevated"
          label={tCommon("total")}
          value={fmtRD(summary.totalContributions)}
          icon={<Icons.trendUp size={16} />}
          tone="d-system"
          totalSummary
        />
      </div>

      <SectionCard
        eyebrow={t("trendEyebrow")}
        title={t("monthlyContributions")}
        subtitle={t("monthlyContributionsSubtitle")}
      >
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {isEmpty ? message : t("noChartData")}
          </p>
        ) : (
          <>
            <MonthlyGroupedChart
              data={chartData}
              ariaLabel={t("chartAriaLabel")}
            />
            <div className="mt-3 flex flex-wrap gap-4">
              <LegendDot color="var(--d-tithe)" label={t("tithes")} />
              <LegendDot color="var(--d-offering)" label={t("offerings")} />
              <LegendDot color="var(--d-donation)" label={t("donations")} />
              <LegendLine label={t("monthlyTotal")} />
            </div>
          </>
        )}
      </SectionCard>

      <ContributionsTable
        collections={collections}
        emptyMessage={message}
        isEmpty={isEmpty}
        canWriteContributions={canWriteContributions}
        addContributionLabel={t("addContribution")}
        onAddContribution={() => void openContributionDrawer()}
      />

      <ContributionFormDrawer
        key={member.memberId}
        mode="new"
        entry={null}
        open={contributionOpen && !contributionCatalogsLoading}
        onClose={handleContributionClose}
        onSaved={() => router.refresh()}
        funds={contributionCatalogs.funds}
        incomeTypes={contributionCatalogs.incomeTypes}
        presetContributor={memberPresetContributor(member)}
      />
    </div>
  );
}

function MonthlyGroupedChart({
  data,
  ariaLabel,
}: {
  data: MemberFinanceChartPoint[];
  ariaLabel: string;
}) {
  const max = Math.max(...data.map((d) => d.tithe + d.offer + d.donation), 1);
  const W = 640;
  const H = 220;
  const padL = 40;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const step = innerW / data.length;
  const groupW = step * 0.72;
  const barW = (groupW / 3) * 0.88;
  const barGap = (groupW - barW * 3) / 4;

  const linePoints = data.map((d, i) => {
    const total = d.tithe + d.offer + d.donation;
    const cx = padL + step * i + step / 2;
    const cy = padT + innerH - (total / max) * innerH;
    return { cx, cy, label: d.label };
  });

  const linePath = linePoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.cx.toFixed(1)} ${p.cy.toFixed(1)}`)
    .join(" ");

  return (
    <div className="w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
        className="block"
        role="img"
        aria-label={ariaLabel}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padT + innerH * (1 - p);
          return (
            <g key={i}>
              <line
                x1={padL}
                x2={W - padR}
                y1={y}
                y2={y}
                stroke="var(--border)"
                strokeDasharray={p === 0 ? "0" : "2 3"}
              />
              <text
                x={padL - 6}
                y={y + 3}
                textAnchor="end"
                fontSize="9"
                fill="var(--muted)"
              >
                {max * p >= 1000
                  ? `${Math.round((max * p) / 1000)}k`
                  : Math.round(max * p)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const groupX = padL + step * i + (step - groupW) / 2;
          const series = [
            { value: d.tithe, color: "#5b21b6" },
            { value: d.offer, color: "#059669" },
            { value: d.donation, color: "#ea580c" },
          ];

          return (
            <g key={d.label}>
              {series.map((s, j) => {
                const h = innerH * (s.value / max);
                if (h <= 0) return null;
                const x = groupX + barGap + j * (barW + barGap);
                const y = padT + innerH - h;
                return (
                  <rect
                    key={j}
                    x={x}
                    y={y}
                    width={barW}
                    height={h}
                    fill={s.color}
                    rx="2"
                  />
                );
              })}
              <text
                x={groupX + groupW / 2}
                y={H - 8}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}

        {linePoints.length > 0 ? (
          <>
            {linePoints.length > 1 ? (
              <path
                d={linePath}
                fill="none"
                stroke="#c4b5fd"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
            {linePoints.map((p) => (
              <circle
                key={p.label}
                cx={p.cx}
                cy={p.cy}
                r="4"
                fill="#c4b5fd"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            ))}
          </>
        ) : null}
      </svg>
    </div>
  );
}

function LegendLine({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <svg width="18" height="10" aria-hidden className="shrink-0">
        <line
          x1="0"
          y1="5"
          x2="18"
          y2="5"
          stroke="#c4b5fd"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx="9" cy="5" r="3" fill="#c4b5fd" />
      </svg>
      {label}
    </span>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span
        className="h-2.5 w-2.5 rounded-sm"
        style={{ background: color }}
        aria-hidden
      />
      {label}
    </span>
  );
}

function ContributionsTable({
  collections,
  emptyMessage,
  isEmpty,
  canWriteContributions,
  addContributionLabel,
  onAddContribution,
}: {
  collections: MemberCollectionRow[];
  emptyMessage: string;
  isEmpty: boolean;
  canWriteContributions: boolean;
  addContributionLabel: string;
  onAddContribution: () => void;
}) {
  const t = useTranslations("members");
  const tFin = useTranslations("finances");
  const tContributions = useTranslations("contributions");
  const tCommon = useTranslations("common");
  const typeLabels = {
    tithe: tFin("contributionTypes.tithe"),
    offering: tFin("contributionTypes.offering"),
    donation: tFin("contributionTypes.donation"),
    other: t("otherType"),
  };
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return collections;
    return collections.filter((c) =>
      [
        c.collectionTypeName,
        c.collectionAmount,
        c.collectionDate,
        c.comments,
        c.paymentMethod,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [collections, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(pageStart, pageStart + PAGE_SIZE);

  return (
    <SectionCard
      eyebrow={tCommon("records")}
      title={t("memberContributions")}
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            title={tCommon("comingSoon")}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted opacity-60"
          >
            <DownloadIcon />
            {tCommon("export")}
          </button>
          {canWriteContributions ? (
            <button
              type="button"
              onClick={onAddContribution}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-primary/90"
            >
              <PlusIcon />
              {addContributionLabel}
            </button>
          ) : null}
        </div>
      }
    >
      {!isEmpty ? (
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("searchContributionsPlaceholder")}
            className="w-full max-w-sm rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : null}

      {isEmpty ? (
        <p className="py-6 text-center text-sm text-muted">{emptyMessage}</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          {t("noContributionsMatchSearch")}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-semibold">{tCommon("type")}</th>
                  <th className="pb-3 pr-4 font-semibold">{tCommon("date")}</th>
                  <th className="pb-3 pr-4 font-semibold">{tCommon("amount")}</th>
                  <th className="pb-3 pr-4 font-semibold">{tCommon("comment")}</th>
                  <th className="pb-3 font-semibold">{tContributions("paymentMethod")}</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const style = typeStyle(c.collectionType, typeLabels);
                  return (
                    <tr key={c.collectionId} className="border-t border-border">
                      <td className="py-3 pr-4">
                        <span className="inline-flex items-center gap-2.5">
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                            style={{
                              background: `${style.color}22`,
                              color: style.color,
                            }}
                          >
                            <WalletIcon className="h-3.5 w-3.5" />
                          </span>
                          <span className="font-medium">
                            {c.collectionTypeName}
                          </span>
                        </span>
                      </td>
                      <td className="py-3 pr-4 tabular-nums text-muted">
                        {c.collectionDate}
                      </td>
                      <td className="py-3 pr-4 font-semibold tabular-nums">
                        {fmtRD(c.collectionAmount)}
                      </td>
                      <td className="max-w-[200px] truncate py-3 pr-4 text-muted">
                        {c.comments || "—"}
                      </td>
                      <td className="py-3 text-muted">
                        {c.paymentMethod || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted">
              {tCommon("showing", {
                from: pageStart + 1,
                to: Math.min(pageStart + PAGE_SIZE, filtered.length),
                total: filtered.length,
              })}
            </p>
            <div className="flex flex-wrap gap-1">
              <PaginationBtn
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                {tCommon("previous")}
              </PaginationBtn>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <PaginationBtn
                  key={p}
                  active={p === safePage}
                  onClick={() => setPage(p)}
                >
                  {p}
                </PaginationBtn>
              ))}
              <PaginationBtn
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                {tCommon("next")}
              </PaginationBtn>
            </div>
          </div>
        </>
      )}
    </SectionCard>
  );
}

function PaginationBtn({
  children,
  onClick,
  disabled,
  active,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-8 rounded-lg px-2.5 py-1.5 text-xs font-semibold tabular-nums transition ${
        active
          ? "bg-primary text-white"
          : disabled
            ? "cursor-not-allowed border border-border text-muted opacity-50"
            : "border border-border text-foreground hover:bg-background"
      }`}
    >
      {children}
    </button>
  );
}

function WalletIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4v16m8-8H4"
      />
    </svg>
  );
}
