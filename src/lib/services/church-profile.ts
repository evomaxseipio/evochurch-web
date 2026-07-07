import type { SupabaseClient } from "@supabase/supabase-js";

const LOGO_BUCKET = "church-assets";
const LOGO_SIGNED_URL_TTL = 3600;

export type ChurchProfile = {
  id: number;
  name: string;
  shortName: string | null;
  legalName: string | null;
  slug: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  stateProvince: string | null;
  countryCode: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  websiteUrl: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  externalCode: string | null;
  presbyteryName: string | null;
  timezone: string;
  defaultLocale: string;
  updatedAt: string | null;
  updatedByProfileId: string | null;
};

export type ChurchProfileInput = {
  name: string;
  shortName?: string;
  legalName?: string;
  slug: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateProvince?: string;
  countryCode?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  websiteUrl?: string;
  logoUrl?: string | null;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  externalCode?: string;
  presbyteryName?: string;
  timezone?: string;
  defaultLocale?: string;
};

type ChurchProfileRow = {
  id?: number;
  name?: string;
  short_name?: string | null;
  legal_name?: string | null;
  slug?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state_province?: string | null;
  country_code?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  email?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
  external_code?: string | null;
  presbytery_name?: string | null;
  timezone?: string;
  default_locale?: string;
  updated_at?: string | null;
  updated_by_profile_id?: string | null;
};

type RpcEnvelope<T> = {
  success?: boolean;
  status_code?: number;
  message?: string;
  profile?: T;
  logo_url?: string;
};

function parseProfileRow(row: ChurchProfileRow | null | undefined): ChurchProfile | null {
  if (!row || row.id == null || !row.name || !row.slug) return null;

  return {
    id: row.id,
    name: row.name,
    shortName: row.short_name ?? null,
    legalName: row.legal_name ?? null,
    slug: row.slug,
    addressLine1: row.address_line1 ?? null,
    addressLine2: row.address_line2 ?? null,
    city: row.city ?? null,
    stateProvince: row.state_province ?? null,
    countryCode: row.country_code ?? null,
    postalCode: row.postal_code ?? null,
    phone: row.phone ?? null,
    email: row.email ?? null,
    websiteUrl: row.website_url ?? null,
    logoUrl: row.logo_url ?? null,
    primaryColor: row.primary_color ?? "#5B21B6",
    secondaryColor: row.secondary_color ?? "#4C1D95",
    accentColor: row.accent_color ?? "#1E0A4C",
    externalCode: row.external_code ?? null,
    presbyteryName: row.presbytery_name ?? null,
    timezone: row.timezone ?? "America/Santo_Domingo",
    defaultLocale: row.default_locale ?? "es",
    updatedAt: row.updated_at ?? null,
    updatedByProfileId: row.updated_by_profile_id ?? null,
  };
}

function profileToPayload(input: ChurchProfileInput): Record<string, string | null> {
  return {
    name: input.name,
    short_name: input.shortName ?? "",
    legal_name: input.legalName ?? "",
    slug: input.slug,
    address_line1: input.addressLine1 ?? "",
    address_line2: input.addressLine2 ?? "",
    city: input.city ?? "",
    state_province: input.stateProvince ?? "",
    country_code: input.countryCode ?? "DO",
    postal_code: input.postalCode ?? "",
    phone: input.phone ?? "",
    email: input.email ?? "",
    website_url: input.websiteUrl ?? "",
    logo_url: input.logoUrl ?? "",
    primary_color: input.primaryColor,
    secondary_color: input.secondaryColor,
    accent_color: input.accentColor,
    external_code: input.externalCode ?? "",
    presbytery_name: input.presbyteryName ?? "",
    timezone: input.timezone ?? "",
    default_locale: input.defaultLocale ?? "es",
  };
}

function assertRpcSuccess<T>(data: RpcEnvelope<T> | null, fallback: string): T {
  if (!data?.success) {
    throw new Error(data?.message ?? fallback);
  }
  return data as T;
}

export async function fetchChurchProfile(
  supabase: SupabaseClient,
  churchId: number,
): Promise<ChurchProfile> {
  const { data, error } = await supabase.rpc("sp_get_church_profile", {
    p_church_id: churchId,
  });

  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<ChurchProfileRow>;
  assertRpcSuccess(envelope, "No se pudo cargar el perfil de iglesia.");
  const profile = parseProfileRow(envelope.profile);
  if (!profile) throw new Error("Perfil de iglesia no disponible.");
  return profile;
}

export async function updateChurchProfile(
  supabase: SupabaseClient,
  churchId: number,
  input: ChurchProfileInput,
): Promise<ChurchProfile> {
  const { data, error } = await supabase.rpc("sp_update_church_profile", {
    p_church_id: churchId,
    p_payload: profileToPayload(input),
  });

  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<ChurchProfileRow>;
  assertRpcSuccess(envelope, "No se pudo guardar el perfil de iglesia.");
  const profile = parseProfileRow(envelope.profile);
  if (!profile) throw new Error("Perfil de iglesia no disponible tras guardar.");
  return profile;
}

export async function confirmChurchLogo(
  supabase: SupabaseClient,
  churchId: number,
  storagePath: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("sp_confirm_church_logo", {
    p_church_id: churchId,
    p_storage_path: storagePath,
  });

  if (error) throw new Error(error.message);

  const envelope = data as RpcEnvelope<never>;
  assertRpcSuccess(envelope, "No se pudo confirmar el logo.");
  return envelope.logo_url ?? storagePath;
}

export function churchLogoStoragePath(churchId: number, extension: string): string {
  const ext = extension.replace(/^\./, "").toLowerCase() || "png";
  return `${churchId}/logo.${ext}`;
}

export async function uploadChurchLogo(
  supabase: SupabaseClient,
  churchId: number,
  file: File,
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = churchLogoStoragePath(churchId, ext);

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) throw new Error(uploadError.message);

  return confirmChurchLogo(supabase, churchId, path);
}

export async function resolveChurchLogoSignedUrl(
  supabase: SupabaseClient,
  storagePath: string | null | undefined,
): Promise<string | null> {
  if (!storagePath?.trim()) return null;

  const { data, error } = await supabase.storage
    .from(LOGO_BUCKET)
    .createSignedUrl(storagePath, LOGO_SIGNED_URL_TTL);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function churchProfileToReportMeta(profile: ChurchProfile) {
  const addressParts = [
    profile.addressLine1,
    profile.city,
    profile.stateProvince,
  ].filter(Boolean);

  return {
    churchName: profile.name,
    presbyterio: profile.presbyteryName ?? undefined,
    churchCode: profile.externalCode ?? undefined,
    address: addressParts.length > 0 ? addressParts.join(", ") : undefined,
  };
}
