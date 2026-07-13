-- P1.4.1: Familia bidireccional — mostrar padres en perfil del hijo
-- (más cónyuge del padre/madre como co-padre/madre).

CREATE OR REPLACE FUNCTION public.sp_get_member_family(
  p_profile_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_spouse_id uuid;
  v_spouse jsonb := NULL;
  v_children jsonb := '[]'::jsonb;
  v_parents jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  IF EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.church_id = p_church_id
      AND p.is_child = true
  ) THEN
    RAISE EXCEPTION 'El perfil no es un adulto.';
  END IF;

  SELECT ps.spouse_profile_id
  INTO v_spouse_id
  FROM public.profile_spouse ps
  WHERE ps.profile_id = p_profile_id
    AND ps.church_id = p_church_id;

  IF v_spouse_id IS NOT NULL THEN
    SELECT jsonb_build_object(
      'profileId', sp.id,
      'firstName', sp.first_name,
      'lastName', sp.last_name,
      'gender', sp.gender,
      'isMember', sp.is_member,
      'isActive', sp.is_active,
      'maritalStatus', sp.marital_status,
      'membershipRole', coalesce(mr.role_name, 'Visita')
    )
    INTO v_spouse
    FROM public.profiles sp
    LEFT JOIN LATERAL (
      SELECT m2.member_role_id
      FROM public.membership m2
      WHERE m2.profile_id = sp.id
        AND m2.church_id = sp.church_id
      ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN public.member_roles mr ON mr.id = m.member_role_id
    WHERE sp.id = v_spouse_id
      AND sp.church_id = p_church_id
      AND sp.is_child = false;
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
        p_profile_id,
        coalesce(v_spouse_id, '00000000-0000-0000-0000-000000000000'::uuid)
      )
    ORDER BY p.id, p.last_name, p.first_name
  ) child;

  -- Padres directos + cónyuge del padre/madre (co-padre inferido)
  WITH direct_parents AS (
    SELECT
      p.id,
      p.first_name,
      p.last_name,
      p.gender,
      p.is_member,
      p.is_active,
      p.marital_status,
      coalesce(mr.role_name, 'Visita') AS membership_role,
      false AS inferred_from_spouse,
      CASE
        WHEN p.gender = 'Female' THEN 'mother'
        WHEN p.gender = 'Male' THEN 'father'
        ELSE 'parent'
      END AS parent_role
    FROM public.profile_parent_child ppc
    INNER JOIN public.profiles p ON p.id = ppc.parent_profile_id
    LEFT JOIN LATERAL (
      SELECT m2.member_role_id
      FROM public.membership m2
      WHERE m2.profile_id = p.id
        AND m2.church_id = p.church_id
      ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN public.member_roles mr ON mr.id = m.member_role_id
    WHERE ppc.child_profile_id = p_profile_id
      AND ppc.church_id = p_church_id
      AND p.church_id = p_church_id
      AND p.is_child = false
  ),
  inferred_parents AS (
    SELECT
      sp.id,
      sp.first_name,
      sp.last_name,
      sp.gender,
      sp.is_member,
      sp.is_active,
      sp.marital_status,
      coalesce(mr.role_name, 'Visita') AS membership_role,
      true AS inferred_from_spouse,
      CASE
        WHEN sp.gender = 'Female' THEN 'mother'
        WHEN sp.gender = 'Male' THEN 'father'
        ELSE 'parent'
      END AS parent_role
    FROM direct_parents dp
    INNER JOIN public.profile_spouse ps
      ON ps.profile_id = dp.id
      AND ps.church_id = p_church_id
    INNER JOIN public.profiles sp ON sp.id = ps.spouse_profile_id
    LEFT JOIN LATERAL (
      SELECT m2.member_role_id
      FROM public.membership m2
      WHERE m2.profile_id = sp.id
        AND m2.church_id = sp.church_id
      ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
      LIMIT 1
    ) m ON true
    LEFT JOIN public.member_roles mr ON mr.id = m.member_role_id
    WHERE sp.church_id = p_church_id
      AND sp.is_child = false
      AND sp.id <> p_profile_id
      AND NOT EXISTS (SELECT 1 FROM direct_parents d2 WHERE d2.id = sp.id)
  ),
  all_parents AS (
    SELECT * FROM direct_parents
    UNION ALL
    SELECT * FROM inferred_parents
  )
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'profileId', ap.id,
        'firstName', ap.first_name,
        'lastName', ap.last_name,
        'gender', ap.gender,
        'isMember', ap.is_member,
        'isActive', ap.is_active,
        'maritalStatus', ap.marital_status,
        'membershipRole', ap.membership_role,
        'parentRole', ap.parent_role,
        'inferredFromSpouse', ap.inferred_from_spouse
      )
      ORDER BY ap.inferred_from_spouse, ap.last_name, ap.first_name, ap.id
    ),
    '[]'::jsonb
  )
  INTO v_parents
  FROM all_parents ap;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'spouse', v_spouse,
    'parents', v_parents,
    'children', v_children
  );
END;
$$;
