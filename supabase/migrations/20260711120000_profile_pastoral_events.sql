-- P0 backlog post-reunión: eventos pastorales por miembro (timeline CRM).
-- Distinto de /eventos (calendario) y de profiles.bio / notas pastorales libres.

-- ---------------------------------------------------------------------------
-- profile_pastoral_event
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profile_pastoral_event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  church_id integer NOT NULL REFERENCES public.church (id),
  event_type text NOT NULL,
  title text,
  description text,
  event_date date NOT NULL,
  needs_follow_up boolean NOT NULL DEFAULT false,
  created_by_profile_id uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profile_pastoral_event_type_check CHECK (
    event_type IN (
      'illness',
      'accident',
      'family_loss',
      'financial_aid',
      'emergency',
      'collection',
      'recognition',
      'discipleship',
      'other'
    )
  )
);

COMMENT ON TABLE public.profile_pastoral_event IS
  'Bitácora pastoral por miembro: enfermedad, emergencias, recolectas, etc.';

CREATE INDEX IF NOT EXISTS idx_profile_pastoral_event_church_profile_date
  ON public.profile_pastoral_event (church_id, profile_id, event_date DESC);

ALTER TABLE public.profile_pastoral_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_pastoral_event FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_profile_pastoral_event_select ON public.profile_pastoral_event;
DROP POLICY IF EXISTS tenant_profile_pastoral_event_insert ON public.profile_pastoral_event;
DROP POLICY IF EXISTS tenant_profile_pastoral_event_update ON public.profile_pastoral_event;
DROP POLICY IF EXISTS tenant_profile_pastoral_event_delete ON public.profile_pastoral_event;

CREATE POLICY tenant_profile_pastoral_event_select ON public.profile_pastoral_event
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_pastoral_event_insert ON public.profile_pastoral_event
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_pastoral_event_update ON public.profile_pastoral_event
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_profile_pastoral_event_delete ON public.profile_pastoral_event
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

-- ---------------------------------------------------------------------------
-- sp_list_profile_pastoral_events
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_list_profile_pastoral_events(
  p_profile_id uuid,
  p_church_id integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_events jsonb := '[]'::jsonb;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', e.id,
        'profileId', e.profile_id,
        'churchId', e.church_id,
        'eventType', e.event_type,
        'title', coalesce(e.title, ''),
        'description', coalesce(e.description, ''),
        'eventDate', e.event_date,
        'needsFollowUp', e.needs_follow_up,
        'createdByProfileId', e.created_by_profile_id,
        'createdAt', e.created_at,
        'updatedAt', e.updated_at
      )
      ORDER BY e.event_date DESC, e.created_at DESC
    ),
    '[]'::jsonb
  )
  INTO v_events
  FROM public.profile_pastoral_event e
  WHERE e.profile_id = p_profile_id
    AND e.church_id = p_church_id;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'events', v_events
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_profile_pastoral_events(uuid, integer)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- sp_maintain_profile_pastoral_event
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_maintain_profile_pastoral_event(
  p_profile_id uuid,
  p_church_id integer,
  p_action text,
  p_event_id uuid DEFAULT NULL::uuid,
  p_event_type text DEFAULT NULL::text,
  p_title text DEFAULT NULL::text,
  p_description text DEFAULT NULL::text,
  p_event_date date DEFAULT NULL::date,
  p_needs_follow_up boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_action text := lower(trim(coalesce(p_action, '')));
  v_event_id uuid;
  v_actor_profile_id uuid;
  v_member_name text;
  v_event_label text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  SELECT trim(coalesce(p.first_name, '') || ' ' || coalesce(p.last_name, ''))
  INTO v_member_name
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  SELECT (public.sp_get_session_context()->>'profile_id')::uuid
  INTO v_actor_profile_id;

  IF v_action = 'delete' THEN
    IF p_event_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'event_id requerido');
    END IF;

    DELETE FROM public.profile_pastoral_event
    WHERE id = p_event_id
      AND profile_id = p_profile_id
      AND church_id = p_church_id;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Evento no encontrado');
    END IF;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'delete',
      'pastoral_event',
      p_event_id::text,
      'Eliminó evento pastoral de ' || v_member_name,
      'actions.members.pastoral_event.delete',
      jsonb_build_object('profile_id', p_profile_id)
    );

    RETURN jsonb_build_object('success', true, 'status_code', 200, 'message', 'Evento eliminado');
  END IF;

  IF v_action NOT IN ('insert', 'update') THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'Acción inválida');
  END IF;

  IF p_event_type IS NULL OR trim(p_event_type) = '' THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'event_type requerido');
  END IF;

  IF p_event_date IS NULL THEN
    RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'event_date requerido');
  END IF;

  v_event_label := coalesce(nullif(trim(p_title), ''), p_event_type);

  IF v_action = 'update' THEN
    IF p_event_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 400, 'message', 'event_id requerido');
    END IF;

    UPDATE public.profile_pastoral_event
    SET
      event_type = p_event_type,
      title = nullif(trim(p_title), ''),
      description = nullif(trim(p_description), ''),
      event_date = p_event_date,
      needs_follow_up = coalesce(p_needs_follow_up, false),
      updated_at = now()
    WHERE id = p_event_id
      AND profile_id = p_profile_id
      AND church_id = p_church_id
    RETURNING id INTO v_event_id;

    IF v_event_id IS NULL THEN
      RETURN jsonb_build_object('success', false, 'status_code', 404, 'message', 'Evento no encontrado');
    END IF;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'update',
      'pastoral_event',
      v_event_id::text,
      'Actualizó evento pastoral (' || v_event_label || ') de ' || v_member_name,
      'actions.members.pastoral_event.update',
      jsonb_build_object('profile_id', p_profile_id, 'event_type', p_event_type)
    );
  ELSE
    INSERT INTO public.profile_pastoral_event (
      profile_id,
      church_id,
      event_type,
      title,
      description,
      event_date,
      needs_follow_up,
      created_by_profile_id
    )
    VALUES (
      p_profile_id,
      p_church_id,
      p_event_type,
      nullif(trim(p_title), ''),
      nullif(trim(p_description), ''),
      p_event_date,
      coalesce(p_needs_follow_up, false),
      v_actor_profile_id
    )
    RETURNING id INTO v_event_id;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'members',
      'create',
      'pastoral_event',
      v_event_id::text,
      'Registró evento pastoral (' || v_event_label || ') de ' || v_member_name,
      'actions.members.pastoral_event.create',
      jsonb_build_object('profile_id', p_profile_id, 'event_type', p_event_type)
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Evento guardado',
    'event_id', v_event_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_maintain_profile_pastoral_event(
  uuid, integer, text, uuid, text, text, text, date, boolean
) TO authenticated, service_role;
