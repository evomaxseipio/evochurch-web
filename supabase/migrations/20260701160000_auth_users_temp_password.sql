-- Contraseñas temporales de acceso (solo visible/regenerable por admin mientras is_temp_password).

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS is_temp_password boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS temp_password_plain text;

COMMENT ON COLUMN public.auth_users.is_temp_password IS
  'True hasta que el usuario cambie su contraseña (login propio).';
COMMENT ON COLUMN public.auth_users.temp_password_plain IS
  'Última temporal generada; solo lectura vía RPC admin. NULL si no aplica.';

CREATE OR REPLACE FUNCTION public.sp_set_auth_user_temp_password(
  p_church_id integer,
  p_auth_user_id uuid,
  p_temp_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF p_auth_user_id IS NULL OR NULLIF(TRIM(p_temp_password), '') IS NULL THEN
    RAISE EXCEPTION 'Datos de contraseña temporal inválidos.';
  END IF;

  UPDATE public.auth_users au
  SET
    is_temp_password = true,
    temp_password_plain = TRIM(p_temp_password),
    updated_at = now()
  FROM public.profiles p
  WHERE au.id = p_auth_user_id
    AND p.id = au.profile_id
    AND p.church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta iglesia.';
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_auth_user_temp_password(
  p_church_id integer,
  p_auth_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row record;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  SELECT au.is_temp_password, au.temp_password_plain
  INTO v_row
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = p_auth_user_id
    AND p.church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta iglesia.';
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'is_temp_password', COALESCE(v_row.is_temp_password, false),
    'temp_password', CASE
      WHEN COALESCE(v_row.is_temp_password, false) THEN v_row.temp_password_plain
      ELSE NULL
    END
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_clear_auth_user_temp_password(
  p_church_id integer,
  p_auth_user_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  UPDATE public.auth_users au
  SET
    is_temp_password = false,
    temp_password_plain = NULL,
    updated_at = now()
  FROM public.profiles p
  WHERE au.id = p_auth_user_id
    AND p.id = au.profile_id
    AND p.church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta iglesia.';
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200);
END;
$$;

-- Incluir is_temp_password en listado (sin exponer la clave).
CREATE OR REPLACE FUNCTION public.sp_list_church_auth_users(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_church_id integer;
  v_result json;
  v_single_church_id integer;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  v_church_id := p_church_id;

  SELECT MIN(ch.id)
  INTO v_single_church_id
  FROM public.church ch
  HAVING COUNT(*) = 1;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'auth_user_id', u.id,
        'email', u.email,
        'profile_id', COALESCE(au.profile_id, p.id),
        'first_name', p.first_name,
        'last_name', p.last_name,
        'app_role_id', au.app_role_id,
        'app_role_name', aur.app_users_role_name,
        'membership_role', m.membership_role,
        'is_active', COALESCE(au.is_active, true),
        'is_verified', COALESCE(
          au.is_verified,
          u.email_confirmed_at IS NOT NULL,
          false
        ),
        'is_temp_password', COALESCE(au.is_temp_password, false),
        'last_login_at', COALESCE(au.last_login_at, u.last_sign_in_at),
        'created_at', COALESCE(au.created_at, u.created_at),
        'updated_at', COALESCE(au.updated_at, u.updated_at)
      )
      ORDER BY COALESCE(au.created_at, u.created_at) DESC
    ),
    '[]'::json
  )
  INTO v_result
  FROM auth.users u
  LEFT JOIN public.auth_users au ON au.id = u.id
  LEFT JOIN public.profiles p ON p.id = COALESCE(
    au.profile_id,
    (
      SELECT pr.id
      FROM public.profiles pr
      INNER JOIN public.contacts c ON c.profile_id = pr.id
      WHERE pr.church_id = v_church_id
        AND lower(trim(c.email)) = lower(trim(u.email))
      LIMIT 1
    )
  )
  LEFT JOIN public.app_users_role aur
    ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = p.id
      AND m2.church_id = v_church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE (
      p.id IS NOT NULL
      AND p.church_id = v_church_id
    )
    OR COALESCE((u.raw_app_meta_data ->> 'church_id')::integer, 0) = v_church_id
    OR (
      p.id IS NULL
      AND au.id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.contacts c ON c.profile_id = pr.id
        WHERE lower(trim(c.email)) = lower(trim(u.email))
      )
      AND v_single_church_id IS NOT NULL
      AND v_church_id = v_single_church_id
    );

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'users', v_result
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_set_auth_user_temp_password(integer, uuid, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_auth_user_temp_password(integer, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_clear_auth_user_temp_password(integer, uuid)
  TO authenticated, service_role;
