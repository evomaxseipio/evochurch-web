-- P1.2: Familia en perfil de miembro adulto (cónyuge + hijos vía tutores P1).

-- ---------------------------------------------------------------------------
-- profile_spouse — vínculo opcional entre dos adultos de la misma iglesia
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_spouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  spouse_profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church (id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_spouse_distinct_profiles CHECK (profile_id <> spouse_profile_id),
  CONSTRAINT profile_spouse_unique_profile UNIQUE (profile_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_spouse_church
  ON public.profile_spouse (church_id);

CREATE INDEX IF NOT EXISTS idx_profile_spouse_spouse
  ON public.profile_spouse (spouse_profile_id);

ALTER TABLE public.profile_spouse ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_spouse FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_profile_spouse_select ON public.profile_spouse;
DROP POLICY IF EXISTS tenant_profile_spouse_insert ON public.profile_spouse;
DROP POLICY IF EXISTS tenant_profile_spouse_update ON public.profile_spouse;
DROP POLICY IF EXISTS tenant_profile_spouse_delete ON public.profile_spouse;

CREATE POLICY tenant_profile_spouse_select ON public.profile_spouse
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_spouse_insert ON public.profile_spouse
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_spouse_update ON public.profile_spouse
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_spouse_delete ON public.profile_spouse
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- ---------------------------------------------------------------------------
-- sp_get_member_family — cónyuge + hijos (tutores del adulto o del cónyuge)
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
        'childId', child.id,
        'firstName', child.first_name,
        'lastName', child.last_name,
        'dateOfBirth', child.date_of_birth,
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
      p.allergies,
      p.emergency_contact_name,
      p.emergency_contact_phone,
      p.bio,
      g.guardians
    FROM public.profiles p
    INNER JOIN public.profile_child_guardian pcg
      ON pcg.child_profile_id = p.id
      AND pcg.church_id = p_church_id
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
      AND pcg.guardian_profile_id IN (
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

GRANT EXECUTE ON FUNCTION public.sp_get_member_family(uuid, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_link_profile_spouse
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_link_profile_spouse(
  p_profile_id uuid,
  p_spouse_profile_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_old_spouse uuid;
  v_spouse_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);
  PERFORM public.fn_assert_profile_in_session_church(p_spouse_profile_id);

  IF p_profile_id = p_spouse_profile_id THEN
    RAISE EXCEPTION 'No se puede vincular un perfil consigo mismo.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_profile_id AND church_id = p_church_id AND is_child = true
  ) OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_spouse_profile_id AND church_id = p_church_id AND is_child = true
  ) THEN
    RAISE EXCEPTION 'Solo se pueden vincular perfiles de adultos.';
  END IF;

  SELECT ps.spouse_profile_id
  INTO v_old_spouse
  FROM public.profile_spouse ps
  WHERE ps.profile_id = p_profile_id
    AND ps.church_id = p_church_id;

  IF v_old_spouse IS NOT NULL AND v_old_spouse <> p_spouse_profile_id THEN
    DELETE FROM public.profile_spouse
    WHERE church_id = p_church_id
      AND (
        profile_id IN (p_profile_id, v_old_spouse)
        OR spouse_profile_id IN (p_profile_id, v_old_spouse)
      );
  END IF;

  DELETE FROM public.profile_spouse
  WHERE church_id = p_church_id
    AND (
      profile_id = p_spouse_profile_id
      OR spouse_profile_id = p_spouse_profile_id
    );

  INSERT INTO public.profile_spouse (profile_id, spouse_profile_id, church_id)
  VALUES (p_profile_id, p_spouse_profile_id, p_church_id)
  ON CONFLICT (profile_id) DO UPDATE
    SET spouse_profile_id = EXCLUDED.spouse_profile_id,
        updated_at = now();

  INSERT INTO public.profile_spouse (profile_id, spouse_profile_id, church_id)
  VALUES (p_spouse_profile_id, p_profile_id, p_church_id)
  ON CONFLICT (profile_id) DO UPDATE
    SET spouse_profile_id = EXCLUDED.spouse_profile_id,
        updated_at = now();

  SELECT trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
  INTO v_spouse_name
  FROM public.profiles p
  WHERE p.id = p_spouse_profile_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'members',
    'update',
    'profile_spouse',
    p_profile_id::text,
    'Vinculó cónyuge ' || v_spouse_name,
    'actions.members.spouse.link',
    jsonb_build_object(
      'profile_id', p_profile_id,
      'spouse_profile_id', p_spouse_profile_id
    )
  );

  RETURN jsonb_build_object('success', true, 'status_code', 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_link_profile_spouse(uuid, uuid, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_unlink_profile_spouse
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_unlink_profile_spouse(
  p_profile_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_spouse_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  SELECT ps.spouse_profile_id
  INTO v_spouse_id
  FROM public.profile_spouse ps
  WHERE ps.profile_id = p_profile_id
    AND ps.church_id = p_church_id;

  IF v_spouse_id IS NULL THEN
    RETURN jsonb_build_object('success', true, 'status_code', 200);
  END IF;

  DELETE FROM public.profile_spouse
  WHERE church_id = p_church_id
    AND (
      profile_id IN (p_profile_id, v_spouse_id)
      OR spouse_profile_id IN (p_profile_id, v_spouse_id)
    );

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'members',
    'update',
    'profile_spouse',
    p_profile_id::text,
    'Desvinculó cónyuge',
    'actions.members.spouse.unlink',
    jsonb_build_object('profile_id', p_profile_id)
  );

  RETURN jsonb_build_object('success', true, 'status_code', 200);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_unlink_profile_spouse(uuid, integer)
  TO authenticated, service_role;
