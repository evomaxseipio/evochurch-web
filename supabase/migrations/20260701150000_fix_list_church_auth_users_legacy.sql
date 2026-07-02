-- Lista cuentas de auth.users vinculadas a la iglesia (auth_users, perfil por email o metadata).
-- Backfill de auth_users para cuentas legacy creadas solo en Supabase Auth.

CREATE OR REPLACE FUNCTION public.sp_list_church_auth_users(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_church_id integer;
  v_result json;
  v_single_church_id integer;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  v_church_id := p_church_id;

  SELECT MIN(ch.id)
  INTO v_single_church_id
  FROM public.church ch
  HAVING COUNT(*) = 1;

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'auth_user_id', u.id,
        'email', u.email,
        'profile_id', COALESCE(au.profile_id, p.id),
        'first_name', p.first_name,
        'last_name', p.last_name,
        'app_role_id', au.app_role_id,
        'app_role_name', aur.app_users_role_name,
        'membership_role', m.membership_role,
        'is_active', COALESCE(au.is_active, true),
        'is_verified', COALESCE(
          au.is_verified,
          u.email_confirmed_at IS NOT NULL,
          false
        ),
        'last_login_at', COALESCE(au.last_login_at, u.last_sign_in_at),
        'created_at', COALESCE(au.created_at, u.created_at),
        'updated_at', COALESCE(au.updated_at, u.updated_at)
      )
      ORDER BY COALESCE(au.created_at, u.created_at) DESC
    ),
    '[]'::json
  )
  INTO v_result
  FROM auth.users u
  LEFT JOIN public.auth_users au ON au.id = u.id
  LEFT JOIN public.profiles p ON p.id = COALESCE(
    au.profile_id,
    (
      SELECT pr.id
      FROM public.profiles pr
      INNER JOIN public.contacts c ON c.profile_id = pr.id
      WHERE pr.church_id = v_church_id
        AND lower(trim(c.email)) = lower(trim(u.email))
      LIMIT 1
    )
  )
  LEFT JOIN public.app_users_role aur
    ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = p.id
      AND m2.church_id = v_church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE (
      p.id IS NOT NULL
      AND p.church_id = v_church_id
    )
    OR COALESCE((u.raw_app_meta_data ->> 'church_id')::integer, 0) = v_church_id
    OR (
      p.id IS NULL
      AND au.id IS NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.profiles pr
        INNER JOIN public.contacts c ON c.profile_id = pr.id
        WHERE lower(trim(c.email)) = lower(trim(u.email))
      )
      AND v_single_church_id IS NOT NULL
      AND v_church_id = v_single_church_id
    );

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'users', v_result
  );
END;
$$;

-- Vincular cuentas Supabase Auth existentes con perfiles de la iglesia (por email).
INSERT INTO public.auth_users (
  id,
  email,
  profile_id,
  oauth_provider,
  is_active,
  is_verified,
  failed_login_attempts,
  app_role_id,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  p.id,
  'EMAIL'::public.oauthprovider,
  true,
  COALESCE(u.email_confirmed_at IS NOT NULL, false),
  0,
  NULL,
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
INNER JOIN public.profiles p ON p.church_id IS NOT NULL
INNER JOIN public.contacts c ON c.profile_id = p.id
  AND lower(trim(c.email)) = lower(trim(u.email))
LEFT JOIN public.auth_users au ON au.id = u.id
WHERE au.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Cuentas auth sin perfil (p. ej. correo alternativo): registrar fila y metadata de iglesia.
INSERT INTO public.auth_users (
  id,
  email,
  profile_id,
  oauth_provider,
  is_active,
  is_verified,
  failed_login_attempts,
  app_role_id,
  created_at,
  updated_at
)
SELECT
  u.id,
  u.email,
  NULL,
  'EMAIL'::public.oauthprovider,
  true,
  COALESCE(u.email_confirmed_at IS NOT NULL, false),
  0,
  NULL,
  COALESCE(u.created_at, now()),
  now()
FROM auth.users u
LEFT JOIN public.auth_users au ON au.id = u.id
WHERE au.id IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    INNER JOIN public.contacts c ON c.profile_id = pr.id
    WHERE lower(trim(c.email)) = lower(trim(u.email))
  )
ON CONFLICT (id) DO NOTHING;

-- Metadata de iglesia para cuentas auth sin perfil vinculado (solo iglesia única).
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb)
  || jsonb_build_object('church_id', ch.id)
FROM public.church ch
WHERE NOT EXISTS (
    SELECT 1
    FROM public.profiles pr
    INNER JOIN public.contacts c ON c.profile_id = pr.id
    WHERE lower(trim(c.email)) = lower(trim(u.email))
  )
  AND (u.raw_app_meta_data ->> 'church_id') IS NULL
  AND (SELECT COUNT(*) FROM public.church) = 1
  AND ch.id = (SELECT MIN(c2.id) FROM public.church c2);

-- Sincronizar JWT app_metadata para filas recién vinculadas.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT au.id
    FROM public.auth_users au
    LEFT JOIN public.profiles p ON p.id = au.profile_id
    WHERE au.profile_id IS NOT NULL
  LOOP
    PERFORM public.fn_sync_auth_app_metadata(r.id);
  END LOOP;
END;
$$;
