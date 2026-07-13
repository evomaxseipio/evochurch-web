import type {
  OrganizationSortField,
  SortDirection,
} from "../types/repository.types";
import {
  ORGANIZATION_STATUSES,
  ORGANIZATION_TYPES,
  type OrganizationStatus,
  type OrganizationType,
} from "../types/organization.enums";
import type { ListOrganizationsRequest } from "../schemas/organization.requests";

export type OrganizationsListQuery = {
  search: string;
  status: OrganizationStatus | "ALL";
  type: OrganizationType | "ALL";
  page: number;
  pageSize: number;
  sortField: OrganizationSortField;
  sortDirection: SortDirection;
};

const SORT_FIELDS: OrganizationSortField[] = [
  "name",
  "city",
  "type",
  "status",
  "source",
  "created_at",
  "updated_at",
];

export type OrganizationsSearchParams = {
  q?: string;
  status?: string;
  type?: string;
  page?: string;
  pageSize?: string;
  sort?: string;
  dir?: string;
};

function parseStatus(value?: string): OrganizationStatus | "ALL" {
  return ORGANIZATION_STATUSES.includes(value as OrganizationStatus)
    ? (value as OrganizationStatus)
    : "ALL";
}

function parseType(value?: string): OrganizationType | "ALL" {
  return ORGANIZATION_TYPES.includes(value as OrganizationType)
    ? (value as OrganizationType)
    : "ALL";
}

function parseSortField(value?: string): OrganizationSortField {
  return SORT_FIELDS.includes(value as OrganizationSortField)
    ? (value as OrganizationSortField)
    : "created_at";
}

function parseSortDirection(value?: string): SortDirection {
  return value === "asc" ? "asc" : "desc";
}

export function parseOrganizationsListQuery(
  sp: OrganizationsSearchParams,
): OrganizationsListQuery {
  return {
    search: sp.q?.trim() ?? "",
    status: parseStatus(sp.status),
    type: parseType(sp.type),
    page: Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1),
    pageSize: Math.max(1, Number.parseInt(sp.pageSize ?? "25", 10) || 25),
    sortField: parseSortField(sp.sort),
    sortDirection: parseSortDirection(sp.dir),
  };
}

export function listQueryToRequest(
  query: OrganizationsListQuery,
): ListOrganizationsRequest {
  return {
    search: query.search || undefined,
    status: query.status === "ALL" ? undefined : query.status,
    type: query.type === "ALL" ? undefined : query.type,
    includeArchived: true,
    page: query.page,
    pageSize: query.pageSize,
    sortField: query.sortField,
    sortDirection: query.sortDirection,
  };
}

export function buildOrganizationsListHref(
  query: OrganizationsListQuery,
): string {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.status !== "ALL") params.set("status", query.status);
  if (query.type !== "ALL") params.set("type", query.type);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.pageSize !== 25) params.set("pageSize", String(query.pageSize));
  if (query.sortField !== "created_at") params.set("sort", query.sortField);
  if (query.sortDirection !== "desc") params.set("dir", query.sortDirection);
  const qs = params.toString();
  return `/apps/backoffice/organizations${qs ? `?${qs}` : ""}`;
}
