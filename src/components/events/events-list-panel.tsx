"use client";

import { EventListRow } from "@/components/events/event-list-row";
import { Icons } from "@/components/icons";
import type { EventOccurrence } from "@/lib/events/types";
import { useTranslations } from "next-intl";

const LIST_PANEL_MAX_HEIGHT = "calc(100dvh - 220px)";

export function EventsListPanel({
  events,
  timezone,
  canCreate,
  canEditFor,
  canDelete,
  loadingSeries,
  onCreate,
  onEdit,
  onDelete,
}: {
  events: EventOccurrence[];
  timezone: string;
  canCreate: boolean;
  canEditFor: (event: EventOccurrence) => boolean;
  canDelete: boolean;
  loadingSeries: boolean;
  onCreate: () => void;
  onEdit: (event: EventOccurrence) => void;
  onDelete: (event: EventOccurrence) => void;
}) {
  const t = useTranslations("eventos");

  return (
    <div
      className="card"
      style={{
        padding: 0,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxHeight: LIST_PANEL_MAX_HEIGHT,
        minHeight: 420,
      }}
    >
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          padding: 12,
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {events.length === 0 ? (
          <div className="empty-state" style={{ padding: "48px 24px" }}>
            <Icons.cal width={40} />
            <h3>{t("emptyTitle")}</h3>
            <p className="muted">{t("emptyDescription")}</p>
            {canCreate ? (
              <button type="button" className="btn primary sm" onClick={onCreate}>
                {t("newEvent")}
              </button>
            ) : null}
          </div>
        ) : (
          events.map((event) => {
            const canEdit = canEditFor(event);
            return (
              <EventListRow
                key={`${event.seriesId}-${event.occurrenceDate}`}
                event={event}
                timezone={timezone}
                canEdit={canEdit}
                canDelete={canDelete}
                loadingSeries={loadingSeries}
                onEdit={() => onEdit(event)}
                onDelete={() => onDelete(event)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
