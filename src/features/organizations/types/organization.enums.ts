/** Catálogos alineados con CHECK constraints en sales.organizations */

export const ORGANIZATION_TYPES = [
  "CHURCH",
  "MINISTRY",
  "COUNCIL",
  "FOUNDATION",
] as const;

export type OrganizationType = (typeof ORGANIZATION_TYPES)[number];

export const ORGANIZATION_STATUSES = ["ACTIVE", "ARCHIVED"] as const;

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number];

export const ORGANIZATION_SOURCES = [
  "REFERRAL",
  "VISIT",
  "SOCIAL_MEDIA",
  "EVENT",
  "WEB",
  "OTHER",
] as const;

export type OrganizationSource = (typeof ORGANIZATION_SOURCES)[number];

/** Reservado para sales.opportunities (feature futura). No persiste en organizations. */
export const PIPELINE_STAGES = [
  "NEW",
  "RESEARCH",
  "CONTACT",
  "FOLLOW_UP",
  "DEMO",
  "WON",
  "LOST",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];
