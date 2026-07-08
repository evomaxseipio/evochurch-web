"use client";

import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { formatDateTime } from "@/lib/i18n/format";
import {
  memberDirectoryRow,
  membershipStatsRows,
  paginateMembersForPrint,
  sortMembersByName,
} from "@/lib/reports/templates/membership/directory-helpers";
import type { MembershipDirectoryPayload } from "@/lib/services/reports";
import { useLocale, useTranslations } from "next-intl";

function PrintHeader({
  churchDisplay,
  pastorDisplay,
  councilDisplay,
  generatedLabel,
  generatedByDisplay,
  filterLabel,
}: {
  churchDisplay: string;
  pastorDisplay: string;
  councilDisplay: string;
  generatedLabel: string;
  generatedByDisplay: string;
  filterLabel: string;
}) {
  const t = useTranslations("reports");
  const logoSrc = brandLogoForSurface("document");

  return (
    <header className="members-dir-form-head">
      <div className="members-dir-form-head-main">
        <div className="members-dir-form-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logoSrc} alt={churchDisplay} />
        </div>
        <div>
          <h1>{t("preview.membershipDirectory.title")}</h1>
          <p className="members-dir-form-church">{churchDisplay}</p>
          <p className="members-dir-form-meta">
            {t("preview.membershipDirectory.pastor")}: <strong>{pastorDisplay}</strong>
            {" · "}
            {t("preview.membershipDirectory.council")}: <strong>{councilDisplay}</strong>
          </p>
        </div>
      </div>
      <div className="members-dir-form-head-info">
        <div>
          {t("preview.membershipDirectory.generatedAt")}: <strong>{generatedLabel}</strong>
        </div>
        <div>
          {t("preview.membershipDirectory.generatedBy")}: <strong>{generatedByDisplay}</strong>
        </div>
        <div>
          {t("preview.membershipDirectory.filterApplied")}: <strong>{filterLabel}</strong>
        </div>
      </div>
    </header>
  );
}

function PrintKpis({ stats }: { stats: MembershipDirectoryPayload["stats"] }) {
  const t = useTranslations("reports");

  return (
    <div className="members-dir-form-kpis">
      {(
        [
          ["total", stats.total, "blue"],
          ["members", stats.members, "purple"],
          ["visits", stats.visits, "orange"],
          ["active", stats.active, "green"],
          ["inactive", stats.inactive, "red"],
        ] as const
      ).map(([key, value, tone]) => (
        <div key={key} className={`members-dir-form-kpi ${tone}`}>
          <span className="members-dir-form-kpi-label">
            {t(
              `preview.membershipDirectory.${
                key === "total"
                  ? "kpiTotal"
                  : key === "members"
                    ? "kpiMembers"
                    : key === "visits"
                      ? "kpiVisits"
                      : key === "active"
                        ? "kpiActive"
                        : "kpiInactive"
              }`,
            )}
          </span>
          <span className="members-dir-form-kpi-value mono">{value}</span>
        </div>
      ))}
    </div>
  );
}

function PrintTable({
  pageMembers,
  startIndex,
  continued,
  yesLabel,
  noLabel,
}: {
  pageMembers: MembershipDirectoryPayload["members"];
  startIndex: number;
  continued: boolean;
  yesLabel: string;
  noLabel: string;
}) {
  const t = useTranslations("reports");
  const from = pageMembers.length > 0 ? startIndex + 1 : 0;
  const to = startIndex + pageMembers.length;

  return (
    <section className="members-dir-form-table-wrap">
      <div className="members-dir-form-table-head">
        <h2>
          {continued
            ? t("preview.membershipDirectory.sectionDirectoryContinued")
            : t("preview.membershipDirectory.sectionDirectory")}
        </h2>
        <span>
          {continued
            ? t("preview.membershipDirectory.recordsRange", { from, to })
            : t("preview.membershipDirectory.sortedBy")}
        </span>
      </div>
      <table className="members-dir-form-table">
        <thead>
          <tr>
            <th className="col-idx">#</th>
            <th className="col-name">{t("exports.membershipDirectory.columns.fullName")}</th>
            <th className="col-role">{t("exports.membershipDirectory.columns.role")}</th>
            <th className="col-phone">{t("exports.membershipDirectory.columns.phone")}</th>
            <th className="col-email">{t("exports.membershipDirectory.columns.email")}</th>
            <th className="col-city">{t("exports.membershipDirectory.columns.city")}</th>
            <th className="col-flag">{t("exports.membershipDirectory.columns.member")}</th>
            <th className="col-flag">{t("exports.membershipDirectory.columns.active")}</th>
          </tr>
        </thead>
        <tbody>
          {pageMembers.map((member, index) => {
            const row = memberDirectoryRow(member, yesLabel, noLabel);
            const memberFlagClass = member.isMember ? "flag-yes" : "flag-no";
            const activeFlagClass = member.isActive ? "flag-yes" : "flag-off";
            return (
              <tr key={member.memberId}>
                <td className="idx">{startIndex + index + 1}</td>
                <td className="name">{row[0]}</td>
                <td className="role">{row[1] || "—"}</td>
                <td className="contact mono">{row[2] || "—"}</td>
                <td className="email" title={row[3] || undefined}>
                  {row[3] || "—"}
                </td>
                <td className="city">{row[4] || "—"}</td>
                <td className={`flag ${memberFlagClass}`}>{row[5]}</td>
                <td className={`flag ${activeFlagClass}`}>{row[6]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

function PrintBottom({ stats }: { stats: MembershipDirectoryPayload["stats"] }) {
  const t = useTranslations("reports");
  const statsRows = membershipStatsRows(stats).filter((s) => s.key !== "total");

  return (
    <div className="members-dir-form-bottom">
      <section className="members-dir-form-summary">
        <h2>{t("preview.membershipDirectory.summaryTitle")}</h2>
        {statsRows.map((row) => (
          <div key={row.key} className="members-dir-form-dist-row">
            <div className="members-dir-form-dist-top">
              <span>
                {t(
                  `preview.membershipDirectory.${
                    row.key === "members"
                      ? "kpiMembers"
                      : row.key === "visits"
                        ? "kpiVisits"
                        : row.key === "active"
                          ? "kpiActive"
                          : "kpiInactive"
                  }`,
                )}
              </span>
              <span className="mono">
                {row.value} · {row.percent}%
              </span>
            </div>
            <div className="members-dir-form-dist-track">
              <div className={`fill ${row.key}`} style={{ width: `${row.percent}%` }} />
            </div>
          </div>
        ))}
      </section>

      <section className="members-dir-form-notes">
        <h2>{t("preview.membershipDirectory.importantNotes")}</h2>
        <p>{t("preview.membershipDirectory.notesBodyLine1")}</p>
        <p>{t("preview.membershipDirectory.notesBodyLine2")}</p>
      </section>
    </div>
  );
}

export function MembershipDirectoryFormPrint({
  payload,
  generatedByName,
}: {
  payload: MembershipDirectoryPayload;
  generatedByName?: string | null;
}) {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  const churchDisplay = payload.churchName?.trim() || FUENTE_INAGOTABLE.churchDisplayName;
  const pastorDisplay = payload.pastorName?.trim() || "—";
  const councilDisplay = payload.presbyterio?.trim() || "—";
  const generatedByDisplay = generatedByName?.trim() || "—";
  const filterLabel = t(`memberFilters.${payload.filter}`);
  const yesLabel = tCommon("yes");
  const noLabel = tCommon("no");

  const generatedLabel = formatDateTime(payload.generatedAt, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const members = sortMembersByName(payload.members);
  const pages = paginateMembersForPrint(members);
  const totalPages = pages.length;

  const headerProps = {
    churchDisplay,
    pastorDisplay,
    councilDisplay,
    generatedLabel,
    generatedByDisplay,
    filterLabel,
  };

  return (
    <div className="members-dir-form-print" aria-hidden>
      {pages.map((page, pageIndex) => {
        const showKpis = page.kind === "only" || page.kind === "first";
        const showBottom = page.kind === "only" || page.kind === "last";
        const continued = page.kind === "middle" || page.kind === "last";

        return (
          <div key={pageIndex} className="members-dir-form-sheet">
            <PrintHeader {...headerProps} />
            {showKpis ? <PrintKpis stats={payload.stats} /> : null}
            {page.members.length > 0 ? (
              <PrintTable
                pageMembers={page.members}
                startIndex={page.startIndex}
                continued={continued}
                yesLabel={yesLabel}
                noLabel={noLabel}
              />
            ) : null}
            {showBottom ? <PrintBottom stats={payload.stats} /> : null}
            <footer className="members-dir-form-foot">
              <span>
                {churchDisplay} — {t("preview.membershipDirectory.title")}
              </span>
              <span>
                {t("preview.membershipDirectory.pageOf", {
                  page: pageIndex + 1,
                  total: totalPages,
                })}
              </span>
            </footer>
          </div>
        );
      })}
    </div>
  );
}
