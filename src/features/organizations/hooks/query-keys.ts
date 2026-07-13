import type { ListOrganizationsRequest } from "../schemas/organization.requests";
import type {
  OrganizationListVm,
  OrganizationVm,
} from "../schemas/organization.responses";

/** Clave estable para TanStack Query (evita mismatch server/client por undefined). */
export function normalizeListOrganizationsRequest(
  request: ListOrganizationsRequest = {},
) {
  return {
    search: request.search?.trim() ?? "",
    status: request.status ?? null,
    type: request.type ?? null,
    city: request.city ?? null,
    ownerId: request.ownerId ?? null,
    source: request.source ?? null,
    includeArchived: request.includeArchived ?? true,
    page: request.page ?? 1,
    pageSize: request.pageSize ?? 25,
    sortField: request.sortField ?? "created_at",
    sortDirection: request.sortDirection ?? "desc",
  };
}

export const organizationKeys = {
  all: ["organizations"] as const,
  lists: () => [...organizationKeys.all, "list"] as const,
  list: (request: ListOrganizationsRequest) =>
    [
      ...organizationKeys.lists(),
      normalizeListOrganizationsRequest(request),
    ] as const,
  details: () => [...organizationKeys.all, "detail"] as const,
  detail: (id: string) => [...organizationKeys.details(), id] as const,
};

export type OrganizationListQueryKey = ReturnType<typeof organizationKeys.list>;
export type OrganizationDetailQueryKey = ReturnType<typeof organizationKeys.detail>;

export function isOrganizationListVm(value: unknown): value is OrganizationListVm {
  if (!value || typeof value !== "object") return false;
  const candidate = value as OrganizationListVm;
  return (
    Array.isArray(candidate.items) &&
    typeof candidate.total === "number" &&
    typeof candidate.page === "number" &&
    typeof candidate.pageSize === "number"
  );
}

export function isOrganizationVm(value: unknown): value is OrganizationVm {
  if (!value || typeof value !== "object") return false;
  const candidate = value as OrganizationVm;
  return typeof candidate.id === "string" && typeof candidate.name === "string";
}
