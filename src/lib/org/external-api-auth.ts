import { hashOrgApiKey } from "@/lib/org/api-key";
import { createAdminClient } from "@/lib/supabase/admin";

type ResolvedOrgApiKey = {
  organizationId: number;
  scopes: string[];
};

export async function resolveOrgApiKey(
  rawKey: string,
): Promise<ResolvedOrgApiKey | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("sp_resolve_org_api_key", {
    p_key_hash: hashOrgApiKey(rawKey),
  });
  if (error) return null;

  const envelope = data as {
    success?: boolean;
    organization_id?: number;
    scopes?: string[];
  };
  if (!envelope?.success || envelope.organization_id == null) return null;

  return {
    organizationId: Number(envelope.organization_id),
    scopes: Array.isArray(envelope.scopes) ? envelope.scopes.map(String) : [],
  };
}
