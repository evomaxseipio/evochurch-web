-- RBAC: permission catalog, role matrix (global + per church), session permissions[].

CREATE TABLE IF NOT EXISTS public.app_permissions (
  permission_key text PRIMARY KEY,
  module text NOT NULL,
  action text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public.app_role_permissions (
  app_role_id integer NOT NULL,
  permission_key text NOT NULL REFERENCES public.app_permissions(permission_key) ON DELETE CASCADE,
  PRIMARY KEY (app_role_id, permission_key)
);

CREATE TABLE IF NOT EXISTS public.church_role_permissions (
  church_id integer NOT NULL,
  app_role_id integer NOT NULL,
  permission_key text NOT NULL REFERENCES public.app_permissions(permission_key) ON DELETE CASCADE,
  PRIMARY KEY (church_id, app_role_id, permission_key)
);

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('profile:read', 'profile', 'read', 'Ver perfil propio'),
  ('settings:read', 'settings', 'read', 'Ver configuración propia'),
  ('settings:catalogs', 'settings', 'write', 'Editar catálogos'),
  ('dashboard:read', 'dashboard', 'read', 'Ver dashboard'),
  ('members:read', 'members', 'read', 'Listar miembros'),
  ('members:write', 'members', 'write', 'Crear/editar miembros'),
  ('members:delete', 'members', 'delete', 'Eliminar miembros'),
  ('ministerios:read', 'ministerios', 'read', 'Ver ministerios'),
  ('ministerios:write', 'ministerios', 'write', 'Crear/editar cualquier ministerio'),
  ('ministerios:write_own', 'ministerios', 'write_own', 'Editar ministerios donde es líder'),
  ('finances:read', 'finances', 'read', 'Ver finanzas'),
  ('finances:write', 'finances', 'write', 'Registrar transacciones'),
  ('finances:authorize', 'finances', 'authorize', 'Autorizar egresos/transferencias'),
  ('admin_users:manage', 'admin_users', 'write', 'Gestionar usuarios del sistema'),
  ('roles:manage', 'roles', 'write', 'Editar roles y permisos por iglesia')
ON CONFLICT (permission_key) DO NOTHING;

-- Pastor role (id 4) if missing
INSERT INTO public.app_users_role (
  app_users_role_id,
  app_users_role_name,
  app_users_role_description,
  is_primary,
  app_users_role_status
)
SELECT 4, 'Pastor', 'Admin con menos privilegios; finanzas completas.', false, 'active'
WHERE NOT EXISTS (
  SELECT 1 FROM public.app_users_role WHERE app_users_role_id = 4
);

DELETE FROM public.app_role_permissions;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 1, permission_key FROM public.app_permissions;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 2, k FROM unnest(ARRAY[
  'dashboard:read', 'members:read', 'members:write', 'ministerios:read', 'ministerios:write', 'settings:read'
]::text[]) AS k;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 3, k FROM unnest(ARRAY[
  'dashboard:read', 'finances:read', 'finances:write', 'finances:authorize', 'settings:read'
]::text[]) AS k;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 4, k FROM unnest(ARRAY[
  'dashboard:read', 'settings:read',
  'members:read', 'members:write', 'members:delete',
  'ministerios:read', 'ministerios:write',
  'finances:read', 'finances:write', 'finances:authorize'
]::text[]) AS k;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 10, k FROM unnest(ARRAY[
  'dashboard:read', 'members:read', 'ministerios:read', 'ministerios:write_own'
]::text[]) AS k;

CREATE OR REPLACE FUNCTION public.fn_user_permissions_for(
  p_church_id integer,
  p_app_role_id integer
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_perms text[];
BEGIN
  IF p_app_role_id IS NULL THEN
    RETURN ARRAY['profile:read', 'settings:read']::text[];
  END IF;

  IF p_app_role_id = 1 THEN
    SELECT COALESCE(array_agg(permission_key ORDER BY permission_key), ARRAY[]::text[])
    INTO v_perms
    FROM public.app_permissions;
    RETURN v_perms;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.church_role_permissions crp
    WHERE crp.church_id = p_church_id
      AND crp.app_role_id = p_app_role_id
  ) THEN
    SELECT COALESCE(array_agg(crp.permission_key ORDER BY crp.permission_key), ARRAY[]::text[])
    INTO v_perms
    FROM public.church_role_permissions crp
    WHERE crp.church_id = p_church_id
      AND crp.app_role_id = p_app_role_id;
    RETURN v_perms;
  END IF;

  SELECT COALESCE(array_agg(arp.permission_key ORDER BY arp.permission_key), ARRAY[]::text[])
  INTO v_perms
  FROM public.app_role_permissions arp
  WHERE arp.app_role_id = p_app_role_id;

  RETURN v_perms;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_user_has_permission(p_permission_key text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_church_id integer;
  v_app_role_id integer;
  v_perms text[];
BEGIN
  IF v_uid IS NULL OR p_permission_key IS NULL OR TRIM(p_permission_key) = '' THEN
    RETURN false;
  END IF;

  SELECT p.church_id, au.app_role_id
  INTO v_church_id, v_app_role_id
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = v_uid
    AND COALESCE(au.is_active, true) = true
    AND p.church_id IS NOT NULL;

  IF v_church_id IS NULL THEN
    RETURN false;
  END IF;

  v_perms := public.fn_user_permissions_for(v_church_id, v_app_role_id);
  RETURN p_permission_key = ANY(v_perms);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_permission(p_permission_key text)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.fn_user_has_permission(p_permission_key) THEN
    RAISE EXCEPTION 'Acceso denegado: permiso % requerido.', p_permission_key;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_can_edit_ministry(p_ministry_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile_id uuid;
  v_church_id integer;
BEGIN
  IF p_ministry_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT au.profile_id, p.church_id
  INTO v_profile_id, v_church_id
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = auth.uid()
    AND COALESCE(au.is_active, true) = true;

  IF v_profile_id IS NULL OR v_church_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.fn_user_has_permission('ministerios:write') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.church_ministries cm
      WHERE cm.id = p_ministry_id AND cm.church_id = v_church_id
    );
  END IF;

  IF public.fn_user_has_permission('ministerios:write_own') THEN
    RETURN EXISTS (
      SELECT 1 FROM public.church_ministries cm
      WHERE cm.id = p_ministry_id
        AND cm.church_id = v_church_id
        AND v_profile_id = ANY(COALESCE(cm.leader_profile_ids, ARRAY[]::uuid[]))
    );
  END IF;

  RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_can_manage_admin_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT public.fn_user_has_permission('admin_users:manage');
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_session_app_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_permission('admin_users:manage');
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_can_authorize_finances(
  p_profile_id uuid,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    p_profile_id = public.fn_get_session_profile_id()
    AND p_auth_user_id = auth.uid()
    AND public.fn_get_session_church_id() IS NOT NULL
    AND public.fn_user_has_permission('finances:authorize');
$$;

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
    'app_role_id', au.app_role_id,
    'app_role_name', aur.app_users_role_name,
    'membership_role', m.membership_role,
    'can_authorize_finances', public.fn_user_has_permission('finances:authorize'),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false),
    'is_temp_password', COALESCE(au.is_temp_password, false)
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = au.profile_id AND m2.church_id = p.church_id
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

  SELECT COALESCE(json_agg(k ORDER BY k), '[]'::json)
  INTO v_permissions
  FROM unnest(public.fn_user_permissions_for(v_church_id, v_app_role_id)) AS k;

  RETURN (v_result::jsonb || jsonb_build_object('permissions', v_permissions))::json;
END;
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
          'app_role_name', aur.app_users_role_name,
          'description', aur.app_users_role_description,
          'permissions', (
            SELECT COALESCE(json_agg(k ORDER BY k), '[]'::json)
            FROM unnest(public.fn_user_permissions_for(p_church_id, aur.app_users_role_id)) AS k
          )
        )
        ORDER BY aur.app_users_role_id
      )
      FROM public.app_users_role aur
      WHERE COALESCE(aur.app_users_role_status, 'active') = 'active'
    ),
    '[]'::json
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

  IF p_app_role_id = 1 THEN
    RAISE EXCEPTION 'El rol Administrador no es editable.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
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

GRANT EXECUTE ON FUNCTION public.fn_user_permissions_for(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_user_has_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_permission(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_can_edit_ministry(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_church_roles_with_permissions(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_set_church_role_permissions(integer, integer, text[]) TO authenticated, service_role;

GRANT SELECT ON public.app_permissions TO authenticated, service_role;
GRANT SELECT ON public.app_role_permissions TO authenticated, service_role;
GRANT SELECT ON public.church_role_permissions TO authenticated, service_role;
