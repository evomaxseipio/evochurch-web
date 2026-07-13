import type { PipelineStage } from "../types/organization.enums";

/** Campos comerciales mock hasta Opportunities / Contacts / Activities en BD. */
export type OrganizationCommercialMock = {
  pipelineStage: PipelineStage;
  ownerName: string;
  primaryContactName: string | null;
  primaryContactRole: string | null;
  primaryContactPhone: string | null;
  primaryContactEmail: string | null;
  nextActionLabel: string | null;
  nextActionDateLabel: string | null;
  nextActionOverdue: boolean;
  lastActivityType: string | null;
  lastActivityWhen: string | null;
  priority: "HIGH" | "MEDIUM" | "LOW" | null;
  temperature: "HOT" | "WARM" | "COLD" | null;
  followUpDateLabel: string | null;
};

export type OrganizationActivityMock = {
  id: string;
  type: string;
  emoji: string;
  when: string;
  author: string;
  result?: string;
  nextAction?: string;
  tone: "info" | "ok" | "pending" | "warn";
};

export type OrganizationCommercialBundle = OrganizationCommercialMock & {
  activities: OrganizationActivityMock[];
};
