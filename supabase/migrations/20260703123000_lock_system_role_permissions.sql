-- Bloquear edición de permisos para roles del sistema fijos (1–4).

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

  IF p_app_role_id IN (1, 2, 3, 4) THEN
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
