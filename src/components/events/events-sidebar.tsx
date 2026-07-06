"use client";

import {
  formatEventLocalDate,
  formatEventLocalTime,
} from "@/lib/events/parse";
import type { EventOccurrence } from "@/lib/events/types";
import { useLocale, useTranslations } from "next-intl";

export function EventsSidebar({
  upcoming,
  featured,
  timezone,
}: {
  upcoming: EventOccurrence[];
  featured: EventOccurrence | null;
  timezone: string;
}) {
  const t = useTranslations("eventos");
  const locale = useLocale();

  return (
    <div className="col" style={{ gap: 14 }}>
      <div className="card">
        <div className="eyebrow">{t("upcoming")}</div>
        <div className="col" style={{ gap: 12, marginTop: 12 }}>
          {upcoming.length === 0 ? (
            <p className="tiny muted">{t("emptyTitle")}</p>
          ) : (
            upcoming.map((event) => (
              <div
                key={`up-${event.seriesId}-${event.occurrenceDate}`}
                className="row"
                style={{ gap: 12, alignItems: "flex-start" }}
              >
                <div
                  style={{
                    width: 4,
                    alignSelf: "stretch",
                    borderRadius: 4,
                    background: "color-mix(in oklab, var(--accent) 70%, transparent)",
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{event.title}</div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    {formatEventLocalDate(event.startsAt, timezone, locale, "long")}
                    {!event.isAllDay
                      ? ` · ${formatEventLocalTime(event.startsAt, timezone, false, locale)}`
                      : ""}
                  </div>
                  {event.location ? (
                    <div className="tiny muted">{event.location}</div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {featured ? (
        <div
          className="card"
          style={{
            background: "linear-gradient(135deg, var(--primary), var(--primary-500))",
            color: "#fff",
            border: "1px solid transparent",
          }}
        >
          <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>
            {t("featured")}
          </div>
          <div
            className="display"
            style={{ fontSize: 24, marginTop: 6, lineHeight: 1.15 }}
          >
            {featured.title}
          </div>
          <p style={{ fontSize: 13, opacity: 0.85, marginTop: 8, lineHeight: 1.5 }}>
            {formatEventLocalDate(featured.startsAt, timezone, locale, "long")}
            {!featured.isAllDay
              ? ` · ${formatEventLocalTime(featured.startsAt, timezone, false, locale)}`
              : ""}
            {featured.location ? ` · ${featured.location}` : ""}
          </p>
        </div>
      ) : null}
    </div>
  );
}
