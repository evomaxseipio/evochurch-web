export type OrganizationRepositoryErrorCode =
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_IMPLEMENTED"
  | "UNKNOWN";

export class OrganizationRepositoryError extends Error {
  readonly code: OrganizationRepositoryErrorCode;
  readonly cause?: unknown;

  constructor(
    message: string,
    code: OrganizationRepositoryErrorCode = "UNKNOWN",
    cause?: unknown,
  ) {
    super(message);
    this.name = "OrganizationRepositoryError";
    this.code = code;
    this.cause = cause;
  }
}

export function isOrganizationRepositoryError(
  error: unknown,
): error is OrganizationRepositoryError {
  return error instanceof OrganizationRepositoryError;
}
