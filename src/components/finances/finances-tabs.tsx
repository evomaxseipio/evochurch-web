"use client";

import Link from "next/link";

const TABS = [
  { id: "fondos", href: "/finances/funds", label: "Fondos" },
  { id: "transacciones", href: "/finances/transactions", label: "Transacciones" },
  {
    id: "contribuciones",
    href: "/finances/contributions",
    label: "Contribuciones",
  },
] as const;

export type FinancesTabId = (typeof TABS)[number]["id"];

export function FinancesTabs({ active }: { active: FinancesTabId }) {
  return (
    <div className="tabs" style={{ marginTop: 28 }}>
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`tab ${active === tab.id ? "active" : ""}`}
          style={{ textDecoration: "none" }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
