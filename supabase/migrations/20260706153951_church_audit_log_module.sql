-- Audit log module: table, RLS, helpers, read RPC, permissions, instrumentation.

-- ---------------------------------------------------------------------------
-- AUDIT-1: schema
-- ---------------------------------------------------------------------------

CREATE TABLE public.church_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  actor_auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_display_name text NOT NULL DEFAULT '',
  module text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id text,
  summary text NOT NULL,
  summary_key text,
  summary_params jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX church_audit_log_church_created_idx
  ON public.church_audit_log (church_id, created_at DESC);

CREATE INDEX church_audit_log_church_module_created_idx
  ON public.church_audit_log (church_id, module, created_at DESC);

CREATE INDEX church_audit_log_church_actor_created_idx
  ON public.church_audit_log (church_id, actor_profile_id, created_at DESC)
  WHERE actor_profile_id IS NOT NULL;

ALTER TABLE public.church_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_audit_log FORCE ROW LEVEL SECURITY;

CREATE POLICY church_audit_log_select ON public.church_audit_log
  FOR SELECT TO authenticated
  USING (
    church_id = public.fn_get_session_church_id()
    AND public.fn_user_has_permission('audit:read')
  );

REVOKE ALL ON TABLE public.church_audit_log FROM anon;
GRANT SELECT ON TABLE public.church_audit_log TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_append_church_audit_log(
  p_church_id integer,
  p_module text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_summary text,
  p_summary_key text DEFAULT NULL,
  p_summary_params jsonb DEFAULT '{}'::jsonb,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_display_name text := '';
  v_log_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF v_uid IS NOT NULL THEN
    SELECT
      au.profile_id,
      NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), '')
    INTO v_profile_id, v_display_name
    FROM public.auth_users au
    INNER JOIN public.profiles p ON p.id = au.profile_id
    WHERE au.id = v_uid
      AND COALESCE(au.is_active, true) = true
      AND p.church_id = p_church_id;
  END IF;

  INSERT INTO public.church_audit_log (
    church_id,
    actor_auth_user_id,
    actor_profile_id,
    actor_display_name,
    module,
    action,
    entity_type,
    entity_id,
    summary,
    summary_key,
    summary_params,
    metadata
  ) VALUES (
    p_church_id,
    v_uid,
    v_profile_id,
    COALESCE(v_display_name, ''),
    p_module,
    p_action,
    p_entity_type,
    p_entity_id,
    p_summary,
    p_summary_key,
    COALESCE(p_summary_params, '{}'::jsonb),
    COALESCE(p_metadata, '{}'::jsonb)
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_church_audit_log(
  p_church_id integer,
  p_from timestamptz DEFAULT NULL,
  p_to timestamptz DEFAULT NULL,
  p_module text DEFAULT NULL,
  p_action text DEFAULT NULL,
  p_actor_profile_id uuid DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 50), 1), 200);
  v_offset integer := GREATEST(COALESCE(p_offset, 0), 0);
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_total integer;
  v_items json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('audit:read');

  SELECT COUNT(*)::integer
  INTO v_total
  FROM public.church_audit_log cal
  WHERE cal.church_id = p_church_id
    AND (p_from IS NULL OR cal.created_at >= p_from)
    AND (p_to IS NULL OR cal.created_at <= p_to)
    AND (p_module IS NULL OR cal.module = p_module)
    AND (p_action IS NULL OR cal.action = p_action)
    AND (p_actor_profile_id IS NULL OR cal.actor_profile_id = p_actor_profile_id)
    AND (
      v_search IS NULL
      OR cal.summary ILIKE '%' || v_search || '%'
      OR cal.actor_display_name ILIKE '%' || v_search || '%'
      OR cal.entity_id ILIKE '%' || v_search || '%'
    );

  SELECT COALESCE(json_agg(row_to_json(r) ORDER BY r.created_at DESC), '[]'::json)
  INTO v_items
  FROM (
    SELECT
      cal.id,
      cal.church_id,
      cal.actor_auth_user_id,
      cal.actor_profile_id,
      cal.actor_display_name,
      cal.module,
      cal.action,
      cal.entity_type,
      cal.entity_id,
      cal.summary,
      cal.summary_key,
      cal.summary_params,
      cal.metadata,
      cal.created_at
    FROM public.church_audit_log cal
    WHERE cal.church_id = p_church_id
      AND (p_from IS NULL OR cal.created_at >= p_from)
      AND (p_to IS NULL OR cal.created_at <= p_to)
      AND (p_module IS NULL OR cal.module = p_module)
      AND (p_action IS NULL OR cal.action = p_action)
      AND (p_actor_profile_id IS NULL OR cal.actor_profile_id = p_actor_profile_id)
      AND (
        v_search IS NULL
        OR cal.summary ILIKE '%' || v_search || '%'
        OR cal.actor_display_name ILIKE '%' || v_search || '%'
        OR cal.entity_id ILIKE '%' || v_search || '%'
      )
    ORDER BY cal.created_at DESC
    LIMIT v_limit
    OFFSET v_offset
  ) r;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'items', v_items,
    'total', v_total
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'items', '[]'::json,
      'total', 0
    );
END;
$$;

-- ---------------------------------------------------------------------------
-- AUDIT-2: permissions
-- ---------------------------------------------------------------------------

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('audit:read', 'audit', 'read', 'Ver bitácora de acciones'),
  ('audit:export', 'audit', 'export', 'Exportar bitácora')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 4, k
FROM unnest(ARRAY['audit:read', 'audit:export']::text[]) AS k
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Dashboard: recent_audit (top 15) when audit:read
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_dashboard_recent_audit(p_church_id integer)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT CASE
    WHEN public.fn_user_has_permission('audit:read') THEN
      COALESCE((
        SELECT json_agg(row_to_json(a) ORDER BY a.created_at DESC)
        FROM (
          SELECT
            cal.id,
            cal.actor_display_name,
            cal.module,
            cal.action,
            cal.entity_type,
            cal.entity_id,
            cal.summary,
            cal.summary_key,
            cal.summary_params,
            cal.created_at
          FROM public.church_audit_log cal
          WHERE cal.church_id = p_church_id
          ORDER BY cal.created_at DESC
          LIMIT 15
        ) a
      ), '[]'::json)
    ELSE '[]'::json
  END;
$$;

-- Patch sp_get_dashboard_summary: append recent_audit block
DO $patch$
DECLARE
  v_def text;
  v_marker text := '''pending_authorizations'', COALESCE((';
  v_insert text := '''recent_audit'', public.fn_dashboard_recent_audit(p_church_id),
    ''pending_authorizations'', COALESCE((';
BEGIN
  SELECT pg_get_functiondef(p.oid)
  INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'sp_get_dashboard_summary'
    AND pg_get_function_identity_arguments(p.oid) = 'p_church_id integer, p_months integer'
  LIMIT 1;

  IF v_def IS NOT NULL AND v_def NOT LIKE '%recent_audit%' THEN
    IF position(v_marker in v_def) = 0 THEN
      RAISE EXCEPTION 'sp_get_dashboard_summary: marker not found';
    END IF;
    v_def := replace(v_def, v_marker, v_insert);
    EXECUTE v_def;
  END IF;
END;
$patch$;

-- ---------------------------------------------------------------------------
-- AUDIT-3: catalog triggers (no RPC for direct client writes)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_audit_income_type_catalog()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_action text;
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'create';
    v_name := NEW.type_name;
    PERFORM public.fn_append_church_audit_log(
      NEW.church_id, 'settings', v_action, 'catalog_item', NEW.id::text,
      'Creó tipo de ingreso: ' || COALESCE(v_name, ''),
      'actions.settings.income_type.create',
      jsonb_build_object('name', COALESCE(v_name, ''))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_name := NEW.type_name;
    PERFORM public.fn_append_church_audit_log(
      NEW.church_id, 'settings', 'update', 'catalog_item', NEW.id::text,
      'Editó tipo de ingreso: ' || COALESCE(v_name, ''),
      'actions.settings.income_type.update',
      jsonb_build_object('name', COALESCE(v_name, ''))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_name := OLD.type_name;
    PERFORM public.fn_append_church_audit_log(
      OLD.church_id, 'settings', 'delete', 'catalog_item', OLD.id::text,
      'Eliminó tipo de ingreso: ' || COALESCE(v_name, ''),
      'actions.settings.income_type.delete',
      jsonb_build_object('name', COALESCE(v_name, ''))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_audit_expenses_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_name text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_name := NEW.expenses_name;
    PERFORM public.fn_append_church_audit_log(
      NEW.church_id, 'settings', 'create', 'catalog_item', NEW.expenses_type_id::text,
      'Creó tipo de gasto: ' || COALESCE(v_name, ''),
      'actions.settings.expense_type.create',
      jsonb_build_object('name', COALESCE(v_name, ''))
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    v_name := NEW.expenses_name;
    PERFORM public.fn_append_church_audit_log(
      NEW.church_id, 'settings', 'update', 'catalog_item', NEW.expenses_type_id::text,
      'Editó tipo de gasto: ' || COALESCE(v_name, ''),
      'actions.settings.expense_type.update',
      jsonb_build_object('name', COALESCE(v_name, ''))
    );
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    v_name := OLD.expenses_name;
    PERFORM public.fn_append_church_audit_log(
      OLD.church_id, 'settings', 'delete', 'catalog_item', OLD.expenses_type_id::text,
      'Eliminó tipo de gasto: ' || COALESCE(v_name, ''),
      'actions.settings.expense_type.delete',
      jsonb_build_object('name', COALESCE(v_name, ''))
    );
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS audit_income_type_catalog ON public.income_type_catalog;
CREATE TRIGGER audit_income_type_catalog
  AFTER INSERT OR UPDATE OR DELETE ON public.income_type_catalog
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_income_type_catalog();

DROP TRIGGER IF EXISTS audit_expenses_type ON public.expenses_type;
CREATE TRIGGER audit_expenses_type
  AFTER INSERT OR UPDATE OR DELETE ON public.expenses_type
  FOR EACH ROW EXECUTE FUNCTION public.trg_audit_expenses_type();

-- ---------------------------------------------------------------------------
-- AUDIT-3: RPC instrumentation (patches via CREATE OR REPLACE)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_create_transaction(
  p_church_id integer,
  p_expenses_type_id integer,
  p_fund_id uuid,
  p_created_by_profile_id uuid,
  p_transaction_amount numeric,
  p_description text,
  p_payment_method text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  fund_amount NUMERIC := 0;
  transaction_amount_in_transit NUMERIC := 0;
  remaining_balance NUMERIC;
  v_tx_id integer;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_created_by_profile_id);

  SELECT
    COALESCE(f.total_contributions, 0),
    COALESCE(SUM(t.transaction_amount), 0)
  INTO fund_amount, transaction_amount_in_transit
  FROM funds f
  LEFT JOIN transactions t
    ON f.church_id = t.church_id
   AND f.fund_id = t.fund_id
  WHERE f.fund_id = p_fund_id
    AND f.church_id = p_church_id
  GROUP BY f.total_contributions;

  remaining_balance := fund_amount - transaction_amount_in_transit;

  IF p_transaction_amount > remaining_balance OR fund_amount = 0 THEN
    RAISE EXCEPTION 'Insufficient funds. Requested amount: %, Available balance: %',
      p_transaction_amount, remaining_balance;
  END IF;

  INSERT INTO transactions (
    church_id,
    expenses_type_id,
    fund_id,
    created_by_profile_id,
    transaction_amount,
    transaction_description,
    payment_method
  ) VALUES (
    p_church_id,
    p_expenses_type_id,
    p_fund_id,
    p_created_by_profile_id,
    p_transaction_amount,
    p_description,
    p_payment_method
  )
  RETURNING transaction_id INTO v_tx_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'finances',
    'create',
    'transaction',
    v_tx_id::text,
    'Registró egreso por RD$' || COALESCE(p_transaction_amount::text, '0'),
    'actions.finances.transaction.create',
    jsonb_build_object('amount', p_transaction_amount::text, 'id', v_tx_id::text)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_authorize_transaction(
  p_church_id integer,
  p_transaction_id integer,
  p_authorized_by_profile_id uuid,
  p_authorization_status character varying,
  p_authorization_comments text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_amount numeric;
  v_action text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_authorized_by_profile_id);

  IF NOT public.fn_can_authorize_finances(p_authorized_by_profile_id, auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para autorizar egresos.';
  END IF;

  SELECT t.transaction_amount
  INTO v_amount
  FROM public.transactions t
  WHERE t.transaction_id = p_transaction_id
    AND t.church_id = p_church_id;

  UPDATE public.transactions
  SET
    authorized_by_profile_id = p_authorized_by_profile_id,
    authorization_status = p_authorization_status,
    authorization_comments = p_authorization_comments,
    authorization_date = CURRENT_TIMESTAMP
  WHERE transaction_id = p_transaction_id
    AND church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transacción no encontrada.';
  END IF;

  v_action := CASE
    WHEN lower(p_authorization_status::text) = 'approved' THEN 'authorize'
    WHEN lower(p_authorization_status::text) = 'rejected' THEN 'reject'
    ELSE 'update'
  END;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'finances',
    v_action,
    'transaction',
    p_transaction_id::text,
    CASE v_action
      WHEN 'authorize' THEN 'Autorizó egreso por RD$' || COALESCE(v_amount::text, '0')
      WHEN 'reject' THEN 'Rechazó egreso por RD$' || COALESCE(v_amount::text, '0')
      ELSE 'Actualizó egreso #' || p_transaction_id::text
    END,
    'actions.finances.transaction.' || v_action,
    jsonb_build_object('amount', COALESCE(v_amount::text, '0'), 'id', p_transaction_id::text)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.spinsertprofiles(
  p_church_id integer,
  p_first_name character varying,
  p_last_name character varying,
  p_nick_name character varying DEFAULT NULL::character varying,
  p_date_of_birth date DEFAULT NULL::date,
  p_gender character varying DEFAULT NULL::character varying,
  p_marital_status character varying DEFAULT NULL::character varying,
  p_nationality character varying DEFAULT NULL::character varying,
  p_id_type character varying DEFAULT NULL::character varying,
  p_id_number character varying DEFAULT NULL::character varying,
  p_is_member boolean DEFAULT false,
  p_is_active boolean DEFAULT true,
  p_bio text DEFAULT NULL::text,
  p_street_address character varying DEFAULT NULL::character varying,
  p_state_province character varying DEFAULT NULL::character varying,
  p_city_state character varying DEFAULT NULL::character varying,
  p_country character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_mobile_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_id UUID;
  v_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  INSERT INTO public.profiles (
    first_name, last_name, nick_name, date_of_birth, gender, marital_status,
    nationality, id_type, id_number, is_member, is_active, bio, church_id
  )
  VALUES (
    p_first_name, p_last_name, p_nick_name, p_date_of_birth, p_gender, p_marital_status,
    p_nationality, p_id_type, p_id_number, p_is_member, p_is_active, p_bio, p_church_id
  )
  ON CONFLICT (id_number) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.profiles WHERE id_number = p_id_number;
    PERFORM public.fn_assert_profile_in_session_church(v_id);
  END IF;

  INSERT INTO public.address (
    profile_id, street_address, state_province, city_state, country
  )
  VALUES (
    v_id, p_street_address, p_state_province, p_city_state, p_country
  );

  INSERT INTO public.contacts (
    profile_id, phone, mobile_phone, email
  )
  VALUES (
    v_id, p_phone, p_mobile_phone, p_email
  );

  v_name := TRIM(COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, ''));

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'members',
    'create',
    'profile',
    v_id::text,
    'Creó miembro: ' || v_name,
    'actions.members.create',
    jsonb_build_object('name', v_name)
  );

  RETURN jsonb_build_object(
    'status', 'Success',
    'message', 'Profile added successfully',
    'profile_id', v_id
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'status', 'Error',
      'message', SQLERRM
    );
END;
$function$;

-- spupdateprofiles: audit on success path
CREATE OR REPLACE FUNCTION public.spupdateprofiles(
  p_id uuid,
  p_first_name character varying,
  p_last_name character varying,
  p_nick_name character varying DEFAULT NULL::character varying,
  p_date_of_birth date DEFAULT NULL::date,
  p_gender character varying DEFAULT NULL::character varying,
  p_marital_status character varying DEFAULT NULL::character varying,
  p_nationality character varying DEFAULT NULL::character varying,
  p_id_type character varying DEFAULT NULL::character varying,
  p_id_number character varying DEFAULT NULL::character varying,
  p_is_member boolean DEFAULT false,
  p_is_active boolean DEFAULT true,
  p_bio text DEFAULT NULL::text,
  p_street_address character varying DEFAULT NULL::character varying,
  p_state_province character varying DEFAULT NULL::character varying,
  p_city_state character varying DEFAULT NULL::character varying,
  p_country character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_mobile_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_profile_exists BOOLEAN;
  v_address_exists BOOLEAN;
  v_contact_exists BOOLEAN;
  v_church_id integer;
  v_name text;
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_id);

  SELECT p.church_id INTO v_church_id FROM public.profiles p WHERE p.id = p_id;

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_id) INTO v_profile_exists;
  SELECT EXISTS(SELECT 1 FROM public.address WHERE profile_id = p_id) INTO v_address_exists;
  SELECT EXISTS(SELECT 1 FROM public.contacts WHERE profile_id = p_id) INTO v_contact_exists;

  IF NOT v_profile_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status_code', 500,
      'message', 'Profile not found',
      'profile_id', ''
    );
  END IF;

  UPDATE public.profiles
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    nick_name = p_nick_name,
    date_of_birth = p_date_of_birth,
    gender = p_gender,
    marital_status = p_marital_status,
    nationality = p_nationality,
    id_type = p_id_type,
    id_number = p_id_number,
    is_member = p_is_member,
    is_active = p_is_active,
    bio = p_bio
  WHERE id = p_id;

  IF NOT v_address_exists THEN
    INSERT INTO public.address(profile_id, street_address, state_province, city_state, country)
    VALUES (p_id, p_street_address, p_state_province, p_city_state, p_country);
  ELSE
    UPDATE public.address
    SET
      street_address = p_street_address,
      state_province = p_state_province,
      city_state = p_city_state,
      country = p_country
    WHERE profile_id = p_id;
  END IF;

  IF NOT v_contact_exists THEN
    INSERT INTO public.contacts(profile_id, phone, mobile_phone, email)
    VALUES (p_id, p_phone, p_mobile_phone, p_email);
  ELSE
    UPDATE public.contacts
    SET phone = p_phone, mobile_phone = p_mobile_phone, email = p_email
    WHERE profile_id = p_id;
  END IF;

  v_name := TRIM(COALESCE(p_first_name, '') || ' ' || COALESCE(p_last_name, ''));

  PERFORM public.fn_append_church_audit_log(
    v_church_id,
    'members',
    'update',
    'profile',
    p_id::text,
    'Editó miembro: ' || v_name,
    'actions.members.update',
    jsonb_build_object('name', v_name)
  );

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Profile updated successfully',
    'profile_id', p_id
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'profile_id', ''
    );
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
DECLARE
  v_title text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('eventos:delete');

  IF p_event_id IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'event_id requerido');
  END IF;

  IF NOT public.fn_can_edit_event(p_event_id) THEN
    RETURN json_build_object('success', false, 'status_code', 403, 'message', 'No tienes permiso para eliminar este evento');
  END IF;

  SELECT ce.title INTO v_title
  FROM public.church_events ce
  WHERE ce.id = p_event_id AND ce.church_id = p_church_id;

  DELETE FROM public.church_events
  WHERE id = p_event_id
    AND church_id = p_church_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Evento no encontrado');
  END IF;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'eventos',
    'delete',
    'event',
    p_event_id::text,
    'Eliminó evento: ' || COALESCE(v_title, ''),
    'actions.eventos.delete',
    jsonb_build_object('title', COALESCE(v_title, ''))
  );

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;

-- sp_authorize_fund_transfer
CREATE OR REPLACE FUNCTION public.sp_authorize_fund_transfer(
  p_church_id integer,
  p_transfer_id uuid,
  p_authorized_by_profile_id uuid,
  p_auth_user_id uuid,
  p_authorization_comments text DEFAULT NULL::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_ft public.fund_transfers%ROWTYPE;
  v_income_type_id integer;
  v_income_id uuid;
  v_auth_user uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_authorized_by_profile_id);

  IF NOT public.fn_can_authorize_finances(p_authorized_by_profile_id, p_auth_user_id) THEN
    RAISE EXCEPTION 'No tienes permiso para autorizar transferencias.';
  END IF;

  SELECT * INTO v_ft
  FROM public.fund_transfers ft
  WHERE ft.transfer_id = p_transfer_id
    AND ft.church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia no encontrada.';
  END IF;

  IF v_ft.status <> 'PENDING' THEN
    RAISE EXCEPTION 'La transferencia ya fue procesada.';
  END IF;

  SELECT itc.id INTO v_income_type_id
  FROM public.income_type_catalog itc
  WHERE itc.church_id = p_church_id
    AND itc.type_name = 'Transferencia'
    AND COALESCE(itc.is_operational, false) = true
    AND itc.is_active = true
  LIMIT 1;

  IF v_income_type_id IS NULL THEN
    RAISE EXCEPTION 'Tipo de ingreso operacional Transferencia no configurado.';
  END IF;

  SELECT au.id INTO v_auth_user
  FROM public.auth_users au
  WHERE au.profile_id = p_authorized_by_profile_id
  LIMIT 1;

  INSERT INTO public.income_entries (
    church_id, fund_id, income_type_id, collection_mode, contribution_kind,
    amount, payment_date, payment_method, is_anonymous, notes, recorded_by
  ) VALUES (
    p_church_id, v_ft.destination_fund_id, v_income_type_id, 'collective', 'monetary',
    v_ft.amount, v_ft.movement_date, v_ft.payment_method, true,
    public.fn_build_fund_transfer_description(
      (SELECT fund_name FROM public.funds WHERE fund_id = v_ft.source_fund_id),
      (SELECT fund_name FROM public.funds WHERE fund_id = v_ft.destination_fund_id),
      v_ft.user_comment
    ),
    COALESCE(v_auth_user, p_auth_user_id)
  )
  RETURNING income_id INTO v_income_id;

  UPDATE public.fund_transfers
  SET
    status = 'APPROVED',
    income_id = v_income_id,
    authorized_by_profile_id = p_authorized_by_profile_id,
    authorization_date = now(),
    authorization_comments = NULLIF(TRIM(COALESCE(p_authorization_comments, '')), ''),
    updated_at = now()
  WHERE transfer_id = p_transfer_id;

  UPDATE public.transactions
  SET
    authorization_status = 'APPROVED',
    authorized_by_profile_id = p_authorized_by_profile_id,
    authorization_date = CURRENT_TIMESTAMP,
    authorization_comments = NULLIF(TRIM(COALESCE(p_authorization_comments, '')), ''),
    updated_at = now()
  WHERE transaction_id = v_ft.expense_transaction_id
    AND church_id = p_church_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'finances',
    'authorize',
    'fund_transfer',
    p_transfer_id::text,
    'Autorizó transferencia entre fondos por RD$' || COALESCE(v_ft.amount::text, '0'),
    'actions.finances.fund_transfer.authorize',
    jsonb_build_object('amount', COALESCE(v_ft.amount::text, '0'), 'id', p_transfer_id::text)
  );

  RETURN json_build_object('success', true, 'income_id', v_income_id);
END;
$$;

-- sp_maintain_event: audit on create/update
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
  v_is_create boolean;
  v_title text := trim(p_title);
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

  v_is_create := p_event_id IS NULL;

  IF v_is_create THEN
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

  IF v_is_create THEN
    v_event_id := gen_random_uuid();
    INSERT INTO public.church_events (
      id, church_id, title, description, location, event_type,
      ministry_id, fund_id, starts_at, ends_at, is_all_day, is_featured,
      is_recurring, recurrence_rule, recurrence_until, created_by_profile_id
    ) VALUES (
      v_event_id, p_church_id, v_title,
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
      title = v_title,
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

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'eventos',
    CASE WHEN v_is_create THEN 'create' ELSE 'update' END,
    'event',
    v_event_id::text,
    CASE WHEN v_is_create THEN 'Creó evento: ' ELSE 'Editó evento: ' END || v_title,
    CASE WHEN v_is_create THEN 'actions.eventos.create' ELSE 'actions.eventos.update' END,
    jsonb_build_object('title', v_title)
  );

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

-- Admin users
CREATE OR REPLACE FUNCTION public.sp_register_church_auth_user(
  p_church_id integer,
  p_auth_user_id uuid,
  p_profile_id uuid,
  p_email text,
  p_app_role_id integer DEFAULT NULL,
  p_is_active boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile_church integer;
  v_existing uuid;
  v_email text := TRIM(p_email);
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF p_auth_user_id IS NULL OR p_profile_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id y profile_id son obligatorios.';
  END IF;

  IF NULLIF(TRIM(COALESCE(p_email, '')), '') IS NULL THEN
    RAISE EXCEPTION 'El correo es obligatorio.';
  END IF;

  SELECT p.church_id INTO v_profile_church FROM public.profiles p WHERE p.id = p_profile_id;

  IF v_profile_church IS NULL OR v_profile_church <> p_church_id THEN
    RAISE EXCEPTION 'El perfil no pertenece a esta iglesia.';
  END IF;

  IF p_app_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Rol de aplicación no válido.';
  END IF;

  SELECT au.id INTO v_existing FROM public.auth_users au WHERE au.profile_id = p_profile_id LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'Este perfil ya tiene una cuenta de acceso vinculada.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.auth_users au WHERE au.id = p_auth_user_id) THEN
    RAISE EXCEPTION 'La cuenta de acceso ya está registrada.';
  END IF;

  INSERT INTO public.auth_users (
    id, email, profile_id, oauth_provider, is_active, is_verified,
    failed_login_attempts, app_role_id, created_at, updated_at
  ) VALUES (
    p_auth_user_id, v_email, p_profile_id, 'EMAIL'::public.oauthprovider,
    COALESCE(p_is_active, true), true, 0, p_app_role_id, now(), now()
  );

  PERFORM public.fn_sync_auth_app_metadata(p_auth_user_id);

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'admin_users',
    'create',
    'auth_user',
    p_auth_user_id::text,
    'Registró usuario de sistema: ' || v_email,
    'actions.admin_users.create',
    jsonb_build_object('email', v_email)
  );

  RETURN json_build_object('success', true, 'status_code', 201, 'auth_user_id', p_auth_user_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_update_church_auth_user(
  p_church_id integer,
  p_auth_user_id uuid,
  p_profile_id uuid DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_app_role_id integer DEFAULT NULL,
  p_is_active boolean DEFAULT NULL,
  p_clear_app_role boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile_church integer;
  v_current_profile uuid;
  v_email text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_app_admin();

  IF p_auth_user_id IS NULL THEN
    RAISE EXCEPTION 'auth_user_id es obligatorio.';
  END IF;

  SELECT au.profile_id INTO v_current_profile
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = p_auth_user_id AND p.church_id = p_church_id;

  IF v_current_profile IS NULL THEN
    RAISE EXCEPTION 'Usuario no encontrado en esta iglesia.';
  END IF;

  IF p_profile_id IS NOT NULL AND p_profile_id <> v_current_profile THEN
    SELECT p.church_id INTO v_profile_church FROM public.profiles p WHERE p.id = p_profile_id;
    IF v_profile_church IS NULL OR v_profile_church <> p_church_id THEN
      RAISE EXCEPTION 'El perfil no pertenece a esta iglesia.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.auth_users au
      WHERE au.profile_id = p_profile_id AND au.id <> p_auth_user_id
    ) THEN
      RAISE EXCEPTION 'El perfil seleccionado ya tiene otra cuenta vinculada.';
    END IF;
  END IF;

  IF p_app_role_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Rol de aplicación no válido.';
  END IF;

  UPDATE public.auth_users au
  SET
    profile_id = COALESCE(p_profile_id, au.profile_id),
    email = COALESCE(NULLIF(TRIM(p_email), ''), au.email),
    app_role_id = CASE
      WHEN p_clear_app_role THEN NULL
      WHEN p_app_role_id IS NOT NULL THEN p_app_role_id
      ELSE au.app_role_id
    END,
    is_active = COALESCE(p_is_active, au.is_active),
    updated_at = now()
  FROM public.profiles p
  WHERE au.id = p_auth_user_id
    AND p.id = au.profile_id
    AND p.church_id = p_church_id;

  PERFORM public.fn_sync_auth_app_metadata(p_auth_user_id);

  SELECT au.email INTO v_email FROM public.auth_users au WHERE au.id = p_auth_user_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'admin_users',
    'update',
    'auth_user',
    p_auth_user_id::text,
    'Actualizó usuario de sistema: ' || COALESCE(v_email, ''),
    'actions.admin_users.update',
    jsonb_build_object('email', COALESCE(v_email, ''))
  );

  RETURN json_build_object('success', true, 'status_code', 200, 'auth_user_id', p_auth_user_id);
END;
$$;

-- Roles
CREATE OR REPLACE FUNCTION public.sp_create_church_role(
  p_church_id integer,
  p_name text,
  p_description text DEFAULT NULL,
  p_permission_keys text[] DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_name text;
  v_new_id integer;
  v_role_key text;
  v_keys text[];
  k text;
  v_summary text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  v_name := NULLIF(TRIM(COALESCE(p_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El nombre del rol es obligatorio.';
  END IF;

  IF char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'El nombre no puede superar 120 caracteres.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.church_id = p_church_id
      AND lower(aur.app_users_role_name) = lower(v_name)
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Ya existe un rol con ese nombre en esta iglesia.';
  END IF;

  v_role_key := public.fn_build_custom_role_key(p_church_id, v_name);
  v_summary := NULLIF(TRIM(COALESCE(p_description, '')), '');

  INSERT INTO public.app_users_role (
    role_key, app_users_role_name, app_users_role_description, app_users_role_status,
    is_primary, church_id, role_kind, role_config, created_at, updated_at
  ) VALUES (
    v_role_key, v_name, v_summary, 'active', false, p_church_id, 'custom',
    jsonb_build_object(
      'color', 'var(--primary)',
      'summary', COALESCE(v_summary, 'Rol personalizado de la iglesia'),
      'sortOrder', 1000,
      'showInUserPicker', true
    ),
    now(), now()
  )
  RETURNING app_users_role_id INTO v_new_id;

  v_keys := COALESCE(p_permission_keys, ARRAY['profile:read', 'settings:read']::text[]);

  FOREACH k IN ARRAY v_keys LOOP
    IF EXISTS (SELECT 1 FROM public.app_permissions ap WHERE ap.permission_key = k) THEN
      INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
      VALUES (p_church_id, v_new_id, k)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'roles',
    'create',
    'role',
    v_new_id::text,
    'Creó rol: ' || v_name,
    'actions.roles.create',
    jsonb_build_object('name', v_name)
  );

  RETURN json_build_object(
    'success', true,
    'app_role_id', v_new_id,
    'role_key', v_role_key,
    'app_role_name', v_name,
    'description', v_summary
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_update_church_role(
  p_church_id integer,
  p_app_role_id integer,
  p_name text,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_name text;
  v_summary text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  IF public.fn_is_locked_system_role(p_app_role_id) THEN
    RAISE EXCEPTION 'Los roles del sistema no son editables.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id
      AND aur.church_id = p_church_id
      AND aur.role_kind = 'custom'
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Solo se pueden editar roles personalizados de esta iglesia.';
  END IF;

  v_name := NULLIF(TRIM(COALESCE(p_name, '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El nombre del rol es obligatorio.';
  END IF;

  IF char_length(v_name) > 120 THEN
    RAISE EXCEPTION 'El nombre no puede superar 120 caracteres.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.church_id = p_church_id
      AND aur.app_users_role_id <> p_app_role_id
      AND lower(aur.app_users_role_name) = lower(v_name)
      AND COALESCE(aur.app_users_role_status, 'active') = 'active'
  ) THEN
    RAISE EXCEPTION 'Ya existe un rol con ese nombre en esta iglesia.';
  END IF;

  v_summary := NULLIF(TRIM(COALESCE(p_description, '')), '');

  UPDATE public.app_users_role
  SET
    app_users_role_name = v_name,
    app_users_role_description = v_summary,
    role_config = role_config || jsonb_build_object(
      'summary', COALESCE(v_summary, 'Rol personalizado de la iglesia')
    ),
    updated_at = now()
  WHERE app_users_role_id = p_app_role_id
    AND church_id = p_church_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'roles',
    'update',
    'role',
    p_app_role_id::text,
    'Editó rol: ' || v_name,
    'actions.roles.update',
    jsonb_build_object('name', v_name)
  );

  RETURN json_build_object(
    'success', true,
    'app_role_id', p_app_role_id,
    'app_role_name', v_name,
    'description', v_summary
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_deactivate_church_role(
  p_church_id integer,
  p_app_role_id integer
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_user_count integer;
  v_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('roles:manage');

  IF NOT public.fn_can_deactivate_role(p_app_role_id) THEN
    RAISE EXCEPTION 'Este rol no se puede inactivar.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.app_users_role aur
    WHERE aur.app_users_role_id = p_app_role_id AND aur.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Rol no válido para esta iglesia.';
  END IF;

  SELECT aur.app_users_role_name INTO v_name
  FROM public.app_users_role aur
  WHERE aur.app_users_role_id = p_app_role_id;

  SELECT COUNT(*)::integer INTO v_user_count
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE p.church_id = p_church_id
    AND au.app_role_id = p_app_role_id
    AND COALESCE(au.is_active, true) = true;

  IF v_user_count > 0 THEN
    RAISE EXCEPTION 'No se puede inactivar: hay % usuario(s) con este rol asignado.', v_user_count;
  END IF;

  UPDATE public.app_users_role
  SET app_users_role_status = 'inactive', updated_at = now()
  WHERE app_users_role_id = p_app_role_id AND church_id = p_church_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'roles',
    'delete',
    'role',
    p_app_role_id::text,
    'Inactivó rol: ' || COALESCE(v_name, ''),
    'actions.roles.delete',
    jsonb_build_object('name', COALESCE(v_name, ''))
  );

  RETURN json_build_object('success', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_append_church_audit_log(
  integer, text, text, text, text, text, text, jsonb, jsonb
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_church_audit_log(
  integer, timestamptz, timestamptz, text, text, uuid, text, integer, integer
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_dashboard_recent_audit(integer) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
