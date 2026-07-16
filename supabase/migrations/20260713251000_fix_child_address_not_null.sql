-- Fix child create: address.street_address (and sibling cols) are NOT NULL.
-- Insert empty strings instead of relying on defaults.

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
  v_family_rel text;
  v_child_gender text;
  v_guardians jsonb;
  v_old_guardian_ids uuid[] := ARRAY[]::uuid[];
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

  IF nullif(trim(COALESCE(p_emergency_contact_name, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Contacto de emergencia requerido'
    );
  END IF;
  IF nullif(trim(COALESCE(p_emergency_contact_phone, '')), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Teléfono de emergencia requerido'
    );
  END IF;

  v_guardians := COALESCE(p_guardians, '[]'::jsonb);
  IF jsonb_typeof(v_guardians) <> 'array' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Tutores inválidos');
  END IF;

  FOR v_guardian IN SELECT value FROM jsonb_array_elements(v_guardians)
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

    INSERT INTO public.address (
      profile_id, street_address, state_province, city_state, country
    ) VALUES (
      v_child_id, '', '', '', ''
    );
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

  SELECT coalesce(array_agg(guardian_profile_id), ARRAY[]::uuid[])
  INTO v_old_guardian_ids
  FROM public.profile_child_guardian
  WHERE child_profile_id = v_child_id
    AND church_id = p_church_id;

  DELETE FROM public.profile_child_guardian
  WHERE child_profile_id = v_child_id
    AND church_id = p_church_id;

  v_idx := 0;
  FOR v_guardian IN SELECT value FROM jsonb_array_elements(v_guardians)
  LOOP
    v_idx := v_idx + 1;
    v_guardian_id := (v_guardian->>'guardianProfileId')::uuid;
    v_relationship := lower(trim(coalesce(v_guardian->>'relationship', '')));
    v_is_primary := coalesce((v_guardian->>'isPrimary')::boolean, false);

    IF NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(v_guardians) elem
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

  -- Drop family links that came only from guardians that were removed.
  IF cardinality(v_old_guardian_ids) > 0 THEN
    DELETE FROM public.profile_parent_child ppc
    WHERE ppc.child_profile_id = v_child_id
      AND ppc.church_id = p_church_id
      AND ppc.parent_profile_id = ANY (v_old_guardian_ids)
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(v_guardians) elem
        WHERE (elem->>'guardianProfileId')::uuid = ppc.parent_profile_id
      );
  END IF;

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
