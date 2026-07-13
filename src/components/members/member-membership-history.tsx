"use client";

import { Icons } from "@/components/icons";
import { PastoralEventFormDrawer } from "@/components/members/pastoral-event-form-drawer";
import { ProfileSectionCard } from "@/components/members/member-profile-form-ui";
import { type Locale } from "@/i18n/config";
import { formatDate, localeCompare } from "@/lib/i18n/format";
import type {
  PastoralEvent,
  PastoralEventType,
} from "@/lib/members/pastoral-events";
import type {
  MembershipHistoryEntry,
  MembershipRecord,
} from "@/lib/members/types";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState, type ReactNode } from "react";

type TimelineItem = {
  id: string;
  sortKey: string;
  dateLabel: string;
  title: string;
  sub?: string;
  color: string;
  icon: ReactNode;
  kind: "membership" | "pastoral";
  pastoralEvent?: PastoralEvent;
};

function formatTimelineDate(value: string, locale: Locale): string {
  if (!value) return "—";
  return formatDate(`${value.slice(0, 10)}T12:00:00`, locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function styleForText(text: string, index: number) {
  const t = text.toLowerCase();
  if (t.includes("bautismo")) {
    return { color: "var(--accent)", icon: <Icons.cross size={13} /> };
  }
  if (
    t.includes("diacon") ||
    t.includes("asignación") ||
    t.includes("asignacion") ||
    t.includes("rol")
  ) {
    return { color: "var(--lila)", icon: <Icons.users size={13} /> };
  }
  if (t.includes("ministerio") || t.includes("ingreso")) {
    return { color: "var(--green)", icon: <Icons.pin size={13} /> };
  }
  if (t.includes("credencial") || t.includes("renovación") || t.includes("renovacion")) {
    return { color: "var(--warm)", icon: <Icons.check size={13} /> };
  }

  const palette = [
    { color: "var(--accent)", icon: <Icons.cross size={13} /> },
    { color: "var(--lila)", icon: <Icons.users size={13} /> },
    { color: "var(--green)", icon: <Icons.pin size={13} /> },
    { color: "var(--warm)", icon: <Icons.check size={13} /> },
  ];
  return palette[index % palette.length];
}

function styleForPastoralEvent(type: PastoralEventType) {
  switch (type) {
    case "illness":
      return { color: "var(--warm)", icon: <Icons.bell size={13} /> };
    case "accident":
    case "emergency":
      return { color: "var(--danger)", icon: <Icons.bell size={13} /> };
    case "collection":
    case "financial_aid":
      return { color: "var(--green)", icon: <Icons.wallet size={13} /> };
    case "family_loss":
      return { color: "var(--muted)", icon: <Icons.users size={13} /> };
    case "recognition":
    case "discipleship":
      return { color: "var(--lila)", icon: <Icons.star size={13} /> };
    default:
      return { color: "var(--accent)", icon: <Icons.chat size={13} /> };
  }
}

function historyEntryToItem(
  entry: MembershipHistoryEntry,
  index: number,
  locale: Locale,
  t: ReturnType<typeof useTranslations<"members">>,
): TimelineItem {
  const style = styleForText(entry.observations, index);
  return {
    id: `history-${entry.dateStart}-${index}`,
    sortKey: entry.dateStart || "",
    dateLabel: formatTimelineDate(entry.dateStart, locale),
    title: entry.observations || t("membershipEvent"),
    sub: entry.dateReturned
      ? t("returnDate", { date: formatTimelineDate(entry.dateReturned, locale) })
      : undefined,
    color: style.color,
    icon: style.icon,
    kind: "membership",
  };
}

function pastoralEventToItem(
  event: PastoralEvent,
  locale: Locale,
  t: ReturnType<typeof useTranslations<"members">>,
): TimelineItem {
  const style = styleForPastoralEvent(event.eventType);
  const typeLabel = t(`pastoralEventType.${event.eventType}`);
  const subParts = [
    event.title ? typeLabel : undefined,
    event.description || undefined,
    event.needsFollowUp ? t("pastoralFollowUpBadge") : undefined,
  ].filter(Boolean);

  return {
    id: `pastoral-${event.id}`,
    sortKey: event.eventDate || "",
    dateLabel: formatTimelineDate(event.eventDate, locale),
    title: event.title || typeLabel,
    sub: subParts.length > 0 ? subParts.join(" · ") : undefined,
    color: style.color,
    icon: style.icon,
    kind: "pastoral",
    pastoralEvent: event,
  };
}

function buildTimelineItems(
  membership: MembershipRecord | null,
  pastoralEvents: PastoralEvent[],
  locale: Locale,
  t: ReturnType<typeof useTranslations<"members">>,
): TimelineItem[] {
  const items: TimelineItem[] = [];

  if (membership) {
    items.push(
      ...membership.membershipHistory.map((entry, index) =>
        historyEntryToItem(entry, index, locale, t),
      ),
    );

    if (membership.baptismDate) {
      const hasBaptism = items.some((item) =>
        item.title.toLowerCase().includes("bautismo"),
      );
      if (!hasBaptism) {
        const sub = [
          membership.baptismChurch,
          membership.baptismPastor
            ? `Pastor ${membership.baptismPastor}`
            : "",
        ]
          .filter(Boolean)
          .join(" · ");

        items.push({
          id: "baptism-synthetic",
          sortKey: membership.baptismDate,
          dateLabel: formatTimelineDate(membership.baptismDate, locale),
          title: t("waterBaptism"),
          sub: sub || undefined,
          color: "var(--accent)",
          icon: <Icons.cross size={13} />,
          kind: "membership",
        });
      }
    }
  }

  items.push(
    ...pastoralEvents.map((event) => pastoralEventToItem(event, locale, t)),
  );

  return items.sort((a, b) => localeCompare(a.sortKey, b.sortKey, locale));
}

export function MembershipHistorySection({
  membership,
  pastoralEvents,
  profileId,
  readOnly = false,
}: {
  membership: MembershipRecord | null;
  pastoralEvents: PastoralEvent[];
  profileId: string;
  readOnly?: boolean;
}) {
  const t = useTranslations("members");
  const tCommon = useTranslations("common");
  const locale = useLocale() as Locale;
  const [drawer, setDrawer] = useState<{
    mode: "new" | "edit";
    event: PastoralEvent | null;
  } | null>(null);

  const items = useMemo(
    () => buildTimelineItems(membership, pastoralEvents, locale, t),
    [membership, pastoralEvents, locale, t],
  );

  return (
    <>
      <ProfileSectionCard
        eyebrow={t("journey")}
        title={t("membershipHistory")}
        action={
          readOnly ? undefined : (
            <button
              type="button"
              className="btn primary sm"
              onClick={() => setDrawer({ mode: "new", event: null })}
            >
              <Icons.plus size={14} /> {t("addEvent")}
            </button>
          )
        }
      >
        {items.length === 0 ? (
          <p className="tiny muted" style={{ margin: 0 }}>
            {t("membershipHistoryEmpty")}
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              position: "relative",
            }}
          >
            {items.map((entry, i, arr) => (
              <li
                key={entry.id}
                style={{
                  display: "flex",
                  gap: 14,
                  paddingBottom: i === arr.length - 1 ? 0 : 16,
                  position: "relative",
                }}
              >
                {i < arr.length - 1 ? (
                  <span
                    style={{
                      position: "absolute",
                      left: 13,
                      top: 28,
                      bottom: -4,
                      width: 1,
                      background: "var(--line)",
                    }}
                  />
                ) : null}
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 999,
                    flexShrink: 0,
                    background: `color-mix(in oklab, ${entry.color} 16%, transparent)`,
                    color: entry.color,
                    display: "grid",
                    placeItems: "center",
                    border: `1px solid color-mix(in oklab, ${entry.color} 32%, transparent)`,
                  }}
                >
                  {entry.icon}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: 10,
                        flexWrap: "wrap",
                        minWidth: 0,
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {entry.title}
                      </span>
                      <span className="mono tiny muted">{entry.dateLabel}</span>
                    </div>
                    {entry.kind === "pastoral" && !readOnly && entry.pastoralEvent ? (
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() =>
                          setDrawer({
                            mode: "edit",
                            event: entry.pastoralEvent!,
                          })
                        }
                      >
                        {tCommon("edit")}
                      </button>
                    ) : null}
                  </div>
                  {entry.sub ? (
                    <div className="tiny muted" style={{ marginTop: 2 }}>
                      {entry.sub}
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </ProfileSectionCard>

      <PastoralEventFormDrawer
        open={drawer != null}
        mode={drawer?.mode ?? "new"}
        event={drawer?.event ?? null}
        profileId={profileId}
        onClose={() => setDrawer(null)}
      />
    </>
  );
}
