import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOrganizationRepository } from "../repositories";
import {
  createOrganizationService,
  type OrganizationService,
} from "../services";

/**
 * Wiring server-only: service role → repository → service.
 * MVP: acceso vía service_role (schema sales no expuesto en PostgREST).
 */
export function getOrganizationService(): OrganizationService {
  const admin = createAdminClient();
  if (!admin) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY no está configurado; no se puede acceder a sales.organizations.",
    );
  }
  const repository = createOrganizationRepository(admin);
  return createOrganizationService(repository);
}
