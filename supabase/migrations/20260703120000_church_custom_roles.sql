-- Roles personalizados por iglesia (app_users_role.church_id) + RPC de creación.

ALTER TABLE public.app_users_role
  ADD COLUMN IF NOT EXISTS church_id integer REFERENCES public.church(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_app_users_role_church
  ON public.app_users_role (church_id)
  WHERE church_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sp_list_church_roles_with_permissions(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  RETURN COALESCE(
    (
      SELECT json_agg(
        json_build_object(
          'app_role_id', aur.app_users_role_id,
          'app_role_name', aur.app_users_role_name,
          'description', aur.app_users_role_description,
          'is_custom', aur.church_id IS NOT NULL,
          'permissions', (
            SELECT COALESCE(json_agg(k ORDER BY k), '[]'::json)
            FROM unnest(public.fn_user_permissions_for(p_church_id, aur.app_users_role_id)) AS k
          )
        )
        ORDER BY aur.church_id NULLS FIRST, aur.app_users_role_id
      )
      FROM public.app_users_role aur
      WHERE COALESCE(aur.app_users_role_status, 'active') = 'active'
        AND (aur.church_id IS NULL OR aur.church_id = p_church_id)
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_create_church_role(
  p_church_id integer,
  p_name text,
  p_description text DEFAULT NULL,
  p_permission_keys text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_name text;
  v_new_id integer;
  v_keys text[];
  k text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  v_name := NULLIF(TRIM(COALESCE(p_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El nombre del rol es obligatorio.';
  END IF;

  IF char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'El nombre no puede superar 120 caracteres.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.church_id = p_church_id
      AND lower(aur.app_users_role_name) = lower(v_name)
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Ya existe un rol con ese nombre en esta iglesia.';
  END IF;

  SELECT COALESCE(MAX(aur.app_users_role_id), 0) + 1
  INTO v_new_id
  FROM public.app_users_role aur;

  INSERT INTO public.app_users_role (
    app_users_role_id,
    app_users_role_name,
    app_users_role_description,
    app_users_role_status,
    is_primary,
    church_id,
    created_at,
    updated_at
  )
  VALUES (
    v_new_id,
    v_name,
    NULLIF(TRIM(COALESCE(p_description, '')), ''),
    'active',
    false,
    p_church_id,
    now(),
    now()
  );

  v_keys := COALESCE(
    p_permission_keys,
    ARRAY['profile:read', 'settings:read']::text[]
  );

  FOREACH k IN ARRAY v_keys LOOP
    IF EXISTS (
      SELECT 1
      FROM public.app_permissions ap
      WHERE ap.permission_key = k
    ) THEN
      INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
      VALUES (p_church_id, v_new_id, k)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'app_role_id', v_new_id,
    'app_role_name', v_name,
    'description', NULLIF(TRIM(COALESCE(p_description, '')), '')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_create_church_role(integer, text, text, text[]) TO authenticated, service_role;
