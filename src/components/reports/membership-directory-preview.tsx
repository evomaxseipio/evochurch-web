"use client";

import "./membership-directory-preview.css";
import "./membership-directory-form-print.css";

import { MembershipDirectoryFormPrint } from "@/components/reports/membership-directory-form-print";
import type { Locale } from "@/i18n/config";
import { FUENTE_INAGOTABLE, brandLogoForSurface } from "@/lib/brand";
import { formatDateTime } from "@/lib/i18n/format";
import {
  memberDirectoryRow,
  membershipStatsRows,
  sortMembersByName,
} from "@/lib/reports/templates/membership/directory-helpers";
import type { MembershipDirectoryPayload } from "@/lib/services/reports";
import { useLocale, useTranslations } from "next-intl";
import type { RefObject } from "react";

function IconUsers() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function MembershipDirectoryPreview({
  payload,
  generatedByName,
  printRef,
}: {
  payload: MembershipDirectoryPayload;
  generatedByName?: string | null;
  printRef?: RefObject<HTMLDivElement | null>;
}) {
  const t = useTranslations("reports");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;

  const logoSrc = brandLogoForSurface("document");
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
  const statsRows = membershipStatsRows(payload.stats);

  const kpiConfig = [
    { key: "total" as const, iconClass: "blue", Icon: IconUsers },
    { key: "members" as const, iconClass: "purple", Icon: IconUsers },
    { key: "visits" as const, iconClass: "orange", Icon: IconUsers },
    { key: "active" as const, iconClass: "green", Icon: IconUsers },
    { key: "inactive" as const, iconClass: "red", Icon: IconUsers },
  ];

  return (
    <div ref={printRef} className="members-dir-dash">
      <div className="members-dir-page members-dir-screen">
        <div className="members-dir-head">
          <div className="members-dir-head-left">
            <div className="members-dir-head-logo">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logoSrc} alt={churchDisplay} />
            </div>
            <div className="members-dir-head-copy">
              <h1>{t("preview.membershipDirectory.title")}</h1>
              <p className="members-dir-head-subtitle">{churchDisplay}</p>
              <div className="members-dir-head-meta">
                <span>
                  {t("preview.membershipDirectory.pastor")}: <b>{pastorDisplay}</b>
                </span>
                <span className="sep">|</span>
                <span>
                  {t("preview.membershipDirectory.council")}: <b>{councilDisplay}</b>
                </span>
              </div>
            </div>
          </div>
          <div className="members-dir-head-info">
            <div>
              {t("preview.membershipDirectory.generatedAt")}: <b>{generatedLabel}</b>
            </div>
            <div>
              {t("preview.membershipDirectory.generatedBy")}: <b>{generatedByDisplay}</b>
            </div>
            <div>
              {t("preview.membershipDirectory.filterApplied")}: <b>{filterLabel}</b>
            </div>
          </div>
        </div>

        <div className="members-dir-filterbar">
          <span className="members-dir-filterbar-label">{t("preview.membershipDirectory.filterLabel")}</span>
          <span className={`members-dir-chip${payload.filter === "all" ? " active" : ""}`}>
            {t("memberFilters.all")}
          </span>
          <span className={`members-dir-chip${payload.filter === "members" ? " active" : ""}`}>
            {t("memberFilters.members")}
          </span>
          <span className={`members-dir-chip${payload.filter === "visits" ? " active" : ""}`}>
            {t("memberFilters.visits")}
          </span>
          <span className={`members-dir-chip${payload.filter === "active" ? " active" : ""}`}>
            {t("memberFilters.active")}
          </span>
          <span className={`members-dir-chip${payload.filter === "inactive" ? " active" : ""}`}>
            {t("memberFilters.inactive")}
          </span>
        </div>

        <div className="members-dir-kpis">
          {kpiConfig.map(({ key, iconClass }) => {
            const row = statsRows.find((s) => s.key === key)!;
            const labelKey =
              key === "total"
                ? "kpiTotal"
                : key === "members"
                  ? "kpiMembers"
                  : key === "visits"
                    ? "kpiVisits"
                    : key === "active"
                      ? "kpiActive"
                      : "kpiInactive";
            const subKey =
              key === "total"
                ? "kpiTotalSub"
                : key === "members"
                  ? "kpiMembersSub"
                  : key === "visits"
                    ? "kpiVisitsSub"
                    : key === "active"
                      ? "kpiActiveSub"
                      : "kpiInactiveSub";
            return (
              <div key={key} className="members-dir-kpi">
                <div className={`members-dir-kpi-icon ${iconClass}`}>
                  <IconUsers />
                </div>
                <div>
                  <p className={`members-dir-kpi-label ${iconClass}`}>
                    {t(`preview.membershipDirectory.${labelKey}`)}
                  </p>
                  <p className="members-dir-kpi-value mono">{row.value}</p>
                  <p className="members-dir-kpi-sub">
                    {t(`preview.membershipDirectory.${subKey}`, { percent: row.percent })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="members-dir-card">
          <div className="members-dir-card-head">
            <div className="members-dir-sicon purple">
              <IconUsers />
            </div>
            <span className="purple">{t("preview.membershipDirectory.sectionDirectory")}</span>
            <span className="members-dir-card-count">
              {t("exports.membershipDirectory.records", { count: payload.stats.total })}
            </span>
          </div>
          <table className="members-dir-table">
            <thead>
              <tr>
                <th className="col-idx">#</th>
                <th>{t("exports.membershipDirectory.columns.fullName")}</th>
                <th>{t("exports.membershipDirectory.columns.role")}</th>
                <th>{t("exports.membershipDirectory.columns.phone")}</th>
                <th>{t("exports.membershipDirectory.columns.email")}</th>
                <th>{t("exports.membershipDirectory.columns.city")}</th>
                <th className="col-flag">{t("exports.membershipDirectory.columns.member")}</th>
                <th className="col-flag">{t("exports.membershipDirectory.columns.active")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => {
                const row = memberDirectoryRow(member, yesLabel, noLabel);
                return (
                  <tr key={member.memberId}>
                    <td className="idx">{index + 1}</td>
                    <td className="name">{row[0]}</td>
                    <td className="role">
                      <span className="members-dir-role-pill">{row[1] || "—"}</span>
                    </td>
                    <td className="contact mono">{row[2] || "—"}</td>
                    <td className="email">{row[3] || "—"}</td>
                    <td className="city">{row[4] || "—"}</td>
                    <td className="flag">
                      <span className={`members-dir-badge ${member.isMember ? "yes" : "no"}`}>
                        <span className="dot" />
                        {row[5]}
                      </span>
                    </td>
                    <td className="flag">
                      <span className={`members-dir-badge ${member.isActive ? "yes" : "off"}`}>
                        <span className="dot" />
                        {row[6]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="members-dir-table-foot">
            <span>
              {t("preview.membershipDirectory.showing", {
                from: members.length > 0 ? 1 : 0,
                to: members.length,
                total: payload.stats.total,
              })}
            </span>
            <span>{t("preview.membershipDirectory.sortedBy")}</span>
          </div>
        </div>

        <div className="members-dir-row2">
          <div className="members-dir-card">
            <div className="members-dir-card-head">
              <div className="members-dir-sicon blue">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M3 3v18h18" />
                  <path d="M7 15l4-4 3 3 5-6" />
                </svg>
              </div>
              <span className="navy">{t("preview.membershipDirectory.summaryTitle")}</span>
            </div>
            <div className="members-dir-dist-body">
              {statsRows
                .filter((s) => s.key !== "total")
                .map((row) => (
                  <div key={row.key} className="members-dir-dist-row">
                    <div className="members-dir-dist-top">
                      <span className={row.key}>
                        {t(`preview.membershipDirectory.kpi${row.key === "members" ? "Members" : row.key === "visits" ? "Visits" : row.key === "active" ? "Active" : "Inactive"}`)}
                      </span>
                      <span className="mono">
                        {row.value} · {row.percent}%
                      </span>
                    </div>
                    <div className="members-dir-dist-track">
                      <div
                        className={`members-dir-dist-fill ${row.key}`}
                        style={{ width: `${row.percent}%` }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>

          <div className="members-dir-card">
            <div className="members-dir-card-head">
              <IconUsers />
              <span className="orange">{t("preview.membershipDirectory.importantNotes")}</span>
            </div>
            <div className="members-dir-notes-body">
              <p>{t("preview.membershipDirectory.notesBodyLine1")}</p>
              <p>{t("preview.membershipDirectory.notesBodyLine2")}</p>
            </div>
          </div>
        </div>
      </div>

      <MembershipDirectoryFormPrint
        payload={payload}
        generatedByName={generatedByName}
      />
    </div>
  );
}
