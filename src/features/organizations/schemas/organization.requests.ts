import type {
  OrganizationSource,
  OrganizationStatus,
  OrganizationType,
} from "../types/organization.enums";
import type { OrganizationSortField, SortDirection } from "../types/repository.types";

/** DTO de entrada (camelCase) para crear organización. */
export type CreateOrganizationRequest = {
  name: string;
  type?: OrganizationType;
  denomination?: string | null;
  country?: string;
  province?: string | null;
  city: string;
  addressLine?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  source: OrganizationSource;
  notes?: string | null;
  ownerId?: string | null;
};

export type UpdateOrganizationRequest = CreateOrganizationRequest & {
  type: OrganizationType;
};

export type ListOrganizationsRequest = {
  search?: string;
  status?: OrganizationStatus | OrganizationStatus[];
  type?: OrganizationType | OrganizationType[];
  city?: string;
  ownerId?: string;
  source?: OrganizationSource | OrganizationSource[];
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  sortField?: OrganizationSortField;
  sortDirection?: SortDirection;
};
