-- Sprint 2: targeted admin lookups (no full member/auth user scans).

CREATE OR REPLACE FUNCTION public.sp_find_profile_by_email(
  p_church_id integer,
  p_email text
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_email text := lower(trim(COALESCE(p_email, '')));
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF v_email = '' THEN
    RETURN json_build_object('success', true, 'profile', null);
  END IF;

  SELECT json_build_object(
    'success', true,
    'profile', json_build_object(
      'profile_id', p.id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'email', c.email
    )
  )
  INTO v_result
  FROM profiles p
  INNER JOIN contacts c ON c.profile_id = p.id
  WHERE p.church_id = p_church_id
    AND lower(trim(COALESCE(c.email, ''))) = v_email
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN json_build_object('success', true, 'profile', null);
  END IF;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_church_auth_user_by_profile(
  p_church_id integer,
  p_profile_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  SELECT json_build_object(
    'success', true,
    'user', json_build_object(
      'auth_user_id', au.id,
      'email', au.email,
      'profile_id', au.profile_id,
      'first_name', p.first_name,
      'last_name', p.last_name,
      'app_role_id', au.app_role_id,
      'app_role_name', aur.app_users_role_name,
      'membership_role', m.membership_role,
      'is_active', COALESCE(au.is_active, false),
      'is_verified', COALESCE(au.is_verified, false),
      'last_login_at', COALESCE(au.last_login_at, u.last_sign_in_at),
      'created_at', au.created_at,
      'updated_at', au.updated_at,
      'is_temp_password', COALESCE(au.is_temp_password, false)
    )
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.app_users_role aur
    ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN auth.users u ON u.id = au.id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    LIMIT 1
  ) m ON true
  WHERE p.church_id = p_church_id
    AND au.profile_id = p_profile_id
  LIMIT 1;

  IF v_result IS NULL THEN
    RETURN json_build_object('success', true, 'user', null);
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.sp_find_profile_by_email(integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.sp_get_church_auth_user_by_profile(integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sp_find_profile_by_email(integer, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_church_auth_user_by_profile(integer, uuid)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
