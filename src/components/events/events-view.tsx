"use client";

import {
  deleteEventAction,
  loadEventSeriesAction,
  saveEventAction,
} from "@/app/apps/church/(console)/eventos/actions";
import { EventFormDrawer } from "@/components/events/event-form-drawer";
import { EventsCalendar } from "@/components/events/events-calendar";
import { EventsListPanel } from "@/components/events/events-list-panel";
import { EventsSidebar } from "@/components/events/events-sidebar";
import { Icons } from "@/components/icons";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { useActionToast } from "@/hooks/use-action-toast";
import { useIsDesktop } from "@/hooks/use-is-desktop";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  canCreateEventWith,
  canDeleteEventsWith,
  canEditEventWith,
  canFeatureEventsWith,
  hasPermission,
} from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/app-session";
import type { EventOccurrence, EventSeries } from "@/lib/events/types";
import type { Ministry } from "@/lib/ministries/types";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState, useTransition } from "react";

type EventsViewMode = "calendar" | "list";

function canEditOccurrence(
  event: EventOccurrence,
  permissions: PermissionKey[],
  profileId: string,
  ministries: Ministry[],
): boolean {
  const ministry = ministries.find((m) => m.id === event.ministryId);
  return canEditEventWith(
    permissions,
    profileId,
    event.ministryId,
    ministry?.leaderProfileIds ?? [],
  );
}

function filterEvents(
  events: EventOccurrence[],
  query: string,
  typeLabel: (type: EventOccurrence["eventType"]) => string,
): EventOccurrence[] {
  const q = query.trim().toLowerCase();
  if (!q) return events;
  return events.filter((event) => {
    const haystack = [
      event.title,
      event.location ?? "",
      event.ministryName ?? "",
      event.description ?? "",
      typeLabel(event.eventType),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function EventsView({
  events,
  timezone,
  ministries,
  permissions,
  profileId,
}: {
  events: EventOccurrence[];
  timezone: string;
  ministries: Ministry[];
  permissions: PermissionKey[];
  profileId: string;
}) {
  const t = useTranslations("eventos");
  const router = useRouter();
  const isDesktop = useIsDesktop();
  const [query, setQuery] = useState("");
  const [view, setView] = useState<EventsViewMode>("calendar");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"new" | "edit">("new");
  const [editingSeries, setEditingSeries] = useState<EventSeries | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EventOccurrence | null>(null);
  const [pendingDelete, startDelete] = useTransition();
  const [loadingSeries, startLoadSeries] = useTransition();
  const [deleteResult, setDeleteResult] = useState<
    Awaited<ReturnType<typeof deleteEventAction>> | null
  >(null);

  const sessionStub = { permissions } as AppSession;
  const writeOwnOnly =
    !hasPermission(sessionStub, "eventos:write") &&
    hasPermission(sessionStub, "eventos:write_own");
  const canCreate = canCreateEventWith(permissions);
  const canDelete = canDeleteEventsWith(permissions);
  const canFeature = canFeatureEventsWith(permissions);

  const editableMinistries = useMemo(
    () =>
      ministries.filter((m) =>
        canEditEventWith(permissions, profileId, m.id, m.leaderProfileIds),
      ),
    [ministries, permissions, profileId],
  );

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt)),
    [events],
  );

  const filteredEvents = useMemo(
    () => filterEvents(sortedEvents, query, (type) => t(`types.${type}`)),
    [sortedEvents, query, t],
  );

  const upcoming = useMemo(() => filteredEvents.slice(0, 4), [filteredEvents]);
  const featured = useMemo(
    () => filteredEvents.find((e) => e.isFeatured) ?? null,
    [filteredEvents],
  );

  const canEditFor = (event: EventOccurrence) =>
    canEditOccurrence(event, permissions, profileId, ministries);

  useActionToast(deleteResult, {
    successMessage: t("deleteSuccess"),
    onSuccess: () => {
      setDeleteTarget(null);
      router.refresh();
    },
  });

  function openCreate() {
    setDrawerMode("new");
    setEditingSeries(null);
    setDrawerOpen(true);
  }

  function openEdit(event: EventOccurrence) {
    startLoadSeries(async () => {
      const result = await loadEventSeriesAction(event.seriesId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDrawerMode("edit");
      setEditingSeries(result.series);
      setDrawerOpen(true);
    });
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    startDelete(async () => {
      const result = await deleteEventAction(deleteTarget.seriesId);
      setDeleteResult(result);
    });
  }

  const mainSpan = isDesktop ? "span-8" : "span-12";
  const sidebarSpan = isDesktop ? "span-4" : "span-12";

  return (
    <>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("agendaEyebrow")}</div>
          <h1
            className="display"
            style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}
          >
            {t("title")}{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              {t("churchEvents")}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("subtitle")}
          </p>
        </div>
      </div>

      <FilterToolbar
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder={t("searchPlaceholder")}
        searchWidthPercent={40}
        trailing={
          <>
            <div
              className="row"
              style={{
                gap: 4,
                padding: 4,
                background: "var(--surface-2)",
                borderRadius: 10,
              }}
            >
              {(
                [
                  ["calendar", <Icons.cal key="calendar" size={16} />],
                  ["list", <Icons.list key="list" size={16} />],
                ] as const
              ).map(([mode, icon]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  className="btn sm icon-only"
                  title={
                    mode === "calendar" ? t("viewCalendar") : t("viewList")
                  }
                  style={{
                    background:
                      view === mode ? "var(--surface)" : "transparent",
                    color: view === mode ? "var(--accent)" : "var(--ink-3)",
                    boxShadow: view === mode ? "var(--shadow-1)" : "none",
                    padding: 7,
                  }}
                >
                  {icon}
                </button>
              ))}
            </div>
            {canCreate ? (
              <button type="button" className="btn primary" onClick={openCreate}>
                <Icons.plus size={14} /> {t("newEvent")}
              </button>
            ) : null}
          </>
        }
      />

      <div className="grid-12" style={{ alignItems: "start" }}>
        <div className={mainSpan}>
          {view === "calendar" ? (
            <EventsCalendar
              events={filteredEvents}
              timezone={timezone}
              onSelectEvent={(event) => {
                if (canEditFor(event)) openEdit(event);
              }}
            />
          ) : (
            <EventsListPanel
              events={filteredEvents}
              timezone={timezone}
              canCreate={canCreate}
              canEditFor={canEditFor}
              canDelete={canDelete}
              loadingSeries={loadingSeries}
              onCreate={openCreate}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          )}
        </div>
        <div className={sidebarSpan}>
          <EventsSidebar upcoming={upcoming} featured={featured} timezone={timezone} />
        </div>
      </div>

      <EventFormDrawer
        mode={drawerMode}
        series={editingSeries}
        ministries={ministries}
        editableMinistries={editableMinistries}
        canFeature={canFeature}
        writeOwnOnly={writeOwnOnly}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        saveAction={saveEventAction}
      />

      {deleteTarget ? (
        <ConfirmDialog
          title={t("deleteEvent")}
          message={t("deleteConfirm", { title: deleteTarget.title })}
          itemName={deleteTarget.title}
          pending={pendingDelete}
          onConfirm={confirmDelete}
          onClose={() => setDeleteTarget(null)}
        />
      ) : null}
    </>
  );
}
