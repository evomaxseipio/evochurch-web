-- Añade asserts multitenant a RPCs de transferencias (sin reescribir ledger).

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
