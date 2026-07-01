-- =============================================================================
-- Transferencias entre fondos (par egreso origen + ingreso destino)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.fund_transfers (
  transfer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id),
  source_fund_id uuid NOT NULL REFERENCES public.funds(fund_id),
  destination_fund_id uuid NOT NULL REFERENCES public.funds(fund_id),
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  user_comment text,
  expense_transaction_id integer NOT NULL UNIQUE REFERENCES public.transactions(transaction_id),
  income_id uuid UNIQUE REFERENCES public.income_entries(income_id),
  status varchar(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  payment_method text NOT NULL DEFAULT 'Transfer',
  movement_date date NOT NULL DEFAULT CURRENT_DATE,
  created_by_profile_id uuid NOT NULL,
  authorized_by_profile_id uuid,
  authorization_date timestamptz,
  authorization_comments text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fund_transfers_different_funds CHECK (source_fund_id <> destination_fund_id)
);

CREATE INDEX IF NOT EXISTS idx_fund_transfers_church_status
  ON public.fund_transfers (church_id, status);

-- Tipo de egreso interno por iglesia
SELECT setval(
  pg_get_serial_sequence('public.expenses_type', 'expenses_type_id'),
  COALESCE((SELECT MAX(expenses_type_id) FROM public.expenses_type), 1)
);

INSERT INTO public.expenses_type (
  church_id, expenses_name, expenses_category, expenses_description, is_active
)
SELECT
  c.id,
  'Transferencia entre fondos',
  'INTERNO',
  'Salida por traslado de saldo hacia otro fondo.',
  true
FROM public.church c
WHERE NOT EXISTS (
  SELECT 1
  FROM public.expenses_type et
  WHERE et.church_id = c.id
    AND et.expenses_name = 'Transferencia entre fondos'
);

-- ¿Puede autorizar/rechazar finanzas? Admin app o Pastor (membresía)
CREATE OR REPLACE FUNCTION public.fn_can_authorize_finances(
  p_profile_id uuid,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.auth_users au
      WHERE au.app_role_id = 1
        AND (
          au.id = p_auth_user_id
          OR au.profile_id = p_profile_id
        )
    )
    OR EXISTS (
      SELECT 1
      FROM public.membership m
      WHERE m.profile_id = p_profile_id
        AND LOWER(TRIM(m.membership_role)) = 'pastor'
    );
$$;

CREATE OR REPLACE FUNCTION public.fn_build_fund_transfer_description(
  p_source_name text,
  p_destination_name text,
  p_user_comment text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_base text;
  v_comment text;
BEGIN
  v_base := 'Transferencia desde ' || TRIM(p_source_name) || ' hacia ' || TRIM(p_destination_name) || ':';
  v_comment := NULLIF(TRIM(COALESCE(p_user_comment, '')), '');
  IF v_comment IS NULL THEN
    RETURN v_base;
  END IF;
  RETURN v_base || ' ' || v_comment;
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

CREATE OR REPLACE FUNCTION public.sp_update_fund_transfer(
  p_church_id integer,
  p_transfer_id uuid,
  p_source_fund_id uuid,
  p_destination_fund_id uuid,
  p_amount numeric,
  p_user_comment text,
  p_payment_method text,
  p_movement_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_ft public.fund_transfers%ROWTYPE;
  v_source_name text;
  v_dest_name text;
  v_description text;
BEGIN
  SELECT * INTO v_ft
  FROM public.fund_transfers ft
  WHERE ft.transfer_id = p_transfer_id
    AND ft.church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia no encontrada.';
  END IF;

  IF v_ft.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Solo se pueden editar transferencias pendientes.';
  END IF;

  IF p_source_fund_id = p_destination_fund_id THEN
    RAISE EXCEPTION 'El fondo origen y destino deben ser diferentes.';
  END IF;

  SELECT f.fund_name INTO v_source_name
  FROM public.funds f
  WHERE f.fund_id = p_source_fund_id AND f.church_id = p_church_id;

  SELECT f.fund_name INTO v_dest_name
  FROM public.funds f
  WHERE f.fund_id = p_destination_fund_id AND f.church_id = p_church_id;

  v_description := public.fn_build_fund_transfer_description(
    v_source_name, v_dest_name, p_user_comment
  );

  IF char_length(v_description) > 250 THEN
    RAISE EXCEPTION 'La descripción no puede superar 250 caracteres.';
  END IF;

  UPDATE public.fund_transfers
  SET
    source_fund_id = p_source_fund_id,
    destination_fund_id = p_destination_fund_id,
    amount = p_amount,
    user_comment = NULLIF(TRIM(COALESCE(p_user_comment, '')), ''),
    payment_method = COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Transfer'),
    movement_date = COALESCE(p_movement_date, movement_date),
    updated_at = now()
  WHERE transfer_id = p_transfer_id;

  UPDATE public.transactions
  SET
    fund_id = p_source_fund_id,
    transaction_amount = p_amount,
    transaction_description = v_description,
    payment_method = COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Transfer'),
    transaction_date = COALESCE(p_movement_date, transaction_date),
    updated_at = now()
  WHERE transaction_id = v_ft.expense_transaction_id
    AND church_id = p_church_id;

  RETURN json_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_authorize_fund_transfer(
  p_church_id integer,
  p_transfer_id uuid,
  p_authorized_by_profile_id uuid,
  p_auth_user_id uuid,
  p_authorization_comments text DEFAULT NULL
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
  p_authorization_comments text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_ft public.fund_transfers%ROWTYPE;
BEGIN
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

GRANT EXECUTE ON FUNCTION public.fn_can_authorize_finances(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_create_fund_transfer(integer, uuid, uuid, numeric, text, text, date, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_update_fund_transfer(integer, uuid, uuid, uuid, numeric, text, text, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_authorize_fund_transfer(integer, uuid, uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_reject_fund_transfer(integer, uuid, uuid, uuid, text) TO authenticated, service_role;

-- Ledger: marcar transferencias y exponer fondos origen/destino
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
SET search_path TO 'public'
AS $function$
DECLARE
  v_result json;
BEGIN
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
$function$;

NOTIFY pgrst, 'reload schema';
