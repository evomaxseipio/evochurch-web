"use client";

import { EventTypeBadge } from "@/components/events/event-type-badge";
import { Icons } from "@/components/icons";
import {
  formatEventLocalTime,
  formatEventMonthDay,
} from "@/lib/events/parse";
import type { EventOccurrence } from "@/lib/events/types";
import { useLocale, useTranslations } from "next-intl";

export function EventListRow({
  event,
  timezone,
  canEdit,
  canDelete,
  loadingSeries,
  onEdit,
  onDelete,
}: {
  event: EventOccurrence;
  timezone: string;
  canEdit: boolean;
  canDelete: boolean;
  loadingSeries: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const t = useTranslations("eventos");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const { month, day } = formatEventMonthDay(event.startsAt, timezone, locale);
  const timeLabel = formatEventLocalTime(
    event.startsAt,
    timezone,
    event.isAllDay,
    locale,
  );
  const meta = [
    timeLabel,
    event.location,
    event.ministryName,
    event.isRecurring ? t("recurring") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      className="card"
      style={{
        padding: 18,
        display: "grid",
        gridTemplateColumns: "70px 1fr auto",
        gap: 18,
        alignItems: "center",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          background: "color-mix(in oklab, var(--accent) 10%, transparent)",
          color: "var(--accent-600)",
          borderRadius: 14,
          padding: 12,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {month}
        </div>
        <div className="display" style={{ fontSize: 28, lineHeight: 1, marginTop: 2 }}>
          {day}
        </div>
      </div>
      <div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{event.title}</div>
          <EventTypeBadge type={event.eventType} label={t(`types.${event.eventType}`)} />
        </div>
        <div className="tiny muted" style={{ marginTop: 4 }}>
          {meta}
        </div>
      </div>
      <div className="row" style={{ gap: 6 }}>
        {canEdit ? (
          <button
            type="button"
            className="btn outline sm"
            disabled={loadingSeries}
            onClick={onEdit}
          >
            {tCommon("edit")}
          </button>
        ) : null}
        {canDelete && canEdit ? (
          <button
            type="button"
            className="btn ghost icon-only sm"
            onClick={onDelete}
            aria-label={t("deleteEvent")}
          >
            <Icons.trash width={16} />
          </button>
        ) : null}
      </div>
    </div>
  );
}
