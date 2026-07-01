-- Autorizar/rechazar transferencias: guards multitenant.

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

DROP FUNCTION IF EXISTS public.spgetprofiles();

NOTIFY pgrst, 'reload schema';
