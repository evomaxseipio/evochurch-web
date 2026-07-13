import type { OrganizationActionResult } from "@/app/apps/backoffice/organizations/actions";

export class OrganizationActionError extends Error {
  readonly code: string;
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    message: string,
    code: string,
    fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "OrganizationActionError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

export function unwrapOrganizationAction<T>(
  result: { ok: true; data: T } | { ok: false; code: string; error: string; fieldErrors?: Record<string, string[]> },
): T {
  if (!result.ok) {
    throw new OrganizationActionError(
      result.error,
      result.code,
      result.fieldErrors,
    );
  }
  return result.data;
}

export function isOrganizationActionError(
  error: unknown,
): error is OrganizationActionError {
  return error instanceof OrganizationActionError;
}

export type { OrganizationActionResult };

export function applyOrganizationMutationResult(
  result: OrganizationActionResult,
  handlers: {
    onSuccess: (data: Extract<OrganizationActionResult, { ok: true }>) => void;
    onDuplicate: (message: string) => void;
    onValidation: (
      message: string,
      fieldErrors?: Record<string, string[]>,
    ) => void;
    onError: (message: string) => void;
  },
) {
  if (result.ok) {
    handlers.onSuccess(result);
    return;
  }

  if (result.code === "DUPLICATE") {
    handlers.onDuplicate(result.error);
    return;
  }

  if (result.code === "VALIDATION") {
    handlers.onValidation(result.error, result.fieldErrors);
    return;
  }

  handlers.onError(result.error);
}
