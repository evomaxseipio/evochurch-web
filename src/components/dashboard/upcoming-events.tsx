import type { ChurchEvent } from "@/lib/mock/dashboard-data";

const MONTHS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

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

export function UpcomingEvents({ events }: { events: ChurchEvent[] }) {
  return (
    <div className="col" style={{ gap: 12 }}>
      {events.slice(0, 4).map((e) => {
        const d = new Date(e.date + "T12:00:00");
        const colors = eventColors(e.type);
        return (
          <div
            key={e.id}
            className="row"
            style={{
              gap: 12,
              padding: 8,
              borderRadius: 12,
              background: "var(--surface-2)",
            }}
          >
            <div
              style={{
                width: 50,
                height: 50,
                borderRadius: 12,
                background: colors.bg,
                color: colors.color,
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <div style={{ textAlign: "center", lineHeight: 1 }}>
                <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {MONTHS[d.getMonth()]}
                </div>
                <div className="display" style={{ fontSize: 22, marginTop: 2 }}>
                  {d.getDate()}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {e.title}
              </div>
              <div className="tiny muted">
                {e.time} · {e.location}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
