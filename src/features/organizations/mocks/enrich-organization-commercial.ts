import type { OrganizationVm } from "../schemas/organization.responses";
import {
  DEFAULT_ORGANIZATION_COMMERCIAL,
  ORGANIZATION_COMMERCIAL_BY_NAME,
} from "./organization-commercial.fixture";
import type {
  OrganizationActivityMock,
  OrganizationCommercialMock,
} from "./organization-commercial.types";

export type OrganizationEnrichedVm = OrganizationVm & {
  /** Datos comerciales mock — no persistidos en BD (MVP 0.1). */
  commercial: OrganizationCommercialMock;
};

export function getOrganizationCommercialMock(
  organization: Pick<OrganizationVm, "name">,
): OrganizationCommercialMock & { activities: OrganizationActivityMock[] } {
  return (
    ORGANIZATION_COMMERCIAL_BY_NAME[organization.name] ??
    DEFAULT_ORGANIZATION_COMMERCIAL
  );
}

export function enrichOrganizationVm(
  organization: OrganizationVm,
): OrganizationEnrichedVm {
  const bundle = getOrganizationCommercialMock(organization);
  const { activities: _activities, ...commercial } = bundle;
  return { ...organization, commercial };
}

export function enrichOrganizationList(
  items: OrganizationVm[],
): OrganizationEnrichedVm[] {
  return items.map(enrichOrganizationVm);
}

export function getOrganizationActivitiesMock(
  organization: Pick<OrganizationVm, "name">,
): OrganizationActivityMock[] {
  return getOrganizationCommercialMock(organization).activities;
}
