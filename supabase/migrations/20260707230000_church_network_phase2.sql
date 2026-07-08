-- Fase 2 — Red sede/sucursales: jerarquía, permisos, RPCs read-only.

-- ---------------------------------------------------------------------------
-- CN-1: schema church hierarchy
-- ---------------------------------------------------------------------------

ALTER TABLE public.church
  ADD COLUMN IF NOT EXISTS parent_church_id integer REFERENCES public.church(id),
  ADD COLUMN IF NOT EXISTS church_kind text NOT NULL DEFAULT 'standalone';

ALTER TABLE public.church
  DROP CONSTRAINT IF EXISTS church_church_kind_check;

ALTER TABLE public.church
  ADD CONSTRAINT church_church_kind_check
  CHECK (church_kind IN ('standalone', 'headquarters', 'campus'));

ALTER TABLE public.church
  DROP CONSTRAINT IF EXISTS church_parent_kind_check;

ALTER TABLE public.church
  ADD CONSTRAINT church_parent_kind_check
  CHECK (
    (church_kind = 'campus' AND parent_church_id IS NOT NULL)
    OR (church_kind IN ('standalone', 'headquarters') AND parent_church_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_church_parent_church_id
  ON public.church (parent_church_id)
  WHERE parent_church_id IS NOT NULL;

UPDATE public.church
SET church_kind = 'standalone'
WHERE church_kind IS NULL OR church_kind NOT IN ('standalone', 'headquarters', 'campus');

-- ---------------------------------------------------------------------------
-- CN-2: permission
-- ---------------------------------------------------------------------------

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('network:churches:read', 'network', 'read', 'Ver sucursales de la red (sede)')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 1, 'network:churches:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 4, 'network:churches:read'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- CN-3: helpers + RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_assert_network_headquarters(p_church_id integer)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_kind text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('network:churches:read');

  SELECT ch.church_kind
  INTO v_kind
  FROM public.church ch
  WHERE ch.id = p_church_id;

  IF v_kind IS DISTINCT FROM 'headquarters' THEN
    RAISE EXCEPTION 'Solo una iglesia sede puede consultar la red local.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_network_child(
  p_parent_church_id integer,
  p_child_church_id integer
)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_network_headquarters(p_parent_church_id);

  IF p_child_church_id IS NULL THEN
    RAISE EXCEPTION 'Iglesia sucursal requerida.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.church ch
    WHERE ch.id = p_child_church_id
      AND ch.parent_church_id = p_parent_church_id
      AND ch.church_kind = 'campus'
  ) THEN
    RAISE EXCEPTION 'La sucursal no pertenece a esta sede.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_network_church_kpis(p_church_id integer)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT json_build_object(
    'church_id', p_church_id,
    'member_count', (
      SELECT COUNT(*)::integer
      FROM public.profiles p
      WHERE p.church_id = p_church_id
        AND p.is_active = true
    ),
    'fund_balance', COALESCE((
      SELECT SUM(f.total_contributions)
      FROM public.funds f
      WHERE f.church_id = p_church_id
        AND f.is_active = true
    ), 0),
    'month_income', COALESCE((
      SELECT SUM(ie.amount)
      FROM public.income_entries ie
      INNER JOIN public.income_type_catalog itc ON itc.id = ie.income_type_id
      WHERE ie.church_id = p_church_id
        AND ie.payment_date >= date_trunc('month', CURRENT_DATE)::date
        AND COALESCE(itc.is_operational, false) = false
    ), 0)
  );
$$;

CREATE OR REPLACE FUNCTION public.sp_list_network_churches(p_parent_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_items json;
BEGIN
  PERFORM public.fn_assert_network_headquarters(p_parent_church_id);

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.name), '[]'::json)
  INTO v_items
  FROM (
    SELECT
      ch.id,
      ch.name,
      ch.short_name,
      ch.slug,
      ch.city,
      ch.church_kind,
      ch.parent_church_id,
      public.fn_network_church_kpis(ch.id) AS kpis
    FROM public.church ch
    WHERE ch.parent_church_id = p_parent_church_id
      AND ch.church_kind = 'campus'
    ORDER BY ch.name
  ) r;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'items', v_items
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'items', '[]'::json
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_network_church_summary(
  p_parent_church_id integer,
  p_child_church_id integer
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile json;
  v_kpis json;
BEGIN
  PERFORM public.fn_assert_network_child(p_parent_church_id, p_child_church_id);

  SELECT public.fn_church_profile_row(p_child_church_id) INTO v_profile;
  SELECT public.fn_network_church_kpis(p_child_church_id) INTO v_kpis;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'profile', v_profile,
    'kpis', v_kpis
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_network_dashboard(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_campuses json;
  v_totals json;
BEGIN
  PERFORM public.fn_assert_network_headquarters(p_church_id);

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.name), '[]'::json)
  INTO v_campuses
  FROM (
    SELECT
      ch.id,
      ch.name,
      ch.short_name,
      ch.slug,
      ch.city,
      public.fn_network_church_kpis(ch.id) AS kpis
    FROM public.church ch
    WHERE ch.parent_church_id = p_church_id
      AND ch.church_kind = 'campus'
    ORDER BY ch.name
  ) r;

  SELECT json_build_object(
    'campus_count', COALESCE(json_array_length(v_campuses), 0),
    'total_members', COALESCE((
      SELECT SUM((k->>'member_count')::integer)
      FROM json_array_elements(v_campuses) elem,
           LATERAL (SELECT elem->'kpis' AS k) s
    ), 0),
    'total_fund_balance', COALESCE((
      SELECT SUM((k->>'fund_balance')::numeric)
      FROM json_array_elements(v_campuses) elem,
           LATERAL (SELECT elem->'kpis' AS k) s
    ), 0),
    'total_month_income', COALESCE((
      SELECT SUM((k->>'month_income')::numeric)
      FROM json_array_elements(v_campuses) elem,
           LATERAL (SELECT elem->'kpis' AS k) s
    ), 0)
  )
  INTO v_totals;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'headquarters_id', p_church_id,
    'totals', v_totals,
    'campuses', v_campuses,
    'headquarters_kpis', public.fn_network_church_kpis(p_church_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assert_network_headquarters(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_network_child(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_network_church_kpis(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_network_churches(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_network_church_summary(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_network_dashboard(integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Extend sp_get_session_context with church_kind + parent_church_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_session_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result json;
  v_church_id integer;
  v_app_role_id integer;
  v_permissions json;
  v_branding json;
  v_network json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'auth_user_id', au.id,
    'profile_id', au.profile_id,
    'email', COALESCE(au.email, ''),
    'church_id', p.church_id,
    'full_name', NULLIF(
      TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
      ''
    ),
    'church_name', ch.name,
    'church_kind', ch.church_kind,
    'parent_church_id', ch.parent_church_id,
    'app_role_id', au.app_role_id,
    'app_role_name', aur.app_users_role_name,
    'membership_role_id', m.member_role_id,
    'membership_role', m.role_name,
    'can_authorize_finances', public.fn_user_has_permission('finances:transactions:authorize'),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false),
    'is_temp_password', COALESCE(au.is_temp_password, false),
    'preferred_locale', COALESCE(au.preferred_locale, 'es')
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.member_role_id, mr.role_name
    FROM public.membership m2
    INNER JOIN public.member_roles mr ON mr.id = m2.member_role_id
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE au.id = v_uid
    AND COALESCE(au.is_active, true) = true
    AND p.church_id IS NOT NULL;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  v_church_id := (v_result->>'church_id')::integer;
  v_app_role_id := NULLIF(v_result->>'app_role_id', '')::integer;

  SELECT COALESCE(
    to_json(
      public.fn_user_permissions_for(v_church_id, v_app_role_id)
    ),
    '[]'::json
  )
  INTO v_permissions;

  SELECT json_build_object(
    'short_name', ch.short_name,
    'logo_url', ch.logo_url,
    'primary_color', ch.primary_color,
    'secondary_color', ch.secondary_color,
    'accent_color', ch.accent_color
  )
  INTO v_branding
  FROM public.church ch
  WHERE ch.id = v_church_id;

  SELECT json_build_object(
    'church_kind', ch.church_kind,
    'parent_church_id', ch.parent_church_id,
    'campus_count', (
      SELECT COUNT(*)::integer
      FROM public.church c2
      WHERE c2.parent_church_id = v_church_id
        AND c2.church_kind = 'campus'
    )
  )
  INTO v_network
  FROM public.church ch
  WHERE ch.id = v_church_id;

  RETURN (
    v_result::jsonb
    || jsonb_build_object('permissions', v_permissions)
    || jsonb_build_object('church_branding', COALESCE(v_branding, '{}'::json))
    || jsonb_build_object('church_network', COALESCE(v_network, '{}'::json))
  )::json;
END;
$$;

NOTIFY pgrst, 'reload schema';
