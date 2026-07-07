"use server";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import {
  fetchChurchProfile,
  updateChurchProfile,
  uploadChurchLogo,
  type ChurchProfile,
  type ChurchProfileInput,
} from "@/lib/services/church-profile";
import { syncAuthAppMetadata } from "@/lib/auth/sync-app-metadata";
import { revalidatePath } from "next/cache";

export type ChurchProfileActionResult =
  | { ok: true; profile: ChurchProfile }
  | { ok: false; error: string };

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

function parseProfileInput(formData: FormData): ChurchProfileInput {
  return {
    name: String(formData.get("name") ?? "").trim(),
    shortName: String(formData.get("shortName") ?? "").trim(),
    legalName: String(formData.get("legalName") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim().toLowerCase(),
    addressLine1: String(formData.get("addressLine1") ?? "").trim(),
    addressLine2: String(formData.get("addressLine2") ?? "").trim(),
    city: String(formData.get("city") ?? "").trim(),
    stateProvince: String(formData.get("stateProvince") ?? "").trim(),
    countryCode: String(formData.get("countryCode") ?? "DO").trim().toUpperCase(),
    postalCode: String(formData.get("postalCode") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim(),
    websiteUrl: String(formData.get("websiteUrl") ?? "").trim(),
    primaryColor: String(formData.get("primaryColor") ?? "#5B21B6").trim(),
    secondaryColor: String(formData.get("secondaryColor") ?? "#4C1D95").trim(),
    accentColor: String(formData.get("accentColor") ?? "#1E0A4C").trim(),
    externalCode: String(formData.get("externalCode") ?? "").trim(),
    presbyteryName: String(formData.get("presbyteryName") ?? "").trim(),
    timezone: String(formData.get("timezone") ?? "").trim(),
    defaultLocale: String(formData.get("defaultLocale") ?? "es").trim(),
    logoUrl: String(formData.get("logoUrl") ?? "").trim() || null,
  };
}

function validateProfileInput(input: ChurchProfileInput): string | null {
  if (!input.name) return "El nombre de la iglesia es obligatorio.";
  if (!input.slug) return "El slug es obligatorio.";
  if (!SLUG_PATTERN.test(input.slug)) {
    return "El slug solo puede contener letras minúsculas, números y guiones.";
  }
  if (!HEX_COLOR.test(input.primaryColor)) return "Color primario inválido.";
  if (!HEX_COLOR.test(input.secondaryColor)) return "Color secundario inválido.";
  if (!HEX_COLOR.test(input.accentColor)) return "Color de acento inválido.";
  if (!["es", "en", "fr"].includes(input.defaultLocale ?? "es")) {
    return "Idioma predeterminado inválido.";
  }
  return null;
}

export async function saveChurchProfileAction(
  _prev: ChurchProfileActionResult | null,
  formData: FormData,
): Promise<ChurchProfileActionResult> {
  try {
    const input = parseProfileInput(formData);
    const validationError = validateProfileInput(input);
    if (validationError) return { ok: false, error: validationError };

    const { supabase, session } = await getActionSessionWith(
      "settings:church:write",
    );
    const profile = await updateChurchProfile(supabase, session.churchId, input);
    await syncAuthAppMetadata(session, supabase);
    revalidatePath("/settings/church");
    revalidatePath("/", "layout");
    return { ok: true, profile };
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error ? e.message : "No se pudo guardar el perfil de iglesia.",
    };
  }
}

export async function uploadChurchLogoAction(
  formData: FormData,
): Promise<ChurchProfileActionResult> {
  try {
    const file = formData.get("logo");
    if (!(file instanceof File) || file.size === 0) {
      return { ok: false, error: "Selecciona una imagen válida." };
    }
    if (file.size > 2 * 1024 * 1024) {
      return { ok: false, error: "El logo no puede superar 2 MB." };
    }

    const { supabase, session } = await getActionSessionWith(
      "settings:church:write",
    );
    await uploadChurchLogo(supabase, session.churchId, file);
    const profile = await fetchChurchProfile(supabase, session.churchId);
    revalidatePath("/settings/church");
    revalidatePath("/", "layout");
    return { ok: true, profile };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "No se pudo subir el logo.",
    };
  }
}
