-- KISS: reuse profiles + attendance records for quick visitor registration and
-- expose the distinct current-month visitor count in the dashboard payload.

CREATE OR REPLACE FUNCTION public.sp_add_attendance_visitor(
  p_church_id integer,
  p_session_id uuid,
  p_first_name varchar,
  p_last_name varchar,
  p_phone varchar DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_profile_result jsonb;
  v_attendance_result jsonb;
  v_profile_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('attendance:write');

  IF nullif(trim(p_first_name), '') IS NULL
    OR nullif(trim(p_last_name), '') IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Nombre y apellido son obligatorios'
    );
  END IF;

  v_profile_result := public.spinsertprofiles(
    p_church_id,
    trim(p_first_name),
    trim(p_last_name),
    NULL, NULL, NULL, NULL, NULL, NULL, NULL,
    false, true, NULL,
    NULL, NULL, NULL, NULL,
    nullif(trim(p_phone), ''),
    NULL, NULL, NULL, NULL, NULL
  );

  IF lower(coalesce(v_profile_result->>'status', '')) <> 'success' THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 400,
      'message', coalesce(v_profile_result->>'message', 'No se pudo crear el visitante')
    );
  END IF;

  v_profile_id := nullif(v_profile_result->>'profile_id', '')::uuid;
  v_attendance_result := public.sp_set_attendance_records(
    p_church_id,
    p_session_id,
    jsonb_build_array(jsonb_build_object(
      'profileId', v_profile_id,
      'status', 'present',
      'notes', ''
    ))
  );

  IF NOT coalesce((v_attendance_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION '%', coalesce(
      v_attendance_result->>'message',
      'No se pudo registrar la asistencia'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'profileId', v_profile_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_add_attendance_visitor(
  integer, uuid, varchar, varchar, varchar
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sp_add_attendance_visitor(
  integer, uuid, varchar, varchar, varchar
) TO authenticated, service_role;

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
  v_result jsonb;
  v_kpi_month jsonb;
  v_timezone text;
  v_visitors_month integer;
  v_can_funds boolean;
  v_can_contributions boolean;
  v_can_transactions boolean;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('dashboard:read');

  v_can_funds :=
    public.fn_user_has_permission('finances:funds:read') OR
    public.fn_user_has_permission('finances:read');
  v_can_contributions :=
    public.fn_user_has_permission('finances:contributions:read') OR
    public.fn_user_has_permission('finances:read');
  v_can_transactions :=
    public.fn_user_has_permission('finances:transactions:read') OR
    public.fn_user_has_permission('finances:read');

  v_timezone := public.fn_church_timezone(p_church_id);
  v_result := public.fn_dashboard_summary_data(p_church_id, p_months)::jsonb;
  v_result := jsonb_set(v_result, '{timezone}', to_jsonb(v_timezone), true);

  SELECT count(DISTINCT ar.profile_id)::integer
  INTO v_visitors_month
  FROM public.attendance_record ar
  JOIN public.attendance_session ats
    ON ats.id = ar.session_id AND ats.church_id = ar.church_id
  JOIN public.profiles p
    ON p.id = ar.profile_id AND p.church_id = ar.church_id
  WHERE ar.church_id = p_church_id
    AND ar.status IN ('present', 'late')
    AND p.is_member = false
    AND ats.session_date >= date_trunc('month', now() AT TIME ZONE v_timezone)::date
    AND ats.session_date <
      (date_trunc('month', now() AT TIME ZONE v_timezone) + interval '1 month')::date;

  v_result := jsonb_set(
    v_result,
    '{visitors_month}',
    to_jsonb(coalesce(v_visitors_month, 0)),
    true
  );

  IF NOT v_can_funds THEN
    v_result := v_result - 'funds_summary';
  END IF;

  IF NOT v_can_contributions THEN
    v_result := v_result
      - 'offering_today'
      - 'contribution_monthly_totals'
      - 'contribution_chart';
  END IF;

  IF NOT v_can_transactions THEN
    v_result := v_result - 'pending_authorizations';
  END IF;

  v_result := jsonb_set(
    v_result,
    '{ledger_chart}',
    public.fn_redact_dashboard_ledger_chart(
      v_result -> 'ledger_chart',
      v_can_contributions,
      v_can_transactions
    ),
    true
  );

  v_kpi_month := coalesce(v_result -> 'kpi_month', '{}'::jsonb);
  IF NOT v_can_contributions THEN
    v_kpi_month := v_kpi_month
      - 'contributions_this_month'
      - 'contributions_prev_month'
      - 'ledger_income_this_month'
      - 'ledger_income_prev_month';
  END IF;
  IF NOT v_can_transactions THEN
    v_kpi_month := v_kpi_month
      - 'ledger_expense_this_month'
      - 'ledger_expense_prev_month';
  END IF;
  v_result := jsonb_set(v_result, '{kpi_month}', v_kpi_month, true);

  RETURN v_result::json;
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_get_dashboard_summary(integer, integer)
  FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.sp_get_dashboard_summary(integer, integer)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.sp_get_dashboard_summary(integer, integer) IS
  'Dashboard tenant-scoped; includes timezone and distinct monthly visitors, with finance RBAC redaction.';

NOTIFY pgrst, 'reload schema';

