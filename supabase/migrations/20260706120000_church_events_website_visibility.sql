-- Website visibility flags for public church site (evochurch-site).
-- is_website_listed: carousel section (max 10 per church)
-- is_website_promoted: header promos (max 3 per church, shared quota with is_featured)

-- Replace overloads with new signatures.
DROP FUNCTION IF EXISTS public.fn_church_event_occurrences(integer, date, date, uuid);
DROP FUNCTION IF EXISTS public.sp_maintain_event(
  uuid, integer, text, text, text, text, uuid, uuid,
  date, time without time zone, time without time zone, boolean, boolean, boolean, jsonb, date, uuid
);

ALTER TABLE public.church_events
  ADD COLUMN IF NOT EXISTS is_website_listed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_website_promoted boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.church_events.is_website_listed IS
  'Show on public website events carousel (max 10 active series per church).';
COMMENT ON COLUMN public.church_events.is_website_promoted IS
  'Promote on public website header (max 3 active series per church; shares quota with is_featured).';

CREATE INDEX IF NOT EXISTS idx_church_events_website_listed
  ON public.church_events (church_id, is_website_listed)
  WHERE is_website_listed = true;

CREATE INDEX IF NOT EXISTS idx_church_events_website_promoted
  ON public.church_events (church_id, is_website_promoted)
  WHERE is_website_promoted = true;

CREATE OR REPLACE FUNCTION public.fn_count_website_listed(p_church_id integer, p_exclude_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COUNT(*)::integer
  FROM public.church_events e
  WHERE e.church_id = p_church_id
    AND e.is_website_listed = true
    AND (p_exclude_id IS NULL OR e.id <> p_exclude_id);
$$;

CREATE OR REPLACE FUNCTION public.fn_count_website_promoted(p_church_id integer, p_exclude_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COUNT(*)::integer
  FROM public.church_events e
  WHERE e.church_id = p_church_id
    AND (e.is_website_promoted = true OR e.is_featured = true)
    AND (p_exclude_id IS NULL OR e.id <> p_exclude_id);
$$;

CREATE OR REPLACE FUNCTION public.fn_assert_website_event_limits()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.is_website_listed THEN
    IF public.fn_count_website_listed(NEW.church_id, NEW.id) >= 10 THEN
      RAISE EXCEPTION 'Máximo 10 eventos pueden mostrarse en el sitio web.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  IF NEW.is_website_promoted OR NEW.is_featured THEN
    IF public.fn_count_website_promoted(NEW.church_id, NEW.id) >= 3 THEN
      RAISE EXCEPTION 'Máximo 3 eventos pueden promocionarse en el header del sitio (incluye destacados).'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_clear_other_featured_events ON public.church_events;

DROP TRIGGER IF EXISTS trg_assert_website_event_limits ON public.church_events;
CREATE TRIGGER trg_assert_website_event_limits
  BEFORE INSERT OR UPDATE OF is_website_listed, is_website_promoted, is_featured
  ON public.church_events
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_assert_website_event_limits();

DROP FUNCTION IF EXISTS public.fn_clear_other_featured_events();

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
  is_website_listed boolean,
  is_website_promoted boolean,
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
      e.is_website_listed,
      e.is_website_promoted,
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
      e.is_website_listed,
      e.is_website_promoted,
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
              EXTRACT(YEAR FROM d.day) - EXTRACT(YEAR FROM (e.starts_at AT TIME ZONE tz.name)::date)
            ) * 12
            + EXTRACT(MONTH FROM d.day) - EXTRACT(MONTH FROM (e.starts_at AT TIME ZONE tz.name)::date)
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
        'is_website_listed', o.is_website_listed,
        'is_website_promoted', o.is_website_promoted,
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

CREATE OR REPLACE FUNCTION public.fn_website_event_series_next_starts_at(
  p_church_id integer,
  p_series_id uuid
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_today date;
  v_horizon date;
  v_next timestamptz;
BEGIN
  v_today := (now() AT TIME ZONE public.fn_church_timezone(p_church_id))::date;
  v_horizon := v_today + 366;

  SELECT MIN(o.starts_at)
  INTO v_next
  FROM public.fn_church_event_occurrences(p_church_id, v_today, v_horizon, NULL) o
  WHERE o.series_id = p_series_id;

  RETURN v_next;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_get_public_website_events(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_tz text;
  v_today date;
  v_listed json;
  v_promoted json;
BEGIN
  IF p_church_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'church_id requerido'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.church c WHERE c.id = p_church_id) THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Iglesia no encontrada'
    );
  END IF;

  v_tz := public.fn_church_timezone(p_church_id);
  v_today := (now() AT TIME ZONE v_tz)::date;

  SELECT COALESCE(
    json_agg(row_to_json(x) ORDER BY x.starts_at, x.title),
    '[]'::json
  )
  INTO v_listed
  FROM (
    SELECT
      e.id AS series_id,
      e.title,
      e.description,
      e.location,
      e.event_type,
      e.is_all_day,
      e.is_recurring,
      public.fn_website_event_series_next_starts_at(p_church_id, e.id) AS starts_at
    FROM public.church_events e
    WHERE e.church_id = p_church_id
      AND e.is_website_listed = true
      AND public.fn_website_event_series_next_starts_at(p_church_id, e.id) IS NOT NULL
    ORDER BY public.fn_website_event_series_next_starts_at(p_church_id, e.id), e.title
    LIMIT 10
  ) x;

  SELECT COALESCE(
    json_agg(row_to_json(x) ORDER BY x.starts_at, x.title),
    '[]'::json
  )
  INTO v_promoted
  FROM (
    SELECT
      e.id AS series_id,
      e.title,
      e.description,
      e.location,
      e.event_type,
      e.is_all_day,
      e.is_recurring,
      e.is_featured,
      e.is_website_promoted,
      public.fn_website_event_series_next_starts_at(p_church_id, e.id) AS starts_at
    FROM public.church_events e
    WHERE e.church_id = p_church_id
      AND (e.is_website_promoted = true OR e.is_featured = true)
      AND public.fn_website_event_series_next_starts_at(p_church_id, e.id) IS NOT NULL
    ORDER BY public.fn_website_event_series_next_starts_at(p_church_id, e.id), e.title
    LIMIT 3
  ) x;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'timezone', v_tz,
    'listed', v_listed,
    'promoted', v_promoted
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
  p_is_website_listed boolean,
  p_is_website_promoted boolean,
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

  IF (
    coalesce(p_is_featured, false)
    OR coalesce(p_is_website_listed, false)
    OR coalesce(p_is_website_promoted, false)
  ) AND NOT public.fn_user_has_permission('eventos:write') THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 403,
      'message', 'Solo administradores pueden destacar eventos o publicarlos en el sitio web'
    );
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
      is_website_listed, is_website_promoted,
      is_recurring, recurrence_rule, recurrence_until, created_by_profile_id
    ) VALUES (
      v_event_id, p_church_id, trim(p_title),
      nullif(trim(coalesce(p_description, '')), ''),
      nullif(trim(coalesce(p_location, '')), ''),
      v_type, p_ministry_id, p_fund_id, v_starts_at, v_ends_at,
      coalesce(p_is_all_day, false), coalesce(p_is_featured, false),
      coalesce(p_is_website_listed, false), coalesce(p_is_website_promoted, false),
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
      is_website_listed = coalesce(p_is_website_listed, false),
      is_website_promoted = coalesce(p_is_website_promoted, false),
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
  WHEN check_violation THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', SQLERRM);
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.fn_count_website_listed(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_count_website_promoted(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_website_event_series_next_starts_at(integer, uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.sp_get_public_website_events(integer) TO anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.sp_maintain_event(
  uuid, integer, text, text, text, text, uuid, uuid,
  date, time without time zone, time without time zone, boolean, boolean, boolean, boolean, boolean, jsonb, date, uuid
) TO authenticated, service_role;
