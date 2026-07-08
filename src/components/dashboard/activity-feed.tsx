"use client";

import type { AuditLogEntry } from "@/lib/audit/types";
import { Icons } from "@/components/icons";
import {
  auditActionLabel,
  formatAuditRelativeTime,
  resolveAuditSummary,
} from "@/lib/audit/labels";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/config";

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ActivityFeed({
  items,
  emptyMessage,
  limit = 4,
}: {
  items: AuditLogEntry[];
  emptyMessage?: string;
  limit?: number;
}) {
  const tAudit = useTranslations("audit");
  const locale = useLocale() as Locale;
  const visible = items.slice(0, limit);

  if (visible.length === 0) {
    return (
      <div className="dashboard-activity-empty">
        <span
          className="avatar sq lg"
          style={{
            margin: "0 auto 12px",
            background: "var(--accent-soft)",
            color: "var(--accent)",
          }}
        >
          <Icons.bell size={18} />
        </span>
        <p className="tiny muted" style={{ margin: 0, maxWidth: 260, lineHeight: 1.5 }}>
          {emptyMessage ?? tAudit("empty")}
        </p>
      </div>
    );
  }

  return (
    <div className="dashboard-activity-list">
      {visible.map((entry) => {
        const who = entry.actorDisplayName || tAudit("unknownActor");
        const summary = resolveAuditSummary(entry, (key, values) =>
          tAudit(key as "actions.create", values),
        );
        const actionLabel = auditActionLabel(entry.action, (key, values) =>
          tAudit(key as "actions.create", values),
        );

        return (
          <div
            key={entry.id}
            className="row"
            style={{ gap: 12, alignItems: "flex-start" }}
          >
            <span
              className="avatar md"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {initials(who)}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="dashboard-activity-summary" style={{ fontSize: 14 }}>
                <b>{who}</b>{" "}
                <span className="muted">{summary || actionLabel}</span>
              </div>
              <div className="tiny muted" suppressHydrationWarning>
                {formatAuditRelativeTime(entry.createdAt, locale)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
