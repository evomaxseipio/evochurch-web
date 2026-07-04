"use client";

import { fmtRD } from "@/lib/format-currency";
import { sortFunds } from "@/lib/funds/parse";
import type { Fund } from "@/lib/funds/types";
import { useLocale, useTranslations } from "next-intl";

const FUND_PALETTE = [
  "var(--primary)",
  "var(--accent)",
  "var(--success)",
  "#A855F7",
  "var(--info)",
  "var(--warm)",
];
const FUND_OTHER_COLOR = "var(--ink-4)";

function fmtChartNum(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.round(n).toString();
}

/** Coordenadas SVG idénticas en SSR y cliente (evita hydration mismatch en arcos). */
function svgCoord(n: number): string {
  return (Math.round(n * 1e4) / 1e4).toFixed(4);
}

function FundDonut({
  slices,
  total,
}: {
  slices: { label: string; v: number; color: string }[];
  total: number;
}) {
  const r = 58;
  const R = 92;
  const arcs = slices.map((d, i) => {
    const startFrac = total
      ? slices.slice(0, i).reduce((acc, item) => acc + item.v, 0) / total
      : 0;
    const frac = total ? d.v / total : 0;
    const sweep = frac * Math.PI * 2;
    const a0 = -Math.PI / 2 + startFrac * Math.PI * 2;
    const a1 = a0 + sweep - (slices.length > 1 ? 0.014 : 0);
    const large = sweep > Math.PI ? 1 : 0;
    const x0 = 100 + R * Math.cos(a0);
    const y0 = 100 + R * Math.sin(a0);
    const x1 = 100 + R * Math.cos(a1);
    const y1 = 100 + R * Math.sin(a1);
    const x0i = 100 + r * Math.cos(a0);
    const y0i = 100 + r * Math.sin(a0);
    const x1i = 100 + r * Math.cos(a1);
    const y1i = 100 + r * Math.sin(a1);
    return (
      <path
        key={i}
        d={`M ${svgCoord(x0)} ${svgCoord(y0)} A ${R} ${R} 0 ${large} 1 ${svgCoord(x1)} ${svgCoord(y1)} L ${svgCoord(x1i)} ${svgCoord(y1i)} A ${r} ${r} 0 ${large} 0 ${svgCoord(x0i)} ${svgCoord(y0i)} Z`}
        fill={d.color}
      />
    );
  });

  return (
    <svg
      viewBox="0 0 200 200"
      style={{ width: 210, height: 210, flexShrink: 0, display: "block" }}
      aria-hidden
    >
      {arcs}
    </svg>
  );
}

export function FundsSummary({ funds }: { funds: Fund[] }) {
  const tFinances = useTranslations("finances");
  const tFunds = useTranslations("funds");
  const locale = useLocale();
  const sorted = sortFunds(
    funds,
    (a, b) => b.totalContributions - a.totalContributions,
  );
  const total = sorted.reduce((s, f) => s + f.totalContributions, 0);
  const max = sorted[0]?.totalContributions || 1;

  const TOP = 5;
  const topFunds = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);
  const restSum = rest.reduce((s, f) => s + f.totalContributions, 0);

  const slices = topFunds.map((f, i) => ({
    label: f.name,
    v: f.totalContributions,
    color: FUND_PALETTE[i % FUND_PALETTE.length],
  }));
  if (rest.length) {
    slices.push({
      label: `${tFinances("others")} (${rest.length})`,
      v: restSum,
      color: FUND_OTHER_COLOR,
    });
  }

  const colorFor = (idx: number) =>
    idx < TOP ? FUND_PALETTE[idx % FUND_PALETTE.length] : FUND_OTHER_COLOR;

  if (funds.length === 0) return null;

  return (
    <div className="grid-12" style={{ marginBottom: 18 }}>
      <div className="card span-6">
        <div
          className="row between"
          style={{ alignItems: "flex-start", gap: 16 }}
        >
          <div>
            <div
              className="display"
              style={{ fontSize: 22, letterSpacing: "-0.01em" }}
            >
              {tFunds("distributionByFund")}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {tFunds("distributionSubtitle")}
            </div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div
              className="tiny muted"
              style={{
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                fontWeight: 600,
              }}
            >
              {tFunds("totalFunds")}
            </div>
            <div
              className="display tnum"
              style={{
                fontSize: 24,
                letterSpacing: "-0.02em",
                marginTop: 4,
              }}
            >
              {fmtRD(total, locale as "es" | "en" | "fr")}
            </div>
          </div>
        </div>

        <div
          className="row"
          style={{
            gap: 20,
            alignItems: "center",
            marginTop: 18,
            flexWrap: "wrap",
          }}
        >
          <div className="col" style={{ gap: 12, flex: 1, minWidth: 150 }}>
            {slices.map((s, i) => (
              <div
                key={i}
                className="row"
                style={{ gap: 10, alignItems: "center", fontSize: 13.5 }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: 3,
                    background: s.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    color: "var(--ink-2)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.label}
                </span>
                <span
                  className="tnum mono"
                  style={{ flexShrink: 0, fontWeight: 600, color: "var(--ink)" }}
                >
                  {fmtChartNum(s.v)}
                </span>
              </div>
            ))}
          </div>
          <FundDonut slices={slices} total={total} />
        </div>
      </div>

      <div className="card span-6">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="eyebrow">{tFinances("stewardshipLabel")}</div>
            <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
              {tFunds("allFunds")}
            </div>
          </div>
          <span className="chip">
            {tFunds("fundCount", { count: sorted.length })}
          </span>
        </div>
        <div
          className="col"
          style={{
            gap: 16,
            marginTop: 18,
            maxHeight: 280,
            overflowY: "auto",
            paddingRight: 4,
          }}
        >
          {sorted.map((f, i) => {
            const pct = total ? (f.totalContributions / total) * 100 : 0;
            const barPct = max ? (f.totalContributions / max) * 100 : 0;
            return (
              <div key={f.fundId}>
                <div
                  className="row between"
                  style={{ gap: 10, marginBottom: 7 }}
                >
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 3,
                        background: colorFor(i),
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: 13.5,
                        fontWeight: 500,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {f.name}
                    </span>
                  </div>
                  <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                    <span
                      className="tnum mono"
                      style={{ fontSize: 13, fontWeight: 600 }}
                    >
                      {fmtChartNum(f.totalContributions)}
                    </span>
                    <span
                      className="tnum mono muted"
                      style={{
                        fontSize: 12,
                        minWidth: 42,
                        textAlign: "right",
                      }}
                    >
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div
                  style={{
                    height: 7,
                    background: "var(--surface-2)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${barPct}%`,
                      height: "100%",
                      background: colorFor(i),
                      borderRadius: 999,
                      transition: "width 0.4s ease",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

