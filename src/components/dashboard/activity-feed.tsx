"use client";

import type { Activity } from "@/lib/mock/dashboard-data";
import { useTranslations } from "next-intl";

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ActivityFeed({ items }: { items: Activity[] }) {
  const t = useTranslations("dashboard");

  return (
    <div className="col" style={{ gap: 14 }}>
      {items.map((a, i) => (
        <div key={i} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
          <span className={`avatar md`} style={{ background: "var(--accent-soft)", color: "var(--accent)" }}>
            {initials(a.who)}
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14 }}>
              <b>{a.who}</b>{" "}
              <span className="muted">
                {t(a.whatKey as "activityRegisteredTithe")}
              </span>
              {a.amount !== "—" ? (
                <span style={{ color: "var(--ink)", fontWeight: 600 }}> · {a.amount}</span>
              ) : null}
            </div>
            <div className="tiny muted">{t(a.timeKey as "time12Min")}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
