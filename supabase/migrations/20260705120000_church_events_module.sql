-- Eventos: tabla, timezone iglesia, RBAC write_own, RPCs y dashboard real.

ALTER TABLE public.church
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Santo_Domingo';

COMMENT ON COLUMN public.church.timezone IS 'IANA timezone para agenda y eventos de la iglesia.';

CREATE TABLE IF NOT EXISTS public.church_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  location text,
  event_type text NOT NULL,
  ministry_id uuid REFERENCES public.church_ministries(id) ON DELETE SET NULL,
  fund_id uuid REFERENCES public.funds(fund_id) ON DELETE SET NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  is_all_day boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  is_recurring boolean NOT NULL DEFAULT false,
  recurrence_rule jsonb,
  recurrence_until date,
  created_by_profile_id uuid NOT NULL REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT church_events_event_type_check
    CHECK (event_type IN ('culto', 'estudio', 'evento')),
  CONSTRAINT church_events_recurrence_check
    CHECK (
      (is_recurring = false AND recurrence_rule IS NULL)
      OR (is_recurring = true AND recurrence_rule IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_church_events_church_starts
  ON public.church_events (church_id, starts_at);

CREATE INDEX IF NOT EXISTS idx_church_events_church_ministry
  ON public.church_events (church_id, ministry_id)
  WHERE ministry_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_church_events_featured
  ON public.church_events (church_id, is_featured)
  WHERE is_featured = true;

COMMENT ON TABLE public.church_events IS 'Agenda de la iglesia; ocurrencias recurrentes se expanden en sp_get_events.';
COMMENT ON COLUMN public.church_events.recurrence_rule IS 'JSON: frequency (weekly|monthly), interval, byWeekday[], exceptions[] (ISO dates).';

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('eventos:write_own', 'eventos', 'write_own', 'Crear y editar eventos de ministerios donde es líder')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 10, 'eventos:write_own'
WHERE EXISTS (SELECT 1 FROM public.app_users_role WHERE app_users_role_id = 10)
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, 'eventos:write_own'
FROM public.app_role_permissions arp
WHERE arp.permission_key = 'ministerios:write_own'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, 'eventos:write_own'
FROM public.church_role_permissions crp
WHERE crp.permission_key = 'ministerios:write_own'
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.fn_church_timezone(p_church_id integer)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(
    NULLIF(trim(c.timezone), ''),
    'America/Santo_Domingo'
  )
  FROM public.church c
  WHERE c.id = p_church_id;
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_event_ministry(
  p_church_id integer,
  p_ministry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF p_ministry_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.church_ministries cm
    WHERE cm.id = p_ministry_id
      AND cm.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Ministerio no encontrado para esta iglesia';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_assert_event_fund(
  p_church_id integer,
  p_fund_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF p_fund_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.funds f
    WHERE f.fund_id = p_fund_id
      AND f.church_id = p_church_id
      AND COALESCE(f.is_active, true) = true
  ) THEN
    RAISE EXCEPTION 'Fondo no encontrado para esta iglesia';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_can_edit_event(p_event_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_profile_id uuid;
  v_church_id integer;
  v_ministry_id uuid;
BEGIN
  IF p_event_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT au.profile_id, e.church_id, e.ministry_id
  INTO v_profile_id, v_church_id, v_ministry_id
  FROM public.church_events e
  INNER JOIN public.auth_users au ON au.id = auth.uid()
  WHERE e.id = p_event_id
    AND COALESCE(au.is_active, true) = true;

  IF v_profile_id IS NULL OR v_church_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.fn_user_has_permission('eventos:write') THEN
    RETURN true;
  END IF;

  IF public.fn_user_has_permission('eventos:write_own')
     AND v_ministry_id IS NOT NULL THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.church_ministries cm
      WHERE cm.id = v_ministry_id
        AND cm.church_id = v_church_id
        AND v_profile_id = ANY(COALESCE(cm.leader_profile_ids, ARRAY[]::uuid[]))
    );
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_can_create_event(p_ministry_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_profile_id uuid;
  v_church_id integer;
BEGIN
  SELECT au.profile_id, p.church_id
  INTO v_profile_id, v_church_id
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = auth.uid()
    AND COALESCE(au.is_active, true) = true;

  IF v_profile_id IS NULL OR v_church_id IS NULL THEN
    RETURN false;
  END IF;

  IF public.fn_user_has_permission('eventos:write') THEN
    RETURN true;
  END IF;

  IF public.fn_user_has_permission('eventos:write_own') THEN
    IF p_ministry_id IS NULL THEN
      RETURN false;
    END IF;
    RETURN EXISTS (
      SELECT 1
      FROM public.church_ministries cm
      WHERE cm.id = p_ministry_id
        AND cm.church_id = v_church_id
        AND v_profile_id = ANY(COALESCE(cm.leader_profile_ids, ARRAY[]::uuid[]))
    );
  END IF;

  RETURN false;
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_clear_other_featured_events()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_featured THEN
    UPDATE public.church_events ce
    SET is_featured = false,
        updated_at = now()
    WHERE ce.church_id = NEW.church_id
      AND ce.id <> NEW.id
      AND ce.is_featured;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_clear_other_featured_events ON public.church_events;

CREATE TRIGGER trg_clear_other_featured_events
  BEFORE INSERT OR UPDATE OF is_featured ON public.church_events
  FOR EACH ROW
  WHEN (NEW.is_featured)
  EXECUTE FUNCTION public.fn_clear_other_featured_events();

CREATE OR REPLACE FUNCTION public.fn_church_event_occurrences(
  p_church_id integer,
  p_from date,
  p_to date,
  p_ministry_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE (
  series_id uuid,
  occurrence_date date,
  title text,
  description text,
  location text,
  event_type text,
  ministry_id uuid,
  ministry_name text,
  fund_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  is_all_day boolean,
  is_featured boolean,
  is_recurring boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  WITH tz AS (
    SELECT public.fn_church_timezone(p_church_id) AS name
  ),
  singles AS (
    SELECT
      e.id AS series_id,
      (e.starts_at AT TIME ZONE tz.name)::date AS occurrence_date,
      e.title,
      e.description,
      e.location,
      e.event_type,
      e.ministry_id,
      cm.name AS ministry_name,
      e.fund_id,
      e.starts_at,
      e.ends_at,
      e.is_all_day,
      e.is_featured,
      false AS is_recurring
    FROM public.church_events e
    CROSS JOIN tz
    LEFT JOIN public.church_ministries cm ON cm.id = e.ministry_id
    WHERE e.church_id = p_church_id
      AND e.is_recurring = false
      AND (p_ministry_id IS NULL OR e.ministry_id = p_ministry_id)
      AND (e.starts_at AT TIME ZONE tz.name)::date BETWEEN p_from AND p_to
  ),
  expanded AS (
    SELECT
      e.id AS series_id,
      d.day::date AS occurrence_date,
      e.title,
      e.description,
      e.location,
      e.event_type,
      e.ministry_id,
      cm.name AS ministry_name,
      e.fund_id,
      (
        (d.day::date + ((e.starts_at AT TIME ZONE tz.name)::time))
        AT TIME ZONE tz.name
      ) AS starts_at,
      CASE
        WHEN e.ends_at IS NULL THEN NULL
        ELSE (
          (d.day::date + ((e.ends_at AT TIME ZONE tz.name)::time))
          AT TIME ZONE tz.name
        )
      END AS ends_at,
      e.is_all_day,
      e.is_featured,
      true AS is_recurring
    FROM public.church_events e
    CROSS JOIN tz
    LEFT JOIN public.church_ministries cm ON cm.id = e.ministry_id
    CROSS JOIN LATERAL generate_series(
      GREATEST(
        p_from,
        (e.starts_at AT TIME ZONE tz.name)::date
      ),
      LEAST(
        p_to,
        COALESCE(e.recurrence_until, p_to)
      ),
      interval '1 day'
    ) AS d(day)
    WHERE e.church_id = p_church_id
      AND e.is_recurring = true
      AND (p_ministry_id IS NULL OR e.ministry_id = p_ministry_id)
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements_text(COALESCE(e.recurrence_rule -> 'exceptions', '[]'::jsonb)) ex(val)
        WHERE ex.val = d.day::date::text
      )
      AND (
        (
          e.recurrence_rule ->> 'frequency' = 'weekly'
          AND EXTRACT(DOW FROM d.day)::integer IN (
            SELECT value::integer
            FROM jsonb_array_elements_text(
              COALESCE(e.recurrence_rule -> 'byWeekday', '[]'::jsonb)
            ) AS t(value)
          )
          AND (
            (d.day::date - (e.starts_at AT TIME ZONE tz.name)::date) / 7
          ) % GREATEST(COALESCE((e.recurrence_rule ->> 'interval')::integer, 1), 1) = 0
        )
        OR (
          e.recurrence_rule ->> 'frequency' = 'monthly'
          AND EXTRACT(DAY FROM d.day) = EXTRACT(DAY FROM (e.starts_at AT TIME ZONE tz.name)::date)
          AND (
            (
              EXTRACT(YEAR FROM d.day)::integer
              - EXTRACT(YEAR FROM (e.starts_at AT TIME ZONE tz.name)::date)::integer
            ) * 12
            + (
              EXTRACT(MONTH FROM d.day)::integer
              - EXTRACT(MONTH FROM (e.starts_at AT TIME ZONE tz.name)::date)::integer
            )
          ) % GREATEST(COALESCE((e.recurrence_rule ->> 'interval')::integer, 1), 1) = 0
        )
      )
  )
  SELECT * FROM singles
  UNION ALL
  SELECT * FROM expanded;
$function$;

CREATE OR REPLACE FUNCTION public.sp_get_events(
  p_church_id integer,
  p_from date,
  p_to date,
  p_ministry_id uuid DEFAULT NULL::uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_tz text;
  v_events json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('eventos:read');

  IF p_from IS NULL OR p_to IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Rango de fechas requerido'
    );
  END IF;

  v_tz := public.fn_church_timezone(p_church_id);

  SELECT COALESCE(
    json_agg(
      json_build_object(
        'series_id', o.series_id,
        'occurrence_date', o.occurrence_date::text,
        'title', o.title,
        'description', o.description,
        'location', o.location,
        'event_type', o.event_type,
        'ministry_id', o.ministry_id,
        'ministry_name', o.ministry_name,
        'fund_id', o.fund_id,
        'starts_at', o.starts_at,
        'ends_at', o.ends_at,
        'is_all_day', o.is_all_day,
        'is_featured', o.is_featured,
        'is_recurring', o.is_recurring
      )
      ORDER BY o.starts_at, o.title
    ),
    '[]'::json
  )
  INTO v_events
  FROM public.fn_church_event_occurrences(p_church_id, p_from, p_to, p_ministry_id) o;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'timezone', v_tz,
    'events', v_events
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_maintain_event(
  p_event_id uuid,
  p_church_id integer,
  p_title text,
  p_description text,
  p_location text,
  p_event_type text,
  p_ministry_id uuid,
  p_fund_id uuid,
  p_local_start_date date,
  p_local_start_time time,
  p_local_end_time time,
  p_is_all_day boolean,
  p_is_featured boolean,
  p_is_recurring boolean,
  p_recurrence_rule jsonb,
  p_recurrence_until date,
  p_created_by_profile_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_event_id uuid;
  v_tz text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_type text := lower(trim(coalesce(p_event_type, '')));
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_created_by_profile_id);
  PERFORM public.fn_assert_event_ministry(p_church_id, p_ministry_id);
  PERFORM public.fn_assert_event_fund(p_church_id, p_fund_id);

  IF trim(coalesce(p_title, '')) = '' THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'El título es obligatorio');
  END IF;

  IF v_type NOT IN ('culto', 'estudio', 'evento') THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'Tipo de evento inválido');
  END IF;

  IF p_local_start_date IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'La fecha es obligatoria');
  END IF;

  IF coalesce(p_is_recurring, false) AND p_recurrence_rule IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'Regla de recurrencia requerida');
  END IF;

  IF p_event_id IS NULL THEN
    IF NOT public.fn_can_create_event(p_ministry_id) THEN
      RETURN json_build_object('success', false, 'status_code', 403, 'message', 'No tienes permiso para crear este evento');
    END IF;
  ELSE
    IF NOT public.fn_can_edit_event(p_event_id) THEN
      RETURN json_build_object('success', false, 'status_code', 403, 'message', 'No tienes permiso para editar este evento');
    END IF;
  END IF;

  IF coalesce(p_is_featured, false)
     AND NOT public.fn_user_has_permission('eventos:write') THEN
    RETURN json_build_object('success', false, 'status_code', 403, 'message', 'Solo administradores pueden destacar eventos');
  END IF;

  v_tz := public.fn_church_timezone(p_church_id);
  v_starts_at := (
    (p_local_start_date + coalesce(p_local_start_time, time '00:00'))
    AT TIME ZONE v_tz
  );
  v_ends_at := CASE
    WHEN p_local_end_time IS NULL THEN NULL
    ELSE ((p_local_start_date + p_local_end_time) AT TIME ZONE v_tz)
  END;

  IF p_event_id IS NULL THEN
    v_event_id := gen_random_uuid();
    INSERT INTO public.church_events (
      id, church_id, title, description, location, event_type,
      ministry_id, fund_id, starts_at, ends_at, is_all_day, is_featured,
      is_recurring, recurrence_rule, recurrence_until, created_by_profile_id
    ) VALUES (
      v_event_id, p_church_id, trim(p_title),
      nullif(trim(coalesce(p_description, '')), ''),
      nullif(trim(coalesce(p_location, '')), ''),
      v_type, p_ministry_id, p_fund_id, v_starts_at, v_ends_at,
      coalesce(p_is_all_day, false), coalesce(p_is_featured, false),
      coalesce(p_is_recurring, false), p_recurrence_rule, p_recurrence_until,
      p_created_by_profile_id
    );
  ELSE
    v_event_id := p_event_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.church_events
      WHERE id = p_event_id AND church_id = p_church_id
    ) THEN
      RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Evento no encontrado');
    END IF;

    UPDATE public.church_events
    SET
      title = trim(p_title),
      description = nullif(trim(coalesce(p_description, '')), ''),
      location = nullif(trim(coalesce(p_location, '')), ''),
      event_type = v_type,
      ministry_id = p_ministry_id,
      fund_id = p_fund_id,
      starts_at = v_starts_at,
      ends_at = v_ends_at,
      is_all_day = coalesce(p_is_all_day, false),
      is_featured = coalesce(p_is_featured, false),
      is_recurring = coalesce(p_is_recurring, false),
      recurrence_rule = p_recurrence_rule,
      recurrence_until = p_recurrence_until,
      updated_at = now()
    WHERE id = p_event_id
      AND church_id = p_church_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'event_id', v_event_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_delete_event(
  p_event_id uuid,
  p_church_id integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('eventos:delete');

  IF p_event_id IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'event_id requerido');
  END IF;

  IF NOT public.fn_can_edit_event(p_event_id) THEN
    RETURN json_build_object('success', false, 'status_code', 403, 'message', 'No tienes permiso para eliminar este evento');
  END IF;

  DELETE FROM public.church_events
  WHERE id = p_event_id
    AND church_id = p_church_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Evento no encontrado');
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;

ALTER TABLE public.church_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_events FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_church_events_select ON public.church_events;
DROP POLICY IF EXISTS tenant_church_events_insert ON public.church_events;
DROP POLICY IF EXISTS tenant_church_events_update ON public.church_events;
DROP POLICY IF EXISTS tenant_church_events_delete ON public.church_events;

CREATE POLICY tenant_church_events_select ON public.church_events
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_church_events_insert ON public.church_events
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_church_events_update ON public.church_events
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_church_events_delete ON public.church_events
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.church_events TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_church_timezone(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_event_ministry(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_event_fund(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_can_edit_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_can_create_event(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_church_event_occurrences(integer, date, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_events(integer, date, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_maintain_event(
  uuid, integer, text, text, text, text, uuid, uuid,
  date, time, time, boolean, boolean, boolean, jsonb, date, uuid
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_delete_event(uuid, integer) TO authenticated, service_role;

-- Dashboard: KPI y agenda real de eventos.
CREATE OR REPLACE FUNCTION public.sp_get_dashboard_summary(
  p_church_id integer,
  p_months integer DEFAULT 12
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_months integer := LEAST(GREATEST(COALESCE(p_months, 12), 1), 24);
  v_today date := CURRENT_DATE;
  v_week_start date := date_trunc('week', v_today)::date;
  v_week_end date := (date_trunc('week', v_today) + interval '6 days')::date;
  v_horizon_end date := (v_today + interval '30 days')::date;
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'member_stats', (
      SELECT json_build_object(
        'total', COUNT(*)::integer,
        'members', COUNT(*) FILTER (WHERE p.is_member)::integer,
        'visits', COUNT(*) FILTER (WHERE NOT p.is_member)::integer,
        'active', COUNT(*) FILTER (WHERE p.is_active)::integer,
        'inactive', COUNT(*) FILTER (WHERE NOT p.is_active)::integer
      )
      FROM profiles p
      WHERE p.church_id = p_church_id
    ),
    'funds_summary', (
      SELECT json_build_object(
        'total_balance', COALESCE(SUM(f.total_contributions), 0),
        'active_count', COUNT(*) FILTER (WHERE f.is_active)::integer
      )
      FROM funds f
      WHERE f.church_id = p_church_id
    ),
    'offering_today', COALESCE((
      SELECT SUM(ie.amount)
      FROM income_entries ie
      INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
      WHERE ie.church_id = p_church_id
        AND ie.payment_date = v_today
        AND COALESCE(itc.is_operational, false) = false
    ), 0),
    'catechumen_count', COALESCE((
      SELECT COUNT(*)::integer
      FROM membership m
      INNER JOIN member_roles mr ON mr.id = m.member_role_id
      WHERE m.church_id = p_church_id
        AND mr.role_code = 'catecumenos'
    ), 0),
    'events_summary', json_build_object(
      'upcoming_count', COALESCE((
        SELECT COUNT(*)::integer
        FROM public.fn_church_event_occurrences(p_church_id, v_today, v_horizon_end) o
      ), 0),
      'this_week_count', COALESCE((
        SELECT COUNT(*)::integer
        FROM public.fn_church_event_occurrences(p_church_id, v_week_start, v_week_end) o
      ), 0),
      'featured', (
        SELECT row_to_json(f)
        FROM (
          SELECT
            ce.id,
            ce.title,
            ce.location,
            ce.event_type,
            ce.starts_at,
            ce.ends_at,
            ce.is_all_day
          FROM public.church_events ce
          WHERE ce.church_id = p_church_id
            AND ce.is_featured = true
          ORDER BY ce.starts_at
          LIMIT 1
        ) f
      )
    ),
    'upcoming_events', COALESCE((
      SELECT json_agg(row_to_json(u) ORDER BY u.starts_at)
      FROM (
        SELECT
          o.series_id,
          o.occurrence_date,
          o.title,
          o.location,
          o.event_type,
          o.starts_at,
          o.ends_at,
          o.is_all_day,
          o.is_recurring
        FROM public.fn_church_event_occurrences(p_church_id, v_today, v_horizon_end) o
        ORDER BY o.starts_at
        LIMIT 4
      ) u
    ), '[]'::json),
    'contribution_monthly_totals', COALESCE((
      SELECT json_agg(COALESCE(mo.total, 0) ORDER BY mo.month_start)
      FROM (
        SELECT
          gs::date AS month_start,
          (
            SELECT SUM(ie.amount)
            FROM income_entries ie
            INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
            WHERE ie.church_id = p_church_id
              AND COALESCE(itc.is_operational, false) = false
              AND ie.payment_date >= gs::date
              AND ie.payment_date < (gs + interval '1 month')::date
          ) AS total
        FROM generate_series(
          date_trunc('month', v_today)::date - ((LEAST(v_months, 8) - 1) || ' months')::interval,
          date_trunc('month', v_today)::date,
          interval '1 month'
        ) gs
      ) mo
    ), '[]'::json),
    'contribution_chart', json_build_object(
      'week', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(w.week_start, 'DD Mon'),
            'value', COALESCE(w.total, 0),
            'from', w.week_start::text,
            'to', (w.week_start + interval '6 days')::date::text
          )
          ORDER BY w.week_start
        )
        FROM (
          SELECT
            (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date AS week_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND ie.payment_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS total
          FROM generate_series(6, 0, -1) n
        ) w
      ), '[]'::json),
      'month', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(m.month_start, 'Mon'),
            'value', COALESCE(m.total, 0),
            'from', m.month_start::text,
            'to', (m.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY m.month_start
        )
        FROM (
          SELECT
            (date_trunc('month', v_today)::date - (n || ' months')::interval)::date AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS total
          FROM generate_series(6, 0, -1) n
        ) m
      ), '[]'::json),
      'quarter', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', 'T' || EXTRACT(quarter FROM q.quarter_start)::text || ' ' || to_char(q.quarter_start, 'YY'),
            'value', COALESCE(q.total, 0),
            'from', q.quarter_start::text,
            'to', (q.quarter_start + interval '3 months' - interval '1 day')::date::text
          )
          ORDER BY q.quarter_start
        )
        FROM (
          SELECT
            (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date AS quarter_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS total
          FROM generate_series(3, 0, -1) n
        ) q
      ), '[]'::json),
      'year', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(y.month_start, 'Mon'),
            'value', COALESCE(y.total, 0),
            'from', y.month_start::text,
            'to', (y.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY y.month_start
        )
        FROM (
          SELECT
            make_date(EXTRACT(year FROM v_today)::integer, n, 1) AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND ie.payment_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS total
          FROM generate_series(1, 12) n
        ) y
      ), '[]'::json)
    ),
    'ledger_chart', json_build_object(
      'week', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(w.week_start, 'DD Mon'),
            'income', COALESCE(w.income_total, 0),
            'expense', COALESCE(w.expense_total, 0),
            'from', w.week_start::text
          )
          ORDER BY w.week_start
        )
        FROM (
          SELECT
            (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date AS week_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND ie.payment_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND t.transaction_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS expense_total
          FROM generate_series(6, 0, -1) n
        ) w
      ), '[]'::json),
      'month', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(m.month_start, 'Mon'),
            'income', COALESCE(m.income_total, 0),
            'expense', COALESCE(m.expense_total, 0),
            'from', m.month_start::text
          )
          ORDER BY m.month_start
        )
        FROM (
          SELECT
            (date_trunc('month', v_today)::date - (n || ' months')::interval)::date AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND t.transaction_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS expense_total
          FROM generate_series(6, 0, -1) n
        ) m
      ), '[]'::json),
      'quarter', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', 'T' || EXTRACT(quarter FROM q.quarter_start)::text || ' ' || to_char(q.quarter_start, 'YY'),
            'income', COALESCE(q.income_total, 0),
            'expense', COALESCE(q.expense_total, 0),
            'from', q.quarter_start::text
          )
          ORDER BY q.quarter_start
        )
        FROM (
          SELECT
            (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date AS quarter_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND t.transaction_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS expense_total
          FROM generate_series(3, 0, -1) n
        ) q
      ), '[]'::json),
      'year', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(y.month_start, 'Mon'),
            'income', COALESCE(y.income_total, 0),
            'expense', COALESCE(y.expense_total, 0),
            'from', y.month_start::text
          )
          ORDER BY y.month_start
        )
        FROM (
          SELECT
            make_date(EXTRACT(year FROM v_today)::integer, n, 1) AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND ie.payment_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND t.transaction_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS expense_total
          FROM generate_series(1, 12) n
        ) y
      ), '[]'::json)
    ),
    'kpi_month', json_build_object(
      'contributions_this_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = false
          AND ie.payment_date >= date_trunc('month', v_today)::date
          AND ie.payment_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'contributions_prev_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = false
          AND ie.payment_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND ie.payment_date < date_trunc('month', v_today)::date
      ), 0),
      'ledger_income_this_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = true
          AND ie.payment_date >= date_trunc('month', v_today)::date
          AND ie.payment_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'ledger_income_prev_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = true
          AND ie.payment_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND ie.payment_date < date_trunc('month', v_today)::date
      ), 0),
      'ledger_expense_this_month', COALESCE((
        SELECT SUM(t.transaction_amount)
        FROM transactions t
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'APPROVED'
          AND t.transaction_date >= date_trunc('month', v_today)::date
          AND t.transaction_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'ledger_expense_prev_month', COALESCE((
        SELECT SUM(t.transaction_amount)
        FROM transactions t
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'APPROVED'
          AND t.transaction_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND t.transaction_date < date_trunc('month', v_today)::date
      ), 0)
    ),
    'pending_authorizations', COALESCE((
      SELECT json_agg(row_to_json(p) ORDER BY p.movement_date DESC)
      FROM (
        SELECT
          t.transaction_id::text AS id,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN 'fund_transfer'
            ELSE 'expense'
          END AS kind,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN 'Transferencia entre fondos'
            ELSE COALESCE(NULLIF(TRIM(t.transaction_description), ''), et.expenses_name, 'Egreso pendiente')
          END AS title,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN
              COALESCE(sf.fund_name, f.fund_name) || ' → ' || COALESCE(df.fund_name, '—')
            ELSE f.fund_name || ' · ' || COALESCE(
              NULLIF(TRIM(CONCAT(pc.first_name, ' ', pc.last_name)), ''),
              '—'
            )
          END AS subtitle,
          t.transaction_amount AS amount,
          t.transaction_date::text AS movement_date
        FROM transactions t
        INNER JOIN funds f ON f.fund_id = t.fund_id AND f.church_id = t.church_id::integer
        LEFT JOIN expenses_type et ON et.expenses_type_id = t.expenses_type_id
        LEFT JOIN profiles pc ON pc.id = t.created_by_profile_id
        LEFT JOIN fund_transfers ft ON ft.expense_transaction_id = t.transaction_id
        LEFT JOIN funds sf ON sf.fund_id = ft.source_fund_id
        LEFT JOIN funds df ON df.fund_id = ft.destination_fund_id
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'PENDING'
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 8
      ) p
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$function$;
