import type {
  OrganizationSource,
  OrganizationStatus,
  OrganizationType,
} from "./organization.enums";

/** Fila de sales.organizations — snake_case, sin mapeo de dominio. */
export type Organization = {
  id: string;
  name: string;
  type: OrganizationType;
  denomination: string | null;
  status: OrganizationStatus;
  country: string;
  province: string | null;
  city: string;
  address_line: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  facebook: string | null;
  instagram: string | null;
  source: OrganizationSource;
  owner_id: string | null;
  notes: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
  deleted_at: string | null;
};

/** Payload de inserción — columnas persistibles; id y timestamps los asigna la BD. */
export type OrganizationInsert = {
  name: string;
  type?: OrganizationType;
  denomination?: string | null;
  status?: OrganizationStatus;
  country?: string;
  province?: string | null;
  city: string;
  address_line?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  source: OrganizationSource;
  owner_id?: string | null;
  notes?: string | null;
  created_by?: string | null;
  updated_by?: string | null;
};

/** Patch parcial para UPDATE. */
export type OrganizationUpdate = Partial<
  Omit<
    OrganizationInsert,
    "created_by"
  >
> & {
  updated_by?: string | null;
  archived_at?: string | null;
  deleted_at?: string | null;
};

export type OrganizationExistsCriteria = {
  id?: string;
  name?: string;
  city?: string;
  email?: string;
};
