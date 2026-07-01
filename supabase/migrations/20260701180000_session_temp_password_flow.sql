-- Contraseña temporal: exponer flag en sesión y permitir que el usuario la limpie tras cambiarla.

CREATE OR REPLACE FUNCTION public.sp_get_session_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result json;
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
      TRIM(
        CONCAT(
          COALESCE(p.first_name, ''),
          ' ',
          COALESCE(p.last_name, '')
        )
      ),
      ''
    ),
    'church_name', ch.name,
    'app_role_id', au.app_role_id,
    'app_role_name', aur.app_users_role_name,
    'membership_role', m.membership_role,
    'can_authorize_finances',
      public.fn_can_authorize_finances(au.profile_id, v_uid),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false),
    'is_temp_password', COALESCE(au.is_temp_password, false)
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur
    ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE au.id = v_uid
    AND COALESCE(au.is_active, true) = true
    AND p.church_id IS NOT NULL;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_clear_my_temp_password()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Debes iniciar sesión.';
  END IF;

  UPDATE public.auth_users au
  SET
    is_temp_password = false,
    temp_password_plain = NULL,
    updated_at = now()
  WHERE au.id = v_uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta de acceso no encontrada.';
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_clear_my_temp_password() TO authenticated, service_role;
