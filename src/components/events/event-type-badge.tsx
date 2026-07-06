import type { EventType } from "@/lib/events/types";
import { eventTypeAccent } from "@/lib/events/parse";

export function EventTypeBadge({
  type,
  label,
}: {
  type: EventType;
  label: string;
}) {
  return (
    <span
      className="chip sm"
      style={{
        background: `color-mix(in oklab, ${eventTypeAccent(type)} 14%, transparent)`,
        color: eventTypeAccent(type),
        border: `1px solid color-mix(in oklab, ${eventTypeAccent(type)} 28%, transparent)`,
      }}
    >
      {label}
    </span>
  );
}
