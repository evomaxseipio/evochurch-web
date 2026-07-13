-- P1 backlog post-reunión: registro de niños + tutores (ministerio de niños).
-- Distinto de asistencia (P2/P3). Niños viven en profiles con is_child = true.

-- ---------------------------------------------------------------------------
-- profiles: flag niño + contacto de emergencia
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_child boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS emergency_contact_name text,
  ADD COLUMN IF NOT EXISTS emergency_contact_phone text;

COMMENT ON COLUMN public.profiles.is_child IS
  'Perfil de niño del ministerio infantil (no miembro adulto).';
COMMENT ON COLUMN public.profiles.emergency_contact_name IS
  'Contacto de emergencia (nombre) — usado principalmente en niños.';
COMMENT ON COLUMN public.profiles.emergency_contact_phone IS
  'Contacto de emergencia (teléfono) — usado principalmente en niños.';

CREATE INDEX IF NOT EXISTS idx_profiles_church_is_child
  ON public.profiles (church_id, is_child);

-- ---------------------------------------------------------------------------
-- profile_child_guardian — puente niño ↔ tutor adulto
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_child_guardian (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  child_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  guardian_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church (id),
  relationship text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_child_guardian_relationship_check CHECK (
    relationship IN ('mother', 'father', 'guardian', 'other')
  ),
  CONSTRAINT profile_child_guardian_distinct_profiles CHECK (
    child_profile_id <> guardian_profile_id
  ),
  CONSTRAINT profile_child_guardian_unique_pair UNIQUE (child_profile_id, guardian_profile_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profile_child_guardian_one_primary
  ON public.profile_child_guardian (child_profile_id)
  WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_profile_child_guardian_church_child
  ON public.profile_child_guardian (church_id, child_profile_id);

CREATE INDEX IF NOT EXISTS idx_profile_child_guardian_guardian
  ON public.profile_child_guardian (guardian_profile_id);

ALTER TABLE public.profile_child_guardian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_child_guardian FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_profile_child_guardian_select ON public.profile_child_guardian;
DROP POLICY IF EXISTS tenant_profile_child_guardian_insert ON public.profile_child_guardian;
DROP POLICY IF EXISTS tenant_profile_child_guardian_update ON public.profile_child_guardian;
DROP POLICY IF EXISTS tenant_profile_child_guardian_delete ON public.profile_child_guardian;

CREATE POLICY tenant_profile_child_guardian_select ON public.profile_child_guardian
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_child_guardian_insert ON public.profile_child_guardian
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_child_guardian_update ON public.profile_child_guardian
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_child_guardian_delete ON public.profile_child_guardian
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- ---------------------------------------------------------------------------
-- spgetprofiles — excluir niños del listado de adultos
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
SET search_path TO public
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
      AND p.is_child = false
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
-- sp_get_profile_by_id — isChild + contacto emergencia
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
      'isChild', p.is_child,
      'membershipRoleId', COALESCE(m.member_role_id, v_visita_role_id),
      'membershipRole', COALESCE(m.role_name, 'Visita'),
      'bio', p.bio,
      'bloodType', p.blood_type,
      'allergies', COALESCE(p.allergies, '[]'::jsonb),
      'professions', COALESCE(p.professions, '[]'::jsonb),
      'emergencyContactName', coalesce(p.emergency_contact_name, ''),
      'emergencyContactPhone', coalesce(p.emergency_contact_phone, ''),
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
-- sp_list_child_profiles
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_list_child_profiles(
  p_church_id integer,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_offset integer := (v_page - 1) * v_page_size;
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_total bigint;
  v_children jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  WITH scoped AS (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.date_of_birth,
      COALESCE(p.allergies, '[]'::jsonb) AS allergies,
      COALESCE(p.emergency_contact_name, '') AS emergency_contact_name,
      COALESCE(p.emergency_contact_phone, '') AS emergency_contact_phone,
      COALESCE(g.guardians, '[]'::jsonb) AS guardians
    FROM public.profiles p
    LEFT JOIN LATERAL (
      SELECT coalesce(
        jsonb_agg(
          jsonb_build_object(
            'guardianProfileId', g2.guardian_profile_id,
            'guardianFirstName', gp.first_name,
            'guardianLastName', gp.last_name,
            'relationship', g2.relationship,
            'isPrimary', g2.is_primary
          )
          ORDER BY g2.is_primary DESC, gp.last_name, gp.first_name
        ),
        '[]'::jsonb
      ) AS guardians
      FROM public.profile_child_guardian g2
      INNER JOIN public.profiles gp ON gp.id = g2.guardian_profile_id
      WHERE g2.child_profile_id = p.id
        AND g2.church_id = p_church_id
    ) g ON true
    WHERE p.church_id = p_church_id
      AND p.is_child = true
      AND (
        v_search IS NULL
        OR p.first_name ILIKE '%' || v_search || '%'
        OR p.last_name ILIKE '%' || v_search || '%'
        OR EXISTS (
          SELECT 1
          FROM public.profile_child_guardian g3
          INNER JOIN public.profiles gp3 ON gp3.id = g3.guardian_profile_id
          WHERE g3.child_profile_id = p.id
            AND (
              gp3.first_name ILIKE '%' || v_search || '%'
              OR gp3.last_name ILIKE '%' || v_search || '%'
            )
        )
      )
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total FROM scoped
  ),
  paged AS (
    SELECT *
    FROM scoped
    ORDER BY last_name, first_name, id
    OFFSET v_offset
    LIMIT v_page_size
  )
  SELECT
    (SELECT total FROM counted),
    coalesce(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'childId', row.id,
            'firstName', row.first_name,
            'lastName', row.last_name,
            'dateOfBirth', row.date_of_birth,
            'allergies', row.allergies,
            'emergencyContactName', row.emergency_contact_name,
            'emergencyContactPhone', row.emergency_contact_phone,
            'guardians', row.guardians
          )
          ORDER BY row.last_name, row.first_name, row.id
        )
        FROM paged row
      ),
      '[]'::jsonb
    )
  INTO v_total, v_children;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'children', v_children,
    'pagination', jsonb_build_object(
      'page', v_page,
      'pageSize', v_page_size,
      'total', coalesce(v_total, 0),
      'totalPages', GREATEST(CEIL(coalesce(v_total, 0)::numeric / v_page_size::numeric), 1)
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_child_profiles(integer, integer, integer, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_get_child_profile
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_child_profile(
  p_child_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_child jsonb;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_child_id);

  SELECT jsonb_build_object(
    'childId', p.id,
    'churchId', p.church_id,
    'firstName', p.first_name,
    'lastName', p.last_name,
    'dateOfBirth', p.date_of_birth,
    'allergies', COALESCE(p.allergies, '[]'::jsonb),
    'emergencyContactName', coalesce(p.emergency_contact_name, ''),
    'emergencyContactPhone', coalesce(p.emergency_contact_phone, ''),
    'guardians', COALESCE(g.guardians, '[]'::jsonb)
  )
  INTO v_child
  FROM public.profiles p
  LEFT JOIN LATERAL (
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', g2.id,
          'guardianProfileId', g2.guardian_profile_id,
          'guardianFirstName', gp.first_name,
          'guardianLastName', gp.last_name,
          'relationship', g2.relationship,
          'isPrimary', g2.is_primary
        )
        ORDER BY g2.is_primary DESC, gp.last_name, gp.first_name
      ),
      '[]'::jsonb
    ) AS guardians
    FROM public.profile_child_guardian g2
    INNER JOIN public.profiles gp ON gp.id = g2.guardian_profile_id
    WHERE g2.child_profile_id = p.id
      AND g2.church_id = p_church_id
  ) g ON true
  WHERE p.id = p_child_id
    AND p.church_id = p_church_id
    AND p.is_child = true;

  IF v_child IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Niño no encontrado'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'child', v_child
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_child_profile(uuid, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_maintain_child_profile
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_maintain_child_profile(
  p_church_id integer,
  p_action text,
  p_child_id uuid DEFAULT NULL,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_date_of_birth date DEFAULT NULL,
  p_allergies jsonb DEFAULT NULL,
  p_emergency_contact_name text DEFAULT NULL,
  p_emergency_contact_phone text DEFAULT NULL,
  p_guardians jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_action text := lower(trim(coalesce(p_action, '')));
  v_child_id uuid;
  v_child_name text;
  v_guardian jsonb;
  v_guardian_id uuid;
  v_relationship text;
  v_is_primary boolean;
  v_guardian_count integer := 0;
  v_has_primary boolean := false;
  v_idx integer := 0;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF v_action = 'delete' THEN
    IF p_child_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'child_id requerido');
    END IF;

    SELECT trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
    INTO v_child_name
    FROM public.profiles p
    WHERE p.id = p_child_id
      AND p.church_id = p_church_id
      AND p.is_child = true;

    IF v_child_name IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Niño no encontrado');
    END IF;

    DELETE FROM public.profiles
    WHERE id = p_child_id
      AND church_id = p_church_id
      AND is_child = true;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'delete',
      'child_profile',
      p_child_id::text,
      'Eliminó registro de niño ' || v_child_name,
      'actions.members.child.delete',
      jsonb_build_object('child_id', p_child_id)
    );

    RETURN jsonb_build_object('success', true, 'status_code', 200, 'message', 'Niño eliminado');
  END IF;

  IF v_action NOT IN ('insert', 'update') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Acción inválida');
  END IF;

  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'first_name requerido');
  END IF;

  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'last_name requerido');
  END IF;

  IF p_date_of_birth IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'date_of_birth requerido');
  END IF;

  IF p_guardians IS NULL OR jsonb_typeof(p_guardians) <> 'array' OR jsonb_array_length(p_guardians) < 1 THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Al menos un tutor requerido');
  END IF;

  FOR v_guardian IN SELECT value FROM jsonb_array_elements(p_guardians)
  LOOP
    v_guardian_id := (v_guardian->>'guardianProfileId')::uuid;
    v_relationship := lower(trim(coalesce(v_guardian->>'relationship', '')));
    v_is_primary := coalesce((v_guardian->>'isPrimary')::boolean, false);

    IF v_guardian_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'guardianProfileId inválido');
    END IF;

    IF v_relationship NOT IN ('mother', 'father', 'guardian', 'other') THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'relationship inválida');
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles gp
      WHERE gp.id = v_guardian_id
        AND gp.church_id = p_church_id
        AND gp.is_child = false
    ) THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Tutor no válido para esta iglesia');
    END IF;

    v_guardian_count := v_guardian_count + 1;
    IF v_is_primary THEN
      v_has_primary := true;
    END IF;
  END LOOP;

  IF NOT v_has_primary THEN
  -- Auto-asignar primario al primer tutor si ninguno lo es
    v_has_primary := true;
  END IF;

  IF v_action = 'update' THEN
    IF p_child_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'child_id requerido');
    END IF;

    UPDATE public.profiles
    SET
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      date_of_birth = p_date_of_birth,
      allergies = public.fn_normalize_string_tag_array(COALESCE(p_allergies, '[]'::jsonb)),
      emergency_contact_name = nullif(trim(p_emergency_contact_name), ''),
      emergency_contact_phone = nullif(trim(p_emergency_contact_phone), ''),
      updated_at = now()
    WHERE id = p_child_id
      AND church_id = p_church_id
      AND is_child = true
    RETURNING id INTO v_child_id;

    IF v_child_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Niño no encontrado');
    END IF;

    DELETE FROM public.profile_child_guardian
    WHERE child_profile_id = v_child_id
      AND church_id = p_church_id;

    v_child_name := trim(p_first_name) || ' ' || trim(p_last_name);

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'update',
      'child_profile',
      v_child_id::text,
      'Actualizó registro de niño ' || v_child_name,
      'actions.members.child.update',
      jsonb_build_object('child_id', v_child_id)
    );
  ELSE
    INSERT INTO public.profiles (
      first_name,
      last_name,
      date_of_birth,
      allergies,
      emergency_contact_name,
      emergency_contact_phone,
      is_member,
      is_active,
      is_child,
      church_id
    )
    VALUES (
      trim(p_first_name),
      trim(p_last_name),
      p_date_of_birth,
      public.fn_normalize_string_tag_array(COALESCE(p_allergies, '[]'::jsonb)),
      nullif(trim(p_emergency_contact_name), ''),
      nullif(trim(p_emergency_contact_phone), ''),
      false,
      true,
      true,
      p_church_id
    )
    RETURNING id INTO v_child_id;

    INSERT INTO public.address (profile_id)
    VALUES (v_child_id);

    INSERT INTO public.contacts (profile_id)
    VALUES (v_child_id);

    v_child_name := trim(p_first_name) || ' ' || trim(p_last_name);

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'create',
      'child_profile',
      v_child_id::text,
      'Registró niño ' || v_child_name,
      'actions.members.child.create',
      jsonb_build_object('child_id', v_child_id)
    );
  END IF;

  v_idx := 0;
  FOR v_guardian IN SELECT value FROM jsonb_array_elements(p_guardians)
  LOOP
    v_idx := v_idx + 1;
    v_guardian_id := (v_guardian->>'guardianProfileId')::uuid;
    v_relationship := lower(trim(coalesce(v_guardian->>'relationship', '')));
    v_is_primary := coalesce((v_guardian->>'isPrimary')::boolean, false);

  -- Si no hay primario explícito, el primero de la lista lo es
    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_guardians) elem
      WHERE coalesce((elem->>'isPrimary')::boolean, false) = true
    ) AND v_idx = 1 THEN
      v_is_primary := true;
    END IF;

    INSERT INTO public.profile_child_guardian (
      child_profile_id,
      guardian_profile_id,
      church_id,
      relationship,
      is_primary
    )
    VALUES (
      v_child_id,
      v_guardian_id,
      p_church_id,
      v_relationship,
      v_is_primary
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Niño guardado',
    'child_id', v_child_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_maintain_child_profile(
  integer, text, uuid, text, text, date, jsonb, text, text, jsonb
) TO authenticated, service_role;
