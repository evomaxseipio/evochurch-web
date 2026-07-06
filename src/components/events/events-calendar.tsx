"use client";

import {
  buildMonthGrid,
  groupEventsByDate,
  monthStartFromToday,
  todayInTimezone,
} from "@/lib/events/calendar";
import type { EventOccurrence } from "@/lib/events/types";
import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

const CALENDAR_MAX_HEIGHT = "calc(100dvh - 220px)";

const WEEKDAY_KEYS = ["0", "1", "2", "3", "4", "5", "6"] as const;

export function EventsCalendar({
  events,
  timezone,
  onSelectEvent,
}: {
  events: EventOccurrence[];
  timezone: string;
  onSelectEvent?: (event: EventOccurrence) => void;
}) {
  const t = useTranslations("eventos");
  const locale = useLocale();
  const initial = monthStartFromToday(timezone);
  const [year, setYear] = useState(initial.year);
  const [monthIndex, setMonthIndex] = useState(initial.monthIndex);

  const eventsByDate = useMemo(() => groupEventsByDate(events), [events]);
  const cells = useMemo(
    () => buildMonthGrid(year, monthIndex, timezone),
    [year, monthIndex, timezone],
  );

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "long",
        year: "numeric",
        timeZone: timezone,
      }).format(new Date(year, monthIndex, 15)),
    [year, monthIndex, timezone, locale],
  );

  function shiftMonth(delta: number) {
    const d = new Date(year, monthIndex + delta, 1);
    setYear(d.getFullYear());
    setMonthIndex(d.getMonth());
  }

  function goToday() {
    const today = todayInTimezone(timezone);
    const [y, m] = today.split("-").map(Number);
    setYear(y);
    setMonthIndex(m - 1);
  }

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: CALENDAR_MAX_HEIGHT,
        minHeight: 420,
      }}
    >
      <div
        className="row between"
        style={{
          padding: "18px 22px",
          borderBottom: "1px solid var(--hairline)",
          flexShrink: 0,
        }}
      >
        <div
          className="display"
          style={{ fontSize: 28, letterSpacing: "-0.02em", textTransform: "capitalize" }}
        >
          {monthLabel}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className="btn ghost icon-only sm"
            onClick={() => shiftMonth(-1)}
            aria-label={t("prevMonth")}
          >
            ←
          </button>
          <button type="button" className="btn outline sm" onClick={goToday}>
            {t("today")}
          </button>
          <button
            type="button"
            className="btn ghost icon-only sm"
            onClick={() => shiftMonth(1)}
            aria-label={t("nextMonth")}
          >
            →
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        <div className="cal" style={{ borderRadius: 0, border: "none" }}>
          {WEEKDAY_KEYS.map((key) => (
            <div key={key} className="dow">
              {t(`calendarWeekdays.${key}`)}
            </div>
          ))}
          {cells.map((cell) => {
            const dayEvents = eventsByDate.get(cell.dateIso) ?? [];
            return (
              <div
                key={cell.dateIso}
                className={`day${cell.muted ? " muted" : ""}${cell.isToday ? " today" : ""}`}
              >
                <div className="num">{cell.day}</div>
                {dayEvents.slice(0, 2).map((event) => (
                  <button
                    key={`${event.seriesId}-${event.occurrenceDate}`}
                    type="button"
                    className={`pill ${event.eventType}`}
                    title={event.title}
                    onClick={() => onSelectEvent?.(event)}
                    style={{
                      border: "none",
                      cursor: onSelectEvent ? "pointer" : "default",
                      textAlign: "left",
                      width: "100%",
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 2 ? (
                  <div className="tiny muted">
                    {t("moreEvents", { count: dayEvents.length - 2 })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
