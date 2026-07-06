-- Public website events: featured first in listed carousel; header promos deferred.

CREATE OR REPLACE FUNCTION public.sp_get_public_website_events(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_tz text;
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

  SELECT COALESCE(
    json_agg(row_to_json(x) ORDER BY x.is_featured DESC, x.starts_at, x.title),
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
      e.is_featured,
      public.fn_website_event_series_next_starts_at(p_church_id, e.id) AS starts_at
    FROM public.church_events e
    WHERE e.church_id = p_church_id
      AND (
        e.is_website_listed = true
        OR e.is_featured = true
      )
      AND public.fn_website_event_series_next_starts_at(p_church_id, e.id) IS NOT NULL
    ORDER BY
      e.is_featured DESC,
      public.fn_website_event_series_next_starts_at(p_church_id, e.id),
      e.title
    LIMIT 10
  ) x;

  SELECT COALESCE(
    json_agg(row_to_json(x) ORDER BY x.is_featured DESC, x.starts_at, x.title),
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
    ORDER BY
      e.is_featured DESC,
      public.fn_website_event_series_next_starts_at(p_church_id, e.id),
      e.title
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
