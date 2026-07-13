"use client";

import type { OrganizationActivityMock } from "../mocks/organization-commercial.types";
import type { OrganizationCommercialMock } from "../mocks/organization-commercial.types";
import {
  PIPELINE_STAGE_CHIP,
  PIPELINE_STAGE_LABELS,
  PRIORITY_CHIP,
  PRIORITY_LABELS,
  TEMPERATURE_CHIP,
  TEMPERATURE_LABELS,
} from "./organization-labels";

const ACTIVITY_TONE_CLASS: Record<OrganizationActivityMock["tone"], string> = {
  info: "bo-tl-dot info",
  ok: "bo-tl-dot ok",
  pending: "bo-tl-dot pending",
  warn: "bo-tl-dot warn",
};

export function PipelineStageChip({
  stage,
}: {
  stage: OrganizationCommercialMock["pipelineStage"];
}) {
  return (
    <span className={`chip ${PIPELINE_STAGE_CHIP[stage]}`}>
      <span className="pip" />
      {PIPELINE_STAGE_LABELS[stage]}
    </span>
  );
}

export function PriorityChip({
  priority,
}: {
  priority: OrganizationCommercialMock["priority"];
}) {
  if (!priority) return <span className="value empty">—</span>;
  return (
    <span className={`chip ${PRIORITY_CHIP[priority]}`}>
      <span className="pip" />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export function TemperatureChip({
  temperature,
}: {
  temperature: OrganizationCommercialMock["temperature"];
}) {
  if (!temperature) return <span className="value empty">—</span>;
  return (
    <span className={`chip ${TEMPERATURE_CHIP[temperature]}`}>
      <span className="pip" />
      {TEMPERATURE_LABELS[temperature]}
    </span>
  );
}

export function OrganizationActivityTimeline({
  activities,
}: {
  activities: OrganizationActivityMock[];
}) {
  if (activities.length === 0) {
    return (
      <div className="bo-tab-placeholder">
        <div className="eyebrow">Sin actividades</div>
        <p>
          Aún no hay actividades registradas. Los datos reales llegarán con la
          feature Activities.
        </p>
      </div>
    );
  }

  return (
    <div className="bo-timeline">
      {activities.map((item) => (
        <div key={item.id} className="bo-tl-item">
          <div className={ACTIVITY_TONE_CLASS[item.tone]} aria-hidden>
            {item.emoji}
          </div>
          <div>
            <div className="bo-tl-head">
              <span className="type">{item.type}</span>
              <span className="when">
                {item.when} · {item.author}
              </span>
            </div>
            {item.result ? (
              <div className="bo-tl-result">{item.result}</div>
            ) : null}
            {item.nextAction ? (
              <div className="bo-tl-next">Próxima: {item.nextAction}</div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MockDataHint() {
  return (
    <span
      className="chip muted"
      style={{ fontSize: 10, padding: "2px 8px" }}
      title="Estos campos son datos de demostración hasta conectar Opportunities, Contacts y Activities."
    >
      Demo
    </span>
  );
}
