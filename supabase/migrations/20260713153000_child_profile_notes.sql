-- P1.1: observaciones en registro de niños (reutiliza profiles.bio).

DROP FUNCTION IF EXISTS public.sp_maintain_child_profile(
  integer, text, uuid, text, text, date, jsonb, text, text, jsonb
);

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
  v_action text := lower(trim(coalesce(p_action, '')));
  v_child_id uuid;
  v_child_name text;
  v_guardian jsonb;
  v_guardian_id uuid;
  v_relationship text;
  v_is_primary boolean;
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

    IF v_is_primary THEN
      v_has_primary := true;
    END IF;
  END LOOP;

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
      bio = nullif(trim(p_notes), ''),
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
