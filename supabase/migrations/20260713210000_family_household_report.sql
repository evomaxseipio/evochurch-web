-- P-family-report: hogares derivados de profile_spouse + profile_parent_child.
-- Sin entidad household (P1.3). Dedup cónyuges: anchor = LEAST(profile_id, spouse_id).

-- ---------------------------------------------------------------------------
-- sp_list_family_households
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_list_family_households(
  p_church_id integer,
  p_search text DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_filter text := LOWER(NULLIF(TRIM(COALESCE(p_filter, 'all')), ''));
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_offset integer;
  v_total integer;
  v_items jsonb;
  v_summary jsonb;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('members:read');

  IF v_filter IS NULL OR v_filter NOT IN (
    'all', 'complete', 'incomplete', 'adults_only', 'with_ministry_children'
  ) THEN
    v_filter := 'all';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  /*
    Dedup rule (documented):
    - Couples with bidirectional profile_spouse rows: one household,
      anchorProfileId = LEAST(profile_id, spouse_profile_id).
    - Single parents (children via profile_parent_child, no spouse):
      anchor = that parent.
    - Adults who are only the GREATER uuid of a spouse pair are not listed.
  */
  WITH undirected_spouses AS (
    SELECT
      ps.church_id,
      LEAST(ps.profile_id, ps.spouse_profile_id) AS anchor_id,
      GREATEST(ps.profile_id, ps.spouse_profile_id) AS other_id
    FROM public.profile_spouse ps
    WHERE ps.church_id = p_church_id
      AND ps.profile_id < ps.spouse_profile_id
  ),
  parent_ids AS (
    SELECT DISTINCT ppc.parent_profile_id AS profile_id
    FROM public.profile_parent_child ppc
    INNER JOIN public.profiles p ON p.id = ppc.parent_profile_id
    WHERE ppc.church_id = p_church_id
      AND p.church_id = p_church_id
      AND p.is_child = false
  ),
  anchors AS (
    SELECT us.anchor_id AS anchor_id, us.other_id AS spouse_id
    FROM undirected_spouses us
    UNION
    SELECT pi.profile_id AS anchor_id, NULL::uuid AS spouse_id
    FROM parent_ids pi
    WHERE NOT EXISTS (
      SELECT 1
      FROM undirected_spouses us
      WHERE us.other_id = pi.profile_id OR us.anchor_id = pi.profile_id
    )
  ),
  household_base AS (
    SELECT
      a.anchor_id,
      a.spouse_id,
      ap.first_name AS anchor_first_name,
      ap.last_name AS anchor_last_name,
      sp.first_name AS spouse_first_name,
      sp.last_name AS spouse_last_name,
      COALESCE(
        NULLIF(TRIM(ap.last_name), ''),
        NULLIF(TRIM(sp.last_name), ''),
        NULLIF(TRIM(ap.first_name), ''),
        '—'
      ) AS family_surname,
      COALESCE(
        NULLIF(TRIM(COALESCE(ac.mobile_phone, '')), ''),
        NULLIF(TRIM(COALESCE(ac.phone, '')), ''),
        NULLIF(TRIM(COALESCE(sc.mobile_phone, '')), ''),
        NULLIF(TRIM(COALESCE(sc.phone, '')), '')
      ) AS phone,
      (
        SELECT COUNT(DISTINCT ppc.child_profile_id)::integer
        FROM public.profile_parent_child ppc
        WHERE ppc.church_id = p_church_id
          AND ppc.parent_profile_id IN (
            a.anchor_id,
            COALESCE(a.spouse_id, '00000000-0000-0000-0000-000000000000'::uuid)
          )
      ) AS children_count,
      (
        SELECT COUNT(DISTINCT ppc.child_profile_id)::integer
        FROM public.profile_parent_child ppc
        INNER JOIN public.profiles cp ON cp.id = ppc.child_profile_id
        WHERE ppc.church_id = p_church_id
          AND cp.church_id = p_church_id
          AND cp.is_child = true
          AND ppc.parent_profile_id IN (
            a.anchor_id,
            COALESCE(a.spouse_id, '00000000-0000-0000-0000-000000000000'::uuid)
          )
      ) AS ministry_children_count
    FROM anchors a
    INNER JOIN public.profiles ap
      ON ap.id = a.anchor_id
     AND ap.church_id = p_church_id
     AND ap.is_child = false
    LEFT JOIN public.profiles sp
      ON sp.id = a.spouse_id
     AND sp.church_id = p_church_id
     AND sp.is_child = false
    LEFT JOIN public.contacts ac ON ac.profile_id = ap.id
    LEFT JOIN public.contacts sc ON sc.profile_id = sp.id
  ),
  households AS (
    SELECT
      hb.*,
      (hb.spouse_id IS NOT NULL) AS has_spouse,
      (1 + CASE WHEN hb.spouse_id IS NOT NULL THEN 1 ELSE 0 END + hb.children_count)
        AS member_count,
      CASE
        WHEN hb.spouse_id IS NOT NULL AND hb.children_count > 0 THEN 'complete'
        WHEN hb.spouse_id IS NULL AND hb.children_count > 0 THEN 'incomplete'
        WHEN hb.spouse_id IS NOT NULL AND hb.children_count = 0 THEN 'complete'
        ELSE 'alerts'
      END AS status,
      ('Familia ' || hb.family_surname) AS family_label,
      TRIM(
        BOTH ' '
        FROM CONCAT_WS(
          ' · ',
          NULLIF(TRIM(CONCAT_WS(' ', hb.anchor_first_name, hb.anchor_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', hb.spouse_first_name, hb.spouse_last_name)), '')
        )
      ) AS adults_label
    FROM household_base hb
  ),
  filtered AS (
    SELECT h.*
    FROM households h
    WHERE (
      v_search IS NULL
      OR h.family_label ILIKE '%' || v_search || '%'
      OR h.adults_label ILIKE '%' || v_search || '%'
      OR COALESCE(h.anchor_first_name, '') ILIKE '%' || v_search || '%'
      OR COALESCE(h.anchor_last_name, '') ILIKE '%' || v_search || '%'
      OR COALESCE(h.spouse_first_name, '') ILIKE '%' || v_search || '%'
      OR COALESCE(h.spouse_last_name, '') ILIKE '%' || v_search || '%'
    )
    AND (
      v_filter = 'all'
      OR (v_filter = 'complete' AND h.status = 'complete')
      OR (v_filter = 'incomplete' AND h.status = 'incomplete')
      OR (v_filter = 'adults_only' AND h.has_spouse AND h.children_count = 0)
      OR (v_filter = 'with_ministry_children' AND h.ministry_children_count > 0)
    )
  )
  SELECT COUNT(*)::integer INTO v_total FROM filtered;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'familyLabel', f.family_label,
        'anchorProfileId', f.anchor_id,
        'adultsLabel', f.adults_label,
        'anchorFirstName', f.anchor_first_name,
        'anchorLastName', f.anchor_last_name,
        'spouseFirstName', f.spouse_first_name,
        'spouseLastName', f.spouse_last_name,
        'memberCount', f.member_count,
        'childrenCount', f.children_count,
        'ministryChildrenCount', f.ministry_children_count,
        'hasSpouse', f.has_spouse,
        'hasMinistryChildren', f.ministry_children_count > 0,
        'status', f.status,
        'phone', f.phone
      )
      ORDER BY f.family_surname, f.anchor_last_name, f.anchor_first_name, f.anchor_id
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM (
    SELECT *
    FROM filtered
    ORDER BY family_surname, anchor_last_name, anchor_first_name, anchor_id
    LIMIT v_page_size
    OFFSET v_offset
  ) f;

  SELECT jsonb_build_object(
    'households', COUNT(*)::integer,
    'complete', COUNT(*) FILTER (WHERE status = 'complete')::integer,
    'incomplete', COUNT(*) FILTER (WHERE status = 'incomplete')::integer,
    'withMinistryChildren', COUNT(*) FILTER (WHERE ministry_children_count > 0)::integer
  )
  INTO v_summary
  FROM households;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'items', COALESCE(v_items, '[]'::jsonb),
    'total', COALESCE(v_total, 0),
    'page', v_page,
    'pageSize', v_page_size,
    'summary', COALESCE(
      v_summary,
      jsonb_build_object(
        'households', 0,
        'complete', 0,
        'incomplete', 0,
        'withMinistryChildren', 0
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_family_households(integer, text, text, integer, integer)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- sp_get_family_household
-- Accepts any adult in the household (anchor or spouse) and resolves to LEAST uuid.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_family_household(
  p_church_id integer,
  p_anchor_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_input_id uuid := p_anchor_profile_id;
  v_spouse_of_input uuid;
  v_anchor_id uuid;
  v_spouse_id uuid;
  v_anchor jsonb;
  v_spouse jsonb := NULL;
  v_children jsonb := '[]'::jsonb;
  v_family_surname text;
  v_status text;
  v_children_count integer;
  v_ministry_children_count integer;
  v_member_count integer;
  v_has_spouse boolean;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('members:read');
  PERFORM public.fn_assert_profile_in_session_church(v_input_id);

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_input_id
      AND p.church_id = p_church_id
      AND p.is_child = true
  ) THEN
    RAISE EXCEPTION 'El perfil no es un adulto.';
  END IF;

  SELECT ps.spouse_profile_id
  INTO v_spouse_of_input
  FROM public.profile_spouse ps
  WHERE ps.profile_id = v_input_id
    AND ps.church_id = p_church_id;

  IF v_spouse_of_input IS NOT NULL THEN
    v_anchor_id := LEAST(v_input_id, v_spouse_of_input);
    v_spouse_id := GREATEST(v_input_id, v_spouse_of_input);
  ELSE
    -- Input may be listed only as spouse_profile_id in the other row style,
    -- or a single parent without spouse.
    SELECT ps.profile_id
    INTO v_spouse_of_input
    FROM public.profile_spouse ps
    WHERE ps.spouse_profile_id = v_input_id
      AND ps.church_id = p_church_id
    LIMIT 1;

    IF v_spouse_of_input IS NOT NULL THEN
      v_anchor_id := LEAST(v_input_id, v_spouse_of_input);
      v_spouse_id := GREATEST(v_input_id, v_spouse_of_input);
    ELSE
      v_anchor_id := v_input_id;
      v_spouse_id := NULL;
    END IF;
  END IF;

  -- Household must have spouse and/or children
  IF v_spouse_id IS NULL AND NOT EXISTS (
    SELECT 1
    FROM public.profile_parent_child ppc
    WHERE ppc.church_id = p_church_id
      AND ppc.parent_profile_id = v_anchor_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'message', 'No se encontró un hogar familiar para este perfil.'
    );
  END IF;

  SELECT jsonb_build_object(
    'profileId', p.id,
    'firstName', p.first_name,
    'lastName', p.last_name,
    'gender', p.gender,
    'isMember', p.is_member,
    'isActive', p.is_active,
    'maritalStatus', p.marital_status,
    'membershipRole', coalesce(mr.role_name, 'Visita'),
    'phone', COALESCE(
      NULLIF(TRIM(COALESCE(c.mobile_phone, '')), ''),
      NULLIF(TRIM(COALESCE(c.phone, '')), '')
    ),
    'role', CASE
      WHEN p.gender = 'Female' THEN 'mother'
      WHEN p.gender = 'Male' THEN 'father'
      ELSE 'parent'
    END
  )
  INTO v_anchor
  FROM public.profiles p
  LEFT JOIN public.contacts c ON c.profile_id = p.id
  LEFT JOIN LATERAL (
    SELECT m2.member_role_id
    FROM public.membership m2
    WHERE m2.profile_id = p.id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  LEFT JOIN public.member_roles mr ON mr.id = m.member_role_id
  WHERE p.id = v_anchor_id
    AND p.church_id = p_church_id
    AND p.is_child = false;

  IF v_anchor IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'message', 'No se encontró un hogar familiar para este perfil.'
    );
  END IF;

  IF v_spouse_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'profileId', p.id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'gender', p.gender,
      'isMember', p.is_member,
      'isActive', p.is_active,
      'maritalStatus', p.marital_status,
      'membershipRole', coalesce(mr.role_name, 'Visita'),
      'phone', COALESCE(
        NULLIF(TRIM(COALESCE(c.mobile_phone, '')), ''),
        NULLIF(TRIM(COALESCE(c.phone, '')), '')
      ),
      'role', CASE
        WHEN p.gender = 'Female' THEN 'mother'
        WHEN p.gender = 'Male' THEN 'father'
        ELSE 'parent'
      END
    )
    INTO v_spouse
    FROM public.profiles p
    LEFT JOIN public.contacts c ON c.profile_id = p.id
    LEFT JOIN LATERAL (
      SELECT m2.member_role_id
      FROM public.membership m2
      WHERE m2.profile_id = p.id
        AND m2.church_id = p.church_id
      ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN public.member_roles mr ON mr.id = m.member_role_id
    WHERE p.id = v_spouse_id
      AND p.church_id = p_church_id
      AND p.is_child = false;
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profileId', child.id,
        'childId', child.id,
        'firstName', child.first_name,
        'lastName', child.last_name,
        'dateOfBirth', child.date_of_birth,
        'gender', child.gender,
        'isChild', child.is_child,
        'isMember', child.is_member,
        'isActive', child.is_active,
        'membershipRole', child.membership_role,
        'familyRelationship', child.family_relationship,
        'age', child.age,
        'allergies', coalesce(child.allergies, '[]'::jsonb),
        'emergencyContactName', coalesce(child.emergency_contact_name, ''),
        'emergencyContactPhone', coalesce(child.emergency_contact_phone, ''),
        'notes', coalesce(child.bio, ''),
        'guardians', child.guardians
      )
      ORDER BY child.last_name, child.first_name, child.id
    ),
    '[]'::jsonb
  )
  INTO v_children
  FROM (
    SELECT DISTINCT ON (p.id)
      p.id,
      p.first_name,
      p.last_name,
      p.date_of_birth,
      p.gender,
      p.is_child,
      p.is_member,
      p.is_active,
      p.allergies,
      p.emergency_contact_name,
      p.emergency_contact_phone,
      p.bio,
      ppc.relationship AS family_relationship,
      coalesce(mr.role_name, 'Visita') AS membership_role,
      CASE
        WHEN p.date_of_birth IS NULL THEN NULL
        ELSE EXTRACT(YEAR FROM age(CURRENT_DATE, p.date_of_birth))::integer
      END AS age,
      g.guardians
    FROM public.profile_parent_child ppc
    INNER JOIN public.profiles p ON p.id = ppc.child_profile_id
    LEFT JOIN LATERAL (
      SELECT m2.member_role_id
      FROM public.membership m2
      WHERE m2.profile_id = p.id
        AND m2.church_id = p.church_id
      ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN public.member_roles mr ON mr.id = m.member_role_id
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
        AND p.is_child = true
    ) g ON true
    WHERE ppc.church_id = p_church_id
      AND ppc.parent_profile_id IN (
        v_anchor_id,
        COALESCE(v_spouse_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    ORDER BY p.id, p.last_name, p.first_name
  ) child;

  v_children_count := jsonb_array_length(v_children);
  SELECT COUNT(*)::integer
  INTO v_ministry_children_count
  FROM jsonb_array_elements(v_children) c
  WHERE (c->>'isChild')::boolean IS TRUE;

  v_has_spouse := v_spouse IS NOT NULL;
  v_member_count := 1 + CASE WHEN v_has_spouse THEN 1 ELSE 0 END + v_children_count;

  v_status := CASE
    WHEN v_has_spouse AND v_children_count > 0 THEN 'complete'
    WHEN NOT v_has_spouse AND v_children_count > 0 THEN 'incomplete'
    WHEN v_has_spouse AND v_children_count = 0 THEN 'complete'
    ELSE 'alerts'
  END;

  v_family_surname := COALESCE(
    NULLIF(TRIM(v_anchor->>'lastName'), ''),
    NULLIF(TRIM(COALESCE(v_spouse->>'lastName', '')), ''),
    NULLIF(TRIM(v_anchor->>'firstName'), ''),
    '—'
  );

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'familyLabel', 'Familia ' || v_family_surname,
    'anchorProfileId', v_anchor_id,
    'status', v_status,
    'hasSpouse', v_has_spouse,
    'memberCount', v_member_count,
    'childrenCount', v_children_count,
    'ministryChildrenCount', COALESCE(v_ministry_children_count, 0),
    'adultsCount', 1 + CASE WHEN v_has_spouse THEN 1 ELSE 0 END,
    'anchor', v_anchor,
    'spouse', v_spouse,
    'children', v_children,
    'tree', jsonb_build_object(
      'adults', CASE
        WHEN v_spouse IS NULL THEN jsonb_build_array(v_anchor)
        ELSE jsonb_build_array(v_anchor, v_spouse)
      END,
      'children', v_children
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_family_household(integer, uuid)
  TO authenticated;
