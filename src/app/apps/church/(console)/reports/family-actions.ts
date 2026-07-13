"use server";

import { getActionSession } from "@/lib/auth/app-session";
import { canReadMembers, requirePermission } from "@/lib/auth/permissions";
import {
  isFamilyHouseholdFilter,
  type FamilyHouseholdFilter,
  type FamilyHouseholdDetail,
  type FamilyHouseholdListPage,
} from "@/lib/reports/family-household";
import {
  fetchFamilyHousehold,
  fetchFamilyHouseholdsPage,
} from "@/lib/services/family-report";
import { getTranslations } from "next-intl/server";

export type FetchFamilyHouseholdsResult =
  | { ok: true; page: FamilyHouseholdListPage }
  | { ok: false; error: string };

export type FetchFamilyHouseholdDetailResult =
  | { ok: true; household: FamilyHouseholdDetail }
  | { ok: false; error: string };

export async function fetchFamilyHouseholdsAction(input: {
  search?: string | null;
  filter?: string | null;
  page?: number;
  pageSize?: number;
}): Promise<FetchFamilyHouseholdsResult> {
  const tErrors = await getTranslations("errors");
  try {
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tErrors("noChurch") };
    }
    if (!canReadMembers(session)) {
      return { ok: false, error: tErrors("forbidden") };
    }
    requirePermission(session, "members:read");

    const filter: FamilyHouseholdFilter =
      input.filter && isFamilyHouseholdFilter(input.filter)
        ? input.filter
        : "all";

    const page = await fetchFamilyHouseholdsPage(supabase, session.churchId, {
      search: input.search,
      filter,
      page: input.page,
      pageSize: input.pageSize,
    });
    return { ok: true, page };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : tErrors("loadFailed"),
    };
  }
}

export async function fetchFamilyHouseholdDetailAction(
  anchorProfileId: string,
): Promise<FetchFamilyHouseholdDetailResult> {
  const tErrors = await getTranslations("errors");
  try {
    const { supabase, session } = await getActionSession();
    if (!session.churchId) {
      return { ok: false, error: tErrors("noChurch") };
    }
    if (!canReadMembers(session)) {
      return { ok: false, error: tErrors("forbidden") };
    }
    requirePermission(session, "members:read");

    const household = await fetchFamilyHousehold(
      supabase,
      session.churchId,
      anchorProfileId,
    );
    if (!household) {
      return { ok: false, error: tErrors("loadFailed") };
    }
    return { ok: true, household };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : tErrors("loadFailed"),
    };
  }
}
