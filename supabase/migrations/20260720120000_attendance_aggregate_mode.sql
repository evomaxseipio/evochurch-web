-- P3.x — Aggregate mode on the existing attendance engine (ADR-006).

ALTER TABLE public.attendance_session
  ADD COLUMN IF NOT EXISTS aggregate_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS attendance_mode text NOT NULL DEFAULT 'individual';

ALTER TABLE public.attendance_session
  DROP CONSTRAINT IF EXISTS attendance_session_mode_check,
  ADD CONSTRAINT attendance_session_mode_check
    CHECK (attendance_mode IN ('individual', 'aggregate')),
  DROP CONSTRAINT IF EXISTS attendance_session_aggregate_data_check,
  ADD CONSTRAINT attendance_session_aggregate_data_check CHECK (
    jsonb_typeof(aggregate_data) = 'array'
    AND (
      attendance_mode = 'individual'
      OR (
        jsonb_array_length(aggregate_data) > 0
        AND NOT jsonb_path_exists(
          aggregate_data,
          '$[*] ? (!exists(@.label) || @.label.type() != "string" || @.label == "" || !exists(@.value) || @.value.type() != "number" || @.value < 0)'
        )
      )
    )
  );

COMMENT ON COLUMN public.attendance_session.attendance_mode IS
  'Capture mode for the single attendance engine: individual or aggregate.';
COMMENT ON COLUMN public.attendance_session.aggregate_data IS
  'Dynamic aggregate concepts [{"label": text, "value": non-negative number}].';

CREATE OR REPLACE FUNCTION public.sp_list_attendance_sessions(
  p_church_id integer,
  p_activity_type text DEFAULT NULL,
  p_ministry_id uuid DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_sessions jsonb := '[]'::jsonb;
  v_total integer := 0;
  v_limit integer := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset integer := greatest(0, coalesce(p_offset, 0));
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:read');

  SELECT count(*)::integer INTO v_total
  FROM public.attendance_session s
  WHERE s.church_id = p_church_id
    AND (p_activity_type IS NULL OR s.activity_type = p_activity_type)
    AND (p_ministry_id IS NULL OR s.ministry_id = p_ministry_id)
    AND (p_from IS NULL OR s.session_date >= p_from)
    AND (p_to IS NULL OR s.session_date <= p_to);

  SELECT coalesce(jsonb_agg(row_data ORDER BY session_date DESC, created_at DESC), '[]'::jsonb)
  INTO v_sessions
  FROM (
    SELECT s.session_date, s.created_at,
      jsonb_build_object(
        'id', s.id,
        'churchId', s.church_id,
        'sessionDate', s.session_date,
        'activityType', s.activity_type,
        'ministryId', s.ministry_id,
        'ministryName', coalesce(cm.name, ''),
        'eventId', s.event_id,
        'title', coalesce(s.title, ''),
        'notes', coalesce(s.notes, ''),
        'createdByProfileId', s.created_by_profile_id,
        'createdAt', s.created_at,
        'updatedAt', s.updated_at,
        'attendanceMode', s.attendance_mode,
        'aggregateData', s.aggregate_data,
        'presentCount', CASE WHEN s.attendance_mode = 'aggregate' THEN coalesce(aggregate_totals.total, 0) ELSE coalesce(records.present_count, 0) END,
        'absentCount', CASE WHEN s.attendance_mode = 'aggregate' THEN 0 ELSE coalesce(records.absent_count, 0) END,
        'lateCount', CASE WHEN s.attendance_mode = 'aggregate' THEN 0 ELSE coalesce(records.late_count, 0) END,
        'recordCount', CASE WHEN s.attendance_mode = 'aggregate' THEN coalesce(aggregate_totals.total, 0) ELSE coalesce(records.record_count, 0) END
      ) AS row_data
    FROM public.attendance_session s
    LEFT JOIN public.church_ministries cm ON cm.id = s.ministry_id AND cm.church_id = s.church_id
    LEFT JOIN LATERAL (
      SELECT count(*) FILTER (WHERE r.status = 'present')::integer AS present_count,
        count(*) FILTER (WHERE r.status = 'absent')::integer AS absent_count,
        count(*) FILTER (WHERE r.status = 'late')::integer AS late_count,
        count(*)::integer AS record_count
      FROM public.attendance_record r
      WHERE r.session_id = s.id AND r.church_id = s.church_id
    ) records ON true
    LEFT JOIN LATERAL (
      SELECT coalesce(sum((item->>'value')::numeric), 0)::integer AS total
      FROM jsonb_array_elements(s.aggregate_data) item
    ) aggregate_totals ON true
    WHERE s.church_id = p_church_id
      AND (p_activity_type IS NULL OR s.activity_type = p_activity_type)
      AND (p_ministry_id IS NULL OR s.ministry_id = p_ministry_id)
      AND (p_from IS NULL OR s.session_date >= p_from)
      AND (p_to IS NULL OR s.session_date <= p_to)
    ORDER BY s.session_date DESC, s.created_at DESC
    LIMIT v_limit OFFSET v_offset
  ) q;

  RETURN jsonb_build_object('success', true, 'status_code', 200, 'sessions', v_sessions,
    'total', v_total, 'limit', v_limit, 'offset', v_offset);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_attendance_session(
  p_session_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_session jsonb;
  v_records jsonb := '[]'::jsonb;
  v_mode text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:read');

  SELECT s.attendance_mode, jsonb_build_object(
    'id', s.id, 'churchId', s.church_id, 'sessionDate', s.session_date,
    'activityType', s.activity_type, 'ministryId', s.ministry_id,
    'ministryName', coalesce(cm.name, ''),
    'ministryMemberIds', coalesce(cm.member_profile_ids, '{}'::uuid[]),
    'eventId', s.event_id, 'title', coalesce(s.title, ''), 'notes', coalesce(s.notes, ''),
    'createdByProfileId', s.created_by_profile_id, 'createdAt', s.created_at,
    'updatedAt', s.updated_at, 'attendanceMode', s.attendance_mode,
    'aggregateData', s.aggregate_data
  ) INTO v_mode, v_session
  FROM public.attendance_session s
  LEFT JOIN public.church_ministries cm ON cm.id = s.ministry_id AND cm.church_id = s.church_id
  WHERE s.id = p_session_id AND s.church_id = p_church_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Sesión no encontrada');
  END IF;

  IF v_mode = 'individual' THEN
    SELECT coalesce(jsonb_agg(jsonb_build_object(
      'id', r.id, 'sessionId', r.session_id, 'churchId', r.church_id,
      'profileId', r.profile_id, 'status', r.status, 'notes', coalesce(r.notes, ''),
      'firstName', coalesce(p.first_name, ''), 'lastName', coalesce(p.last_name, ''),
      'createdAt', r.created_at, 'updatedAt', r.updated_at
    ) ORDER BY p.last_name NULLS LAST, p.first_name NULLS LAST), '[]'::jsonb)
    INTO v_records
    FROM public.attendance_record r
    LEFT JOIN public.profiles p ON p.id = r.profile_id
    WHERE r.session_id = p_session_id AND r.church_id = p_church_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'status_code', 200, 'session', v_session, 'records', v_records);
END;
$$;

DROP FUNCTION IF EXISTS public.sp_maintain_attendance_session(integer, text, uuid, date, text, uuid, uuid, text, text);
CREATE FUNCTION public.sp_maintain_attendance_session(
  p_church_id integer,
  p_action text,
  p_session_id uuid DEFAULT NULL,
  p_session_date date DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_ministry_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_attendance_mode text DEFAULT 'individual',
  p_aggregate_data jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_action text := lower(trim(coalesce(p_action, '')));
  v_session_id uuid;
  v_activity text;
  v_mode text := lower(trim(coalesce(p_attendance_mode, 'individual')));
  v_profile_id uuid;
  v_old_mode text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:write');
  v_profile_id := public.fn_get_session_profile_id();

  IF v_action = 'delete' THEN
    IF p_session_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'session_id requerido');
    END IF;

    DELETE FROM public.attendance_session s
    WHERE s.id = p_session_id
      AND s.church_id = p_church_id
    RETURNING s.id INTO v_session_id;

    IF v_session_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Sesión no encontrada');
    END IF;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'attendance',
      'delete',
      'attendance_session',
      v_session_id::text,
      'Eliminó sesión de asistencia',
      'actions.attendance.session.delete',
      jsonb_build_object('session_id', v_session_id)
    );

    RETURN jsonb_build_object('success', true, 'status_code', 200, 'sessionId', v_session_id);
  END IF;

  IF v_action NOT IN ('insert', 'update') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Acción inválida');
  END IF;

  v_activity := lower(trim(coalesce(p_activity_type, '')));
  IF v_activity NOT IN ('house_group', 'bible_study', 'children', 'service') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'activity_type inválido');
  END IF;
  IF v_mode NOT IN ('individual', 'aggregate') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'attendance_mode inválido');
  END IF;
  IF p_session_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'session_date requerido');
  END IF;
  IF p_aggregate_data IS NULL OR jsonb_typeof(p_aggregate_data) <> 'array'
    OR (v_mode = 'aggregate' AND jsonb_array_length(p_aggregate_data) = 0) THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'aggregate_data inválido');
  END IF;
  PERFORM public.fn_assert_attendance_ministry(p_church_id, p_ministry_id, v_activity);

  IF p_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.church_events e
    WHERE e.id = p_event_id
      AND e.church_id = p_church_id
  ) THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'event_id inválido');
  END IF;

  IF v_action = 'insert' THEN
    INSERT INTO public.attendance_session (
      church_id, session_date, activity_type, ministry_id, event_id, title, notes,
      created_by_profile_id, attendance_mode, aggregate_data
    ) VALUES (
      p_church_id, p_session_date, v_activity, p_ministry_id, p_event_id,
      nullif(trim(coalesce(p_title, '')), ''), nullif(trim(coalesce(p_notes, '')), ''),
      v_profile_id, v_mode, CASE WHEN v_mode = 'aggregate' THEN p_aggregate_data ELSE '[]'::jsonb END
    ) RETURNING id INTO v_session_id;
  ELSE
    IF p_session_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'session_id requerido');
    END IF;

    SELECT attendance_mode INTO v_old_mode FROM public.attendance_session
    WHERE id = p_session_id AND church_id = p_church_id FOR UPDATE;
    IF v_old_mode IS NULL THEN RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Sesión no encontrada'); END IF;

    IF v_old_mode = 'individual' AND v_mode = 'aggregate' THEN
      DELETE FROM public.attendance_record WHERE session_id = p_session_id AND church_id = p_church_id;
    END IF;

    UPDATE public.attendance_session SET
      session_date = p_session_date, activity_type = v_activity, ministry_id = p_ministry_id,
      event_id = p_event_id, title = nullif(trim(coalesce(p_title, '')), ''),
      notes = nullif(trim(coalesce(p_notes, '')), ''), attendance_mode = v_mode,
      aggregate_data = CASE WHEN v_mode = 'aggregate' THEN p_aggregate_data ELSE '[]'::jsonb END,
      updated_at = now()
    WHERE id = p_session_id AND church_id = p_church_id RETURNING id INTO v_session_id;
  END IF;

  PERFORM public.fn_append_church_audit_log(
    p_church_id, 'attendance', CASE WHEN v_action = 'insert' THEN 'create' ELSE 'update' END,
    'attendance_session', v_session_id::text,
    CASE WHEN v_action = 'insert' THEN 'Creó' ELSE 'Actualizó' END || ' sesión de asistencia (' || v_activity || ', ' || v_mode || ')',
    CASE WHEN v_action = 'insert' THEN 'actions.attendance.session.create' ELSE 'actions.attendance.session.update' END,
    jsonb_build_object(
      'session_id', v_session_id,
      'activity_type', v_activity,
      'attendance_mode', v_mode,
      'ministry_id', p_ministry_id,
      'session_date', p_session_date
    )
  );
  RETURN jsonb_build_object('success', true, 'status_code', 200, 'sessionId', v_session_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_maintain_attendance_session(
  integer, text, uuid, date, text, uuid, uuid, text, text, text, jsonb
) TO authenticated, service_role;

-- Preserve the individual record RPC and reject writes to aggregate sessions.

CREATE OR REPLACE FUNCTION public.sp_set_attendance_records(
  p_church_id integer,
  p_session_id uuid,
  p_records jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_rec jsonb;
  v_profile_id uuid;
  v_status text;
  v_notes text;
  v_count integer := 0;
  v_session_mode text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:write');

  SELECT s.attendance_mode
  INTO v_session_mode
  FROM public.attendance_session s
  WHERE s.id = p_session_id
    AND s.church_id = p_church_id;

  IF v_session_mode IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Sesión no encontrada'
    );
  END IF;

  IF v_session_mode <> 'individual' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'La sesión no usa asistencia individual'
    );
  END IF;

  IF p_records IS NULL OR jsonb_typeof(p_records) <> 'array' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'records debe ser un arreglo'
    );
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_profile_id := nullif(trim(coalesce(v_rec->>'profileId', v_rec->>'profile_id', '')), '')::uuid;
    v_status := lower(trim(coalesce(v_rec->>'status', '')));
    v_notes := nullif(trim(coalesce(v_rec->>'notes', '')), '');

    IF v_profile_id IS NULL THEN
      CONTINUE;
    END IF;

    IF v_status NOT IN ('present', 'absent', 'late') THEN
      RETURN jsonb_build_object(
        'success', false,
        'status_code', 400,
        'message', 'status inválido'
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = v_profile_id
        AND p.church_id = p_church_id
    ) THEN
      RETURN jsonb_build_object(
        'success', false,
        'status_code', 400,
        'message', 'profile_id no pertenece a la iglesia'
      );
    END IF;

    INSERT INTO public.attendance_record (
      session_id,
      church_id,
      profile_id,
      status,
      notes
    ) VALUES (
      p_session_id,
      p_church_id,
      v_profile_id,
      v_status,
      v_notes
    )
    ON CONFLICT (session_id, profile_id) DO UPDATE
    SET
      status = excluded.status,
      notes = excluded.notes,
      updated_at = now();

    v_count := v_count + 1;
  END LOOP;

  UPDATE public.attendance_session
  SET updated_at = now()
  WHERE id = p_session_id
    AND church_id = p_church_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'attendance',
    'update',
    'attendance_records',
    p_session_id::text,
    'Actualizó registros de asistencia (' || v_count || ')',
    'actions.attendance.records.update',
    jsonb_build_object('session_id', p_session_id, 'count', v_count)
  );

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'sessionId', p_session_id,
    'count', v_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_set_attendance_records(integer, uuid, jsonb) TO authenticated, service_role;
