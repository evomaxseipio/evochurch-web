-- Multitenant guards + app_metadata sync (SaaS: una iglesia por sesión, resuelta en BD).

-- Iglesia del usuario autenticado (tenant).
CREATE OR REPLACE FUNCTION public.fn_get_session_church_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT p.church_id
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  WHERE au.id = auth.uid()
    AND COALESCE(au.is_active, true) = true
  LIMIT 1;
$$;

-- Perfil de negocio del usuario autenticado.
CREATE OR REPLACE FUNCTION public.fn_get_session_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT au.profile_id
  FROM public.auth_users au
  WHERE au.id = auth.uid()
    AND COALESCE(au.is_active, true) = true
  LIMIT 1;
$$;

-- Bloquea acceso cross-tenant: p_church_id debe coincidir con la sesión.
CREATE OR REPLACE FUNCTION public.fn_assert_session_church(p_church_id integer)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_church_id integer;
BEGIN
  IF p_church_id IS NULL THEN
    RAISE EXCEPTION 'church_id requerido.';
  END IF;

  v_church_id := public.fn_get_session_church_id();

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'Sesión sin iglesia vinculada.';
  END IF;

  IF v_church_id <> p_church_id THEN
    RAISE EXCEPTION 'Acceso denegado: iglesia no autorizada.';
  END IF;
END;
$$;

-- Impide suplantar otro profile_id en mutaciones sensibles.
CREATE OR REPLACE FUNCTION public.fn_assert_session_profile(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_profile_id uuid;
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id requerido.';
  END IF;

  v_profile_id := public.fn_get_session_profile_id();

  IF v_profile_id IS NULL THEN
    RAISE EXCEPTION 'Sesión sin perfil vinculado.';
  END IF;

  IF v_profile_id <> p_profile_id THEN
    RAISE EXCEPTION 'Acceso denegado: perfil no autorizado.';
  END IF;
END;
$$;

-- Claims seguros para auth.users.raw_app_meta_data (solo lectura en cliente).
CREATE OR REPLACE FUNCTION public.fn_build_app_metadata(p_auth_user_id uuid DEFAULT auth.uid())
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT jsonb_strip_nulls(
    jsonb_build_object(
      'church_id', p.church_id,
      'profile_id', au.profile_id,
      'app_role_id', au.app_role_id,
      'church_name', ch.name
    )
  )
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  WHERE au.id = p_auth_user_id
    AND COALESCE(au.is_active, true) = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_auth_app_metadata(p_auth_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public, auth
AS $$
DECLARE
  v_claims jsonb;
BEGIN
  IF p_auth_user_id IS NULL THEN
    RETURN;
  END IF;

  v_claims := public.fn_build_app_metadata(p_auth_user_id);

  IF v_claims IS NULL OR v_claims = '{}'::jsonb THEN
    RETURN;
  END IF;

  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || v_claims
  WHERE id = p_auth_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_auth_users_sync_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_sync_auth_app_metadata(NEW.id);
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_membership_sync_app_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_auth_user_id uuid;
BEGIN
  SELECT au.id INTO v_auth_user_id
  FROM public.auth_users au
  WHERE au.profile_id = NEW.profile_id
  LIMIT 1;

  IF v_auth_user_id IS NOT NULL THEN
    PERFORM public.fn_sync_auth_app_metadata(v_auth_user_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_users_sync_app_metadata ON public.auth_users;
CREATE TRIGGER auth_users_sync_app_metadata
  AFTER INSERT OR UPDATE OF profile_id, app_role_id, is_active
  ON public.auth_users
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_auth_users_sync_app_metadata();

DROP TRIGGER IF EXISTS membership_sync_app_metadata ON public.membership;
CREATE TRIGGER membership_sync_app_metadata
  AFTER INSERT OR UPDATE OF membership_role, church_id, profile_id
  ON public.membership
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_membership_sync_app_metadata();

-- sp_get_session_context: reutiliza helpers de tenant.
CREATE OR REPLACE FUNCTION public.sp_get_session_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'auth_user_id', au.id,
    'profile_id', au.profile_id,
    'email', COALESCE(au.email, ''),
    'church_id', p.church_id,
    'full_name', NULLIF(
      TRIM(
        CONCAT(
          COALESCE(p.first_name, ''),
          ' ',
          COALESCE(p.last_name, '')
        )
      ),
      ''
    ),
    'church_name', ch.name,
    'app_role_id', au.app_role_id,
    'app_role_name', aur.app_users_role_name,
    'membership_role', m.membership_role,
    'can_authorize_finances',
      public.fn_can_authorize_finances(au.profile_id, v_uid),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false)
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur
    ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE au.id = v_uid
    AND COALESCE(au.is_active, true) = true
    AND p.church_id IS NOT NULL;

  RETURN v_result;
END;
$$;

-- Finanzas: assert tenant al inicio.
CREATE OR REPLACE FUNCTION public.sp_get_finance_ledger(
  p_church_id integer,
  p_fund_id uuid DEFAULT NULL::uuid,
  p_date_from date DEFAULT NULL::date,
  p_date_to date DEFAULT NULL::date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'ledger_list', COALESCE((
      SELECT json_agg(row_to_json(x) ORDER BY x.movement_date DESC, x.sort_key DESC)
      FROM (
        SELECT
          'operational_income'::text AS entry_kind,
          ie.income_id::text AS entry_id,
          ie.church_id,
          ie.fund_id,
          f.fund_name,
          ie.income_type_id,
          itc.type_name AS type_name,
          COALESCE(NULLIF(TRIM(ie.notes), ''), itc.type_name) AS description,
          ie.amount AS amount,
          'income'::text AS direction,
          'CONFIRMED'::text AS status,
          ie.payment_date AS movement_date,
          ie.payment_method,
          NULL::uuid AS created_by_profile_id,
          COALESCE(
            NULLIF(TRIM(CONCAT(pr.first_name, ' ', pr.last_name)), ''),
            '—'
          ) AS created_by,
          NULL::uuid AS authorized_by_profile_id,
          COALESCE(
            NULLIF(TRIM(CONCAT(pr.first_name, ' ', pr.last_name)), ''),
            '—'
          ) AS authorized_by,
          ie.payment_date::timestamp AS authorization_date,
          NULL::text AS authorization_comments,
          contrib.contributor_name,
          (ft_in.transfer_id IS NOT NULL) AS is_fund_transfer,
          ft_in.transfer_id::text AS fund_transfer_id,
          ft_in.source_fund_id AS transfer_source_fund_id,
          ft_in.destination_fund_id AS transfer_destination_fund_id,
          sf_in.fund_name AS transfer_source_fund_name,
          df_in.fund_name AS transfer_destination_fund_name,
          ft_in.user_comment AS transfer_user_comment,
          ie.created_at AS sort_key
        FROM income_entries ie
        INNER JOIN income_type_catalog itc
          ON itc.id = ie.income_type_id
         AND COALESCE(itc.is_operational, false) = true
        INNER JOIN funds f
          ON f.fund_id = ie.fund_id
         AND f.church_id = ie.church_id
        LEFT JOIN auth_users au
          ON au.id = ie.recorded_by
        LEFT JOIN profiles pr
          ON pr.id = au.profile_id
        LEFT JOIN fund_transfers ft_in
          ON ft_in.income_id = ie.income_id
        LEFT JOIN funds sf_in
          ON sf_in.fund_id = ft_in.source_fund_id
        LEFT JOIN funds df_in
          ON df_in.fund_id = ft_in.destination_fund_id
        LEFT JOIN LATERAL (
          SELECT
            COALESCE(
              NULLIF(TRIM(CONCAT(prc.first_name, ' ', prc.last_name)), ''),
              NULLIF(TRIM(co.contact_name), ''),
              NULLIF(TRIM(co.company_name), '')
            ) AS contributor_name
          FROM income_contributors ic
          INNER JOIN contributors co
            ON co.contributor_id = ic.contributor_id
          LEFT JOIN profiles prc
            ON prc.id = co.profile_id
          WHERE ic.income_id = ie.income_id
            AND ic.is_primary = true
          LIMIT 1
        ) contrib ON true
        WHERE ie.church_id = p_church_id
          AND (p_fund_id IS NULL OR ie.fund_id = p_fund_id)
          AND (p_date_from IS NULL OR ie.payment_date >= p_date_from)
          AND (p_date_to IS NULL OR ie.payment_date <= p_date_to)

        UNION ALL

        SELECT
          'expense'::text AS entry_kind,
          t.transaction_id::text AS entry_id,
          t.church_id::integer,
          t.fund_id,
          f.fund_name,
          t.expenses_type_id AS income_type_id,
          et.expenses_name AS type_name,
          COALESCE(NULLIF(TRIM(t.transaction_description), ''), et.expenses_name) AS description,
          t.transaction_amount AS amount,
          'expense'::text AS direction,
          t.authorization_status AS status,
          t.transaction_date AS movement_date,
          t.payment_method,
          t.created_by_profile_id,
          COALESCE(
            NULLIF(TRIM(CONCAT(pc.first_name, ' ', pc.last_name)), ''),
            '—'
          ) AS created_by,
          t.authorized_by_profile_id,
          CASE
            WHEN t.authorization_status = 'PENDING' THEN 'Pendiente Autorizacion'
            WHEN pa.first_name IS NOT NULL OR pa.last_name IS NOT NULL
              THEN TRIM(CONCAT(pa.first_name, ' ', pa.last_name))
            ELSE '—'
          END AS authorized_by,
          t.authorization_date,
          t.authorization_comments,
          NULL::text AS contributor_name,
          (ft_ex.transfer_id IS NOT NULL) AS is_fund_transfer,
          ft_ex.transfer_id::text AS fund_transfer_id,
          ft_ex.source_fund_id AS transfer_source_fund_id,
          ft_ex.destination_fund_id AS transfer_destination_fund_id,
          sf_ex.fund_name AS transfer_source_fund_name,
          df_ex.fund_name AS transfer_destination_fund_name,
          ft_ex.user_comment AS transfer_user_comment,
          t.created_at AS sort_key
        FROM transactions t
        INNER JOIN funds f
          ON f.fund_id = t.fund_id
         AND f.church_id = t.church_id::integer
        LEFT JOIN expenses_type et
          ON et.expenses_type_id = t.expenses_type_id
        LEFT JOIN profiles pc
          ON pc.id = t.created_by_profile_id
        LEFT JOIN profiles pa
          ON pa.id = t.authorized_by_profile_id
        LEFT JOIN fund_transfers ft_ex
          ON ft_ex.expense_transaction_id = t.transaction_id
        LEFT JOIN funds sf_ex
          ON sf_ex.fund_id = ft_ex.source_fund_id
        LEFT JOIN funds df_ex
          ON df_ex.fund_id = ft_ex.destination_fund_id
        WHERE t.church_id = p_church_id
          AND (p_fund_id IS NULL OR t.fund_id = p_fund_id)
          AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
          AND (p_date_to IS NULL OR t.transaction_date <= p_date_to)
      ) x
    ), '[]'::json),
    'pending_authorization_count', (
      SELECT COUNT(*)::integer
        FROM transactions t2
       WHERE t2.church_id = p_church_id
         AND (p_fund_id IS NULL OR t2.fund_id = p_fund_id)
         AND t2.authorization_status = 'PENDING'
    )
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Error al cargar el libro de transacciones: ' || SQLERRM,
      'ledger_list', '[]'::json,
      'pending_authorization_count', 0
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_create_fund_transfer(
  p_church_id integer,
  p_source_fund_id uuid,
  p_destination_fund_id uuid,
  p_amount numeric,
  p_user_comment text,
  p_payment_method text,
  p_movement_date date,
  p_created_by_profile_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_source_name text;
  v_dest_name text;
  v_description text;
  v_expense_type_id integer;
  v_fund_amount numeric := 0;
  v_in_transit numeric := 0;
  v_remaining numeric;
  v_transaction_id integer;
  v_transfer_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_created_by_profile_id);

  IF p_source_fund_id = p_destination_fund_id THEN
    RAISE EXCEPTION 'El fondo origen y destino deben ser diferentes.';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'El monto debe ser mayor que cero.';
  END IF;

  SELECT f.fund_name INTO v_source_name
  FROM public.funds f
  WHERE f.fund_id = p_source_fund_id AND f.church_id = p_church_id;

  IF v_source_name IS NULL THEN
    RAISE EXCEPTION 'Fondo origen no válido.';
  END IF;

  SELECT f.fund_name INTO v_dest_name
  FROM public.funds f
  WHERE f.fund_id = p_destination_fund_id AND f.church_id = p_church_id;

  IF v_dest_name IS NULL THEN
    RAISE EXCEPTION 'Fondo destino no válido.';
  END IF;

  v_description := public.fn_build_fund_transfer_description(
    v_source_name, v_dest_name, p_user_comment
  );

  IF char_length(v_description) > 250 THEN
    RAISE EXCEPTION 'La descripción no puede superar 250 caracteres.';
  END IF;

  SELECT et.expenses_type_id INTO v_expense_type_id
  FROM public.expenses_type et
  WHERE et.church_id = p_church_id
    AND et.expenses_name = 'Transferencia entre fondos'
    AND et.is_active = true
  LIMIT 1;

  IF v_expense_type_id IS NULL THEN
    RAISE EXCEPTION 'Tipo de egreso de transferencia no configurado.';
  END IF;

  SELECT
    COALESCE(f.total_contributions, 0),
    COALESCE(SUM(t.transaction_amount), 0)
  INTO v_fund_amount, v_in_transit
  FROM public.funds f
  LEFT JOIN public.transactions t
    ON t.fund_id = f.fund_id
   AND t.church_id = f.church_id
   AND t.authorization_status IN ('PENDING', 'APPROVED')
  WHERE f.fund_id = p_source_fund_id
    AND f.church_id = p_church_id
  GROUP BY f.total_contributions;

  v_remaining := v_fund_amount - v_in_transit;

  IF p_amount > v_remaining OR v_fund_amount = 0 THEN
    RAISE EXCEPTION 'Fondos insuficientes en el fondo origen.';
  END IF;

  INSERT INTO public.transactions (
    church_id,
    expenses_type_id,
    fund_id,
    created_by_profile_id,
    transaction_amount,
    transaction_description,
    payment_method,
    transaction_date,
    authorization_status
  ) VALUES (
    p_church_id,
    v_expense_type_id,
    p_source_fund_id,
    p_created_by_profile_id,
    p_amount,
    v_description,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Transfer'),
    COALESCE(p_movement_date, CURRENT_DATE),
    'PENDING'
  )
  RETURNING transaction_id INTO v_transaction_id;

  INSERT INTO public.fund_transfers (
    church_id,
    source_fund_id,
    destination_fund_id,
    amount,
    user_comment,
    expense_transaction_id,
    payment_method,
    movement_date,
    created_by_profile_id,
    status
  ) VALUES (
    p_church_id,
    p_source_fund_id,
    p_destination_fund_id,
    p_amount,
    NULLIF(TRIM(COALESCE(p_user_comment, '')), ''),
    v_transaction_id,
    COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Transfer'),
    COALESCE(p_movement_date, CURRENT_DATE),
    p_created_by_profile_id,
    'PENDING'
  )
  RETURNING transfer_id INTO v_transfer_id;

  RETURN json_build_object(
    'success', true,
    'transfer_id', v_transfer_id,
    'transaction_id', v_transaction_id
  );
END;
$$;

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
    church_id,
    fund_id,
    income_type_id,
    collection_mode,
    contribution_kind,
    amount,
    payment_date,
    payment_method,
    is_anonymous,
    notes,
    recorded_by
  ) VALUES (
    p_church_id,
    v_ft.destination_fund_id,
    v_income_type_id,
    'collective',
    'monetary',
    v_ft.amount,
    v_ft.movement_date,
    v_ft.payment_method,
    true,
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

  RETURN json_build_object('success', true, 'income_id', v_income_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_reject_fund_transfer(
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
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_authorized_by_profile_id);

  IF NOT public.fn_can_authorize_finances(p_authorized_by_profile_id, p_auth_user_id) THEN
    RAISE EXCEPTION 'No tienes permiso para rechazar transferencias.';
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

  UPDATE public.fund_transfers
  SET
    status = 'REJECTED',
    authorized_by_profile_id = p_authorized_by_profile_id,
    authorization_date = now(),
    authorization_comments = NULLIF(TRIM(COALESCE(p_authorization_comments, '')), ''),
    updated_at = now()
  WHERE transfer_id = p_transfer_id;

  UPDATE public.transactions
  SET
    authorization_status = 'REJECTED',
    authorized_by_profile_id = p_authorized_by_profile_id,
    authorization_date = CURRENT_TIMESTAMP,
    authorization_comments = NULLIF(TRIM(COALESCE(p_authorization_comments, '')), ''),
    updated_at = now()
  WHERE transaction_id = v_ft.expense_transaction_id
    AND church_id = p_church_id;

  RETURN json_build_object('success', true);
END;
$$;

-- Egresos: tenant + permiso + autorización (reemplaza procedure sin guards).
DROP PROCEDURE IF EXISTS public.sp_authorize_transaction(
  integer, integer, uuid, character varying, text
);

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
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_authorized_by_profile_id);

  IF NOT public.fn_can_authorize_finances(p_authorized_by_profile_id, auth.uid()) THEN
    RAISE EXCEPTION 'No tienes permiso para autorizar egresos.';
  END IF;

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
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_session_church_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_get_session_profile_id() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_session_church(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_assert_session_profile(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_build_app_metadata(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sync_auth_app_metadata(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sp_authorize_transaction(integer, integer, uuid, character varying, text) TO authenticated, service_role;

-- Backfill app_metadata para usuarios existentes.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT au.id
    FROM public.auth_users au
    WHERE COALESCE(au.is_active, true) = true
  LOOP
    PERFORM public.fn_sync_auth_app_metadata(r.id);
  END LOOP;
END;
$$;

NOTIFY pgrst, 'reload schema';
