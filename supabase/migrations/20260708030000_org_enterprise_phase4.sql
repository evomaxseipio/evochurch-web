-- Fase 4 — Enterprise: facturación por iglesia, API externa concilio, morosos F.001.

-- ---------------------------------------------------------------------------
-- Billing plan per church (org-managed)
-- ---------------------------------------------------------------------------

ALTER TABLE public.church
  ADD COLUMN IF NOT EXISTS billing_plan text NOT NULL DEFAULT 'standard'
    CHECK (billing_plan IN ('trial', 'standard', 'enterprise')),
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'active'
    CHECK (billing_status IN ('active', 'past_due', 'suspended'));

-- ---------------------------------------------------------------------------
-- External API keys (concilio integrations)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.org_api_key (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id integer NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'Default',
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['read']::text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_org_api_key_organization
  ON public.org_api_key (organization_id)
  WHERE revoked_at IS NULL;

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('org:billing:read', 'org', 'read', 'Ver plan y estado de facturación de iglesias'),
  ('org:billing:write', 'org', 'write', 'Actualizar plan y estado de facturación'),
  ('org:api:manage', 'org', 'write', 'Gestionar claves API del concilio')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.org_role_permissions (app_role_key, permission_key) VALUES
  ('council_admin', 'org:billing:read'),
  ('council_admin', 'org:billing:write'),
  ('council_admin', 'org:api:manage'),
  ('district_auditor', 'org:billing:read')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Helpers: F.001 overdue period
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_org_f001_overdue_period(
  p_due_day integer DEFAULT 10
)
RETURNS TABLE (period_year integer, period_month integer)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_due_day integer := GREATEST(1, LEAST(COALESCE(p_due_day, 10), 28));
  v_today date := CURRENT_DATE;
  v_ref date;
BEGIN
  IF EXTRACT(day FROM v_today)::integer > v_due_day THEN
    v_ref := (date_trunc('month', v_today) - interval '1 month')::date;
  ELSE
    v_ref := (date_trunc('month', v_today) - interval '2 months')::date;
  END IF;

  period_year := EXTRACT(year FROM v_ref)::integer;
  period_month := EXTRACT(month FROM v_ref)::integer;
  RETURN NEXT;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_org_f001_due_day(p_org_id integer)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT GREATEST(
    1,
    LEAST(
      COALESCE(
        NULLIF(trim(o.report_rules #>> '{f001,due_day}'), '')::integer,
        10
      ),
      28
    )
  )
  FROM public.organization o
  WHERE o.id = p_org_id;
$$;

-- ---------------------------------------------------------------------------
-- RPC: update church billing (org admin)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_update_church_billing(
  p_org_id integer,
  p_church_id integer,
  p_payload jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_plan text := NULLIF(trim(COALESCE(p_payload->>'billing_plan', '')), '');
  v_status text := NULLIF(trim(COALESCE(p_payload->>'billing_status', '')), '');
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:billing:write');

  IF NOT EXISTS (
    SELECT 1 FROM public.church ch
    WHERE ch.id = p_church_id AND ch.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Iglesia no pertenece a esta organización.';
  END IF;

  IF v_plan IS NOT NULL AND v_plan NOT IN ('trial', 'standard', 'enterprise') THEN
    RAISE EXCEPTION 'Plan de facturación inválido.';
  END IF;

  IF v_status IS NOT NULL AND v_status NOT IN ('active', 'past_due', 'suspended') THEN
    RAISE EXCEPTION 'Estado de facturación inválido.';
  END IF;

  UPDATE public.church ch
  SET
    billing_plan = COALESCE(v_plan, ch.billing_plan),
    billing_status = COALESCE(v_status, ch.billing_status)
  WHERE ch.id = p_church_id;

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: API key management
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_create_org_api_key(
  p_org_id integer,
  p_label text,
  p_key_prefix text,
  p_key_hash text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
  v_label text := COALESCE(NULLIF(trim(p_label), ''), 'Default');
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:api:manage');

  IF p_key_hash IS NULL OR length(trim(p_key_hash)) < 32 THEN
    RAISE EXCEPTION 'Hash de clave inválido.';
  END IF;

  INSERT INTO public.org_api_key (
    organization_id,
    label,
    key_prefix,
    key_hash
  )
  VALUES (p_org_id, v_label, COALESCE(NULLIF(trim(p_key_prefix), ''), 'evo_org'), p_key_hash)
  RETURNING id INTO v_id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'key_id', v_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_org_api_keys(p_org_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_items json;
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:api:manage');

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::json)
  INTO v_items
  FROM (
    SELECT
      k.id,
      k.label,
      k.key_prefix,
      k.created_at,
      k.revoked_at,
      k.last_used_at
    FROM public.org_api_key k
    WHERE k.organization_id = p_org_id
  ) r;

  RETURN json_build_object('success', true, 'status_code', 200, 'items', v_items);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_revoke_org_api_key(
  p_org_id integer,
  p_key_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:api:manage');

  UPDATE public.org_api_key k
  SET revoked_at = now()
  WHERE k.id = p_key_id
    AND k.organization_id = p_org_id
    AND k.revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Clave API no encontrada o ya revocada.';
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_resolve_org_api_key(p_key_hash text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row public.org_api_key%ROWTYPE;
BEGIN
  IF p_key_hash IS NULL OR length(trim(p_key_hash)) < 32 THEN
    RETURN json_build_object('success', false, 'status_code', 401, 'message', 'Clave inválida.');
  END IF;

  SELECT * INTO v_row
  FROM public.org_api_key k
  WHERE k.key_hash = trim(p_key_hash)
    AND k.revoked_at IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'status_code', 401, 'message', 'Clave no autorizada.');
  END IF;

  UPDATE public.org_api_key
  SET last_used_at = now()
  WHERE id = v_row.id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'organization_id', v_row.organization_id,
    'scopes', v_row.scopes
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- RPC: external API data (service role + resolved org)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_org_api_list_churches(p_org_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_items json;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.organization o WHERE o.id = p_org_id) THEN
    RAISE EXCEPTION 'Organización no encontrada.';
  END IF;

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
      ou.name AS org_unit_name,
      ch.billing_plan,
      ch.billing_status
    FROM public.church ch
    LEFT JOIN public.org_unit ou ON ou.id = ch.org_unit_id
    WHERE ch.organization_id = p_org_id
  ) r;

  RETURN json_build_object('success', true, 'status_code', 200, 'items', v_items);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_org_api_list_reports(
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
  IF NOT EXISTS (SELECT 1 FROM public.organization o WHERE o.id = p_org_id) THEN
    RAISE EXCEPTION 'Organización no encontrada.';
  END IF;

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

  RETURN json_build_object('success', true, 'status_code', 200, 'items', v_items);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

-- ---------------------------------------------------------------------------
-- Extend list churches + dashboard (overdue F.001)
-- ---------------------------------------------------------------------------

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
      ou.name AS org_unit_name,
      ch.billing_plan,
      ch.billing_status
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
  v_overdue json;
  v_due_day integer;
  v_period_year integer;
  v_period_month integer;
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

  v_due_day := public.fn_org_f001_due_day(p_org_id);
  SELECT p.period_year, p.period_month
  INTO v_period_year, v_period_month
  FROM public.fn_org_f001_overdue_period(v_due_day) p;

  SELECT COALESCE(json_agg(row_to_json(o) ORDER BY o.church_name), '[]'::json)
  INTO v_overdue
  FROM (
    SELECT
      ch.id AS church_id,
      ch.name AS church_name,
      ch.external_code,
      ch.billing_status,
      v_period_year AS period_year,
      v_period_month AS period_month,
      v_due_day AS due_day
    FROM public.church ch
    WHERE ch.organization_id = p_org_id
      AND ch.billing_status <> 'suspended'
      AND NOT EXISTS (
        SELECT 1
        FROM public.org_submitted_report osr
        WHERE osr.organization_id = p_org_id
          AND osr.church_id = ch.id
          AND osr.period_year = v_period_year
          AND osr.period_month = v_period_month
          AND osr.report_kind = 'concilio_f001'
      )
  ) o;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'totals', json_build_object(
      'church_count', v_church_count,
      'report_count', v_report_count,
      'overdue_count', COALESCE(json_array_length(v_overdue), 0)
    ),
    'recent_reports', v_recent,
    'overdue_churches', v_overdue,
    'overdue_period', json_build_object(
      'year', v_period_year,
      'month', v_period_month,
      'due_day', v_due_day
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_update_church_billing(integer, integer, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_create_org_api_key(integer, text, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_org_api_keys(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_revoke_org_api_key(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_resolve_org_api_key(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_org_api_list_churches(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_org_api_list_reports(integer, integer, integer) TO service_role;
