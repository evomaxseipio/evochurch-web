"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

const TABS = [
  { id: "fondos", href: "/finances/funds", labelKey: "tabs.funds" },
  {
    id: "transacciones",
    href: "/finances/transactions",
    labelKey: "tabs.transactions",
  },
  {
    id: "contribuciones",
    href: "/finances/contributions",
    labelKey: "tabs.contributions",
  },
] as const;

export type FinancesTabId = (typeof TABS)[number]["id"];

export function FinancesTabs({ active }: { active: FinancesTabId }) {
  const t = useTranslations("finances");
  return (
    <div className="tabs" style={{ marginTop: 28 }}>
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`tab ${active === tab.id ? "active" : ""}`}
          style={{ textDecoration: "none" }}
        >
          {t(tab.labelKey)}
        </Link>
      ))}
    </div>
  );
}
