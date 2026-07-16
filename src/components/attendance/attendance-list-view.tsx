"use client";

import { AttendanceChecklistDrawer } from "@/components/attendance/attendance-checklist-drawer";
import { AttendanceSessionActionMenu } from "@/components/attendance/attendance-session-action-menu";
import { AttendanceSessionFormDrawer } from "@/components/attendance/attendance-session-form-drawer";
import { Icons } from "@/components/icons";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import type {
  AttendanceActivityType,
  AttendanceSessionListItem,
} from "@/lib/attendance/types";
import { ATTENDANCE_UI_PRESETS } from "@/lib/attendance/types";
import { churchPath } from "@/lib/apps/church-routes";
import type { Ministry } from "@/lib/ministries/types";
import type { MinistryCategoryRow } from "@/lib/ministries/category-types";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type TypeFilter = AttendanceActivityType | "all";

function formatDate(iso: string, locale: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AttendanceListView({
  sessions,
  ministries,
  categories,
  activityFilter,
  canWrite,
  locale,
  initialChecklistId = null,
}: {
  sessions: AttendanceSessionListItem[];
  ministries: Ministry[];
  categories: MinistryCategoryRow[];
  activityFilter: TypeFilter;
  canWrite: boolean;
  locale: string;
  initialChecklistId?: string | null;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [checklistSessionId, setChecklistSessionId] = useState<string | null>(
    initialChecklistId,
  );
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    session: AttendanceSessionListItem | null;
    preset: AttendanceActivityType | null;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((row) => {
      const haystack = [
        row.title,
        row.ministryName,
        t(`activityType.${row.activityType}`),
        row.sessionDate,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sessions, query, t]);

  function setFilter(next: TypeFilter) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("type", next);
    const qs = params.toString();
    router.push(`${churchPath("/attendance")}${qs ? `?${qs}` : ""}`);
  }

  function openChecklist(sessionId: string) {
    setChecklistSessionId(sessionId);
  }

  function closeChecklist() {
    setChecklistSessionId(null);
    if (initialChecklistId) {
      const params = new URLSearchParams();
      if (activityFilter !== "all") params.set("type", activityFilter);
      const qs = params.toString();
      router.replace(`${churchPath("/attendance")}${qs ? `?${qs}` : ""}`);
    }
  }

  return (
    <>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("eyebrow")}</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {t("title")}
          </h1>
          <p className="muted" style={{ margin: 0, maxWidth: 560 }}>
            {t("subtitle")}
          </p>
        </div>
        {canWrite ? (
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            {ATTENDANCE_UI_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                className="btn outline"
                onClick={() =>
                  setFormState({ mode: "new", session: null, preset })
                }
              >
                <Icons.check size={16} /> {t(`presets.${preset}`)}
              </button>
            ))}
            <button
              type="button"
              className="btn"
              onClick={() =>
                setFormState({ mode: "new", session: null, preset: null })
              }
            >
              <Icons.plus size={16} /> {t("newSession")}
            </button>
          </div>
        ) : null}
      </div>

      <FilterToolbar
        query={query}
        onQueryChange={setQuery}
        queryPlaceholder={t("searchPlaceholder")}
        compactSearch
        maxSearchWidth={340}
        style={{ marginTop: 20 }}
        filters={[
          { key: "all", label: tCommon("all") },
          { key: "house_group", label: t("activityType.house_group") },
          { key: "bible_study", label: t("activityType.bible_study") },
          { key: "children", label: t("activityType.children") },
          { key: "service", label: t("activityType.service") },
        ]}
        activeFilter={activityFilter}
        onFilterChange={setFilter}
      />

      <div style={{ marginTop: 16 }}>
        <DataTable
          columns={[
            {
              key: "date",
              label: t("columns.date"),
              render: (row) => formatDate(row.sessionDate, locale),
            },
            {
              key: "type",
              label: t("columns.type"),
              render: (row) => t(`activityType.${row.activityType}`),
            },
            {
              key: "ministry",
              label: t("columns.ministry"),
              render: (row) => row.ministryName || "—",
            },
            {
              key: "title",
              label: t("columns.title"),
              render: (row) => row.title || "—",
            },
            {
              key: "present",
              label: t("columns.present"),
              render: (row) => String(row.presentCount),
            },
            {
              key: "total",
              label: t("columns.marked"),
              render: (row) => String(row.recordCount),
            },
          ]}
          rows={filtered}
          rowKey={(row) => row.id}
          empty={<p className="muted">{t("empty")}</p>}
          actionsLabel={tCommon("actions")}
          actionsPosition="start"
          actions={(row) => (
            <AttendanceSessionActionMenu
              onTakeRoll={() => openChecklist(row.id)}
              onEdit={
                canWrite
                  ? () =>
                      setFormState({
                        mode: "edit",
                        session: row,
                        preset: null,
                      })
                  : undefined
              }
            />
          )}
        />
      </div>

      {canWrite ? (
        <AttendanceSessionFormDrawer
          open={formState != null}
          mode={formState?.mode ?? "new"}
          session={formState?.session ?? null}
          presetActivityType={formState?.preset ?? null}
          ministries={ministries}
          categories={categories}
          onClose={() => setFormState(null)}
          onCreated={(sessionId) => {
            setFormState(null);
            openChecklist(sessionId);
          }}
        />
      ) : null}

      <AttendanceChecklistDrawer
        open={checklistSessionId != null}
        sessionId={checklistSessionId}
        onClose={closeChecklist}
      />
    </>
  );
}
