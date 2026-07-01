-- Admin users module: list / register / update auth_users (multitenant, app admin only).

CREATE OR REPLACE FUNCTION public.fn_can_manage_admin_users()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.auth_users au
    WHERE au.id = auth.uid()
      AND COALESCE(au.is_active, true) = true
      AND au.app_role_id = 1
  );
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_session_app_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF NOT public.fn_can_manage_admin_users() THEN
    RAISE EXCEPTION 'Acceso denegado: se requiere rol de Administrador General.';
  END IF;
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

CREATE OR REPLACE FUNCTION public.sp_list_church_auth_users(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'auth_user_id', au.id,
        'email', au.email,
        'profile_id', au.profile_id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'app_role_id', au.app_role_id,
        'app_role_name', aur.app_users_role_name,
        'membership_role', m.membership_role,
        'is_active', COALESCE(au.is_active, false),
        'is_verified', COALESCE(au.is_verified, false),
        'last_login_at', COALESCE(au.last_login_at, u.last_sign_in_at),
        'created_at', au.created_at,
        'updated_at', au.updated_at
      )
      ORDER BY au.created_at DESC
    ),
    '[]'::json
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.app_users_role aur
    ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN auth.users u ON u.id = au.id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE p.church_id = p_church_id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'users', v_result
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_register_church_auth_user(
  p_church_id integer,
  p_auth_user_id uuid,
  p_profile_id uuid,
  p_email text,
  p_app_role_id integer DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile_church integer;
  v_existing uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF p_auth_user_id IS NULL OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id y profile_id son obligatorios.';
  END IF;

  IF NULLIF(TRIM(COALESCE(p_email, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El correo es obligatorio.';
  END IF;

  SELECT p.church_id
  INTO v_profile_church
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  IF v_profile_church IS NULL OR v_profile_church <> p_church_id THEN
    RAISE EXCEPTION 'El perfil no pertenece a esta iglesia.';
  END IF;

  IF p_app_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Rol de aplicación no válido.';
  END IF;

  SELECT au.id
  INTO v_existing
  FROM public.auth_users au
  WHERE au.profile_id = p_profile_id
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Este perfil ya tiene una cuenta de acceso vinculada.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.auth_users au WHERE au.id = p_auth_user_id) THEN
    RAISE EXCEPTION 'La cuenta de acceso ya está registrada.';
  END IF;

  INSERT INTO public.auth_users (
    id,
    email,
    profile_id,
    oauth_provider,
    is_active,
    is_verified,
    failed_login_attempts,
    app_role_id,
    created_at,
    updated_at
  )
  VALUES (
    p_auth_user_id,
    TRIM(p_email),
    p_profile_id,
    'EMAIL'::public.oauthprovider,
    COALESCE(p_is_active, true),
    true,
    0,
    p_app_role_id,
    now(),
    now()
  );

  PERFORM public.fn_sync_auth_app_metadata(p_auth_user_id);

  RETURN json_build_object(
    'success', true,
    'status_code', 201,
    'auth_user_id', p_auth_user_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_update_church_auth_user(
  p_church_id integer,
  p_auth_user_id uuid,
  p_profile_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_app_role_id integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_clear_app_role boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile_church integer;
  v_current_profile uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id es obligatorio.';
  END IF;

  SELECT au.profile_id
  INTO v_current_profile
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = p_auth_user_id
    AND p.church_id = p_church_id;

  IF v_current_profile IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta iglesia.';
  END IF;

  IF p_profile_id IS NOT NULL AND p_profile_id <> v_current_profile THEN
    SELECT p.church_id
    INTO v_profile_church
    FROM public.profiles p
    WHERE p.id = p_profile_id;

    IF v_profile_church IS NULL OR v_profile_church <> p_church_id THEN
      RAISE EXCEPTION 'El perfil no pertenece a esta iglesia.';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.auth_users au
      WHERE au.profile_id = p_profile_id
        AND au.id <> p_auth_user_id
    ) THEN
      RAISE EXCEPTION 'El perfil seleccionado ya tiene otra cuenta vinculada.';
    END IF;
  END IF;

  IF p_app_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Rol de aplicación no válido.';
  END IF;

  UPDATE public.auth_users au
  SET
    profile_id = COALESCE(p_profile_id, au.profile_id),
    email = COALESCE(NULLIF(TRIM(p_email), ''), au.email),
    app_role_id = CASE
      WHEN p_clear_app_role THEN NULL
      WHEN p_app_role_id IS NOT NULL THEN p_app_role_id
      ELSE au.app_role_id
    END,
    is_active = COALESCE(p_is_active, au.is_active),
    updated_at = now()
  FROM public.profiles p
  WHERE au.id = p_auth_user_id
    AND p.id = au.profile_id
    AND p.church_id = p_church_id;

  PERFORM public.fn_sync_auth_app_metadata(p_auth_user_id);

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'auth_user_id', p_auth_user_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_can_manage_admin_users() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_session_app_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_app_user_roles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_church_auth_users(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_register_church_auth_user(
  integer, uuid, uuid, text, integer, boolean
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_update_church_auth_user(
  integer, uuid, uuid, text, integer, boolean, boolean
) TO authenticated, service_role;
