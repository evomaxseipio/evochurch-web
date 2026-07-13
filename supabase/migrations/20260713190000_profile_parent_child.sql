-- P1.4: Familia completa — vínculo padre/madre ↔ hijo/a (cualquier edad, no solo ministerio infantil).

-- ---------------------------------------------------------------------------
-- profile_parent_child
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_parent_child (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  child_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church (id),
  relationship text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_parent_child_distinct_profiles CHECK (
    parent_profile_id <> child_profile_id
  ),
  CONSTRAINT profile_parent_child_relationship_check CHECK (
    relationship IN ('son', 'daughter', 'child', 'other')
  ),
  CONSTRAINT profile_parent_child_unique_pair UNIQUE (parent_profile_id, child_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_parent_child_church
  ON public.profile_parent_child (church_id);

CREATE INDEX IF NOT EXISTS idx_profile_parent_child_child
  ON public.profile_parent_child (child_profile_id);

ALTER TABLE public.profile_parent_child ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_parent_child FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_profile_parent_child_select ON public.profile_parent_child;
DROP POLICY IF EXISTS tenant_profile_parent_child_insert ON public.profile_parent_child;
DROP POLICY IF EXISTS tenant_profile_parent_child_update ON public.profile_parent_child;
DROP POLICY IF EXISTS tenant_profile_parent_child_delete ON public.profile_parent_child;

CREATE POLICY tenant_profile_parent_child_select ON public.profile_parent_child
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_parent_child_insert ON public.profile_parent_child
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_parent_child_update ON public.profile_parent_child
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_parent_child_delete ON public.profile_parent_child
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- Backfill desde tutores del ministerio infantil (P1)
INSERT INTO public.profile_parent_child (
  parent_profile_id,
  child_profile_id,
  church_id,
  relationship
)
SELECT
  pcg.guardian_profile_id,
  pcg.child_profile_id,
  pcg.church_id,
  CASE
    WHEN cp.gender = 'Female' THEN 'daughter'
    WHEN cp.gender = 'Male' THEN 'son'
    ELSE 'child'
  END
FROM public.profile_child_guardian pcg
INNER JOIN public.profiles cp ON cp.id = pcg.child_profile_id
WHERE pcg.relationship IN ('mother', 'father', 'guardian', 'other')
ON CONFLICT (parent_profile_id, child_profile_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- sp_get_member_family — hijos vía profile_parent_child (cualquier edad)
-- ---------------------------------------------------------------------------

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

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'spouse', v_spouse,
    'children', v_children
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_link_parent_child
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_link_parent_child(
  p_parent_profile_id uuid,
  p_child_profile_id uuid,
  p_church_id integer,
  p_relationship text DEFAULT 'child'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_child_name text;
  v_rel text := lower(trim(coalesce(p_relationship, 'child')));
  v_spouse_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_parent_profile_id);
  PERFORM public.fn_assert_profile_in_session_church(p_child_profile_id);

  IF p_parent_profile_id = p_child_profile_id THEN
    RAISE EXCEPTION 'No se puede vincular un perfil consigo mismo.';
  END IF;

  IF v_rel NOT IN ('son', 'daughter', 'child', 'other') THEN
    RAISE EXCEPTION 'Relación familiar inválida.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_parent_profile_id
      AND church_id = p_church_id
      AND is_child = true
  ) THEN
    RAISE EXCEPTION 'Solo un adulto puede ser padre/madre en el vínculo familiar.';
  END IF;

  SELECT ps.spouse_profile_id INTO v_spouse_id
  FROM public.profile_spouse ps
  WHERE ps.profile_id = p_parent_profile_id
    AND ps.church_id = p_church_id;

  IF v_spouse_id = p_child_profile_id THEN
    RAISE EXCEPTION 'No se puede vincular al cónyuge como hijo/a.';
  END IF;

  INSERT INTO public.profile_parent_child (
    parent_profile_id,
    child_profile_id,
    church_id,
    relationship
  )
  VALUES (
    p_parent_profile_id,
    p_child_profile_id,
    p_church_id,
    v_rel
  )
  ON CONFLICT (parent_profile_id, child_profile_id) DO UPDATE
    SET relationship = EXCLUDED.relationship,
        updated_at = now();

  SELECT trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
  INTO v_child_name
  FROM public.profiles p
  WHERE p.id = p_child_profile_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'members',
    'update',
    'profile_parent_child',
    p_parent_profile_id::text,
    'Vinculó hijo/a ' || v_child_name,
    'actions.members.family_child.link',
    jsonb_build_object(
      'parent_profile_id', p_parent_profile_id,
      'child_profile_id', p_child_profile_id,
      'relationship', v_rel
    )
  );

  RETURN jsonb_build_object('success', true, 'status_code', 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_link_parent_child(uuid, uuid, integer, text)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_unlink_parent_child
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_unlink_parent_child(
  p_parent_profile_id uuid,
  p_child_profile_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_parent_profile_id);

  DELETE FROM public.profile_parent_child
  WHERE church_id = p_church_id
    AND parent_profile_id = p_parent_profile_id
    AND child_profile_id = p_child_profile_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'members',
    'update',
    'profile_parent_child',
    p_parent_profile_id::text,
    'Desvinculó hijo/a',
    'actions.members.family_child.unlink',
    jsonb_build_object(
      'parent_profile_id', p_parent_profile_id,
      'child_profile_id', p_child_profile_id
    )
  );

  RETURN jsonb_build_object('success', true, 'status_code', 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_unlink_parent_child(uuid, uuid, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_maintain_child_profile — sincronizar profile_parent_child con tutores
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
  p_notes text DEFAULT NULL,
  p_guardians jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_child_id uuid := p_child_id;
  v_child_name text;
  v_guardian jsonb;
  v_guardian_id uuid;
  v_relationship text;
  v_is_primary boolean;
  v_idx integer := 0;
  v_guardian_count integer := 0;
  v_family_rel text;
  v_child_gender text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_action = 'delete' THEN
    IF v_child_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'child_id requerido');
    END IF;

    PERFORM public.fn_assert_profile_in_session_church(v_child_id);

    IF NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = v_child_id
        AND p.church_id = p_church_id
        AND p.is_child = true
    ) THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Niño no encontrado');
    END IF;

    DELETE FROM public.profile_parent_child
    WHERE child_profile_id = v_child_id
      AND church_id = p_church_id;

    DELETE FROM public.profiles
    WHERE id = v_child_id
      AND church_id = p_church_id
      AND is_child = true;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'delete',
      'child_profile',
      p_child_id::text,
      'Eliminó registro de niño',
      'actions.members.child.delete',
      jsonb_build_object('child_id', p_child_id)
    );

    RETURN jsonb_build_object('success', true, 'status_code', 200, 'child_id', p_child_id);
  END IF;

  IF p_first_name IS NULL OR trim(p_first_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Nombre requerido');
  END IF;
  IF p_last_name IS NULL OR trim(p_last_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Apellido requerido');
  END IF;
  IF p_date_of_birth IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Fecha de nacimiento requerida');
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
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Relación de tutor inválida');
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.profiles gp
      WHERE gp.id = v_guardian_id
        AND gp.church_id = p_church_id
        AND gp.is_child = false
    ) THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Tutor inválido');
    END IF;

    v_guardian_count := v_guardian_count + 1;
  END LOOP;

  IF p_action = 'update' THEN
    IF v_child_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'child_id requerido');
    END IF;

    PERFORM public.fn_assert_profile_in_session_church(v_child_id);

    IF NOT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = v_child_id
        AND church_id = p_church_id
        AND is_child = true
    ) THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Niño no encontrado');
    END IF;

    UPDATE public.profiles
    SET
      first_name = trim(p_first_name),
      last_name = trim(p_last_name),
      date_of_birth = p_date_of_birth,
      allergies = public.fn_normalize_string_tag_array(COALESCE(p_allergies, '[]'::jsonb)),
      emergency_contact_name = nullif(trim(p_emergency_contact_name), ''),
      emergency_contact_phone = nullif(trim(p_emergency_contact_phone), ''),
      bio = nullif(trim(p_notes), ''),
      updated_at = now()
    WHERE id = v_child_id
      AND church_id = p_church_id
      AND is_child = true;

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
      bio,
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
      nullif(trim(p_notes), ''),
      false,
      true,
      true,
      p_church_id
    )
    RETURNING id INTO v_child_id;

    INSERT INTO public.address (profile_id) VALUES (v_child_id);
    INSERT INTO public.contacts (profile_id) VALUES (v_child_id);

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

  SELECT gender INTO v_child_gender FROM public.profiles WHERE id = v_child_id;

  v_family_rel := CASE
    WHEN v_child_gender = 'Female' THEN 'daughter'
    WHEN v_child_gender = 'Male' THEN 'son'
    ELSE 'child'
  END;

  DELETE FROM public.profile_child_guardian
  WHERE child_profile_id = v_child_id
    AND church_id = p_church_id;

  v_idx := 0;
  FOR v_guardian IN SELECT value FROM jsonb_array_elements(p_guardians)
  LOOP
    v_idx := v_idx + 1;
    v_guardian_id := (v_guardian->>'guardianProfileId')::uuid;
    v_relationship := lower(trim(coalesce(v_guardian->>'relationship', '')));
    v_is_primary := coalesce((v_guardian->>'isPrimary')::boolean, false);

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

    INSERT INTO public.profile_parent_child (
      parent_profile_id,
      child_profile_id,
      church_id,
      relationship
    )
    VALUES (
      v_guardian_id,
      v_child_id,
      p_church_id,
      v_family_rel
    )
    ON CONFLICT (parent_profile_id, child_profile_id) DO UPDATE
      SET relationship = EXCLUDED.relationship,
          updated_at = now();
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
  integer, text, uuid, text, text, date, jsonb, text, text, text, jsonb
) TO authenticated, service_role;
