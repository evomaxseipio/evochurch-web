import type { PostgrestError } from "@supabase/supabase-js";
import { OrganizationRepositoryError } from "./organization.repository.error";

export function mapPostgrestError(
  error: PostgrestError,
  fallbackMessage: string,
): OrganizationRepositoryError {
  const message = error.message || error.details || fallbackMessage;

  if (error.code === "PGRST116") {
    return new OrganizationRepositoryError(message, "NOT_FOUND", error);
  }

  if (error.code === "23505") {
    return new OrganizationRepositoryError(message, "CONFLICT", error);
  }

  if (error.code === "23514" || error.code === "23502") {
    return new OrganizationRepositoryError(message, "VALIDATION", error);
  }

  if (error.code === "PGRST106") {
    return new OrganizationRepositoryError(
      "El esquema sales no está expuesto en la API de Supabase. Agrega sales en Settings → API → Exposed schemas y ejecuta supabase config push.",
      "FORBIDDEN",
      error,
    );
  }

  if (error.code === "42501") {
    return new OrganizationRepositoryError(message, "FORBIDDEN", error);
  }

  return new OrganizationRepositoryError(message, "UNKNOWN", error);
}

export function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

export function paginationRange(page: number, pageSize: number): {
  from: number;
  to: number;
} {
  const safePage = Math.max(1, page);
  const safeSize = Math.max(1, Math.min(pageSize, 200));
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  return { from, to };
}

export function normalizePagination(
  pagination?: { page: number; page_size: number },
): { page: number; page_size: number; from: number; to: number } {
  const page = Math.max(1, pagination?.page ?? 1);
  const page_size = Math.max(1, Math.min(pagination?.page_size ?? 25, 200));
  const { from, to } = paginationRange(page, page_size);
  return { page, page_size, from, to };
}
