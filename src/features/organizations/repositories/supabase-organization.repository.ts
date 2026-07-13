import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ChangeStageParams,
  Organization,
  OrganizationCountFilters,
  OrganizationExistsCriteria,
  OrganizationInsert,
  OrganizationListFilters,
  OrganizationListParams,
  OrganizationPageResult,
  OrganizationSearchParams,
  OrganizationStatus,
  OrganizationUpdate,
} from "../types";
import type { IOrganizationRepository } from "./organization.repository.interface";
import { OrganizationRepositoryError } from "./organization.repository.error";
import { mapPostgrestError } from "./organization.repository.utils";

type ListRpcResult = {
  items: Organization[];
  total: number;
  page: number;
  page_size: number;
};

export class SupabaseOrganizationRepository implements IOrganizationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(data: OrganizationInsert): Promise<Organization> {
    const { data: row, error } = await this.supabase.rpc("sp_bo_create_organization", {
      p_payload: data,
    });

    if (error) {
      throw mapPostgrestError(error, "No se pudo crear la organización.");
    }

    return row as Organization;
  }

  async update(id: string, data: OrganizationUpdate): Promise<Organization> {
    const { data: row, error } = await this.supabase.rpc("sp_bo_update_organization", {
      p_id: id,
      p_payload: data,
    });

    if (error) {
      throw mapPostgrestError(error, "No se pudo actualizar la organización.");
    }

    return row as Organization;
  }

  async archive(id: string): Promise<Organization> {
    return this.changeStatus(id, "ARCHIVED");
  }

  async findById(id: string): Promise<Organization | null> {
    const { data, error } = await this.supabase.rpc("sp_bo_get_organization", {
      p_id: id,
    });

    if (error) {
      throw mapPostgrestError(error, "No se pudo consultar la organización.");
    }

    return (data as Organization | null) ?? null;
  }

  async findAll(params: OrganizationListParams = {}): Promise<OrganizationPageResult> {
    return this.listViaRpc({
      search: null,
      filters: params.filters,
      pagination: params.pagination,
      sort: params.sort,
    });
  }

  async search(params: OrganizationSearchParams): Promise<OrganizationPageResult> {
    const term = params.query.trim();
    if (!term) {
      return this.findAll({
        filters: params.filters,
        pagination: params.pagination,
        sort: params.sort,
      });
    }

    return this.listViaRpc({
      search: term,
      filters: params.filters,
      pagination: params.pagination,
      sort: params.sort,
    });
  }

  async changeStage(_params: ChangeStageParams): Promise<Organization> {
    throw new OrganizationRepositoryError(
      "changeStage no persiste en sales.organizations. Usar Opportunities cuando exista sales.opportunities.",
      "NOT_IMPLEMENTED",
    );
  }

  async changeStatus(id: string, status: OrganizationStatus): Promise<Organization> {
    const patch: OrganizationUpdate = { status };

    if (status === "ARCHIVED") {
      patch.archived_at = new Date().toISOString();
    }

    if (status === "ACTIVE") {
      patch.archived_at = null;
    }

    return this.update(id, patch);
  }

  async exists(criteria: OrganizationExistsCriteria): Promise<boolean> {
    if (
      criteria.id == null &&
      criteria.name == null &&
      criteria.city == null &&
      criteria.email == null
    ) {
      throw new OrganizationRepositoryError(
        "exists() requiere al menos un criterio.",
        "VALIDATION",
      );
    }

    const { data, error } = await this.supabase.rpc("sp_bo_organization_exists", {
      p_id: criteria.id ?? null,
      p_name: criteria.name ?? null,
      p_city: criteria.city ?? null,
      p_email: criteria.email ?? null,
    });

    if (error) {
      throw mapPostgrestError(error, "No se pudo verificar la organización.");
    }

    return data === true;
  }

  async count(filters?: OrganizationCountFilters): Promise<number> {
    const page = await this.listViaRpc({
      search: null,
      filters,
      pagination: { page: 1, page_size: 1 },
      sort: { field: "created_at", direction: "desc" },
    });
    return page.total;
  }

  private filtersToRpcArgs(filters?: OrganizationListFilters) {
    const status = filters?.status;
    const type = filters?.type;
    const source = filters?.source;

    return {
      p_status: Array.isArray(status) ? status[0] ?? null : status ?? null,
      p_type: Array.isArray(type) ? type[0] ?? null : type ?? null,
      p_city: filters?.city?.trim() || null,
      p_owner_id: filters?.owner_id ?? null,
      p_source: Array.isArray(source) ? source[0] ?? null : source ?? null,
      p_include_archived: filters?.include_archived !== false,
    };
  }

  private async listViaRpc(input: {
    search: string | null;
    filters?: OrganizationListFilters;
    pagination?: { page: number; page_size: number };
    sort?: { field: string; direction?: "asc" | "desc" };
  }): Promise<OrganizationPageResult> {
    const page = Math.max(1, input.pagination?.page ?? 1);
    const page_size = Math.max(1, Math.min(input.pagination?.page_size ?? 25, 200));
    const filterArgs = this.filtersToRpcArgs(input.filters);

    const { data, error } = await this.supabase.rpc("sp_bo_list_organizations", {
      p_search: input.search,
      p_page: page,
      p_page_size: page_size,
      p_sort_field: input.sort?.field ?? "created_at",
      p_sort_direction: input.sort?.direction ?? "desc",
      ...filterArgs,
    });

    if (error) {
      throw mapPostgrestError(error, "No se pudo listar las organizaciones.");
    }

    const result = data as ListRpcResult;
    return {
      items: result.items ?? [],
      total: result.total ?? 0,
      page: result.page ?? page,
      page_size: result.page_size ?? page_size,
    };
  }
}

export function createOrganizationRepository(
  supabase: SupabaseClient,
): SupabaseOrganizationRepository {
  return new SupabaseOrganizationRepository(supabase);
}
