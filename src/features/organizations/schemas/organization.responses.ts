import type {
  OrganizationSource,
  OrganizationStatus,
  OrganizationType,
} from "../types/organization.enums";

/** ViewModel para la UI (camelCase). */
export type OrganizationVm = {
  id: string;
  name: string;
  type: OrganizationType;
  denomination: string | null;
  status: OrganizationStatus;
  isArchived: boolean;
  country: string;
  province: string | null;
  city: string;
  addressLine: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  source: OrganizationSource;
  ownerId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type OrganizationListVm = {
  items: OrganizationVm[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};
