"use client";

import { churchPath } from "@/lib/apps/church-routes";
import {
  familyChildFullName,
  familyChildProfileHref,
} from "@/lib/members/family";
import {
  familyHouseholdAdultName,
  familyHouseholdInitials,
  type FamilyHouseholdAdult,
  type FamilyHouseholdDetail,
} from "@/lib/reports/family-household";
import Link from "next/link";
import { useTranslations } from "next-intl";
import "./family-report.css";

function AdultRow({
  adult,
  roleLabel,
  soft,
}: {
  adult: FamilyHouseholdAdult;
  roleLabel: string;
  soft?: boolean;
}) {
  const t = useTranslations("reports.families");
  return (
    <div className="person-row">
      <div className={`avatar md${soft ? " soft" : ""}`}>
        {familyHouseholdInitials(adult)}
      </div>
      <div>
        <div style={{ fontWeight: 600 }}>{familyHouseholdAdultName(adult)}</div>
        <div className="person-meta">
          <span className="chip violet">{roleLabel}</span>
          <span className="chip muted">{adult.membershipRole}</span>
          {adult.isMember ? (
            <span className="chip green">{t("member")}</span>
          ) : null}
        </div>
        {adult.phone ? (
          <div className="tiny muted" style={{ marginTop: 4 }}>
            {t("phone", { phone: adult.phone })}
          </div>
        ) : null}
      </div>
      <Link
        className="linkish no-print"
        href={churchPath(`/members/profile?id=${adult.profileId}`)}
      >
        {t("viewProfile")}
      </Link>
    </div>
  );
}

export function FamilyHouseholdDetailView({
  household,
  churchName,
}: {
  household: FamilyHouseholdDetail;
  churchName?: string | null;
}) {
  const t = useTranslations("reports.families");
  const adults = household.spouse
    ? [household.anchor, household.spouse]
    : [household.anchor];

  return (
    <div className="family-report-dash">
      <div
        className="row between no-print"
        style={{ marginBottom: 16, flexWrap: "wrap", gap: 12 }}
      >
        <Link
          className="btn outline sm"
          href={churchPath("/reports/families")}
        >
          ← {t("backToList")}
        </Link>
        <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
          <button
            type="button"
            className="btn outline sm"
            onClick={() => window.print()}
          >
            {t("print")}
          </button>
          <button
            type="button"
            className="btn primary sm"
            onClick={() => window.print()}
          >
            {t("exportPdf")}
          </button>
        </div>
      </div>

      {/* Screen layout */}
      <div className="screen-only">
        <div className="page-head" style={{ marginBottom: 20 }}>
          <div>
            <div className="eyebrow">{t("detailEyebrow")}</div>
            <h1
              className="display"
              style={{
                fontSize: 28,
                margin: "4px 0 8px",
                letterSpacing: "-0.02em",
              }}
            >
              {household.familyLabel}
            </h1>
            <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
              <span className="chip violet">
                {t("adultsChip", { count: household.adultsCount })}
              </span>
              <span className="chip muted">
                {t("ministryChip", { count: household.ministryChildrenCount })}
              </span>
              {household.status === "incomplete" ? (
                <span className="chip amber">{t("status.incomplete")}</span>
              ) : (
                <span className="chip green">{t("status.complete")}</span>
              )}
            </div>
          </div>
        </div>

        <div className="card section-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">{t("linksEyebrow")}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {t("parentsTitle")}
              </div>
            </div>
          </div>
          <div className="section-body">
            {adults.map((adult, idx) => (
              <AdultRow
                key={adult.profileId}
                adult={adult}
                soft={idx > 0}
                roleLabel={
                  idx === 0
                    ? t(`parentRole.${adult.role}`)
                    : t("spouseRole")
                }
              />
            ))}
          </div>
        </div>

        <div className="card section-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">{t("childrenEyebrow")}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {t("childrenTitle")}
              </div>
            </div>
          </div>
          <div className="section-body">
            {household.children.length === 0 ? (
              <p className="muted tiny">{t("noChildren")}</p>
            ) : (
              household.children.map((child) => (
                <div key={child.profileId} className="person-row">
                  <div
                    className={`avatar ${child.isChild ? "xs soft" : "sm"}`}
                  >
                    {familyHouseholdInitials(child)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {familyChildFullName(child)}
                      {child.age != null ? ` · ${child.age}` : ""}
                    </div>
                    <div className="person-meta">
                      {child.isChild ? (
                        <span className="chip violet">{t("ministryChild")}</span>
                      ) : (
                        <span className="chip muted">{child.membershipRole}</span>
                      )}
                    </div>
                  </div>
                  <Link
                    className="linkish no-print"
                    href={churchPath(familyChildProfileHref(child))}
                  >
                    {child.isChild ? t("viewChild") : t("viewProfile")}
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card section-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">{t("treeEyebrow")}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {t("treeTitle")}
              </div>
            </div>
          </div>
          <div className="section-body">
            <div className="family-tree">
              <div className="tree-couple">
                {adults.map((adult, idx) => (
                  <div key={adult.profileId} className="row" style={{ gap: 0 }}>
                    {idx > 0 ? <div className="tree-link" /> : null}
                    <div className="tree-node">
                      <div className={`avatar sm${idx > 0 ? " soft" : ""}`}>
                        {familyHouseholdInitials(adult)}
                      </div>
                      <div className="label">{adult.firstName || "—"}</div>
                      <div className="sub">
                        {idx === 0
                          ? t(`parentRole.${adult.role}`)
                          : t("spouseRole")}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {household.children.length > 0 ? (
                <>
                  <div className="tree-stem" />
                  <div className="tree-kids">
                    {household.children.map((child) => (
                      <div key={child.profileId} className="tree-kid">
                        <div
                          className={`avatar xs${child.isChild ? " soft" : ""}`}
                        >
                          {familyHouseholdInitials(child)}
                        </div>
                        <div
                          className="label"
                          style={{ fontSize: 11, fontWeight: 600 }}
                        >
                          {child.firstName || "—"}
                        </div>
                        <div className="sub">
                          {child.age != null ? String(child.age) : "—"}
                          {child.isChild ? ` · ${t("ministryShort")}` : ""}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>

        <div className="card section-card">
          <div className="section-head">
            <div>
              <div className="eyebrow">{t("notesEyebrow")}</div>
              <div style={{ fontWeight: 600, marginTop: 2 }}>
                {t("notesTitle")}
              </div>
            </div>
            <span className="chip muted">{t("notesPlaceholderBadge")}</span>
          </div>
          <div className="section-body">
            <div className="notes-box">{t("notesPlaceholder")}</div>
          </div>
        </div>
      </div>

      {/* Print sheet */}
      <div className="print-sheet print-only">
        <div className="print-brand">
          <div>
            <div className="church">{churchName ?? "EvoChurch"}</div>
            <div className="tiny muted">{t("printDocType")}</div>
          </div>
          <div className="doc-meta">
            <div>{new Date().toLocaleDateString()}</div>
            <div>{t("printConfidential")}</div>
          </div>
        </div>
        <h1 className="print-title">{household.familyLabel}</h1>
        <p className="print-summary">
          {t("printSummary", {
            adults: household.adultsCount,
            children: household.childrenCount,
          })}
        </p>

        <div className="print-block">
          <h3>{t("parentsTitle")}</h3>
          {adults.map((adult) => (
            <div key={adult.profileId} className="print-person">
              <span>{familyHouseholdAdultName(adult)}</span>
              <span className="muted">
                {adult.membershipRole}
                {adult.phone ? ` · ${adult.phone}` : ""}
              </span>
            </div>
          ))}
        </div>

        <div className="print-block">
          <h3>{t("childrenTitle")}</h3>
          {household.children.length === 0 ? (
            <p className="muted tiny">{t("noChildren")}</p>
          ) : (
            household.children.map((child) => (
              <div key={child.profileId} className="print-person">
                <span>
                  {familyChildFullName(child)}
                  {child.age != null ? ` · ${child.age}` : ""}
                </span>
                <span className="muted">
                  {child.isChild
                    ? t("ministryChild")
                    : child.membershipRole}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="print-block">
          <h3>{t("treeTitle")}</h3>
          <div className="print-tree">
            <div className="couple">
              {adults.map((a) => a.firstName).filter(Boolean).join(" — ")}
            </div>
            {household.children.length > 0 ? (
              <div className="kids">
                {household.children
                  .map((c) => c.firstName || familyChildFullName(c))
                  .join(" · ")}
              </div>
            ) : null}
          </div>
        </div>

        <div className="print-footer">
          <span>EvoChurch</span>
          <span>{t("printFooter")}</span>
        </div>
      </div>
    </div>
  );
}
