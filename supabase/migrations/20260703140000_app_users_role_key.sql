-- Claves estables (role_key) en app_users_role para roles del sistema y personalizados.

ALTER TABLE public.app_users_role
  ADD COLUMN IF NOT EXISTS role_key text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_role_key_unique
  ON public.app_users_role (role_key)
  WHERE role_key IS NOT NULL;

UPDATE public.app_users_role SET role_key = 'admin' WHERE app_users_role_id = 1 AND role_key IS NULL;
UPDATE public.app_users_role SET role_key = 'secretary' WHERE app_users_role_id = 2 AND role_key IS NULL;
UPDATE public.app_users_role SET role_key = 'treasurer' WHERE app_users_role_id = 3 AND role_key IS NULL;
UPDATE public.app_users_role SET role_key = 'pastor' WHERE app_users_role_id = 4 AND role_key IS NULL;
UPDATE public.app_users_role SET role_key = 'leader' WHERE app_users_role_id = 10 AND role_key IS NULL;

CREATE OR REPLACE FUNCTION public.fn_slugify_role_key(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  v := lower(trim(COALESCE(p_name, '')));
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := trim(both '-' from v);
  IF v = '' THEN
    RETURN 'rol';
  END IF;
  RETURN v;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_build_custom_role_key(
  p_church_id integer,
  p_name text
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_base text;
  v_key text;
  v_suffix integer := 0;
BEGIN
  v_base := 'custom.' || p_church_id::text || '.' || public.fn_slugify_role_key(p_name);
  v_key := v_base;

  WHILE EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.role_key = v_key
  ) LOOP
    v_suffix := v_suffix + 1;
    v_key := v_base || '-' || v_suffix::text;
  END LOOP;

  RETURN v_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_is_locked_system_role(p_app_role_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.role_key = ANY(ARRAY['admin', 'secretary', 'treasurer', 'pastor']::text[])
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_is_non_deletable_system_role(p_app_role_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.role_key = ANY(ARRAY['admin', 'secretary', 'treasurer', 'pastor', 'leader']::text[])
  );
$$;

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
          'role_key', aur.role_key,
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
  v_role_key text;
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

  v_role_key := public.fn_build_custom_role_key(p_church_id, v_name);

  SELECT COALESCE(MAX(aur.app_users_role_id), 0) + 1
  INTO v_new_id
  FROM public.app_users_role aur;

  INSERT INTO public.app_users_role (
    app_users_role_id,
    role_key,
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
    v_role_key,
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
    'role_key', v_role_key,
    'app_role_name', v_name,
    'description', NULLIF(TRIM(COALESCE(p_description, '')), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_set_church_role_permissions(
  p_church_id integer,
  p_app_role_id integer,
  p_permission_keys text[]
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  k text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  IF public.fn_is_locked_system_role(p_app_role_id) THEN
    RAISE EXCEPTION 'Los roles del sistema no son editables.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
      AND (aur.church_id IS NULL OR aur.church_id = p_church_id)
  ) THEN
    RAISE EXCEPTION 'Rol no válido.';
  END IF;

  DELETE FROM public.church_role_permissions
  WHERE church_id = p_church_id AND app_role_id = p_app_role_id;

  IF p_permission_keys IS NOT NULL THEN
    FOREACH k IN ARRAY p_permission_keys LOOP
      IF EXISTS (SELECT 1 FROM public.app_permissions ap WHERE ap.permission_key = k) THEN
        INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
        VALUES (p_church_id, p_app_role_id, k)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_update_church_role(
  p_church_id integer,
  p_app_role_id integer,
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  IF public.fn_is_locked_system_role(p_app_role_id) THEN
    RAISE EXCEPTION 'Los roles del sistema no son editables.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.church_id = p_church_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo se pueden editar roles personalizados de esta iglesia.';
  END IF;

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
      AND aur.app_users_role_id <> p_app_role_id
      AND lower(aur.app_users_role_name) = lower(v_name)
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Ya existe un rol con ese nombre en esta iglesia.';
  END IF;

  UPDATE public.app_users_role
  SET
    app_users_role_name = v_name,
    app_users_role_description = NULLIF(TRIM(COALESCE(p_description, '')), ''),
    updated_at = now()
  WHERE app_users_role_id = p_app_role_id
    AND church_id = p_church_id;

  RETURN json_build_object(
    'success', true,
    'app_role_id', p_app_role_id,
    'app_role_name', v_name,
    'description', NULLIF(TRIM(COALESCE(p_description, '')), '')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_delete_church_role(
  p_church_id integer,
  p_app_role_id integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_count integer;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  IF public.fn_is_non_deletable_system_role(p_app_role_id) THEN
    RAISE EXCEPTION 'Este rol del sistema no se puede eliminar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.church_id = p_church_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo se pueden eliminar roles personalizados de esta iglesia.';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_user_count
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE p.church_id = p_church_id
    AND au.app_role_id = p_app_role_id
    AND COALESCE(au.is_active, true) = true;

  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'No se puede eliminar: hay % usuario(s) con este rol asignado.', v_user_count;
  END IF;

  DELETE FROM public.church_role_permissions
  WHERE church_id = p_church_id
    AND app_role_id = p_app_role_id;

  UPDATE public.app_users_role
  SET app_users_role_status = 'inactive', updated_at = now()
  WHERE app_users_role_id = p_app_role_id
    AND church_id = p_church_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_app_user_roles()
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    json_agg(
      json_build_object(
        'app_role_id', aur.app_users_role_id,
        'role_key', aur.role_key,
        'app_role_name', aur.app_users_role_name,
        'description', aur.app_users_role_description,
        'is_primary', aur.is_primary
      )
      ORDER BY aur.app_users_role_id
    ),
    '[]'::json
  )
  FROM public.app_users_role aur
  WHERE COALESCE(aur.app_users_role_status, 'active') = 'active';
$$;

UPDATE public.app_users_role aur
SET role_key = public.fn_build_custom_role_key(aur.church_id, aur.app_users_role_name)
WHERE aur.church_id IS NOT NULL
  AND aur.role_key IS NULL;
