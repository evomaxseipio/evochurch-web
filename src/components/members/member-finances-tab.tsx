"use client";

import { SectionCard } from "@/components/members/member-ui";
import { FundsKpi } from "@/components/funds/funds-kpi";
import { Icons } from "@/components/icons";
import { fmtRD } from "@/lib/format-currency";
import { emptyMemberFinanceData } from "@/lib/services/member-finances";
import type {
  MemberCollectionRow,
  MemberFinanceChartPoint,
  MemberFinanceData,
} from "@/lib/members/types";
import { useEffect, useMemo, useState } from "react";

const PAGE_SIZE = 5;

const TYPE_STYLES: Record<
  number,
  { label: string; color: string; gradient: string }
> = {
  1: {
    label: "Diezmo",
    color: "var(--d-tithe)",
    gradient: "from-blue-600 to-indigo-700",
  },
  2: {
    label: "Ofrenda",
    color: "var(--d-offering)",
    gradient: "from-emerald-600 to-teal-700",
  },
  3: {
    label: "Donación",
    color: "var(--d-donation)",
    gradient: "from-orange-500 to-orange-700",
  },
};

function typeStyle(collectionType: number) {
  return (
    TYPE_STYLES[collectionType] ?? {
      label: "Otro",
      color: "#64748b",
      gradient: "from-slate-500 to-slate-600",
    }
  );
}

export function MemberFinancesTab({ memberId }: { memberId: string }) {
  const [finances, setFinances] = useState<MemberFinanceData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
  }, [memberId]);

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

  return <MemberFinancesContent finances={finances} />;
}

function MemberFinancesContent({ finances }: { finances: MemberFinanceData }) {
  const { summary, chartData, collections, statusCode, message } = finances;
  const isEmpty = statusCode === 204 || collections.length === 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FundsKpi
          kind="elevated"
          label="Diezmos"
          value={fmtRD(summary.tithesAmount)}
          icon={<Icons.wallet size={16} />}
          tone="d-funds"
        />
        <FundsKpi
          kind="elevated"
          label="Ofrendas"
          value={fmtRD(summary.offeringAmount)}
          icon={<Icons.check size={16} />}
          tone="d-income"
        />
        <FundsKpi
          kind="elevated"
          label="Donaciones"
          value={fmtRD(summary.donationAmount)}
          icon={<Icons.star size={16} />}
          tone="d-donation"
        />
        <FundsKpi
          kind="elevated"
          label="Total"
          value={fmtRD(summary.totalContributions)}
          icon={<Icons.trendUp size={16} />}
          tone="d-system"
          totalSummary
        />
      </div>

      <SectionCard
        eyebrow="Tendencia"
        title="Contribuciones mensuales"
        subtitle="Diezmos, ofrendas y donaciones registradas por mes."
      >
        {chartData.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">
            {isEmpty ? message : "Sin datos para el gráfico."}
          </p>
        ) : (
          <>
            <MonthlyGroupedChart data={chartData} />
            <div className="mt-3 flex flex-wrap gap-4">
              <LegendDot color="var(--d-tithe)" label="Diezmos" />
              <LegendDot color="var(--d-offering)" label="Ofrendas" />
              <LegendDot color="var(--d-donation)" label="Donaciones" />
              <LegendLine label="Total mensual" />
            </div>
          </>
        )}
      </SectionCard>

      <ContributionsTable
        collections={collections}
        emptyMessage={message}
        isEmpty={isEmpty}
      />
    </div>
  );
}

function MonthlyGroupedChart({ data }: { data: MemberFinanceChartPoint[] }) {
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
        aria-label="Gráfico de contribuciones mensuales por tipo y total"
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
}: {
  collections: MemberCollectionRow[];
  emptyMessage: string;
  isEmpty: boolean;
}) {
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
      eyebrow="Registros"
      title="Contribuciones del miembro"
      action={
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            title="Próximamente"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted opacity-60"
          >
            <DownloadIcon />
            Exportar
          </button>
          <button
            type="button"
            disabled
            title="Próximamente"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted opacity-60"
          >
            <PlusIcon />
            Diezmo
          </button>
          <button
            type="button"
            disabled
            title="Próximamente"
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/50 px-3 py-1.5 text-xs font-semibold text-white opacity-60"
          >
            <PlusIcon />
            Ofrenda
          </button>
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
            placeholder="Buscar por tipo, monto, fecha…"
            className="w-full max-w-sm rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
      ) : null}

      {isEmpty ? (
        <p className="py-6 text-center text-sm text-muted">{emptyMessage}</p>
      ) : filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">
          Ningún registro coincide con la búsqueda.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-muted">
                  <th className="pb-3 pr-4 font-semibold">Tipo</th>
                  <th className="pb-3 pr-4 font-semibold">Fecha</th>
                  <th className="pb-3 pr-4 font-semibold">Monto</th>
                  <th className="pb-3 pr-4 font-semibold">Comentario</th>
                  <th className="pb-3 font-semibold">Vía</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => {
                  const style = typeStyle(c.collectionType);
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
              Mostrando{" "}
              <span className="font-semibold text-foreground tabular-nums">
                {pageStart + 1}
              </span>
              {" – "}
              <span className="font-semibold text-foreground tabular-nums">
                {Math.min(pageStart + PAGE_SIZE, filtered.length)}
              </span>
              {" de "}
              <span className="font-semibold text-foreground tabular-nums">
                {filtered.length}
              </span>{" "}
              entradas
            </p>
            <div className="flex flex-wrap gap-1">
              <PaginationBtn
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Anterior
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
                Siguiente
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
