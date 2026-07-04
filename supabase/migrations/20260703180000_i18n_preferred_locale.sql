-- preferred_locale on auth_users (login-level preference, aligned with sp_get_session_context)

ALTER TABLE public.auth_users
  ADD COLUMN IF NOT EXISTS preferred_locale text NOT NULL DEFAULT 'es';

ALTER TABLE public.auth_users
  DROP CONSTRAINT IF EXISTS auth_users_preferred_locale_check;

ALTER TABLE public.auth_users
  ADD CONSTRAINT auth_users_preferred_locale_check
  CHECK (preferred_locale IN ('es', 'en', 'fr'));

CREATE OR REPLACE FUNCTION public.sp_update_preferred_locale(p_locale text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF p_locale NOT IN ('es', 'en', 'fr') THEN
    RAISE EXCEPTION 'invalid locale';
  END IF;

  UPDATE public.auth_users
  SET preferred_locale = p_locale
  WHERE id = v_uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_update_preferred_locale(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.sp_get_session_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result json;
  v_church_id integer;
  v_app_role_id integer;
  v_permissions json;
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
      TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
      ''
    ),
    'church_name', ch.name,
    'app_role_id', au.app_role_id,
    'app_role_name', aur.app_users_role_name,
    'membership_role_id', m.member_role_id,
    'membership_role', m.role_name,
    'can_authorize_finances', public.fn_user_has_permission('finances:transactions:authorize'),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false),
    'is_temp_password', COALESCE(au.is_temp_password, false),
    'preferred_locale', COALESCE(au.preferred_locale, 'es')
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.member_role_id, mr.role_name
    FROM public.membership m2
    INNER JOIN public.member_roles mr ON mr.id = m2.member_role_id
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE au.id = v_uid
    AND COALESCE(au.is_active, true) = true
    AND p.church_id IS NOT NULL;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  v_church_id := (v_result->>'church_id')::integer;
  v_app_role_id := NULLIF(v_result->>'app_role_id', '')::integer;

  SELECT COALESCE(
    to_json(
      public.fn_user_permissions_for(v_church_id, v_app_role_id)
    ),
    '[]'::json
  )
  INTO v_permissions;

  RETURN (v_result::jsonb || jsonb_build_object('permissions', v_permissions))::json;
END;
$$;
