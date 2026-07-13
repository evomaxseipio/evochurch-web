"use server";

import { revalidatePath } from "next/cache";
import { getVerifiedUser } from "@/lib/supabase/session";
import { getOrganizationService } from "@/features/organizations/server/organization-service.factory";
import {
  isOrganizationServiceError,
  type OrganizationServiceErrorCode,
} from "@/features/organizations/services";
import type {
  CreateOrganizationRequest,
  ListOrganizationsRequest,
  UpdateOrganizationRequest,
} from "@/features/organizations/schemas/organization.requests";
import type { OrganizationVm } from "@/features/organizations/schemas/organization.responses";
import type { OrganizationListVm } from "@/features/organizations/schemas/organization.responses";

const ORGANIZATIONS_PATH = "/apps/backoffice/organizations";

export type OrganizationActionResult =
  | { ok: true; data: OrganizationVm }
  | {
      ok: false;
      code: OrganizationServiceErrorCode;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

export type ListOrganizationsActionResult =
  | { ok: true; data: OrganizationListVm }
  | { ok: false; code: OrganizationServiceErrorCode; error: string };

export type GetOrganizationActionResult =
  | { ok: true; data: OrganizationVm }
  | { ok: false; code: OrganizationServiceErrorCode; error: string };

export type DeleteActionResult =
  | { ok: true }
  | { ok: false; code: OrganizationServiceErrorCode; error: string };

function handleError(error: unknown): {
  code: OrganizationServiceErrorCode;
  error: string;
  fieldErrors?: Record<string, string[]>;
} {
  if (isOrganizationServiceError(error)) {
    return {
      code: error.code,
      error: error.message,
      fieldErrors: error.fieldErrors,
    };
  }
  return { code: "UNKNOWN", error: "Ocurrió un error inesperado." };
}

async function actorId(): Promise<string | null> {
  const user = await getVerifiedUser();
  return user?.id ?? null;
}

export async function listOrganizationsAction(
  request: ListOrganizationsRequest = {},
): Promise<ListOrganizationsActionResult> {
  try {
    const service = getOrganizationService();
    const data = await service.list(request);
    return { ok: true, data };
  } catch (error) {
    const { code, error: message } = handleError(error);
    return { ok: false, code, error: message };
  }
}

export async function getOrganizationAction(
  id: string,
): Promise<GetOrganizationActionResult> {
  try {
    const service = getOrganizationService();
    const data = await service.getById(id);
    if (!data) {
      return { ok: false, code: "NOT_FOUND", error: "Organización no encontrada." };
    }
    return { ok: true, data };
  } catch (error) {
    const { code, error: message } = handleError(error);
    return { ok: false, code, error: message };
  }
}

export async function createOrganizationAction(
  request: CreateOrganizationRequest,
  options?: { allowDuplicate?: boolean },
): Promise<OrganizationActionResult> {
  try {
    const service = getOrganizationService();
    const data = await service.create(request, {
      actorId: await actorId(),
      allowDuplicate: options?.allowDuplicate,
    });
    revalidatePath(ORGANIZATIONS_PATH);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...handleError(error) };
  }
}

export async function updateOrganizationAction(
  id: string,
  request: UpdateOrganizationRequest,
): Promise<OrganizationActionResult> {
  try {
    const service = getOrganizationService();
    const data = await service.update(id, request, { actorId: await actorId() });
    revalidatePath(ORGANIZATIONS_PATH);
    revalidatePath(`${ORGANIZATIONS_PATH}/${id}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...handleError(error) };
  }
}

export async function archiveOrganizationAction(
  id: string,
): Promise<OrganizationActionResult> {
  try {
    const service = getOrganizationService();
    const data = await service.archive(id, { actorId: await actorId() });
    revalidatePath(ORGANIZATIONS_PATH);
    revalidatePath(`${ORGANIZATIONS_PATH}/${id}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...handleError(error) };
  }
}

export async function reactivateOrganizationAction(
  id: string,
): Promise<OrganizationActionResult> {
  try {
    const service = getOrganizationService();
    const data = await service.reactivate(id, { actorId: await actorId() });
    revalidatePath(ORGANIZATIONS_PATH);
    revalidatePath(`${ORGANIZATIONS_PATH}/${id}`);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, ...handleError(error) };
  }
}

export async function deleteOrganizationAction(
  id: string,
): Promise<DeleteActionResult> {
  try {
    const service = getOrganizationService();
    await service.softDelete(id, { actorId: await actorId() });
    revalidatePath(ORGANIZATIONS_PATH);
    return { ok: true };
  } catch (error) {
    const { code, error: message } = handleError(error);
    return { ok: false, code, error: message };
  }
}
