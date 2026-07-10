"use client";

import { Icons } from "@/components/icons";
import type { DiscountTemplate } from "@/lib/discounts/types";
import type { ReportCatalogEntry } from "@/lib/reports/catalog";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";

const DiscountTemplateFormDrawer = dynamic(
  () =>
    import("@/components/discounts/discount-template-form-drawer").then(
      (m) => m.DiscountTemplateFormDrawer,
    ),
  { ssr: false },
);

function primaryReportLink(template: DiscountTemplate) {
  return template.reportLinks.find((l) => l.isActive) ?? template.reportLinks[0];
}

export function DiscountTemplatesListView({
  templates,
  canWrite,
  linkableReports,
}: {
  templates: DiscountTemplate[];
  canWrite: boolean;
  linkableReports: ReportCatalogEntry[];
}) {
  const t = useTranslations("discountTemplates");
  const tCommon = useTranslations("common");
  const tReports = useTranslations("reports");
  const [drawer, setDrawer] = useState<
    { mode: "new" | "edit"; template: DiscountTemplate | null } | null
  >(null);

  return (
    <div>
      <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
        <div>
          <div className="eyebrow">{t("configLabel")}</div>
          <h1 className="display" style={{ fontSize: 26 }}>
            {t("title")}
          </h1>
          <p className="tiny muted" style={{ marginTop: 6, maxWidth: 560 }}>
            {t("subtitle")}
          </p>
        </div>
        {canWrite ? (
          <button
            type="button"
            className="btn primary"
            onClick={() => setDrawer({ mode: "new", template: null })}
          >
            <Icons.plus size={14} /> {t("newTemplate")}
          </button>
        ) : null}
      </div>

      {templates.length === 0 ? (
        <div className="card" style={{ marginTop: 20, padding: 40, textAlign: "center" }}>
          <div className="display" style={{ fontSize: 20 }}>
            {t("emptyTitle")}
          </div>
          <p className="tiny muted" style={{ marginTop: 8 }}>
            {t("emptyHint")}
          </p>
        </div>
      ) : (
        <div className="col" style={{ gap: 10, marginTop: 20 }}>
          {templates.map((template) => (
            <div
              key={template.id}
              className="card"
              style={{ padding: 16, cursor: "pointer" }}
              onClick={() => setDrawer({ mode: "edit", template })}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setDrawer({ mode: "edit", template });
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="row" style={{ justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>{template.name}</div>
                  {template.description ? (
                    <p className="tiny muted" style={{ marginTop: 4 }}>
                      {template.description}
                    </p>
                  ) : null}
                </div>
                <span className={`chip ${template.isActive ? "success" : ""}`.trim()}>
                  {template.isActive ? tCommon("active") : tCommon("inactive")}
                </span>
              </div>

              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <span className="chip">{t(`baseKinds.${template.baseKind}`)}</span>
                {template.lines.map((line) => (
                  <span key={line.id} className="chip violet">
                    {line.label} {line.percent}%
                  </span>
                ))}
              </div>

              {(() => {
                const link = primaryReportLink(template);
                return link ? (
                  <div className="tiny muted" style={{ marginTop: 10 }}>
                    {t("linkedReport")}:{" "}
                    {tReports(`catalog.${link.reportId}.title`)}
                  </div>
                ) : (
                  <div className="tiny muted" style={{ marginTop: 10 }}>
                    {t("noReportLinks")}
                  </div>
                );
              })()}
            </div>
          ))}
        </div>
      )}

      <DiscountTemplateFormDrawer
        mode={drawer?.mode ?? "new"}
        template={drawer?.template ?? null}
        open={drawer !== null}
        onClose={() => setDrawer(null)}
        canWrite={canWrite}
        linkableReports={linkableReports}
      />
    </div>
  );
}
