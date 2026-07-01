-- Permite al usuario autenticado sincronizar su propio app_metadata (sin service role en cliente).

CREATE OR REPLACE FUNCTION public.sp_sync_my_app_metadata()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no válida.';
  END IF;

  PERFORM public.fn_sync_auth_app_metadata(v_uid);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_sync_my_app_metadata() TO authenticated;

COMMENT ON FUNCTION public.sp_sync_my_app_metadata IS
  'Sync auth.users.raw_app_meta_data from auth_users/profile for the current session.';
