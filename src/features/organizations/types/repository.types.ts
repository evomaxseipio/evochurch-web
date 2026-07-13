import type {
  OrganizationSource,
  OrganizationStatus,
  OrganizationType,
  PipelineStage,
} from "./organization.enums";
import type { Organization } from "./organization.types";

export type SortDirection = "asc" | "desc";

export type OrganizationSortField =
  | "name"
  | "city"
  | "type"
  | "status"
  | "source"
  | "created_at"
  | "updated_at";

export type OrganizationListFilters = {
  status?: OrganizationStatus | OrganizationStatus[];
  type?: OrganizationType | OrganizationType[];
  city?: string;
  owner_id?: string;
  source?: OrganizationSource | OrganizationSource[];
  /** Incluir filas con deleted_at NOT NULL (default false). */
  include_deleted?: boolean;
  /** Incluir ARCHIVED (default true en listados operativos). */
  include_archived?: boolean;
};

export type PaginationParams = {
  page: number;
  page_size: number;
};

export type SortParams = {
  field: OrganizationSortField;
  direction?: SortDirection;
};

export type OrganizationListParams = {
  filters?: OrganizationListFilters;
  pagination?: PaginationParams;
  sort?: SortParams;
};

export type OrganizationSearchParams = {
  query: string;
  filters?: OrganizationListFilters;
  pagination?: PaginationParams;
  sort?: SortParams;
};

export type OrganizationPageResult = {
  items: Organization[];
  total: number;
  page: number;
  page_size: number;
};

export type OrganizationCountFilters = OrganizationListFilters;

export type ChangeStageParams = {
  organization_id: string;
  stage: PipelineStage;
};
