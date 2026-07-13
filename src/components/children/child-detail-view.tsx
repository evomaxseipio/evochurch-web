"use client";

import { ChildFormDrawer } from "@/components/children/child-form-drawer";
import { Icons } from "@/components/icons";
import { churchPath } from "@/lib/apps/church-routes";
import {
  childFullName,
  computeAgeYears,
  guardianFullName,
} from "@/lib/children/parse";
import type { ChildProfile } from "@/lib/children/types";
import type { Member } from "@/lib/members/types";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function ChildDetailView({
  child,
  adultMembers,
  canWrite,
}: {
  child: ChildProfile;
  adultMembers: Member[];
  canWrite: boolean;
}) {
  const t = useTranslations("children");
  const [editOpen, setEditOpen] = useState(false);
  const age = computeAgeYears(child.dateOfBirth);

  return (
    <>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
        <div>
          <div className="eyebrow">{t("eyebrow")}</div>
          <h1 className="display" style={{ fontSize: 36, margin: "4px 0 6px" }}>
            {childFullName(child)}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {age != null ? t("ageYears", { age }) : t("dateOfBirth")}:{" "}
            {child.dateOfBirth || "—"}
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => setEditOpen(true)}
          >
            <Icons.edit size={16} /> {t("editChild")}
          </button>
        ) : null}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <section className="card" style={{ padding: "18px 20px" }}>
          <div className="eyebrow">{t("sectionHealth")}</div>
          <h3 style={{ margin: "6px 0 14px", fontSize: 16 }}>{t("allergies")}</h3>
          {child.allergies.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {child.allergies.map((tag) => (
                <span key={tag} className="chip violet">
                  {tag}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted tiny" style={{ margin: 0 }}>
              —
            </p>
          )}
        </section>

        <section className="card" style={{ padding: "18px 20px" }}>
          <div className="eyebrow">{t("sectionEmergency")}</div>
          <h3 style={{ margin: "6px 0 14px", fontSize: 16 }}>
            {t("emergencyContactName")}
          </h3>
          <p style={{ margin: "0 0 8px" }}>
            {child.emergencyContactName || "—"}
          </p>
          <p className="muted tiny" style={{ margin: 0 }}>
            {child.emergencyContactPhone || "—"}
          </p>
        </section>

        {child.notes?.trim() ? (
          <section className="card" style={{ padding: "18px 20px", gridColumn: "1 / -1" }}>
            <div className="eyebrow">{t("sectionNotes")}</div>
            <h3 style={{ margin: "6px 0 14px", fontSize: 16 }}>{t("notes")}</h3>
            <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{child.notes}</p>
          </section>
        ) : null}

        <section
          className="card"
          style={{
            padding: "18px 20px",
            gridColumn: "1 / -1",
          }}
        >
          <div className="eyebrow">{t("sectionGuardians")}</div>
          <h3 style={{ margin: "6px 0 14px", fontSize: 16 }}>{t("guardiansLabel")}</h3>
          {child.guardians.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {child.guardians.map((guardian) => (
                <div
                  key={`${guardian.guardianProfileId}-${guardian.relationship}`}
                  className="row between"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "var(--bg-2)",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      <Link
                        href={churchPath(
                          `/members/profile?id=${guardian.guardianProfileId}&tab=family`,
                        )}
                        className="text-primary"
                        style={{ textDecoration: "none" }}
                      >
                        {guardianFullName(guardian)}
                      </Link>
                    </div>
                    <div className="tiny muted">
                      {t(`relationship.${guardian.relationship}`)}
                      {guardian.isPrimary ? ` · ${t("primaryGuardian")}` : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted tiny" style={{ margin: 0 }}>
              {t("noGuardians")}
            </p>
          )}
        </section>
      </div>

      {editOpen ? (
        <ChildFormDrawer
          open
          mode="edit"
          child={child}
          adultMembers={adultMembers}
          onClose={() => setEditOpen(false)}
        />
      ) : null}
    </>
  );
}
