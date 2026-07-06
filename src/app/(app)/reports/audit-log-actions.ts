"use server";

import { getActionSession } from "@/lib/auth/app-session";
import {
  canExportAuditLog,
  canReadAuditLog,
  requirePermission,
} from "@/lib/auth/permissions";
import type { AuditLogFilters } from "@/lib/audit/types";
import { fetchAuditLogPage } from "@/lib/services/audit-log";
import { getTranslations } from "next-intl/server";

export type FetchAuditLogPageResult =
  | { ok: true; items: Awaited<ReturnType<typeof fetchAuditLogPage>>["items"]; total: number }
  | { ok: false; error: string };

export async function fetchAuditLogPageAction(
  filters: AuditLogFilters,
): Promise<FetchAuditLogPageResult> {
  const tErrors = await getTranslations("errors");
  try {
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tErrors("noChurch") };
    }
    if (!canReadAuditLog(session)) {
      return { ok: false, error: tErrors("forbidden") };
    }
    requirePermission(session, "audit:read");

    const page = await fetchAuditLogPage(supabase, session.churchId, filters);
    return { ok: true, items: page.items, total: page.total };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : tErrors("loadFailed"),
    };
  }
}

export async function assertAuditExportPermissionAction(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const tErrors = await getTranslations("errors");
  const { session } = await getActionSession();
  if (!session.churchId) {
    return { ok: false, error: tErrors("noChurch") };
  }
  if (!canExportAuditLog(session)) {
    return { ok: false, error: tErrors("forbidden") };
  }
  requirePermission(session, "audit:export");
  return { ok: true };
}
