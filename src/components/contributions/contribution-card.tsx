"use client";

import { ContributionActionMenu } from "@/components/contributions/contribution-action-menu";
import { ContributorCell } from "@/components/contributions/contribution-ui";
import {
  categoryChipClass,
  paymentMethodLabel,
} from "@/lib/contributions/parse";
import type { Contribution } from "@/lib/contributions/types";
import { fmtRD } from "@/lib/format-currency";
import { formatDate } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "next-intl";

/** Card móvil — mismo patrón que miembros / fondos */
export function ContributionCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: Contribution;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tFinances = useTranslations("finances");
  const locale = useLocale() as "es" | "en" | "fr";
  return (
    <div className="card" style={{ padding: 14, position: "relative" }}>
      <div style={{ position: "absolute", top: 12, right: 12 }}>
        <ContributionActionMenu onEdit={onEdit} onDelete={onDelete} />
      </div>

      <div style={{ paddingRight: 36 }}>
        <ContributorCell entry={entry} />
        <div
          className="tnum mono"
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "var(--success)",
            marginTop: 10,
          }}
        >
          +{fmtRD(entry.amount, locale)}
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          <span className={`chip ${categoryChipClass(entry.category)}`}>
            <span className="pip" /> {entry.typeName}
          </span>
          <span className="chip">{entry.fundName}</span>
          <span className="chip">
            {entry.collectionMode === "collective"
              ? tFinances("contributionTypes.collective")
              : tFinances("contributionTypes.individual")}
          </span>
        </div>
        <div className="tiny muted tnum" style={{ marginTop: 8 }}>
          {formatDate(entry.paymentDate, locale, {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}{" "}
          ·{" "}
          {paymentMethodLabel(entry.paymentMethod)}
        </div>
      </div>
    </div>
  );
}
