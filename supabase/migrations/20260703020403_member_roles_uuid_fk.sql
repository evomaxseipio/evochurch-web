-- member_roles: PK uuid + role_code; membership: FK member_role_id (drop varchar membership_role).

-- ---------------------------------------------------------------------------
-- Schema: role_code + uuid PK on member_roles
-- ---------------------------------------------------------------------------

ALTER TABLE public.member_roles ADD COLUMN IF NOT EXISTS role_code text;

UPDATE public.member_roles
SET role_code = lower(
  regexp_replace(
    regexp_replace(trim(role_name), '[^a-zA-Z0-9]+', '_', 'g'),
    '^_+|_+$',
    '',
    'g'
  )
)
WHERE role_code IS NULL OR trim(role_code) = '';

DO $migrate_roles$
DECLARE
  v_id_type text;
BEGIN
  SELECT c.data_type
  INTO v_id_type
  FROM information_schema.columns c
  WHERE c.table_schema = 'public'
    AND c.table_name = 'member_roles'
    AND c.column_name = 'id';

  IF v_id_type IS DISTINCT FROM 'uuid' THEN
    ALTER TABLE public.member_roles ADD COLUMN IF NOT EXISTS id_new uuid;

    UPDATE public.member_roles
    SET id_new = gen_random_uuid()
    WHERE id_new IS NULL;

    ALTER TABLE public.member_roles ALTER COLUMN id_new SET NOT NULL;

    ALTER TABLE public.membership ADD COLUMN IF NOT EXISTS member_role_id uuid;

    UPDATE public.membership m
    SET member_role_id = mr.id_new
    FROM public.member_roles mr
    WHERE m.member_role_id IS NULL
      AND m.membership_role IS NOT NULL
      AND lower(trim(m.membership_role)) = lower(trim(mr.role_name));

    UPDATE public.membership m
    SET member_role_id = (
      SELECT mr.id_new
      FROM public.member_roles mr
      WHERE mr.role_code = 'visita'
         OR lower(trim(mr.role_name)) = 'visita'
      ORDER BY CASE WHEN mr.role_code = 'visita' THEN 0 ELSE 1 END
      LIMIT 1
    )
    WHERE m.member_role_id IS NULL;

    ALTER TABLE public.member_roles DROP CONSTRAINT IF EXISTS member_roles_pkey;
    ALTER TABLE public.member_roles DROP COLUMN id;
    ALTER TABLE public.member_roles RENAME COLUMN id_new TO id;
    ALTER TABLE public.member_roles ADD PRIMARY KEY (id);
  ELSE
    ALTER TABLE public.membership ADD COLUMN IF NOT EXISTS member_role_id uuid;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'membership'
        AND column_name = 'membership_role'
    ) THEN
      UPDATE public.membership m
      SET member_role_id = mr.id
      FROM public.member_roles mr
      WHERE m.member_role_id IS NULL
        AND m.membership_role IS NOT NULL
        AND lower(trim(m.membership_role)) = lower(trim(mr.role_name));

      UPDATE public.membership m
      SET member_role_id = (
        SELECT mr.id
        FROM public.member_roles mr
        WHERE mr.role_code = 'visita'
           OR lower(trim(mr.role_name)) = 'visita'
        ORDER BY CASE WHEN mr.role_code = 'visita' THEN 0 ELSE 1 END
        LIMIT 1
      )
      WHERE m.member_role_id IS NULL;
    END IF;
  END IF;
END $migrate_roles$;

UPDATE public.member_roles
SET role_code = 'catecumenos'
WHERE lower(trim(role_name)) = 'catecumenos'
  AND role_code IS DISTINCT FROM 'catecumenos';

ALTER TABLE public.member_roles ALTER COLUMN role_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS member_roles_role_code_uidx
  ON public.member_roles (role_code);

DO $fk$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'membership_member_role_id_fkey'
  ) THEN
    ALTER TABLE public.membership
      ADD CONSTRAINT membership_member_role_id_fkey
      FOREIGN KEY (member_role_id) REFERENCES public.member_roles (id);
  END IF;
END $fk$;

CREATE INDEX IF NOT EXISTS idx_membership_member_role_id
  ON public.membership (member_role_id);

DROP TRIGGER IF EXISTS membership_sync_app_metadata ON public.membership;

ALTER TABLE public.membership DROP COLUMN IF EXISTS membership_role;

CREATE TRIGGER membership_sync_app_metadata
  AFTER INSERT OR UPDATE OF member_role_id, church_id, profile_id
  ON public.membership
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_membership_sync_app_metadata();

-- Helpers (member_roles.id must already be uuid)
CREATE OR REPLACE FUNCTION public.fn_member_role_id_by_code(p_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT mr.id
  FROM public.member_roles mr
  WHERE mr.role_code = lower(trim(COALESCE(p_code, '')))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_membership_role_is_visita(p_member_role_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    (
      SELECT mr.role_code = 'visita'
      FROM public.member_roles mr
      WHERE mr.id = p_member_role_id
    ),
    false
  );
$$;

GRANT EXECUTE ON FUNCTION public.fn_member_role_id_by_code(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_membership_role_is_visita(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- spmaintancemembership: p_member_role_id uuid
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.spmaintancemembership(
  uuid, date, character varying, character varying, character varying,
  character varying, character varying, boolean, boolean
);

CREATE OR REPLACE FUNCTION public.spmaintancemembership(
  p_profile_id uuid,
  p_baptism_date date,
  p_baptism_church character varying,
  p_baptism_pastor character varying,
  p_member_role_id uuid,
  p_baptism_church_city character varying,
  p_baptism_church_country character varying,
  p_has_credential boolean,
  p_is_baptized_in_spirit boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_membership_exists boolean;
  v_church_id integer;
  v_role_id uuid;
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  v_role_id := COALESCE(
    p_member_role_id,
    public.fn_member_role_id_by_code('visita')
  );

  IF NOT EXISTS (SELECT 1 FROM public.member_roles WHERE id = v_role_id) THEN
    RAISE EXCEPTION 'Rol de membresía inválido.';
  END IF;

  SELECT p.church_id INTO v_church_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  SELECT EXISTS(
    SELECT 1 FROM public.membership WHERE profile_id = p_profile_id
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    INSERT INTO membership (
      profile_id,
      church_id,
      baptism_date,
      baptism_church,
      baptism_pastor,
      member_role_id,
      baptism_church_city,
      baptism_church_country,
      hascredential,
      isbaptizedinspirit
    )
    VALUES (
      p_profile_id,
      v_church_id,
      p_baptism_date,
      NULLIF(trim(p_baptism_church), ''),
      NULLIF(trim(p_baptism_pastor), ''),
      v_role_id,
      NULLIF(trim(p_baptism_church_city), ''),
      NULLIF(trim(p_baptism_church_country), ''),
      p_has_credential,
      p_is_baptized_in_spirit
    );
  ELSE
    UPDATE public.membership
    SET
      church_id = COALESCE(church_id, v_church_id),
      baptism_date = p_baptism_date,
      baptism_church = NULLIF(trim(p_baptism_church), ''),
      baptism_pastor = NULLIF(trim(p_baptism_pastor), ''),
      member_role_id = v_role_id,
      baptism_church_city = NULLIF(trim(p_baptism_church_city), ''),
      baptism_church_country = NULLIF(trim(p_baptism_church_country), ''),
      hascredential = p_has_credential,
      isbaptizedinspirit = p_is_baptized_in_spirit,
      updated_at = now()
    WHERE profile_id = p_profile_id;
  END IF;

  IF public.fn_membership_role_is_visita(v_role_id) THEN
    UPDATE public.profiles SET is_member = false WHERE id = p_profile_id;
  ELSE
    UPDATE public.profiles SET is_member = true WHERE id = p_profile_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Membership updated successfully',
    'membership', p_profile_id
  );

EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'membership', p_profile_id
    );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.spmaintancemembership(
  uuid, date, character varying, character varying, uuid,
  character varying, character varying, boolean, boolean
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- spgetprofiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.spgetprofiles(
  p_church_id integer DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_search text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer;
  v_offset integer;
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_session_church_id integer;
  v_visita_role_id uuid := public.fn_member_role_id_by_code('visita');
BEGIN
  v_session_church_id := public.fn_get_session_church_id();

  IF v_session_church_id IS NULL THEN
    RAISE EXCEPTION 'Sesión sin iglesia vinculada.';
  END IF;

  IF p_church_id IS NOT NULL AND p_church_id <> v_session_church_id THEN
    RAISE EXCEPTION 'Acceso denegado: iglesia no autorizada.';
  END IF;

  p_church_id := v_session_church_id;

  IF p_page_size IS NULL THEN
    v_page_size := NULL;
    v_offset := 0;
  ELSE
    v_page_size := LEAST(GREATEST(p_page_size, 1), 100);
    v_offset := (v_page - 1) * v_page_size;
  END IF;

  WITH scoped AS (
    SELECT
      p.id,
      p.church_id,
      p.first_name,
      p.last_name,
      p.nick_name,
      p.date_of_birth,
      p.gender,
      p.marital_status,
      p.nationality,
      p.id_type,
      p.id_number,
      p.is_active,
      p.is_member,
      p.bio,
      COALESCE(a.country, '') AS country,
      COALESCE(a.city_state, '') AS city_state,
      COALESCE(a.street_address, '') AS street_address,
      COALESCE(a.state_province, '') AS state_province,
      COALESCE(c.email, '') AS email,
      COALESCE(c.phone, '') AS phone,
      COALESCE(c.mobile_phone, '') AS mobile_phone,
      COALESCE(m.member_role_id, v_visita_role_id) AS member_role_id,
      COALESCE(m.role_name, 'Visita') AS membership_role
    FROM profiles p
    LEFT JOIN address a ON a.profile_id = p.id
    LEFT JOIN contacts c ON c.profile_id = p.id
    LEFT JOIN LATERAL (
      SELECT m2.member_role_id, mr.role_name
      FROM membership m2
      INNER JOIN member_roles mr ON mr.id = m2.member_role_id
      WHERE m2.profile_id = p.id
        AND m2.church_id = p.church_id
      ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
      LIMIT 1
    ) m ON true
    WHERE p.church_id = p_church_id
  ),
  stats AS (
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE is_member)::bigint AS members,
      COUNT(*) FILTER (WHERE NOT is_member)::bigint AS visits,
      COUNT(*) FILTER (WHERE is_active)::bigint AS active,
      COUNT(*) FILTER (WHERE NOT is_active)::bigint AS inactive
    FROM scoped
  ),
  filtered AS (
    SELECT *
    FROM scoped s
    WHERE (
      p_page_size IS NULL
      OR p_filter IS NULL
      OR p_filter = 'all'
      OR (p_filter = 'members' AND s.is_member = true)
      OR (p_filter = 'visits' AND s.is_member = false)
      OR (p_filter = 'active' AND s.is_active = true)
      OR (p_filter = 'inactive' AND s.is_active = false)
    )
    AND (
      p_page_size IS NULL
      OR v_search IS NULL
      OR s.first_name ILIKE '%' || v_search || '%'
      OR s.last_name ILIKE '%' || v_search || '%'
      OR s.nick_name ILIKE '%' || v_search || '%'
      OR s.membership_role ILIKE '%' || v_search || '%'
      OR s.nationality ILIKE '%' || v_search || '%'
      OR s.email ILIKE '%' || v_search || '%'
      OR s.phone ILIKE '%' || v_search || '%'
      OR s.mobile_phone ILIKE '%' || v_search || '%'
      OR s.city_state ILIKE '%' || v_search || '%'
    )
  ),
  paged_rows AS (
    SELECT *
    FROM filtered
    ORDER BY last_name, first_name, id
    OFFSET v_offset
    LIMIT v_page_size
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total FROM filtered
  )
  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'member_list', COALESCE((
      SELECT json_agg(
        json_build_object(
          'memberId', row.id,
          'churchId', row.church_id,
          'firstName', row.first_name,
          'lastName', row.last_name,
          'nickName', row.nick_name,
          'dateOfBirth', row.date_of_birth,
          'gender', row.gender,
          'maritalStatus', row.marital_status,
          'nationality', row.nationality,
          'idType', row.id_type,
          'idNumber', row.id_number,
          'isActive', row.is_active,
          'isMember', row.is_member,
          'membershipRoleId', row.member_role_id,
          'membershipRole', row.membership_role,
          'bio', row.bio,
          'address', json_build_object(
            'country', row.country,
            'cityState', row.city_state,
            'streetAddress', row.street_address,
            'stateProvince', row.state_province
          ),
          'contact', json_build_object(
            'email', row.email,
            'phone', row.phone,
            'mobilePhone', row.mobile_phone
          )
        )
        ORDER BY row.last_name, row.first_name, row.id
      )
      FROM paged_rows row
    ), '[]'::json),
    'pagination', json_build_object(
      'page', v_page,
      'page_size', COALESCE(v_page_size, (SELECT total FROM counted)),
      'total', (SELECT total FROM counted),
      'total_pages', CASE
        WHEN v_page_size IS NULL OR v_page_size = 0 THEN 1
        ELSE GREATEST(
          CEIL((SELECT total FROM counted)::numeric / v_page_size::numeric),
          1
        )
      END
    ),
    'stats', (
      SELECT json_build_object(
        'total', stats.total,
        'members', stats.members,
        'visits', stats.visits,
        'active', stats.active,
        'inactive', stats.inactive
      )
      FROM stats
    )
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An error occurred while fetching profiles: ' || SQLERRM,
      'member_list', '[]'::json
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_get_profile_by_id
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_profile_by_id(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_result json;
  v_visita_role_id uuid := public.fn_member_role_id_by_code('visita');
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'member', json_build_object(
      'memberId', p.id,
      'churchId', p.church_id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'nickName', p.nick_name,
      'dateOfBirth', p.date_of_birth,
      'gender', p.gender,
      'maritalStatus', p.marital_status,
      'nationality', p.nationality,
      'idType', p.id_type,
      'idNumber', p.id_number,
      'isActive', p.is_active,
      'isMember', p.is_member,
      'membershipRoleId', COALESCE(m.member_role_id, v_visita_role_id),
      'membershipRole', COALESCE(m.role_name, 'Visita'),
      'bio', p.bio,
      'address', json_build_object(
        'country', COALESCE(a.country, ''),
        'cityState', COALESCE(a.city_state, ''),
        'streetAddress', COALESCE(a.street_address, ''),
        'stateProvince', COALESCE(a.state_province, '')
      ),
      'contact', json_build_object(
        'email', COALESCE(c.email, ''),
        'phone', COALESCE(c.phone, ''),
        'mobilePhone', COALESCE(c.mobile_phone, '')
      )
    )
  )
  INTO v_result
  FROM public.profiles p
  LEFT JOIN public.address a ON a.profile_id = p.id
  LEFT JOIN public.contacts c ON c.profile_id = p.id
  LEFT JOIN LATERAL (
    SELECT m2.member_role_id, mr.role_name
    FROM public.membership m2
    INNER JOIN public.member_roles mr ON mr.id = m2.member_role_id
    WHERE m2.profile_id = p.id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE p.id = p_profile_id;

  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Profile not found',
      'member', NULL
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'member', NULL
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_get_membership_history_by_profile
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_membership_history_by_profile(
  p_church_id integer,
  p_profile_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_result JSON;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  IF p_church_id IS NULL OR p_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Invalid input: church_id and member_id are required.',
      'membership', '[]'
    );
  END IF;

  WITH membership_history_cte AS (
    SELECT
      profile_id,
      church_id,
      COALESCE(
        json_agg(
          json_build_object(
            'history_id', id,
            'date_start', date_start,
            'date_returned', date_returned,
            'history_observations', observations
          )
          ORDER BY date_start
        ),
        '[]'
      ) AS history_data
    FROM membership_history
    GROUP BY profile_id, church_id
  )
  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'membership', COALESCE(json_agg(
      json_build_object(
        'profileId', m.profile_id,
        'baptismDate', m.baptism_date,
        'baptismChurch', m.baptism_church,
        'baptismPastor', m.baptism_pastor,
        'membershipRoleId', m.member_role_id,
        'membershipRole', mr.role_name,
        'baptismChurchCity', m.baptism_church_city,
        'baptismChurchCountry', m.baptism_church_country,
        'hasCredential', m.hascredential,
        'isBaptizedInSpirit', m.isbaptizedinspirit,
        'membershipHistory', COALESCE(mh.history_data, '[]')
      )
    ), '[]')
  )
  INTO v_result
  FROM membership m
  INNER JOIN member_roles mr ON mr.id = m.member_role_id
  LEFT JOIN membership_history_cte mh
    ON m.profile_id = mh.profile_id
   AND m.church_id = mh.church_id
  WHERE m.church_id = p_church_id
    AND m.profile_id = p_profile_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An unexpected error occurred: ' || SQLERRM,
      'membership', '[]'
    );
END;
$function$;

-- ---------------------------------------------------------------------------
-- sp_get_session_context (permissions bundle from 20260702180000)
-- ---------------------------------------------------------------------------

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
    'is_temp_password', COALESCE(au.is_temp_password, false)
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

  RETURN v_result || json_build_object('permissions', v_permissions);
END;
$$;

-- ---------------------------------------------------------------------------
-- Admin auth user RPCs
-- ---------------------------------------------------------------------------

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
        'membership_role_id', m.member_role_id,
        'membership_role', m.role_name,
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
    SELECT m2.member_role_id, mr.role_name
    FROM public.membership m2
    INNER JOIN public.member_roles mr ON mr.id = m2.member_role_id
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
      'membership_role_id', m.member_role_id,
      'membership_role', m.role_name,
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
    SELECT m2.member_role_id, mr.role_name
    FROM public.membership m2
    INNER JOIN public.member_roles mr ON mr.id = m2.member_role_id
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

-- ---------------------------------------------------------------------------
-- Dashboard: catechumen count by role_code
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_dashboard_summary(
  p_church_id integer,
  p_months integer DEFAULT 12
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_months integer := LEAST(GREATEST(COALESCE(p_months, 12), 1), 24);
  v_today date := CURRENT_DATE;
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'member_stats', (
      SELECT json_build_object(
        'total', COUNT(*)::integer,
        'members', COUNT(*) FILTER (WHERE p.is_member)::integer,
        'visits', COUNT(*) FILTER (WHERE NOT p.is_member)::integer,
        'active', COUNT(*) FILTER (WHERE p.is_active)::integer,
        'inactive', COUNT(*) FILTER (WHERE NOT p.is_active)::integer
      )
      FROM profiles p
      WHERE p.church_id = p_church_id
    ),
    'funds_summary', (
      SELECT json_build_object(
        'total_balance', COALESCE(SUM(f.total_contributions), 0),
        'active_count', COUNT(*) FILTER (WHERE f.is_active)::integer
      )
      FROM funds f
      WHERE f.church_id = p_church_id
    ),
    'offering_today', COALESCE((
      SELECT SUM(ie.amount)
      FROM income_entries ie
      INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
      WHERE ie.church_id = p_church_id
        AND ie.payment_date = v_today
        AND COALESCE(itc.is_operational, false) = false
    ), 0),
    'catechumen_count', COALESCE((
      SELECT COUNT(*)::integer
      FROM membership m
      INNER JOIN member_roles mr ON mr.id = m.member_role_id
      WHERE m.church_id = p_church_id
        AND mr.role_code = 'catecumenos'
    ), 0),
    'contribution_monthly_totals', COALESCE((
      SELECT json_agg(COALESCE(mo.total, 0) ORDER BY mo.month_start)
      FROM (
        SELECT
          gs::date AS month_start,
          (
            SELECT SUM(ie.amount)
            FROM income_entries ie
            INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
            WHERE ie.church_id = p_church_id
              AND COALESCE(itc.is_operational, false) = false
              AND ie.payment_date >= gs::date
              AND ie.payment_date < (gs + interval '1 month')::date
          ) AS total
        FROM generate_series(
          date_trunc('month', v_today)::date - ((LEAST(v_months, 8) - 1) || ' months')::interval,
          date_trunc('month', v_today)::date,
          interval '1 month'
        ) gs
      ) mo
    ), '[]'::json),
    'contribution_chart', json_build_object(
      'week', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(w.week_start, 'DD Mon'),
            'value', COALESCE(w.total, 0),
            'from', w.week_start::text,
            'to', (w.week_start + interval '6 days')::date::text
          )
          ORDER BY w.week_start
        )
        FROM (
          SELECT
            (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date AS week_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND ie.payment_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS total
          FROM generate_series(6, 0, -1) n
        ) w
      ), '[]'::json),
      'month', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(m.month_start, 'Mon'),
            'value', COALESCE(m.total, 0),
            'from', m.month_start::text,
            'to', (m.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY m.month_start
        )
        FROM (
          SELECT
            (date_trunc('month', v_today)::date - (n || ' months')::interval)::date AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS total
          FROM generate_series(6, 0, -1) n
        ) m
      ), '[]'::json),
      'quarter', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', 'T' || EXTRACT(quarter FROM q.quarter_start)::text || ' ' || to_char(q.quarter_start, 'YY'),
            'value', COALESCE(q.total, 0),
            'from', q.quarter_start::text,
            'to', (q.quarter_start + interval '3 months' - interval '1 day')::date::text
          )
          ORDER BY q.quarter_start
        )
        FROM (
          SELECT
            (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date AS quarter_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS total
          FROM generate_series(3, 0, -1) n
        ) q
      ), '[]'::json),
      'year', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(y.month_start, 'Mon'),
            'value', COALESCE(y.total, 0),
            'from', y.month_start::text,
            'to', (y.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY y.month_start
        )
        FROM (
          SELECT
            make_date(EXTRACT(year FROM v_today)::integer, n, 1) AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND ie.payment_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS total
          FROM generate_series(1, 12) n
        ) y
      ), '[]'::json)
    ),
    'ledger_chart', json_build_object(
      'week', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(w.week_start, 'DD Mon'),
            'income', COALESCE(w.income_total, 0),
            'expense', COALESCE(w.expense_total, 0),
            'from', w.week_start::text,
            'to', (w.week_start + interval '6 days')::date::text
          )
          ORDER BY w.week_start
        )
        FROM (
          SELECT
            (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date AS week_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND ie.payment_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND t.transaction_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS expense_total
          FROM generate_series(6, 0, -1) n
        ) w
      ), '[]'::json),
      'month', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(m.month_start, 'Mon'),
            'income', COALESCE(m.income_total, 0),
            'expense', COALESCE(m.expense_total, 0),
            'from', m.month_start::text,
            'to', (m.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY m.month_start
        )
        FROM (
          SELECT
            (date_trunc('month', v_today)::date - (n || ' months')::interval)::date AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND t.transaction_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS expense_total
          FROM generate_series(6, 0, -1) n
        ) m
      ), '[]'::json),
      'quarter', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', 'T' || EXTRACT(quarter FROM q.quarter_start)::text || ' ' || to_char(q.quarter_start, 'YY'),
            'income', COALESCE(q.income_total, 0),
            'expense', COALESCE(q.expense_total, 0),
            'from', q.quarter_start::text,
            'to', (q.quarter_start + interval '3 months' - interval '1 day')::date::text
          )
          ORDER BY q.quarter_start
        )
        FROM (
          SELECT
            (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date AS quarter_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND t.transaction_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS expense_total
          FROM generate_series(3, 0, -1) n
        ) q
      ), '[]'::json),
      'year', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(y.month_start, 'Mon'),
            'income', COALESCE(y.income_total, 0),
            'expense', COALESCE(y.expense_total, 0),
            'from', y.month_start::text,
            'to', (y.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY y.month_start
        )
        FROM (
          SELECT
            make_date(EXTRACT(year FROM v_today)::integer, n, 1) AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND ie.payment_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND t.transaction_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS expense_total
          FROM generate_series(1, 12) n
        ) y
      ), '[]'::json)
    ),
    'kpi_month', json_build_object(
      'contributions_this_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = false
          AND ie.payment_date >= date_trunc('month', v_today)::date
          AND ie.payment_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'contributions_prev_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = false
          AND ie.payment_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND ie.payment_date < date_trunc('month', v_today)::date
      ), 0),
      'ledger_income_this_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = true
          AND ie.payment_date >= date_trunc('month', v_today)::date
          AND ie.payment_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'ledger_income_prev_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = true
          AND ie.payment_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND ie.payment_date < date_trunc('month', v_today)::date
      ), 0),
      'ledger_expense_this_month', COALESCE((
        SELECT SUM(t.transaction_amount)
        FROM transactions t
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'APPROVED'
          AND t.transaction_date >= date_trunc('month', v_today)::date
          AND t.transaction_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'ledger_expense_prev_month', COALESCE((
        SELECT SUM(t.transaction_amount)
        FROM transactions t
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'APPROVED'
          AND t.transaction_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND t.transaction_date < date_trunc('month', v_today)::date
      ), 0)
    ),
    'pending_authorizations', COALESCE((
      SELECT json_agg(row_to_json(p) ORDER BY p.movement_date DESC)
      FROM (
        SELECT
          t.transaction_id::text AS id,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN 'fund_transfer'
            ELSE 'expense'
          END AS kind,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN 'Transferencia entre fondos'
            ELSE COALESCE(NULLIF(TRIM(t.transaction_description), ''), et.expenses_name, 'Egreso pendiente')
          END AS title,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN
              COALESCE(sf.fund_name, f.fund_name) || ' → ' || COALESCE(df.fund_name, '—')
            ELSE f.fund_name || ' · ' || COALESCE(
              NULLIF(TRIM(CONCAT(pc.first_name, ' ', pc.last_name)), ''),
              '—'
            )
          END AS subtitle,
          t.transaction_amount AS amount,
          t.transaction_date::text AS movement_date
        FROM transactions t
        INNER JOIN funds f ON f.fund_id = t.fund_id AND f.church_id = t.church_id::integer
        LEFT JOIN expenses_type et ON et.expenses_type_id = t.expenses_type_id
        LEFT JOIN profiles pc ON pc.id = t.created_by_profile_id
        LEFT JOIN fund_transfers ft ON ft.expense_transaction_id = t.transaction_id
        LEFT JOIN funds sf ON sf.fund_id = ft.source_fund_id
        LEFT JOIN funds df ON df.fund_id = ft.destination_fund_id
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'PENDING'
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 8
      ) p
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Error al cargar el dashboard: ' || SQLERRM
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
