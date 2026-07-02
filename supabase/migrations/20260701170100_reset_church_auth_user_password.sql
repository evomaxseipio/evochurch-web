-- Restablecer contraseña de acceso vía RPC (admin de iglesia), sin Admin API / service role.

CREATE OR REPLACE FUNCTION public.sp_reset_church_auth_user_password(
  p_church_id integer,
  p_auth_user_id uuid,
  p_new_password text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth, extensions
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF p_auth_user_id IS NULL OR NULLIF(TRIM(p_new_password), '') IS NULL THEN
    RAISE EXCEPTION 'Datos de contraseña inválidos.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.auth_users au
    INNER JOIN public.profiles p ON p.id = au.profile_id
    WHERE au.id = p_auth_user_id
      AND p.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta iglesia.';
  END IF;

  UPDATE auth.users u
  SET
    encrypted_password = extensions.crypt(TRIM(p_new_password), extensions.gen_salt('bf')),
    updated_at = now()
  WHERE u.id = p_auth_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuenta de autenticación no encontrada.';
  END IF;

  UPDATE public.auth_users au
  SET
    is_temp_password = true,
    temp_password_plain = TRIM(p_new_password),
    updated_at = now()
  FROM public.profiles p
  WHERE au.id = p_auth_user_id
    AND p.id = au.profile_id
    AND p.church_id = p_church_id;

  RETURN json_build_object('success', true, 'status_code', 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_reset_church_auth_user_password(integer, uuid, text)
  TO authenticated, service_role;
