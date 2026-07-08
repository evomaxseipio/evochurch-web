"use client";

import type { ChurchEvent } from "@/lib/mock/dashboard-data";
import type { Locale } from "@/i18n/config";
import { formatDate } from "@/lib/i18n/format";
import { useLocale, useTranslations } from "next-intl";

function eventColors(type: ChurchEvent["type"]) {
  switch (type) {
    case "culto":
      return { bg: "var(--primary-50)", color: "var(--primary-600)" };
    case "estudio":
      return { bg: "var(--accent-100)", color: "var(--accent-600)" };
    default:
      return { bg: "var(--success-bg)", color: "var(--success)" };
  }
}

function nextEvent(events: ChurchEvent[]): ChurchEvent | null {
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = [...events]
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
  return upcoming[0] ?? events[0] ?? null;
}

export function LastEventCard({ events }: { events: ChurchEvent[] }) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as Locale;
  const event = nextEvent(events);

  return (
    <div className="card span-3 dashboard-event-card">
      <div style={{ marginBottom: 14 }}>
        <div className="eyebrow">{t("agenda")}</div>
        <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
          {t("lastEvent")}
        </div>
      </div>

      {!event ? (
        <div
          className="muted"
          style={{
            padding: "24px 8px",
            textAlign: "center",
            borderRadius: 10,
            background: "var(--surface-2)",
            fontSize: 13,
          }}
        >
          {t("noEventsScheduled")}
        </div>
      ) : (
        (() => {
          const d = new Date(event.date + "T12:00:00");
          const monthLabel = formatDate(d, locale, { month: "short" });
          const dayLabel = formatDate(d, locale, { day: "2-digit" });
          const colors = eventColors(event.type);
          return (
            <div className="dashboard-event-body">
              <div className="row" style={{ gap: 12, alignItems: "center" }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 12,
                    background: colors.bg,
                    color: colors.color,
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <div style={{ textAlign: "center", lineHeight: 1 }}>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      {monthLabel}
                    </div>
                    <div className="display" style={{ fontSize: 24, marginTop: 2 }}>
                      {dayLabel}
                    </div>
                  </div>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3 }}>
                    {event.title}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    {event.time}
                  </div>
                  <div className="tiny muted" style={{ marginTop: 2 }}>
                    {event.location}
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
