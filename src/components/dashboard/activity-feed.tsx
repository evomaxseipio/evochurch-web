"use client";

import type { AuditLogEntry } from "@/lib/audit/types";
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
}: {
  items: AuditLogEntry[];
  emptyMessage?: string;
}) {
  const tAudit = useTranslations("audit");
  const locale = useLocale() as Locale;

  if (items.length === 0) {
    return (
      <p className="tiny muted" style={{ margin: 0 }}>
        {emptyMessage ?? tAudit("empty")}
      </p>
    );
  }

  return (
    <div className="col" style={{ gap: 14 }}>
      {items.map((entry) => {
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
              <div style={{ fontSize: 14 }}>
                <b>{who}</b>{" "}
                <span className="muted">{summary || actionLabel}</span>
              </div>
              <div className="tiny muted">
                {formatAuditRelativeTime(entry.createdAt, locale)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
