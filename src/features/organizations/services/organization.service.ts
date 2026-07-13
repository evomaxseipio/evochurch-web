import {
  isOrganizationRepositoryError,
  type IOrganizationRepository,
} from "../repositories";
import {
  toOrganizationInsert,
  toOrganizationListVm,
  toOrganizationUpdate,
  toOrganizationVm,
} from "../mappers/organization.mapper";
import type {
  CreateOrganizationRequest,
  ListOrganizationsRequest,
  UpdateOrganizationRequest,
} from "../schemas/organization.requests";
import type {
  OrganizationListVm,
  OrganizationVm,
} from "../schemas/organization.responses";
import type {
  OrganizationListParams,
  OrganizationStatus,
} from "../types";
import {
  createOrganizationSchema,
  updateOrganizationSchema,
} from "../validations/organization.schema";
import { OrganizationServiceError } from "./organization.service.errors";

/** Tipos permitidos para creación en MVP 0.1. */
const CREATABLE_TYPES = new Set(["CHURCH"]);

export type CreateOrganizationOptions = {
  actorId?: string | null;
  /** Ignorar advertencia de duplicado (name + city). */
  allowDuplicate?: boolean;
};

export type MutationOptions = {
  actorId?: string | null;
};

export class OrganizationService {
  constructor(private readonly repository: IOrganizationRepository) {}

  async create(
    request: CreateOrganizationRequest,
    options: CreateOrganizationOptions = {},
  ): Promise<OrganizationVm> {
    const parsed = createOrganizationSchema.safeParse(request);
    if (!parsed.success) {
      throw this.validationError(parsed.error.flatten().fieldErrors);
    }

    const values = parsed.data;

    if (!CREATABLE_TYPES.has(values.type)) {
      throw new OrganizationServiceError(
        `En esta versión solo se pueden crear organizaciones de tipo CHURCH.`,
        "TYPE_NOT_ALLOWED",
      );
    }

    if (!options.allowDuplicate) {
      const duplicate = await this.repository.exists({
        name: values.name,
        city: values.city,
      });
      if (duplicate) {
        throw new OrganizationServiceError(
          `Ya existe una organización llamada "${values.name}" en ${values.city}.`,
          "DUPLICATE",
        );
      }
    }

    const insert = toOrganizationInsert({
      ...values,
      ownerId: request.ownerId ?? null,
    });
    insert.created_by = options.actorId ?? null;
    insert.updated_by = options.actorId ?? null;

    try {
      const created = await this.repository.create(insert);
      return toOrganizationVm(created);
    } catch (error) {
      throw this.wrapRepositoryError(error, "No se pudo crear la organización.");
    }
  }

  async update(
    id: string,
    request: UpdateOrganizationRequest,
    options: MutationOptions = {},
  ): Promise<OrganizationVm> {
    const parsed = updateOrganizationSchema.safeParse(request);
    if (!parsed.success) {
      throw this.validationError(parsed.error.flatten().fieldErrors);
    }

    const values = parsed.data;
    const update = toOrganizationUpdate({
      ...values,
      ownerId: request.ownerId ?? null,
    });
    update.updated_by = options.actorId ?? null;

    try {
      const updated = await this.repository.update(id, update);
      return toOrganizationVm(updated);
    } catch (error) {
      throw this.wrapRepositoryError(
        error,
        "No se pudo actualizar la organización.",
      );
    }
  }

  async getById(id: string): Promise<OrganizationVm | null> {
    try {
      const entity = await this.repository.findById(id);
      return entity ? toOrganizationVm(entity) : null;
    } catch (error) {
      throw this.wrapRepositoryError(
        error,
        "No se pudo consultar la organización.",
      );
    }
  }

  async list(request: ListOrganizationsRequest = {}): Promise<OrganizationListVm> {
    const params: OrganizationListParams = {
      filters: {
        status: request.status,
        type: request.type,
        city: request.city,
        owner_id: request.ownerId,
        source: request.source,
        include_archived: request.includeArchived ?? true,
      },
      pagination: {
        page: request.page ?? 1,
        page_size: request.pageSize ?? 25,
      },
      sort: {
        field: request.sortField ?? "created_at",
        direction: request.sortDirection ?? "desc",
      },
    };

    try {
      if (request.search && request.search.trim() !== "") {
        const result = await this.repository.search({
          query: request.search,
          filters: params.filters,
          pagination: params.pagination,
          sort: params.sort,
        });
        return toOrganizationListVm(result);
      }

      const result = await this.repository.findAll(params);
      return toOrganizationListVm(result);
    } catch (error) {
      throw this.wrapRepositoryError(
        error,
        "No se pudo listar las organizaciones.",
      );
    }
  }

  async archive(id: string, options: MutationOptions = {}): Promise<OrganizationVm> {
    return this.changeStatus(id, "ARCHIVED", options);
  }

  async reactivate(id: string, options: MutationOptions = {}): Promise<OrganizationVm> {
    return this.changeStatus(id, "ACTIVE", options);
  }

  async changeStatus(
    id: string,
    status: OrganizationStatus,
    options: MutationOptions = {},
  ): Promise<OrganizationVm> {
    try {
      const updated = await this.repository.update(id, {
        status,
        archived_at: status === "ARCHIVED" ? new Date().toISOString() : null,
        updated_by: options.actorId ?? null,
      });
      return toOrganizationVm(updated);
    } catch (error) {
      throw this.wrapRepositoryError(
        error,
        "No se pudo cambiar el estado de la organización.",
      );
    }
  }

  async softDelete(id: string, options: MutationOptions = {}): Promise<void> {
    try {
      await this.repository.update(id, {
        deleted_at: new Date().toISOString(),
        updated_by: options.actorId ?? null,
      });
    } catch (error) {
      throw this.wrapRepositoryError(
        error,
        "No se pudo eliminar la organización.",
      );
    }
  }

  async count(request: ListOrganizationsRequest = {}): Promise<number> {
    try {
      return await this.repository.count({
        status: request.status,
        type: request.type,
        city: request.city,
        owner_id: request.ownerId,
        source: request.source,
        include_archived: request.includeArchived ?? true,
      });
    } catch (error) {
      throw this.wrapRepositoryError(
        error,
        "No se pudo contar las organizaciones.",
      );
    }
  }

  private validationError(
    fieldErrors: Record<string, string[] | undefined>,
  ): OrganizationServiceError {
    const cleaned: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(fieldErrors)) {
      if (value && value.length > 0) cleaned[key] = value;
    }
    return new OrganizationServiceError(
      "Revisa los campos del formulario.",
      "VALIDATION",
      { fieldErrors: cleaned },
    );
  }

  private wrapRepositoryError(
    error: unknown,
    fallback: string,
  ): OrganizationServiceError {
    if (error instanceof OrganizationServiceError) return error;

    if (isOrganizationRepositoryError(error)) {
      const code =
        error.code === "NOT_FOUND"
          ? "NOT_FOUND"
          : error.code === "CONFLICT"
            ? "DUPLICATE"
            : error.code === "VALIDATION"
              ? "VALIDATION"
              : "REPOSITORY";
      return new OrganizationServiceError(error.message || fallback, code, {
        cause: error,
      });
    }

    return new OrganizationServiceError(fallback, "UNKNOWN", { cause: error });
  }
}

export function createOrganizationService(
  repository: IOrganizationRepository,
): OrganizationService {
  return new OrganizationService(repository);
}
