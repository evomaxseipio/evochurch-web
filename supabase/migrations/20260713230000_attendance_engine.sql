-- P2 Attendance Engine (EPIC 03 / ADR-006).
-- Un motor: attendance_session + attendance_record.
-- Casa/estudio = church_ministries (roster); activity_type clasifica la sesión.
-- P2.x ministry_category: diferido. P3 children checklist: diferido.
-- ministry_id requerido si activity_type IN (house_group, bible_study, children);
-- nullable solo si activity_type = service.

-- ---------------------------------------------------------------------------
-- Permissions
-- ---------------------------------------------------------------------------

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('attendance:read', 'attendance', 'read', 'Ver sesiones y registros de asistencia'),
  ('attendance:write', 'attendance', 'write', 'Crear sesiones y marcar asistencia')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY['attendance:read']::text[]) AS k
WHERE arp.permission_key = 'dashboard:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY['attendance:write']::text[]) AS k
WHERE arp.permission_key = 'members:write'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY['attendance:read']::text[]) AS k
WHERE crp.permission_key = 'dashboard:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY['attendance:write']::text[]) AS k
WHERE crp.permission_key = 'members:write'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.attendance_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church (id) ON DELETE CASCADE,
  session_date date NOT NULL,
  activity_type text NOT NULL,
  ministry_id uuid REFERENCES public.church_ministries (id) ON DELETE RESTRICT,
  event_id uuid REFERENCES public.church_events (id) ON DELETE SET NULL,
  title text,
  notes text,
  created_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_session_activity_type_check CHECK (
    activity_type IN ('house_group', 'bible_study', 'children', 'service')
  ),
  -- service: ministry_id opcional; house_group / bible_study / children: requerido
  CONSTRAINT attendance_session_ministry_required_check CHECK (
    activity_type = 'service' OR ministry_id IS NOT NULL
  )
);

COMMENT ON TABLE public.attendance_session IS
  'Sesión de asistencia (motor único ADR-006). ministry_id = grupo (casa/estudio); activity_type = clase de sesión.';
COMMENT ON COLUMN public.attendance_session.ministry_id IS
  'Requerido para house_group, bible_study y children. Opcional para service.';
COMMENT ON COLUMN public.attendance_session.event_id IS
  'Vínculo opcional futuro a /eventos; MVP crea sesiones sueltas.';

CREATE INDEX IF NOT EXISTS idx_attendance_session_church_date
  ON public.attendance_session (church_id, session_date DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_session_church_type
  ON public.attendance_session (church_id, activity_type);

CREATE INDEX IF NOT EXISTS idx_attendance_session_ministry
  ON public.attendance_session (church_id, ministry_id)
  WHERE ministry_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.attendance_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.attendance_session (id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church (id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT attendance_record_status_check CHECK (
    status IN ('present', 'absent', 'late')
  ),
  CONSTRAINT attendance_record_session_profile_unique UNIQUE (session_id, profile_id)
);

COMMENT ON TABLE public.attendance_record IS
  'Registro de asistencia por persona en una sesión.';

CREATE INDEX IF NOT EXISTS idx_attendance_record_church_session
  ON public.attendance_record (church_id, session_id);

CREATE INDEX IF NOT EXISTS idx_attendance_record_profile
  ON public.attendance_record (church_id, profile_id);

ALTER TABLE public.attendance_session ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_session FORCE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_record ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_record FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_attendance_session_select ON public.attendance_session;
DROP POLICY IF EXISTS tenant_attendance_session_insert ON public.attendance_session;
DROP POLICY IF EXISTS tenant_attendance_session_update ON public.attendance_session;
DROP POLICY IF EXISTS tenant_attendance_session_delete ON public.attendance_session;

CREATE POLICY tenant_attendance_session_select ON public.attendance_session
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_attendance_session_insert ON public.attendance_session
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_attendance_session_update ON public.attendance_session
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_attendance_session_delete ON public.attendance_session
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

DROP POLICY IF EXISTS tenant_attendance_record_select ON public.attendance_record;
DROP POLICY IF EXISTS tenant_attendance_record_insert ON public.attendance_record;
DROP POLICY IF EXISTS tenant_attendance_record_update ON public.attendance_record;
DROP POLICY IF EXISTS tenant_attendance_record_delete ON public.attendance_record;

CREATE POLICY tenant_attendance_record_select ON public.attendance_record
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_attendance_record_insert ON public.attendance_record
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_attendance_record_update ON public.attendance_record
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_attendance_record_delete ON public.attendance_record
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_assert_attendance_ministry(
  p_church_id integer,
  p_ministry_id uuid,
  p_activity_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  IF p_activity_type IS DISTINCT FROM 'service' AND p_ministry_id IS NULL THEN
    RAISE EXCEPTION 'ministry_id is required for activity_type %', p_activity_type
      USING ERRCODE = 'P0001';
  END IF;

  IF p_ministry_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.church_ministries cm
    WHERE cm.id = p_ministry_id
      AND cm.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'ministry not found in church'
      USING ERRCODE = 'P0001';
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- sp_list_attendance_sessions
-- ---------------------------------------------------------------------------

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

  SELECT count(*)::integer
  INTO v_total
  FROM public.attendance_session s
  WHERE s.church_id = p_church_id
    AND (p_activity_type IS NULL OR s.activity_type = p_activity_type)
    AND (p_ministry_id IS NULL OR s.ministry_id = p_ministry_id)
    AND (p_from IS NULL OR s.session_date >= p_from)
    AND (p_to IS NULL OR s.session_date <= p_to);

  SELECT coalesce(
    jsonb_agg(row_data ORDER BY session_date DESC, created_at DESC),
    '[]'::jsonb
  )
  INTO v_sessions
  FROM (
    SELECT
      s.session_date,
      s.created_at,
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
        'presentCount', coalesce(agg.present_count, 0),
        'absentCount', coalesce(agg.absent_count, 0),
        'lateCount', coalesce(agg.late_count, 0),
        'recordCount', coalesce(agg.record_count, 0)
      ) AS row_data
    FROM public.attendance_session s
    LEFT JOIN public.church_ministries cm
      ON cm.id = s.ministry_id AND cm.church_id = s.church_id
    LEFT JOIN LATERAL (
      SELECT
        count(*) FILTER (WHERE r.status = 'present')::integer AS present_count,
        count(*) FILTER (WHERE r.status = 'absent')::integer AS absent_count,
        count(*) FILTER (WHERE r.status = 'late')::integer AS late_count,
        count(*)::integer AS record_count
      FROM public.attendance_record r
      WHERE r.session_id = s.id
        AND r.church_id = s.church_id
    ) agg ON true
    WHERE s.church_id = p_church_id
      AND (p_activity_type IS NULL OR s.activity_type = p_activity_type)
      AND (p_ministry_id IS NULL OR s.ministry_id = p_ministry_id)
      AND (p_from IS NULL OR s.session_date >= p_from)
      AND (p_to IS NULL OR s.session_date <= p_to)
    ORDER BY s.session_date DESC, s.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) q;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'sessions', v_sessions,
    'total', v_total,
    'limit', v_limit,
    'offset', v_offset
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_attendance_sessions(
  integer, text, uuid, date, date, integer, integer
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_get_attendance_session
-- ---------------------------------------------------------------------------

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
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:read');

  SELECT jsonb_build_object(
    'id', s.id,
    'churchId', s.church_id,
    'sessionDate', s.session_date,
    'activityType', s.activity_type,
    'ministryId', s.ministry_id,
    'ministryName', coalesce(cm.name, ''),
    'ministryMemberIds', coalesce(cm.member_profile_ids, '{}'::uuid[]),
    'eventId', s.event_id,
    'title', coalesce(s.title, ''),
    'notes', coalesce(s.notes, ''),
    'createdByProfileId', s.created_by_profile_id,
    'createdAt', s.created_at,
    'updatedAt', s.updated_at
  )
  INTO v_session
  FROM public.attendance_session s
  LEFT JOIN public.church_ministries cm
    ON cm.id = s.ministry_id AND cm.church_id = s.church_id
  WHERE s.id = p_session_id
    AND s.church_id = p_church_id;

  IF v_session IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Sesión no encontrada'
    );
  END IF;

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'sessionId', r.session_id,
        'churchId', r.church_id,
        'profileId', r.profile_id,
        'status', r.status,
        'notes', coalesce(r.notes, ''),
        'firstName', coalesce(p.first_name, ''),
        'lastName', coalesce(p.last_name, ''),
        'createdAt', r.created_at,
        'updatedAt', r.updated_at
      )
      ORDER BY p.last_name NULLS LAST, p.first_name NULLS LAST
    ),
    '[]'::jsonb
  )
  INTO v_records
  FROM public.attendance_record r
  LEFT JOIN public.profiles p ON p.id = r.profile_id
  WHERE r.session_id = p_session_id
    AND r.church_id = p_church_id;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'session', v_session,
    'records', v_records
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_attendance_session(uuid, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_maintain_attendance_session
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_maintain_attendance_session(
  p_church_id integer,
  p_action text,
  p_session_id uuid DEFAULT NULL,
  p_session_date date DEFAULT NULL,
  p_activity_type text DEFAULT NULL,
  p_ministry_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_title text DEFAULT NULL,
  p_notes text DEFAULT NULL
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
  v_profile_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:write');
  v_profile_id := public.fn_get_session_profile_id();

  IF v_action = 'delete' THEN
    IF p_session_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status_code', 400,
        'message', 'session_id requerido'
      );
    END IF;

    DELETE FROM public.attendance_session s
    WHERE s.id = p_session_id
      AND s.church_id = p_church_id
    RETURNING s.id INTO v_session_id;

    IF v_session_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status_code', 404,
        'message', 'Sesión no encontrada'
      );
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

    RETURN jsonb_build_object(
      'success', true,
      'status_code', 200,
      'sessionId', v_session_id
    );
  END IF;

  IF v_action NOT IN ('insert', 'update') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Acción inválida'
    );
  END IF;

  v_activity := lower(trim(coalesce(p_activity_type, '')));
  IF v_activity NOT IN ('house_group', 'bible_study', 'children', 'service') THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'activity_type inválido'
    );
  END IF;

  IF p_session_date IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'session_date requerido'
    );
  END IF;

  PERFORM public.fn_assert_attendance_ministry(
    p_church_id,
    p_ministry_id,
    v_activity
  );

  IF p_event_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.church_events e
    WHERE e.id = p_event_id
      AND e.church_id = p_church_id
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'event_id inválido'
    );
  END IF;

  IF v_action = 'insert' THEN
    INSERT INTO public.attendance_session (
      church_id,
      session_date,
      activity_type,
      ministry_id,
      event_id,
      title,
      notes,
      created_by_profile_id
    ) VALUES (
      p_church_id,
      p_session_date,
      v_activity,
      p_ministry_id,
      p_event_id,
      nullif(trim(coalesce(p_title, '')), ''),
      nullif(trim(coalesce(p_notes, '')), ''),
      v_profile_id
    )
    RETURNING id INTO v_session_id;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'attendance',
      'create',
      'attendance_session',
      v_session_id::text,
      'Creó sesión de asistencia (' || v_activity || ')',
      'actions.attendance.session.create',
      jsonb_build_object(
        'session_id', v_session_id,
        'activity_type', v_activity,
        'ministry_id', p_ministry_id,
        'session_date', p_session_date
      )
    );
  ELSE
    IF p_session_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status_code', 400,
        'message', 'session_id requerido'
      );
    END IF;

    UPDATE public.attendance_session s
    SET
      session_date = p_session_date,
      activity_type = v_activity,
      ministry_id = p_ministry_id,
      event_id = p_event_id,
      title = nullif(trim(coalesce(p_title, '')), ''),
      notes = nullif(trim(coalesce(p_notes, '')), ''),
      updated_at = now()
    WHERE s.id = p_session_id
      AND s.church_id = p_church_id
    RETURNING s.id INTO v_session_id;

    IF v_session_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'status_code', 404,
        'message', 'Sesión no encontrada'
      );
    END IF;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'attendance',
      'update',
      'attendance_session',
      v_session_id::text,
      'Actualizó sesión de asistencia (' || v_activity || ')',
      'actions.attendance.session.update',
      jsonb_build_object(
        'session_id', v_session_id,
        'activity_type', v_activity,
        'ministry_id', p_ministry_id,
        'session_date', p_session_date
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'sessionId', v_session_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_maintain_attendance_session(
  integer, text, uuid, date, text, uuid, uuid, text, text
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_set_attendance_records (upsert lote)
-- ---------------------------------------------------------------------------

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
  v_session_exists boolean := false;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:write');

  SELECT true
  INTO v_session_exists
  FROM public.attendance_session s
  WHERE s.id = p_session_id
    AND s.church_id = p_church_id;

  IF NOT coalesce(v_session_exists, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Sesión no encontrada'
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

GRANT EXECUTE ON FUNCTION public.sp_set_attendance_records(integer, uuid, jsonb)
  TO authenticated, service_role;
