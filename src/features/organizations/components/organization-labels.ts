import type {
  OrganizationSource,
  OrganizationStatus,
  OrganizationType,
  PipelineStage,
} from "../types/organization.enums";

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  CHURCH: "Iglesia",
  MINISTRY: "Ministerio",
  COUNCIL: "Concilio",
  FOUNDATION: "Fundación",
};

export const ORGANIZATION_STATUS_LABELS: Record<OrganizationStatus, string> = {
  ACTIVE: "Activa",
  ARCHIVED: "Archivada",
};

export const ORGANIZATION_SOURCE_LABELS: Record<OrganizationSource, string> = {
  REFERRAL: "Referido",
  VISIT: "Visita",
  SOCIAL_MEDIA: "Redes sociales",
  EVENT: "Evento",
  WEB: "Web",
  OTHER: "Otro",
};

export const ORGANIZATION_STATUS_CHIP: Record<OrganizationStatus, string> = {
  ACTIVE: "success",
  ARCHIVED: "muted",
};

export const PIPELINE_STAGE_LABELS: Record<PipelineStage, string> = {
  NEW: "Nuevo",
  RESEARCH: "Investigación",
  CONTACT: "Contacto",
  FOLLOW_UP: "Seguimiento",
  DEMO: "Demo",
  WON: "Ganada",
  LOST: "Perdida",
};

export const PIPELINE_STAGE_CHIP: Record<PipelineStage, string> = {
  NEW: "muted",
  RESEARCH: "pending",
  CONTACT: "info",
  FOLLOW_UP: "violet",
  DEMO: "warn",
  WON: "success",
  LOST: "muted",
};

export const PRIORITY_LABELS = {
  HIGH: "Alta",
  MEDIUM: "Media",
  LOW: "Baja",
} as const;

export const PRIORITY_CHIP = {
  HIGH: "danger",
  MEDIUM: "warn",
  LOW: "muted",
} as const;

export const TEMPERATURE_LABELS = {
  HOT: "Caliente",
  WARM: "Tibio",
  COLD: "Frío",
} as const;

export const TEMPERATURE_CHIP = {
  HOT: "danger",
  WARM: "warn",
  COLD: "info",
} as const;
