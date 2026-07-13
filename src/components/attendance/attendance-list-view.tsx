"use client";

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
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

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
  activityFilter,
  canWrite,
  locale,
}: {
  sessions: AttendanceSessionListItem[];
  ministries: Ministry[];
  activityFilter: TypeFilter;
  canWrite: boolean;
  locale: string;
}) {
  const t = useTranslations("attendance");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    session: AttendanceSessionListItem | null;
    preset: AttendanceActivityType | null;
  } | null>(null);

  function setFilter(next: TypeFilter) {
    const params = new URLSearchParams();
    if (next !== "all") params.set("type", next);
    const qs = params.toString();
    router.push(`${churchPath("/attendance")}${qs ? `?${qs}` : ""}`);
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
        query=""
        onQueryChange={() => undefined}
        queryPlaceholder={t("searchDisabled")}
        maxSearchWidth={0}
        style={{ marginTop: 20 }}
        filters={[
          { key: "all", label: tCommon("all") },
          { key: "house_group", label: t("activityType.house_group") },
          { key: "bible_study", label: t("activityType.bible_study") },
          { key: "service", label: t("activityType.service") },
        ]}
        activeFilter={activityFilter}
        onFilterChange={setFilter}
        middle={
          <span className="tiny muted" style={{ alignSelf: "center" }}>
            {t("filterType")}
          </span>
        }
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
          rows={sessions}
          rowKey={(row) => row.id}
          empty={<p className="muted">{t("empty")}</p>}
          actionsLabel={tCommon("actions")}
          actionsPosition="end"
          actions={(row) => (
            <div className="row" style={{ gap: 8 }}>
              <Link
                href={churchPath(`/attendance/${row.id}`)}
                className="btn ghost"
                style={{ padding: "4px 10px" }}
              >
                {t("openChecklist")}
              </Link>
              {canWrite ? (
                <button
                  type="button"
                  className="btn ghost"
                  style={{ padding: "4px 10px" }}
                  onClick={() =>
                    setFormState({
                      mode: "edit",
                      session: row,
                      preset: null,
                    })
                  }
                >
                  {tCommon("edit")}
                </button>
              ) : null}
            </div>
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
          onClose={() => setFormState(null)}
        />
      ) : null}
    </>
  );
}
