export type OrganizationServiceErrorCode =
  | "VALIDATION"
  | "DUPLICATE"
  | "NOT_FOUND"
  | "TYPE_NOT_ALLOWED"
  | "INVALID_TRANSITION"
  | "REPOSITORY"
  | "UNKNOWN";

export class OrganizationServiceError extends Error {
  readonly code: OrganizationServiceErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: OrganizationServiceErrorCode = "UNKNOWN",
    options?: { fieldErrors?: Record<string, string[]>; cause?: unknown },
  ) {
    super(message);
    this.name = "OrganizationServiceError";
    this.code = code;
    this.fieldErrors = options?.fieldErrors;
    this.cause = options?.cause;
  }
}

export function isOrganizationServiceError(
  error: unknown,
): error is OrganizationServiceError {
  return error instanceof OrganizationServiceError;
}
