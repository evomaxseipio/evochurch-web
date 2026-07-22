-- Make dashboard event rendering tenant-timezone aware. The timezone travels in
-- the protected dashboard payload so SSR can serialize stable event labels.

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

  v_result := public.fn_dashboard_summary_data(p_church_id, p_months)::jsonb;
  v_result := jsonb_set(
    v_result,
    '{timezone}',
    to_jsonb(public.fn_church_timezone(p_church_id)),
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

  v_kpi_month := COALESCE(v_result -> 'kpi_month', '{}'::jsonb);
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
  'Dashboard tenant-scoped; includes church timezone and redacts finance by granular RBAC.';

NOTIFY pgrst, 'reload schema';

