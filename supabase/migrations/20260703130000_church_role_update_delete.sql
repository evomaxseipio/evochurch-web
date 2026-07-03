-- Actualizar y eliminar roles personalizados por iglesia.

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

  IF p_app_role_id IN (1, 2, 3, 4) THEN
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

  IF p_app_role_id IN (1, 2, 3, 4, 10) THEN
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

GRANT EXECUTE ON FUNCTION public.sp_update_church_role(integer, integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_delete_church_role(integer, integer) TO authenticated, service_role;
