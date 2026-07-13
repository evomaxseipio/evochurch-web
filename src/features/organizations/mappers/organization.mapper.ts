import type {
  CreateOrganizationRequest,
  UpdateOrganizationRequest,
} from "../schemas/organization.requests";
import type {
  OrganizationListVm,
  OrganizationVm,
} from "../schemas/organization.responses";
import type {
  Organization,
  OrganizationInsert,
  OrganizationPageResult,
  OrganizationUpdate,
} from "../types";

/** Entity (snake_case, BD) → ViewModel (camelCase, UI). */
export function toOrganizationVm(entity: Organization): OrganizationVm {
  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    denomination: entity.denomination,
    status: entity.status,
    isArchived: entity.status === "ARCHIVED",
    country: entity.country,
    province: entity.province,
    city: entity.city,
    addressLine: entity.address_line,
    phone: entity.phone,
    email: entity.email,
    website: entity.website,
    facebook: entity.facebook,
    instagram: entity.instagram,
    source: entity.source,
    ownerId: entity.owner_id,
    notes: entity.notes,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
    archivedAt: entity.archived_at,
  };
}

export function toOrganizationListVm(
  page: OrganizationPageResult,
): OrganizationListVm {
  const pageCount =
    page.page_size > 0 ? Math.ceil(page.total / page.page_size) : 0;

  return {
    items: page.items.map(toOrganizationVm),
    total: page.total,
    page: page.page,
    pageSize: page.page_size,
    pageCount,
  };
}

/** Request DTO (camelCase) → Insert (snake_case) para el repository. */
export function toOrganizationInsert(
  request: CreateOrganizationRequest,
): OrganizationInsert {
  return {
    name: request.name,
    type: request.type ?? "CHURCH",
    denomination: request.denomination ?? null,
    country: request.country ?? "DO",
    province: request.province ?? null,
    city: request.city,
    address_line: request.addressLine ?? null,
    phone: request.phone ?? null,
    email: request.email ?? null,
    website: request.website ?? null,
    facebook: request.facebook ?? null,
    instagram: request.instagram ?? null,
    source: request.source,
    owner_id: request.ownerId ?? null,
    notes: request.notes ?? null,
  };
}

export function toOrganizationUpdate(
  request: UpdateOrganizationRequest,
): OrganizationUpdate {
  return {
    name: request.name,
    type: request.type,
    denomination: request.denomination ?? null,
    country: request.country ?? "DO",
    province: request.province ?? null,
    city: request.city,
    address_line: request.addressLine ?? null,
    phone: request.phone ?? null,
    email: request.email ?? null,
    website: request.website ?? null,
    facebook: request.facebook ?? null,
    instagram: request.instagram ?? null,
    source: request.source,
    owner_id: request.ownerId ?? null,
    notes: request.notes ?? null,
  };
}
