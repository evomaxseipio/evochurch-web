-- =============================================================================
-- BackOffice Sales Hub — Organizations MVP 0.1
-- Bootstrap completo: schema, tabla, índices, triggers, RLS, vista.
-- Domain: sales.organizations (prospecto comercial; NO es public.organization).
-- Catálogos: text + CHECK (Database Design; sin PostgreSQL ENUM).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

GRANT USAGE ON SCHEMA extensions TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Schema sales
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS sales;

COMMENT ON SCHEMA sales IS
  'Bounded context comercial del BackOffice EvoChurch (captación, pipeline, agenda).';

GRANT USAGE ON SCHEMA sales TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Helper: validación de catálogos (OrganizationType, Status, Source)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.fn_is_valid_organization_type(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO sales, public
AS $$
  SELECT p_value IN ('CHURCH', 'MINISTRY', 'COUNCIL', 'FOUNDATION');
$$;

CREATE OR REPLACE FUNCTION sales.fn_is_valid_organization_status(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO sales, public
AS $$
  SELECT p_value IN ('ACTIVE', 'ARCHIVED');
$$;

CREATE OR REPLACE FUNCTION sales.fn_is_valid_organization_source(p_value text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO sales, public
AS $$
  SELECT p_value IN ('REFERRAL', 'VISIT', 'SOCIAL_MEDIA', 'EVENT', 'WEB', 'OTHER');
$$;

COMMENT ON FUNCTION sales.fn_is_valid_organization_type(text) IS
  'Catálogo OrganizationType. Preferir CHECK en tabla; útil para RPC futuros.';

COMMENT ON FUNCTION sales.fn_is_valid_organization_status(text) IS
  'Catálogo OrganizationStatus (ACTIVE|ARCHIVED). No confundir con pipeline.';

COMMENT ON FUNCTION sales.fn_is_valid_organization_source(text) IS
  'Catálogo OrganizationSource (origen de captación comercial).';

-- ---------------------------------------------------------------------------
-- Table: sales.organizations
-- ---------------------------------------------------------------------------

CREATE TABLE sales.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identidad y clasificación
  name text NOT NULL,
  type text NOT NULL DEFAULT 'CHURCH',
  denomination text,
  status text NOT NULL DEFAULT 'ACTIVE',

  -- Ubicación (VO Address)
  country text NOT NULL DEFAULT 'DO',
  province text,
  city text NOT NULL,
  address_line text,

  -- Contacto institucional (VO ContactInformation)
  phone text,
  email text,

  -- Presencia web (VO WebPresence)
  website text,
  facebook text,
  instagram text,

  -- Comercial
  source text NOT NULL,
  owner_id uuid,
  notes text,

  -- Archivo de negocio + auditoría / soft delete
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,

  CONSTRAINT ck_organizations_name_not_blank
    CHECK (length(trim(name)) > 0),

  CONSTRAINT ck_organizations_city_not_blank
    CHECK (length(trim(city)) > 0),

  CONSTRAINT ck_organizations_type
    CHECK (sales.fn_is_valid_organization_type(type)),

  CONSTRAINT ck_organizations_status
    CHECK (sales.fn_is_valid_organization_status(status)),

  CONSTRAINT ck_organizations_source
    CHECK (sales.fn_is_valid_organization_source(source)),

  CONSTRAINT ck_organizations_archive_coherence
    CHECK (
      (status = 'ACTIVE' AND archived_at IS NULL)
      OR (status = 'ARCHIVED' AND archived_at IS NOT NULL)
    ),

  CONSTRAINT ck_organizations_email_format
    CHECK (
      email IS NULL
      OR email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'
    ),

  CONSTRAINT ck_organizations_website_format
    CHECK (
      website IS NULL
      OR website ~* '^https?://'
    )
);

COMMENT ON TABLE sales.organizations IS
  'Cuenta comercial / prospecto del BackOffice. Ancla para contacts, activities, tasks y opportunities.';

COMMENT ON COLUMN sales.organizations.id IS
  'Identidad del agregado (UUID). Estable para FKs futuras.';

COMMENT ON COLUMN sales.organizations.name IS
  'Nombre comercial de la organización. Obligatorio, no vacío.';

COMMENT ON COLUMN sales.organizations.type IS
  'OrganizationType: CHURCH (MVP), MINISTRY, COUNCIL, FOUNDATION.';

COMMENT ON COLUMN sales.organizations.denomination IS
  'Denominación / corriente (ej. Bautista). Relevante sobre todo para iglesias.';

COMMENT ON COLUMN sales.organizations.status IS
  'Ciclo de vida del registro (ACTIVE|ARCHIVED). No es etapa de pipeline.';

COMMENT ON COLUMN sales.organizations.country IS
  'País ISO 3166-1 alpha-2 (default DO).';

COMMENT ON COLUMN sales.organizations.province IS
  'Provincia o estado.';

COMMENT ON COLUMN sales.organizations.city IS
  'Ciudad. Mínimo geográfico obligatorio del dominio.';

COMMENT ON COLUMN sales.organizations.address_line IS
  'Dirección física (calle, número, sector).';

COMMENT ON COLUMN sales.organizations.phone IS
  'Teléfono institucional de la organización (no contacto persona).';

COMMENT ON COLUMN sales.organizations.email IS
  'Email institucional (text; comparación case-insensitive en app/RPC).';

COMMENT ON COLUMN sales.organizations.website IS
  'Sitio web con esquema http(s).';

COMMENT ON COLUMN sales.organizations.facebook IS
  'Handle o path de Facebook.';

COMMENT ON COLUMN sales.organizations.instagram IS
  'Handle de Instagram.';

COMMENT ON COLUMN sales.organizations.source IS
  'OrganizationSource: origen de captación comercial.';

COMMENT ON COLUMN sales.organizations.owner_id IS
  'Responsable comercial (auth.users.id). FK diferida hasta IAM BackOffice.';

COMMENT ON COLUMN sales.organizations.notes IS
  'Observaciones internas del equipo comercial.';

COMMENT ON COLUMN sales.organizations.archived_at IS
  'Timestamp de archivo de negocio. Coherente con status = ARCHIVED.';

COMMENT ON COLUMN sales.organizations.created_at IS
  'Alta del registro.';

COMMENT ON COLUMN sales.organizations.updated_at IS
  'Última modificación (trigger automático).';

COMMENT ON COLUMN sales.organizations.created_by IS
  'Usuario creador (auth.users.id). Rellenado por trigger si hay sesión.';

COMMENT ON COLUMN sales.organizations.updated_by IS
  'Usuario de última modificación (auth.users.id).';

COMMENT ON COLUMN sales.organizations.deleted_at IS
  'Soft delete técnico. NULL = no eliminada. Distinto de archivar (status).';

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

-- Listado operativo por defecto: activas/no eliminadas, más recientes primero.
CREATE INDEX idx_organizations_list_active
  ON sales.organizations (status, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX sales.idx_organizations_list_active IS
  'Listado paginado del BackOffice (status + recientes).';

-- Filtro toolbar "Responsable".
CREATE INDEX idx_organizations_owner
  ON sales.organizations (owner_id, status)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX sales.idx_organizations_owner IS
  'Filtro por responsable comercial asignado.';

-- Filtro toolbar "Ciudad".
CREATE INDEX idx_organizations_city
  ON sales.organizations (city)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX sales.idx_organizations_city IS
  'Filtro geográfico por ciudad.';

-- Reportes y filtros por tipo de organización.
CREATE INDEX idx_organizations_type
  ON sales.organizations (type)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX sales.idx_organizations_type IS
  'Filtro por OrganizationType.';

-- Analítica de captación por fuente.
CREATE INDEX idx_organizations_source
  ON sales.organizations (source)
  WHERE deleted_at IS NULL;

COMMENT ON INDEX sales.idx_organizations_source IS
  'Analítica de OrganizationSource.';

-- Búsqueda "Buscar organizaciones…" (ILIKE / similarity).
CREATE INDEX idx_organizations_name_trgm
  ON sales.organizations USING gin (name extensions.gin_trgm_ops);

COMMENT ON INDEX sales.idx_organizations_name_trgm IS
  'Búsqueda por similitud en nombre (pg_trgm).';

-- Dedupe suave y búsqueda por email institucional (case-insensitive).
CREATE INDEX idx_organizations_email
  ON sales.organizations (lower(email))
  WHERE email IS NOT NULL AND deleted_at IS NULL;

COMMENT ON INDEX sales.idx_organizations_email IS
  'Búsqueda y deduplicación suave por email institucional.';

-- ---------------------------------------------------------------------------
-- Triggers: updated_at + auditoría (created_by / updated_by)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sales.fn_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO sales, public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION sales.fn_set_organization_audit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO sales, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by IS NULL THEN
      NEW.created_by := v_uid;
    END IF;
    NEW.updated_by := COALESCE(NEW.updated_by, v_uid);
  ELSIF TG_OP = 'UPDATE' THEN
    NEW.updated_by := COALESCE(v_uid, NEW.updated_by);
    -- Preservar created_by original
    NEW.created_by := OLD.created_by;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER tr_organizations_set_updated_at
  BEFORE UPDATE ON sales.organizations
  FOR EACH ROW
  EXECUTE FUNCTION sales.fn_touch_updated_at();

CREATE TRIGGER tr_organizations_set_audit
  BEFORE INSERT OR UPDATE ON sales.organizations
  FOR EACH ROW
  EXECUTE FUNCTION sales.fn_set_organization_audit();

COMMENT ON FUNCTION sales.fn_touch_updated_at() IS
  'Mantiene updated_at en cada UPDATE de organizations.';

COMMENT ON FUNCTION sales.fn_set_organization_audit() IS
  'Rellena created_by / updated_by desde auth.uid() cuando hay sesión Supabase.';

-- ---------------------------------------------------------------------------
-- View: listado operativo
-- ---------------------------------------------------------------------------

CREATE VIEW sales.v_organizations_open AS
SELECT *
FROM sales.organizations
WHERE deleted_at IS NULL
  AND status = 'ACTIVE';

COMMENT ON VIEW sales.v_organizations_open IS
  'Organizaciones activas no eliminadas. Base para listados RPC del BackOffice.';

-- ---------------------------------------------------------------------------
-- RLS + grants (BackOffice autenticado; IAM fino en sprint posterior)
-- ---------------------------------------------------------------------------

ALTER TABLE sales.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales.organizations FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE sales.organizations FROM anon, PUBLIC;
REVOKE ALL ON TABLE sales.v_organizations_open FROM anon, PUBLIC;

GRANT SELECT, INSERT, UPDATE ON TABLE sales.organizations TO authenticated, service_role;
GRANT SELECT ON TABLE sales.v_organizations_open TO authenticated, service_role;

-- Lectura: registros no soft-deleted (incluye archivadas para filtros admin).
CREATE POLICY organizations_select_authenticated
  ON sales.organizations
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Alta: usuario autenticado (created_by se completa vía trigger).
CREATE POLICY organizations_insert_authenticated
  ON sales.organizations
  FOR INSERT
  TO authenticated
  WITH CHECK (deleted_at IS NULL);

-- Edición y soft delete: solo filas no eliminadas.
CREATE POLICY organizations_update_authenticated
  ON sales.organizations
  FOR UPDATE
  TO authenticated
  USING (deleted_at IS NULL)
  WITH CHECK (true);

-- service_role bypassa RLS en Supabase; no requiere políticas explícitas.
