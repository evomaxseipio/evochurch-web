-- The generic profile RPC always inserts a full address row; address columns are
-- NOT NULL. Attendance needs a truly minimal visitor insert (name + surname).

CREATE OR REPLACE FUNCTION public.sp_add_attendance_visitor(
  p_church_id integer,
  p_session_id uuid,
  p_first_name varchar,
  p_last_name varchar,
  p_phone varchar DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_attendance_result jsonb;
  v_profile_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:write');

  IF nullif(trim(p_first_name), '') IS NULL
    OR nullif(trim(p_last_name), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Nombre y apellido son obligatorios'
    );
  END IF;

  INSERT INTO public.profiles (
    church_id,
    first_name,
    last_name,
    is_member,
    is_active
  ) VALUES (
    p_church_id,
    trim(p_first_name),
    trim(p_last_name),
    false,
    true
  )
  RETURNING id INTO v_profile_id;

  INSERT INTO public.contacts (profile_id, phone)
  VALUES (v_profile_id, nullif(trim(p_phone), ''));

  v_attendance_result := public.sp_set_attendance_records(
    p_church_id,
    p_session_id,
    jsonb_build_array(jsonb_build_object(
      'profileId', v_profile_id,
      'status', 'present',
      'notes', ''
    ))
  );

  IF NOT coalesce((v_attendance_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION '%', coalesce(
      v_attendance_result->>'message',
      'No se pudo registrar la asistencia'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'profileId', v_profile_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_add_attendance_visitor(
  integer, uuid, varchar, varchar, varchar
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sp_add_attendance_visitor(
  integer, uuid, varchar, varchar, varchar
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

