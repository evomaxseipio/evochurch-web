import {
  parseOrgPermissionKeys,
  type OrgPermissionKey,
} from "@/lib/auth/org-permission-keys";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/supabase/session";
import { cache } from "react";

export type OrgBranding = {
  id: number;
  name: string;
  slug: string;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  reportRules: Record<string, unknown>;
};

export type OrgSession = {
  authUserId: string;
  email: string;
  fullName: string | null;
  organizationId: number;
  organizationName: string;
  orgUnitId: number | null;
  orgRoleKey: string;
  permissions: OrgPermissionKey[];
  orgBranding: OrgBranding | null;
};

type OrgSessionRow = {
  auth_user_id?: string;
  email?: string;
  full_name?: string | null;
  organization_id?: number | string;
  organization_name?: string;
  org_unit_id?: number | string | null;
  org_role_key?: string;
  permissions?: unknown;
  org_branding?: {
    id?: number;
    name?: string;
    slug?: string;
    logo_url?: string | null;
    primary_color?: string;
    secondary_color?: string;
    accent_color?: string;
    report_rules?: Record<string, unknown>;
  } | null;
};

function parseOrgBranding(raw: OrgSessionRow["org_branding"]): OrgBranding | null {
  if (!raw || raw.id == null) return null;
  return {
    id: Number(raw.id),
    name: String(raw.name ?? ""),
    slug: String(raw.slug ?? ""),
    logoUrl:
      typeof raw.logo_url === "string" && raw.logo_url.length > 0
        ? raw.logo_url
        : null,
    primaryColor: String(raw.primary_color ?? "#1E0A4C"),
    secondaryColor: String(raw.secondary_color ?? "#4C1D95"),
    accentColor: String(raw.accent_color ?? "#5B21B6"),
    reportRules:
      raw.report_rules && typeof raw.report_rules === "object"
        ? raw.report_rules
        : {},
  };
}

function parseOrgSessionRow(row: OrgSessionRow | null): OrgSession | null {
  if (!row?.auth_user_id || row.organization_id == null) return null;
  const organizationId = Number.parseInt(String(row.organization_id), 10);
  if (!Number.isFinite(organizationId)) return null;

  const orgUnitRaw = row.org_unit_id;
  const orgUnitId =
    orgUnitRaw == null || orgUnitRaw === ""
      ? null
      : Number.parseInt(String(orgUnitRaw), 10) || null;

  return {
    authUserId: String(row.auth_user_id),
    email: String(row.email ?? ""),
    fullName:
      typeof row.full_name === "string" && row.full_name.length > 0
        ? row.full_name
        : null,
    organizationId,
    organizationName: String(row.organization_name ?? ""),
    orgUnitId,
    orgRoleKey: String(row.org_role_key ?? "org_viewer"),
    permissions: parseOrgPermissionKeys(row.permissions),
    orgBranding: parseOrgBranding(row.org_branding),
  };
}

export const getOrgSession = cache(async (): Promise<OrgSession | null> => {
  const user = await getVerifiedUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("sp_get_org_session_context");
  if (error) return null;

  return parseOrgSessionRow(data as OrgSessionRow | null);
});

export async function getOrgActionSession() {
  const supabase = await createClient();
  const session = await getOrgSession();
  if (!session) {
    throw new Error("Sesión de organización no disponible.");
  }
  return { supabase, session };
}

export function orgHasPermission(
  session: OrgSession,
  permission: OrgPermissionKey,
): boolean {
  return session.permissions.includes(permission);
}
