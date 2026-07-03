-- role_kind + role_config (jsonb), ID autoincrementable, desactivar roles (sin DELETE).

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role_kind') THEN
    CREATE TYPE public.app_role_kind AS ENUM (
      'system_locked',
      'system_editable',
      'custom'
    );
  END IF;
END $$;

ALTER TABLE public.app_users_role
  ADD COLUMN IF NOT EXISTS role_kind public.app_role_kind,
  ADD COLUMN IF NOT EXISTS role_config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Secuencia para app_users_role_id autoincrementable
CREATE SEQUENCE IF NOT EXISTS public.app_users_role_id_seq;

SELECT setval(
  'public.app_users_role_id_seq',
  GREATEST(
    COALESCE((SELECT MAX(app_users_role_id) FROM public.app_users_role), 0),
    1
  )
);

ALTER SEQUENCE public.app_users_role_id_seq OWNED BY public.app_users_role.app_users_role_id;

ALTER TABLE public.app_users_role
  ALTER COLUMN app_users_role_id
  SET DEFAULT nextval('public.app_users_role_id_seq'::regclass);

-- Backfill role_kind
UPDATE public.app_users_role aur
SET role_kind = 'custom'
WHERE aur.church_id IS NOT NULL
  AND aur.role_kind IS NULL;

UPDATE public.app_users_role aur
SET role_kind = 'system_locked'
WHERE aur.church_id IS NULL
  AND aur.role_key = ANY(ARRAY['admin', 'secretary', 'treasurer', 'pastor']::text[])
  AND aur.role_kind IS NULL;

UPDATE public.app_users_role aur
SET role_kind = 'system_editable'
WHERE aur.church_id IS NULL
  AND aur.role_key = 'leader'
  AND aur.role_kind IS NULL;

UPDATE public.app_users_role aur
SET role_kind = 'system_editable'
WHERE aur.church_id IS NULL
  AND aur.role_kind IS NULL;

-- Backfill role_config (UI metadata — fuente de verdad en BD)
UPDATE public.app_users_role SET role_config = jsonb_build_object(
  'color', '#7C3AED',
  'summary', 'Acceso total a todas las funciones',
  'sortOrder', 1
) WHERE role_key = 'admin' AND role_config = '{}'::jsonb;

UPDATE public.app_users_role SET role_config = jsonb_build_object(
  'color', '#0891B2',
  'summary', 'Miembros, ministerios y configuración básica',
  'sortOrder', 2
) WHERE role_key = 'secretary' AND role_config = '{}'::jsonb;

UPDATE public.app_users_role SET role_config = jsonb_build_object(
  'color', '#059669',
  'summary', 'Gestión financiera',
  'sortOrder', 3
) WHERE role_key = 'treasurer' AND role_config = '{}'::jsonb;

UPDATE public.app_users_role SET role_config = jsonb_build_object(
  'color', '#CA8A04',
  'summary', 'Liderazgo pastoral, miembros y ministerios',
  'sortOrder', 4
) WHERE role_key = 'pastor' AND role_config = '{}'::jsonb;

UPDATE public.app_users_role SET role_config = jsonb_build_object(
  'color', '#EA580C',
  'summary', 'Ministerios asignados (ABAC como líder)',
  'sortOrder', 5
) WHERE role_key = 'leader' AND role_config = '{}'::jsonb;

UPDATE public.app_users_role aur
SET role_config = jsonb_build_object(
  'color', 'var(--primary)',
  'summary', COALESCE(aur.app_users_role_description, 'Rol personalizado de la iglesia'),
  'sortOrder', 100 + aur.app_users_role_id
)
WHERE aur.role_kind = 'custom'
  AND aur.role_config = '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.fn_is_locked_system_role(p_app_role_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.role_kind = 'system_locked'
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_can_deactivate_role(p_app_role_id integer)
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.role_kind = 'custom'
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
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
          'role_kind', aur.role_kind,
          'role_config', COALESCE(aur.role_config, '{}'::jsonb),
          'app_role_name', aur.app_users_role_name,
          'description', aur.app_users_role_description,
          'is_custom', aur.role_kind = 'custom',
          'permissions', (
            SELECT COALESCE(json_agg(k ORDER BY k), '[]'::json)
            FROM unnest(public.fn_user_permissions_for(p_church_id, aur.app_users_role_id)) AS k
          )
        )
        ORDER BY
          COALESCE((aur.role_config->>'sortOrder')::integer, aur.app_users_role_id),
          aur.app_users_role_id
      )
      FROM public.app_users_role aur
      WHERE COALESCE(aur.app_users_role_status, 'active') = 'active'
        AND (aur.church_id IS NULL OR aur.church_id = p_church_id)
    ),
    '[]'::json
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_assignable_roles(p_church_id integer)
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
          'role_kind', aur.role_kind,
          'role_config', COALESCE(aur.role_config, '{}'::jsonb),
          'app_role_name', aur.app_users_role_name,
          'description', aur.app_users_role_description
        )
        ORDER BY
          COALESCE((aur.role_config->>'sortOrder')::integer, aur.app_users_role_id),
          aur.app_users_role_id
      )
      FROM public.app_users_role aur
      WHERE COALESCE(aur.app_users_role_status, 'active') = 'active'
        AND COALESCE((aur.role_config->>'showInUserPicker')::boolean, true) = true
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
  v_summary text;
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
  v_summary := NULLIF(TRIM(COALESCE(p_description, '')), '');

  INSERT INTO public.app_users_role (
    role_key,
    app_users_role_name,
    app_users_role_description,
    app_users_role_status,
    is_primary,
    church_id,
    role_kind,
    role_config,
    created_at,
    updated_at
  )
  VALUES (
    v_role_key,
    v_name,
    v_summary,
    'active',
    false,
    p_church_id,
    'custom',
    jsonb_build_object(
      'color', 'var(--primary)',
      'summary', COALESCE(v_summary, 'Rol personalizado de la iglesia'),
      'sortOrder', 1000,
      'showInUserPicker', true
    ),
    now(),
    now()
  )
  RETURNING app_users_role_id INTO v_new_id;

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
    'role_kind', 'custom',
    'role_config', jsonb_build_object(
      'color', 'var(--primary)',
      'summary', COALESCE(v_summary, 'Rol personalizado de la iglesia'),
      'sortOrder', 1000,
      'showInUserPicker', true
    ),
    'app_role_name', v_name,
    'description', v_summary
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
  v_summary text;
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
      AND aur.role_kind = 'custom'
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

  v_summary := NULLIF(TRIM(COALESCE(p_description, '')), '');

  UPDATE public.app_users_role
  SET
    app_users_role_name = v_name,
    app_users_role_description = v_summary,
    role_config = role_config || jsonb_build_object(
      'summary', COALESCE(v_summary, 'Rol personalizado de la iglesia')
    ),
    updated_at = now()
  WHERE app_users_role_id = p_app_role_id
    AND church_id = p_church_id;

  RETURN json_build_object(
    'success', true,
    'app_role_id', p_app_role_id,
    'app_role_name', v_name,
    'description', v_summary
  );
END;
$$;

-- Desactivar rol (sin DELETE físico; conserva permisos e historial)
CREATE OR REPLACE FUNCTION public.sp_deactivate_church_role(
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

  IF NOT public.fn_can_deactivate_role(p_app_role_id) THEN
    RAISE EXCEPTION 'Este rol no se puede inactivar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Rol no válido para esta iglesia.';
  END IF;

  SELECT COUNT(*)::integer
  INTO v_user_count
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE p.church_id = p_church_id
    AND au.app_role_id = p_app_role_id
    AND COALESCE(au.is_active, true) = true;

  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'No se puede inactivar: hay % usuario(s) con este rol asignado.', v_user_count;
  END IF;

  UPDATE public.app_users_role
  SET
    app_users_role_status = 'inactive',
    updated_at = now()
  WHERE app_users_role_id = p_app_role_id
    AND church_id = p_church_id;

  RETURN json_build_object('success', true);
END;
$$;

DROP FUNCTION IF EXISTS public.sp_delete_church_role(integer, integer);

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
        'role_kind', aur.role_kind,
        'role_config', COALESCE(aur.role_config, '{}'::jsonb),
        'app_role_name', aur.app_users_role_name,
        'description', aur.app_users_role_description,
        'is_primary', aur.is_primary
      )
      ORDER BY
        COALESCE((aur.role_config->>'sortOrder')::integer, aur.app_users_role_id)
    ),
    '[]'::json
  )
  FROM public.app_users_role aur
  WHERE COALESCE(aur.app_users_role_status, 'active') = 'active';
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_assignable_roles(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_deactivate_church_role(integer, integer) TO authenticated, service_role;
