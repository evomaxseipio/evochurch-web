-- Sincronizar JWT cuando cambia is_temp_password (fix AUTH-07 / SEC-03).

DROP TRIGGER IF EXISTS auth_users_sync_app_metadata ON public.auth_users;

CREATE TRIGGER auth_users_sync_app_metadata
  AFTER INSERT OR UPDATE OF profile_id, app_role_id, is_active, is_temp_password
  ON public.auth_users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auth_users_sync_app_metadata();

-- Backfill JWT coherente con BD.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT au.id
    FROM public.auth_users au
    WHERE COALESCE(au.is_active, true) = true
  LOOP
    PERFORM public.fn_sync_auth_app_metadata(r.id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
