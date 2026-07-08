-- Fase 3 — Organization portal (concilio): tablas, permisos org, RPCs read-only + envío reportes.

-- ---------------------------------------------------------------------------
-- OE-1: organization, org_unit, org_membership, church FKs
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.organization (
  id serial PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  primary_color char(7) NOT NULL DEFAULT '#1E0A4C'
    CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  secondary_color char(7) NOT NULL DEFAULT '#4C1D95'
    CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color char(7) NOT NULL DEFAULT '#5B21B6'
    CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  report_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.org_unit (
  id serial PRIMARY KEY,
  organization_id integer NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  parent_unit_id integer REFERENCES public.org_unit(id) ON DELETE SET NULL,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, code)
);

CREATE INDEX IF NOT EXISTS idx_org_unit_organization_id
  ON public.org_unit (organization_id);

CREATE TABLE IF NOT EXISTS public.org_membership (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id integer NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_unit_id integer REFERENCES public.org_unit(id) ON DELETE SET NULL,
  app_role_key text NOT NULL DEFAULT 'org_viewer',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, auth_user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_membership_auth_user
  ON public.org_membership (auth_user_id)
  WHERE is_active = true;

ALTER TABLE public.church
  ADD COLUMN IF NOT EXISTS organization_id integer REFERENCES public.organization(id),
  ADD COLUMN IF NOT EXISTS org_unit_id integer REFERENCES public.org_unit(id);

CREATE INDEX IF NOT EXISTS idx_church_organization_id
  ON public.church (organization_id)
  WHERE organization_id IS NOT NULL;

-- Bandeja de reportes enviados por iglesias al concilio
CREATE TABLE IF NOT EXISTS public.org_submitted_report (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id integer NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  period_year integer NOT NULL CHECK (period_year BETWEEN 2000 AND 2100),
  period_month integer NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  report_kind text NOT NULL DEFAULT 'concilio_f001',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz NOT NULL DEFAULT now(),
  submitted_by_profile_id uuid REFERENCES public.profiles(id),
  UNIQUE (organization_id, church_id, period_year, period_month, report_kind)
);

CREATE INDEX IF NOT EXISTS idx_org_submitted_report_org_period
  ON public.org_submitted_report (organization_id, period_year DESC, period_month DESC);

-- ---------------------------------------------------------------------------
-- OE-2: permisos org (sin write iglesia)
-- ---------------------------------------------------------------------------

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('org:churches:read', 'org', 'read', 'Listar iglesias afiliadas al concilio'),
  ('org:reports:read', 'org', 'read', 'Ver reportes recibidos del concilio'),
  ('org:reports:aggregate', 'org', 'read', 'Dashboard consolidado del concilio'),
  ('org:churches:provision', 'org', 'write', 'Alta de iglesias bajo organización')
ON CONFLICT (permission_key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.org_role_permissions (
  app_role_key text NOT NULL,
  permission_key text NOT NULL REFERENCES public.app_permissions(permission_key) ON DELETE CASCADE,
  PRIMARY KEY (app_role_key, permission_key)
);

INSERT INTO public.org_role_permissions (app_role_key, permission_key) VALUES
  ('council_admin', 'org:churches:read'),
  ('council_admin', 'org:reports:read'),
  ('council_admin', 'org:reports:aggregate'),
  ('council_admin', 'org:churches:provision'),
  ('district_auditor', 'org:churches:read'),
  ('district_auditor', 'org:reports:read'),
  ('district_auditor', 'org:reports:aggregate'),
  ('org_viewer', 'org:churches:read'),
  ('org_viewer', 'org:reports:read')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helpers org
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_org_user_membership(p_auth_user_id uuid DEFAULT auth.uid())
RETURNS TABLE (
  membership_id uuid,
  organization_id integer,
  org_unit_id integer,
  app_role_key text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT om.id, om.organization_id, om.org_unit_id, om.app_role_key
  FROM public.org_membership om
  WHERE om.auth_user_id = COALESCE(p_auth_user_id, auth.uid())
    AND om.is_active = true
  ORDER BY om.created_at ASC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_org_user_permissions(
  p_organization_id integer,
  p_app_role_key text
)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(array_agg(orp.permission_key ORDER BY orp.permission_key), ARRAY[]::text[])
  FROM public.org_role_permissions orp
  WHERE orp.app_role_key = p_app_role_key;
$$;

CREATE OR REPLACE FUNCTION public.fn_org_user_has_permission(
  p_organization_id integer,
  p_permission_key text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_role text;
BEGIN
  IF auth.uid() IS NULL OR p_permission_key IS NULL THEN
    RETURN false;
  END IF;

  SELECT om.app_role_key
  INTO v_role
  FROM public.org_membership om
  WHERE om.auth_user_id = auth.uid()
    AND om.organization_id = p_organization_id
    AND om.is_active = true
  LIMIT 1;

  IF v_role IS NULL THEN
    RETURN false;
  END IF;

  RETURN p_permission_key = ANY(public.fn_org_user_permissions(p_organization_id, v_role));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_org_permission(
  p_organization_id integer,
  p_permission_key text
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.fn_org_user_has_permission(p_organization_id, p_permission_key) THEN
    RAISE EXCEPTION 'Acceso denegado: permiso % requerido.', p_permission_key;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_org_church_scope(
  p_organization_id integer,
  p_church_id integer
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.church ch
    WHERE ch.id = p_church_id
      AND ch.organization_id = p_organization_id
  ) THEN
    RAISE EXCEPTION 'La iglesia no pertenece a esta organización.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_organization_branding_row(p_organization_id integer)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT row_to_json(r)
  FROM (
    SELECT
      o.id,
      o.name,
      o.slug,
      o.logo_url,
      o.primary_color,
      o.secondary_color,
      o.accent_color,
      o.report_rules
    FROM public.organization o
    WHERE o.id = p_organization_id
  ) r;
$$;

-- ---------------------------------------------------------------------------
-- OE-3: RPCs org session + directorio + dashboard + reportes
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_org_session_context()
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_membership record;
  v_permissions json;
  v_full_name text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT om.id, om.organization_id, om.org_unit_id, om.app_role_key
  INTO v_membership
  FROM public.org_membership om
  WHERE om.auth_user_id = v_uid
    AND om.is_active = true
  ORDER BY om.created_at ASC
  LIMIT 1;

  IF v_membership IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(au.email, ''), NULLIF(TRIM(CONCAT(
    COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')
  )), '')
  INTO v_email, v_full_name
  FROM public.auth_users au
  LEFT JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = v_uid;

  SELECT COALESCE(json_agg(k ORDER BY k), '[]'::json)
  INTO v_permissions
  FROM unnest(
    public.fn_org_user_permissions(v_membership.organization_id, v_membership.app_role_key)
  ) AS k;

  RETURN json_build_object(
    'auth_user_id', v_uid,
    'email', v_email,
    'full_name', v_full_name,
    'organization_id', v_membership.organization_id,
    'organization_name', (SELECT o.name FROM public.organization o WHERE o.id = v_membership.organization_id),
    'org_unit_id', v_membership.org_unit_id,
    'org_role_key', v_membership.app_role_key,
    'permissions', v_permissions,
    'org_branding', public.fn_organization_branding_row(v_membership.organization_id)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_org_churches(
  p_org_id integer,
  p_unit_id integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_items json;
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:churches:read');

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.name), '[]'::json)
  INTO v_items
  FROM (
    SELECT
      ch.id,
      ch.name,
      ch.short_name,
      ch.city,
      ch.slug,
      ch.external_code,
      ch.presbytery_name,
      ch.church_kind,
      ch.org_unit_id,
      ou.name AS org_unit_name
    FROM public.church ch
    LEFT JOIN public.org_unit ou ON ou.id = ch.org_unit_id
    WHERE ch.organization_id = p_org_id
      AND (p_unit_id IS NULL OR ch.org_unit_id = p_unit_id)
  ) r;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'items', v_items
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_org_dashboard(p_org_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_church_count integer;
  v_report_count integer;
  v_recent json;
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:reports:aggregate');

  SELECT COUNT(*)::integer
  INTO v_church_count
  FROM public.church ch
  WHERE ch.organization_id = p_org_id;

  SELECT COUNT(*)::integer
  INTO v_report_count
  FROM public.org_submitted_report osr
  WHERE osr.organization_id = p_org_id;

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.submitted_at DESC), '[]'::json)
  INTO v_recent
  FROM (
    SELECT
      osr.id,
      osr.church_id,
      ch.name AS church_name,
      osr.period_year,
      osr.period_month,
      osr.report_kind,
      osr.submitted_at
    FROM public.org_submitted_report osr
    INNER JOIN public.church ch ON ch.id = osr.church_id
    WHERE osr.organization_id = p_org_id
    ORDER BY osr.submitted_at DESC
    LIMIT 10
  ) r;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'totals', json_build_object(
      'church_count', v_church_count,
      'report_count', v_report_count
    ),
    'recent_reports', v_recent
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_submit_concilio_report(
  p_church_id integer,
  p_period_year integer,
  p_period_month integer,
  p_payload jsonb,
  p_report_kind text DEFAULT 'concilio_f001'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_org_id integer;
  v_profile_id uuid;
  v_row_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('reports:financial_monthly_concilio_f001:export');

  SELECT ch.organization_id
  INTO v_org_id
  FROM public.church ch
  WHERE ch.id = p_church_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'La iglesia no está afiliada a un concilio.';
  END IF;

  SELECT au.profile_id INTO v_profile_id
  FROM public.auth_users au
  WHERE au.id = auth.uid();

  INSERT INTO public.org_submitted_report (
    organization_id,
    church_id,
    period_year,
    period_month,
    report_kind,
    payload,
    submitted_by_profile_id
  )
  VALUES (
    v_org_id,
    p_church_id,
    p_period_year,
    p_period_month,
    COALESCE(NULLIF(trim(p_report_kind), ''), 'concilio_f001'),
    COALESCE(p_payload, '{}'::jsonb),
    v_profile_id
  )
  ON CONFLICT (organization_id, church_id, period_year, period_month, report_kind)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    submitted_at = now(),
    submitted_by_profile_id = EXCLUDED.submitted_by_profile_id
  RETURNING id INTO v_row_id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'report_id', v_row_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_org_submitted_reports(
  p_org_id integer,
  p_period_year integer DEFAULT NULL,
  p_period_month integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_items json;
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:reports:read');

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.submitted_at DESC), '[]'::json)
  INTO v_items
  FROM (
    SELECT
      osr.id,
      osr.church_id,
      ch.name AS church_name,
      ch.external_code,
      osr.period_year,
      osr.period_month,
      osr.report_kind,
      osr.submitted_at,
      osr.payload
    FROM public.org_submitted_report osr
    INNER JOIN public.church ch ON ch.id = osr.church_id
    WHERE osr.organization_id = p_org_id
      AND (p_period_year IS NULL OR osr.period_year = p_period_year)
      AND (p_period_month IS NULL OR osr.period_month = p_period_month)
    ORDER BY osr.submitted_at DESC
  ) r;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'items', v_items
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_org_user_membership(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_org_user_permissions(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_org_user_has_permission(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_org_permission(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_org_church_scope(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_organization_branding_row(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_org_session_context() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_org_churches(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_org_dashboard(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_submit_concilio_report(integer, integer, integer, jsonb, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_org_submitted_reports(integer, integer, integer) TO authenticated, service_role;

GRANT SELECT ON public.organization TO authenticated, service_role;
GRANT SELECT ON public.org_unit TO authenticated, service_role;
GRANT SELECT ON public.org_membership TO authenticated, service_role;
GRANT SELECT ON public.org_role_permissions TO authenticated, service_role;
GRANT SELECT ON public.org_submitted_report TO authenticated, service_role;
