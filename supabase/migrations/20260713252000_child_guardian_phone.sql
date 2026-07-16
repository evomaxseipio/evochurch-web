-- Include guardian phone in child list/detail for contact column fallback UI.

CREATE OR REPLACE FUNCTION public.sp_list_child_profiles(
  p_church_id integer,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25,
  p_search text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
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
      COALESCE(p.bio, '') AS notes,
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
            'isPrimary', g2.is_primary,
            'phone', COALESCE(
              NULLIF(TRIM(COALESCE(gc.mobile_phone, '')), ''),
              NULLIF(TRIM(COALESCE(gc.phone, '')), ''),
              ''
            )
          )
          ORDER BY g2.is_primary DESC, gp.last_name, gp.first_name
        ),
        '[]'::jsonb
      ) AS guardians
      FROM public.profile_child_guardian g2
      INNER JOIN public.profiles gp ON gp.id = g2.guardian_profile_id
      LEFT JOIN public.contacts gc ON gc.profile_id = gp.id
      WHERE g2.child_profile_id = p.id
        AND g2.church_id = p_church_id
    ) g ON true
    WHERE p.church_id = p_church_id
      AND p.is_child = true
      AND (
        v_search IS NULL
        OR p.first_name ILIKE '%' || v_search || '%'
        OR p.last_name ILIKE '%' || v_search || '%'
        OR COALESCE(p.emergency_contact_name, '') ILIKE '%' || v_search || '%'
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
            'notes', row.notes,
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
    'notes', coalesce(p.bio, ''),
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
          'isPrimary', g2.is_primary,
          'phone', COALESCE(
            NULLIF(TRIM(COALESCE(gc.mobile_phone, '')), ''),
            NULLIF(TRIM(COALESCE(gc.phone, '')), ''),
            ''
          )
        )
        ORDER BY g2.is_primary DESC, gp.last_name, gp.first_name
      ),
      '[]'::jsonb
    ) AS guardians
    FROM public.profile_child_guardian g2
    INNER JOIN public.profiles gp ON gp.id = g2.guardian_profile_id
    LEFT JOIN public.contacts gc ON gc.profile_id = gp.id
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
