-- Fase 2 reunión: salud, oficios (tags) y empleo principal por miembro.
-- Flutter callers: nuevos campos opcionales en JSON (bloodType, allergies, professions, employment).

-- ---------------------------------------------------------------------------
-- Helper: normalizar array JSON de strings (trim + dedupe case-insensitive)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_normalize_string_tag_array(p_input jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO public
AS $$
DECLARE
  v_result jsonb := '[]'::jsonb;
  v_elem text;
  v_lower text;
  v_seen text[] := '{}';
BEGIN
  IF p_input IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF jsonb_typeof(p_input) <> 'array' THEN
    RAISE EXCEPTION 'Se esperaba un array JSON de strings.';
  END IF;

  FOR v_elem IN
    SELECT trim(both '"' from elem::text)
    FROM jsonb_array_elements(p_input) AS elem
    WHERE jsonb_typeof(elem) = 'string'
  LOOP
    IF v_elem IS NOT NULL AND trim(v_elem) <> '' THEN
      v_lower := lower(trim(v_elem));
      IF NOT (v_lower = ANY (v_seen)) THEN
        v_seen := array_append(v_seen, v_lower);
        v_result := v_result || to_jsonb(trim(v_elem));
      END IF;
    END IF;
  END LOOP;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_normalize_string_tag_array(jsonb)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- profiles: salud + oficios
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS blood_type text,
  ADD COLUMN IF NOT EXISTS allergies jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS professions jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.profiles.blood_type IS 'Tipo de sangre opcional (ej. O+, A-).';
COMMENT ON COLUMN public.profiles.allergies IS 'Alergias: array JSON de strings libres.';
COMMENT ON COLUMN public.profiles.professions IS 'Oficios/profesiones: array JSON de strings libres.';

CREATE INDEX IF NOT EXISTS idx_profiles_professions_gin
  ON public.profiles USING gin (professions jsonb_path_ops);

-- ---------------------------------------------------------------------------
-- profile_employment
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_employment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church (id),
  employer_name text,
  job_title text,
  sector text,
  work_phone text,
  work_email text,
  is_primary boolean NOT NULL DEFAULT false,
  start_date date,
  end_date date,
  source text NOT NULL DEFAULT 'staff',
  notes text,
  marketplace_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_employment_source_check
    CHECK (source IN ('staff', 'member'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_employment_one_primary
  ON public.profile_employment (profile_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_profile_employment_church_profile
  ON public.profile_employment (church_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_employment_profile_primary
  ON public.profile_employment (profile_id, is_primary);

ALTER TABLE public.profile_employment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_employment FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_profile_employment_select ON public.profile_employment;
DROP POLICY IF EXISTS tenant_profile_employment_insert ON public.profile_employment;
DROP POLICY IF EXISTS tenant_profile_employment_update ON public.profile_employment;
DROP POLICY IF EXISTS tenant_profile_employment_delete ON public.profile_employment;

CREATE POLICY tenant_profile_employment_select ON public.profile_employment
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_employment_insert ON public.profile_employment
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_employment_update ON public.profile_employment
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_employment_delete ON public.profile_employment
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- ---------------------------------------------------------------------------
-- spinsertprofiles — extensiones opcionales
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.spinsertprofiles(
  p_church_id integer,
  p_first_name character varying,
  p_last_name character varying,
  p_nick_name character varying DEFAULT NULL::character varying,
  p_date_of_birth date DEFAULT NULL::date,
  p_gender character varying DEFAULT NULL::character varying,
  p_marital_status character varying DEFAULT NULL::character varying,
  p_nationality character varying DEFAULT NULL::character varying,
  p_id_type character varying DEFAULT NULL::character varying,
  p_id_number character varying DEFAULT NULL::character varying,
  p_is_member boolean DEFAULT false,
  p_is_active boolean DEFAULT true,
  p_bio text DEFAULT NULL::text,
  p_street_address character varying DEFAULT NULL::character varying,
  p_state_province character varying DEFAULT NULL::character varying,
  p_city_state character varying DEFAULT NULL::character varying,
  p_country character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_mobile_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying,
  p_blood_type text DEFAULT NULL::text,
  p_allergies jsonb DEFAULT NULL::jsonb,
  p_professions jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  INSERT INTO public.profiles (
    first_name, last_name, nick_name, date_of_birth, gender, marital_status,
    nationality, id_type, id_number, is_member, is_active, bio, church_id,
    blood_type, allergies, professions
  )
  VALUES (
    p_first_name, p_last_name, p_nick_name, p_date_of_birth, p_gender, p_marital_status,
    p_nationality, p_id_type, p_id_number, p_is_member, p_is_active, p_bio, p_church_id,
    NULLIF(trim(p_blood_type), ''),
    public.fn_normalize_string_tag_array(COALESCE(p_allergies, '[]'::jsonb)),
    public.fn_normalize_string_tag_array(COALESCE(p_professions, '[]'::jsonb))
  )
  ON CONFLICT (id_number) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.profiles WHERE id_number = p_id_number;
    PERFORM public.fn_assert_profile_in_session_church(v_id);
  END IF;

  INSERT INTO public.address (
    profile_id, street_address, state_province, city_state, country
  )
  VALUES (
    v_id, p_street_address, p_state_province, p_city_state, p_country
  );

  INSERT INTO public.contacts (
    profile_id, phone, mobile_phone, email
  )
  VALUES (
    v_id, p_phone, p_mobile_phone, p_email
  );

  RETURN jsonb_build_object(
    'status', 'Success',
    'message', 'Profile added successfully',
    'profile_id', v_id
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'status', 'Error',
      'message', SQLERRM
    );
END;
$function$;

-- ---------------------------------------------------------------------------
-- spupdateprofiles — extensiones opcionales
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.spupdateprofiles(
  p_id uuid,
  p_first_name character varying,
  p_last_name character varying,
  p_nick_name character varying DEFAULT NULL::character varying,
  p_date_of_birth date DEFAULT NULL::date,
  p_gender character varying DEFAULT NULL::character varying,
  p_marital_status character varying DEFAULT NULL::character varying,
  p_nationality character varying DEFAULT NULL::character varying,
  p_id_type character varying DEFAULT NULL::character varying,
  p_id_number character varying DEFAULT NULL::character varying,
  p_is_member boolean DEFAULT false,
  p_is_active boolean DEFAULT true,
  p_bio text DEFAULT NULL::text,
  p_street_address character varying DEFAULT NULL::character varying,
  p_state_province character varying DEFAULT NULL::character varying,
  p_city_state character varying DEFAULT NULL::character varying,
  p_country character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_mobile_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying,
  p_blood_type text DEFAULT NULL::text,
  p_allergies jsonb DEFAULT NULL::jsonb,
  p_professions jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_profile_exists boolean;
  v_address_exists boolean;
  v_contact_exists boolean;
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_id);

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_id) INTO v_profile_exists;
  SELECT EXISTS(SELECT 1 FROM public.address WHERE profile_id = p_id) INTO v_address_exists;
  SELECT EXISTS(SELECT 1 FROM public.contacts WHERE profile_id = p_id) INTO v_contact_exists;

  IF NOT v_profile_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status_code', 500,
      'message', 'Profile not found',
      'profile_id', ''
    );
  END IF;

  UPDATE public.profiles
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    nick_name = p_nick_name,
    date_of_birth = p_date_of_birth,
    gender = p_gender,
    marital_status = p_marital_status,
    nationality = p_nationality,
    id_type = p_id_type,
    id_number = p_id_number,
    is_member = p_is_member,
    is_active = p_is_active,
    bio = p_bio,
    blood_type = CASE
      WHEN p_blood_type IS NOT NULL THEN NULLIF(trim(p_blood_type), '')
      ELSE blood_type
    END,
    allergies = CASE
      WHEN p_allergies IS NOT NULL THEN public.fn_normalize_string_tag_array(p_allergies)
      ELSE allergies
    END,
    professions = CASE
      WHEN p_professions IS NOT NULL THEN public.fn_normalize_string_tag_array(p_professions)
      ELSE professions
    END
  WHERE id = p_id;

  IF NOT v_address_exists THEN
    INSERT INTO public.address(profile_id, street_address, state_province, city_state, country)
    VALUES (p_id, p_street_address, p_state_province, p_city_state, p_country);
  ELSE
    UPDATE public.address
    SET
      street_address = p_street_address,
      state_province = p_state_province,
      city_state = p_city_state,
      country = p_country
    WHERE profile_id = p_id;
  END IF;

  IF NOT v_contact_exists THEN
    INSERT INTO public.contacts(profile_id, phone, mobile_phone, email)
    VALUES (p_id, p_phone, p_mobile_phone, p_email);
  ELSE
    UPDATE public.contacts
    SET
      phone = p_phone,
      mobile_phone = p_mobile_phone,
      email = p_email
    WHERE profile_id = p_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Profile updated successfully',
    'profile_id', p_id
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'frofile_id', ''
    );
END;
$function$;

-- ---------------------------------------------------------------------------
-- spgetprofiles — campos nuevos + búsqueda por oficio
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
      p.blood_type,
      COALESCE(p.allergies, '[]'::jsonb) AS allergies,
      COALESCE(p.professions, '[]'::jsonb) AS professions,
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
      OR EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(s.professions) prof(val)
        WHERE prof.val ILIKE '%' || v_search || '%'
      )
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
          'bloodType', row.blood_type,
          'allergies', row.allergies,
          'professions', row.professions,
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
-- sp_get_profile_by_id — salud, oficios y empleo
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
      'bloodType', p.blood_type,
      'allergies', COALESCE(p.allergies, '[]'::jsonb),
      'professions', COALESCE(p.professions, '[]'::jsonb),
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
      ),
      'employment', COALESCE(emp.employment_data, '[]'::json)
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
  LEFT JOIN LATERAL (
    SELECT COALESCE(
      json_agg(
        json_build_object(
          'id', pe.id,
          'employerName', pe.employer_name,
          'jobTitle', pe.job_title,
          'sector', pe.sector,
          'workPhone', pe.work_phone,
          'workEmail', pe.work_email,
          'isPrimary', pe.is_primary,
          'startDate', pe.start_date,
          'endDate', pe.end_date,
          'source', pe.source,
          'notes', pe.notes,
          'marketplaceOptIn', pe.marketplace_opt_in
        )
        ORDER BY pe.is_primary DESC, pe.start_date DESC NULLS LAST, pe.created_at DESC
      ),
      '[]'::json
    ) AS employment_data
    FROM public.profile_employment pe
    WHERE pe.profile_id = p.id
      AND pe.church_id = p.church_id
  ) emp ON true
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
-- sp_maintain_profile_employment
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_maintain_profile_employment(
  p_profile_id uuid,
  p_church_id integer,
  p_action text,
  p_employment_id uuid DEFAULT NULL::uuid,
  p_employer_name text DEFAULT NULL::text,
  p_job_title text DEFAULT NULL::text,
  p_sector text DEFAULT NULL::text,
  p_work_phone text DEFAULT NULL::text,
  p_work_email text DEFAULT NULL::text,
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date,
  p_notes text DEFAULT NULL::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_action text := lower(trim(coalesce(p_action, '')));
  v_employment_id uuid;
  v_existing_primary uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  IF v_action = 'delete' THEN
    IF p_employment_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'employment_id requerido');
    END IF;

    DELETE FROM public.profile_employment
    WHERE id = p_employment_id
      AND profile_id = p_profile_id
      AND church_id = p_church_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Empleo no encontrado');
    END IF;

    RETURN jsonb_build_object('success', true, 'status_code', 200, 'message', 'Empleo eliminado');
  END IF;

  IF v_action = 'upsert_primary' THEN
    SELECT id INTO v_existing_primary
    FROM public.profile_employment
    WHERE profile_id = p_profile_id
      AND church_id = p_church_id
      AND is_primary = true
    LIMIT 1;

    IF v_existing_primary IS NOT NULL THEN
      UPDATE public.profile_employment
      SET
        employer_name = NULLIF(trim(p_employer_name), ''),
        job_title = NULLIF(trim(p_job_title), ''),
        sector = NULLIF(trim(p_sector), ''),
        work_phone = NULLIF(trim(p_work_phone), ''),
        work_email = NULLIF(trim(p_work_email), ''),
        start_date = p_start_date,
        end_date = NULL,
        notes = NULLIF(trim(p_notes), ''),
        updated_at = now()
      WHERE id = v_existing_primary;
      v_employment_id := v_existing_primary;
    ELSE
      IF coalesce(trim(p_employer_name), '') = ''
         AND coalesce(trim(p_job_title), '') = ''
         AND coalesce(trim(p_sector), '') = ''
         AND coalesce(trim(p_work_phone), '') = ''
         AND coalesce(trim(p_work_email), '') = ''
         AND p_start_date IS NULL THEN
        RETURN jsonb_build_object('success', true, 'status_code', 200, 'message', 'Sin empleo principal');
      END IF;

      INSERT INTO public.profile_employment (
        profile_id, church_id, employer_name, job_title, sector,
        work_phone, work_email, is_primary, start_date, notes, source
      )
      VALUES (
        p_profile_id, p_church_id,
        NULLIF(trim(p_employer_name), ''),
        NULLIF(trim(p_job_title), ''),
        NULLIF(trim(p_sector), ''),
        NULLIF(trim(p_work_phone), ''),
        NULLIF(trim(p_work_email), ''),
        true, p_start_date,
        NULLIF(trim(p_notes), ''),
        'staff'
      )
      RETURNING id INTO v_employment_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'status_code', 200,
      'message', 'Empleo principal guardado',
      'employment_id', v_employment_id
    );
  END IF;

  IF v_action = 'upsert_history' THEN
    IF p_employment_id IS NOT NULL THEN
      UPDATE public.profile_employment
      SET
        employer_name = NULLIF(trim(p_employer_name), ''),
        job_title = NULLIF(trim(p_job_title), ''),
        sector = NULLIF(trim(p_sector), ''),
        work_phone = NULLIF(trim(p_work_phone), ''),
        work_email = NULLIF(trim(p_work_email), ''),
        start_date = p_start_date,
        end_date = p_end_date,
        notes = NULLIF(trim(p_notes), ''),
        is_primary = false,
        updated_at = now()
      WHERE id = p_employment_id
        AND profile_id = p_profile_id
        AND church_id = p_church_id;

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Empleo no encontrado');
      END IF;

      v_employment_id := p_employment_id;
    ELSE
      INSERT INTO public.profile_employment (
        profile_id, church_id, employer_name, job_title, sector,
        work_phone, work_email, is_primary, start_date, end_date, notes, source
      )
      VALUES (
        p_profile_id, p_church_id,
        NULLIF(trim(p_employer_name), ''),
        NULLIF(trim(p_job_title), ''),
        NULLIF(trim(p_sector), ''),
        NULLIF(trim(p_work_phone), ''),
        NULLIF(trim(p_work_email), ''),
        false, p_start_date, p_end_date,
        NULLIF(trim(p_notes), ''),
        'staff'
      )
      RETURNING id INTO v_employment_id;
    END IF;

    RETURN jsonb_build_object(
      'success', true,
      'status_code', 200,
      'message', 'Historial de empleo guardado',
      'employment_id', v_employment_id
    );
  END IF;

  RETURN jsonb_build_object(
    'success', false,
    'status_code', 400,
    'message', 'Acción no válida: ' || v_action
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_maintain_profile_employment(
  uuid, integer, text, uuid, text, text, text, text, text, date, date, text
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
