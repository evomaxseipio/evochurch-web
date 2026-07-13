-- BackOffice Organizations — RPC públicos (PostgREST expone public; sales queda interno).
-- Permite listar/crear/editar vía service_role sin exponer el schema sales en la API.

-- ---------------------------------------------------------------------------
-- List + search (paginado)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_bo_list_organizations(
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_type text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_owner_id uuid DEFAULT NULL,
  p_source text DEFAULT NULL,
  p_include_archived boolean DEFAULT true,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_sort_field text DEFAULT 'created_at',
  p_sort_direction text DEFAULT 'desc'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_page int := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size int := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 200);
  v_offset int := (v_page - 1) * v_page_size;
  v_sort_field text;
  v_sort_dir text;
  v_total bigint;
  v_items jsonb;
  v_search text := NULLIF(trim(COALESCE(p_search, '')), '');
BEGIN
  v_sort_field := CASE COALESCE(p_sort_field, 'created_at')
    WHEN 'name' THEN 'name'
    WHEN 'city' THEN 'city'
    WHEN 'type' THEN 'type'
    WHEN 'status' THEN 'status'
    WHEN 'source' THEN 'source'
    WHEN 'updated_at' THEN 'updated_at'
    ELSE 'created_at'
  END;

  v_sort_dir := CASE lower(COALESCE(p_sort_direction, 'desc'))
    WHEN 'asc' THEN 'ASC'
    ELSE 'DESC'
  END;

  SELECT count(*) INTO v_total
  FROM sales.organizations o
  WHERE o.deleted_at IS NULL
    AND (p_include_archived OR o.status = 'ACTIVE')
    AND (p_status IS NULL OR o.status = p_status)
    AND (p_type IS NULL OR o.type = p_type)
    AND (p_city IS NULL OR o.city = p_city)
    AND (p_owner_id IS NULL OR o.owner_id = p_owner_id)
    AND (p_source IS NULL OR o.source = p_source)
    AND (
      v_search IS NULL
      OR o.name ILIKE '%' || v_search || '%'
      OR o.city ILIKE '%' || v_search || '%'
      OR o.email ILIKE '%' || v_search || '%'
      OR o.denomination ILIKE '%' || v_search || '%'
    );

  EXECUTE format(
    $q$
      SELECT COALESCE(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      FROM (
        SELECT o.*
        FROM sales.organizations o
        WHERE o.deleted_at IS NULL
          AND ($1 OR o.status = 'ACTIVE')
          AND ($2 IS NULL OR o.status = $2)
          AND ($3 IS NULL OR o.type = $3)
          AND ($4 IS NULL OR o.city = $4)
          AND ($5 IS NULL OR o.owner_id = $5)
          AND ($6 IS NULL OR o.source = $6)
          AND (
            $7 IS NULL
            OR o.name ILIKE '%%' || $7 || '%%'
            OR o.city ILIKE '%%' || $7 || '%%'
            OR o.email ILIKE '%%' || $7 || '%%'
            OR o.denomination ILIKE '%%' || $7 || '%%'
          )
        ORDER BY %I %s
        OFFSET $8 LIMIT $9
      ) t
    $q$,
    v_sort_field,
    v_sort_dir
  )
  INTO v_items
  USING
    p_include_archived,
    p_status,
    p_type,
    p_city,
    p_owner_id,
    p_source,
    v_search,
    v_offset,
    v_page_size;

  RETURN jsonb_build_object(
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'page_size', v_page_size
  );
END;
$$;

COMMENT ON FUNCTION public.sp_bo_list_organizations IS
  'BackOffice: listado paginado de sales.organizations (sin exponer schema sales en PostgREST).';

-- ---------------------------------------------------------------------------
-- Get by id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_bo_get_organization(p_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = sales, public
AS $$
  SELECT to_jsonb(o)
  FROM sales.organizations o
  WHERE o.id = p_id
    AND o.deleted_at IS NULL
  LIMIT 1;
$$;

COMMENT ON FUNCTION public.sp_bo_get_organization IS
  'BackOffice: detalle de una organización por id.';

-- ---------------------------------------------------------------------------
-- Create
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_bo_create_organization(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_row sales.organizations%ROWTYPE;
BEGIN
  INSERT INTO sales.organizations (
    name,
    type,
    denomination,
    status,
    country,
    province,
    city,
    address_line,
    phone,
    email,
    website,
    facebook,
    instagram,
    source,
    owner_id,
    notes,
    created_by,
    updated_by
  )
  VALUES (
    trim(p_payload->>'name'),
    COALESCE(NULLIF(p_payload->>'type', ''), 'CHURCH'),
    NULLIF(trim(p_payload->>'denomination'), ''),
    COALESCE(NULLIF(p_payload->>'status', ''), 'ACTIVE'),
    COALESCE(NULLIF(p_payload->>'country', ''), 'DO'),
    NULLIF(trim(p_payload->>'province'), ''),
    trim(p_payload->>'city'),
    NULLIF(trim(p_payload->>'address_line'), ''),
    NULLIF(trim(p_payload->>'phone'), ''),
    NULLIF(trim(p_payload->>'email'), ''),
    NULLIF(trim(p_payload->>'website'), ''),
    NULLIF(trim(p_payload->>'facebook'), ''),
    NULLIF(trim(p_payload->>'instagram'), ''),
    COALESCE(p_payload->>'source', 'OTHER'),
    NULLIF(p_payload->>'owner_id', '')::uuid,
    NULLIF(trim(p_payload->>'notes'), ''),
    NULLIF(p_payload->>'created_by', '')::uuid,
    NULLIF(p_payload->>'updated_by', '')::uuid
  )
  RETURNING * INTO v_row;

  RETURN to_jsonb(v_row);
END;
$$;

COMMENT ON FUNCTION public.sp_bo_create_organization IS
  'BackOffice: alta en sales.organizations. Payload snake_case.';

-- ---------------------------------------------------------------------------
-- Update (patch parcial)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_bo_update_organization(
  p_id uuid,
  p_payload jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sales, public
AS $$
DECLARE
  v_row sales.organizations%ROWTYPE;
BEGIN
  UPDATE sales.organizations o
  SET
    name = COALESCE(NULLIF(trim(p_payload->>'name'), ''), o.name),
    type = COALESCE(NULLIF(p_payload->>'type', ''), o.type),
    denomination = CASE
      WHEN p_payload ? 'denomination' THEN NULLIF(trim(p_payload->>'denomination'), '')
      ELSE o.denomination
    END,
    status = COALESCE(NULLIF(p_payload->>'status', ''), o.status),
    country = COALESCE(NULLIF(p_payload->>'country', ''), o.country),
    province = CASE
      WHEN p_payload ? 'province' THEN NULLIF(trim(p_payload->>'province'), '')
      ELSE o.province
    END,
    city = COALESCE(NULLIF(trim(p_payload->>'city'), ''), o.city),
    address_line = CASE
      WHEN p_payload ? 'address_line' THEN NULLIF(trim(p_payload->>'address_line'), '')
      ELSE o.address_line
    END,
    phone = CASE
      WHEN p_payload ? 'phone' THEN NULLIF(trim(p_payload->>'phone'), '')
      ELSE o.phone
    END,
    email = CASE
      WHEN p_payload ? 'email' THEN NULLIF(trim(p_payload->>'email'), '')
      ELSE o.email
    END,
    website = CASE
      WHEN p_payload ? 'website' THEN NULLIF(trim(p_payload->>'website'), '')
      ELSE o.website
    END,
    facebook = CASE
      WHEN p_payload ? 'facebook' THEN NULLIF(trim(p_payload->>'facebook'), '')
      ELSE o.facebook
    END,
    instagram = CASE
      WHEN p_payload ? 'instagram' THEN NULLIF(trim(p_payload->>'instagram'), '')
      ELSE o.instagram
    END,
    source = COALESCE(NULLIF(p_payload->>'source', ''), o.source),
    owner_id = CASE
      WHEN p_payload ? 'owner_id' THEN NULLIF(p_payload->>'owner_id', '')::uuid
      ELSE o.owner_id
    END,
    notes = CASE
      WHEN p_payload ? 'notes' THEN NULLIF(trim(p_payload->>'notes'), '')
      ELSE o.notes
    END,
    archived_at = CASE
      WHEN p_payload ? 'archived_at' THEN NULLIF(p_payload->>'archived_at', '')::timestamptz
      ELSE o.archived_at
    END,
    deleted_at = CASE
      WHEN p_payload ? 'deleted_at' THEN NULLIF(p_payload->>'deleted_at', '')::timestamptz
      ELSE o.deleted_at
    END,
    updated_by = COALESCE(NULLIF(p_payload->>'updated_by', '')::uuid, o.updated_by)
  WHERE o.id = p_id
    AND o.deleted_at IS NULL
  RETURNING * INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Organización no encontrada.' USING ERRCODE = 'P0002';
  END IF;

  RETURN to_jsonb(v_row);
END;
$$;

COMMENT ON FUNCTION public.sp_bo_update_organization IS
  'BackOffice: actualización parcial de sales.organizations.';

-- ---------------------------------------------------------------------------
-- Exists (dedupe)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_bo_organization_exists(
  p_name text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_id uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = sales, public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM sales.organizations o
    WHERE o.deleted_at IS NULL
      AND (p_id IS NULL OR o.id = p_id)
      AND (p_name IS NULL OR o.name = p_name)
      AND (p_city IS NULL OR o.city = p_city)
      AND (p_email IS NULL OR o.email = p_email)
  );
$$;

-- ---------------------------------------------------------------------------
-- Grants (solo service_role — server actions BackOffice)
-- ---------------------------------------------------------------------------

REVOKE ALL ON FUNCTION public.sp_bo_list_organizations FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sp_bo_get_organization FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sp_bo_create_organization FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sp_bo_update_organization FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sp_bo_organization_exists FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.sp_bo_list_organizations TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_bo_get_organization TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_bo_create_organization TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_bo_update_organization TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_bo_organization_exists TO service_role;
