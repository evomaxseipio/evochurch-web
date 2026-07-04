"use client";

import { useTranslations } from "next-intl";

export function CatalogStatusChip({ active }: { active: boolean }) {
  const tCommon = useTranslations("common");
  return (
    <span className={`chip ${active ? "green" : ""}`}>
      <span className="pip" /> {active ? tCommon("active") : tCommon("inactive")}
    </span>
  );
}
