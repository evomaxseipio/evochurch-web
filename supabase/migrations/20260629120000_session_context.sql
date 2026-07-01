-- Contexto de sesión multitenant: resuelve iglesia, perfil y permisos desde auth.uid().
-- Fuente de verdad para Next.js / Flutter — no confiar en church_id del cliente.

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
    'is_verified', COALESCE(au.is_verified, false)
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

GRANT EXECUTE ON FUNCTION public.sp_get_session_context() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sp_get_session_context() TO service_role;

COMMENT ON FUNCTION public.sp_get_session_context IS
  'Returns tenant-scoped session context for the current auth.uid(): church_id from profiles, roles, and finance authorization flag.';
