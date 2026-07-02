-- Incluir is_temp_password en JWT app_metadata para fast-path en middleware (Sprint 1 P0-AUTH-3).

CREATE OR REPLACE FUNCTION public.fn_build_app_metadata(p_auth_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'church_id', p.church_id,
      'profile_id', au.profile_id,
      'app_role_id', au.app_role_id,
      'church_name', ch.name,
      'is_temp_password', COALESCE(au.is_temp_password, false)
    )
  )
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  WHERE au.id = p_auth_user_id
    AND COALESCE(au.is_active, true) = true
  LIMIT 1;
$$;

-- Backfill JWT para usuarios activos existentes.
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
