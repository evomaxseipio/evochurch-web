-- Sprint 2: dashboard summary RPC — pre-aggregated KPIs and charts (no full history).

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
  v_months integer := LEAST(GREATEST(COALESCE(p_months, 12), 1), 24);
  v_today date := CURRENT_DATE;
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'member_stats', (
      SELECT json_build_object(
        'total', COUNT(*)::integer,
        'members', COUNT(*) FILTER (WHERE p.is_member)::integer,
        'visits', COUNT(*) FILTER (WHERE NOT p.is_member)::integer,
        'active', COUNT(*) FILTER (WHERE p.is_active)::integer,
        'inactive', COUNT(*) FILTER (WHERE NOT p.is_active)::integer
      )
      FROM profiles p
      WHERE p.church_id = p_church_id
    ),
    'funds_summary', (
      SELECT json_build_object(
        'total_balance', COALESCE(SUM(f.total_contributions), 0),
        'active_count', COUNT(*) FILTER (WHERE f.is_active)::integer
      )
      FROM funds f
      WHERE f.church_id = p_church_id
    ),
    'offering_today', COALESCE((
      SELECT SUM(ie.amount)
      FROM income_entries ie
      INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
      WHERE ie.church_id = p_church_id
        AND ie.payment_date = v_today
        AND COALESCE(itc.is_operational, false) = false
    ), 0),
    'catechumen_count', COALESCE((
      SELECT COUNT(*)::integer
      FROM membership m
      WHERE m.church_id = p_church_id
        AND m.membership_role = 'Catecumenos'
    ), 0),
    'contribution_monthly_totals', COALESCE((
      SELECT json_agg(COALESCE(mo.total, 0) ORDER BY mo.month_start)
      FROM (
        SELECT
          gs::date AS month_start,
          (
            SELECT SUM(ie.amount)
            FROM income_entries ie
            INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
            WHERE ie.church_id = p_church_id
              AND COALESCE(itc.is_operational, false) = false
              AND ie.payment_date >= gs::date
              AND ie.payment_date < (gs + interval '1 month')::date
          ) AS total
        FROM generate_series(
          date_trunc('month', v_today)::date - ((LEAST(v_months, 8) - 1) || ' months')::interval,
          date_trunc('month', v_today)::date,
          interval '1 month'
        ) gs
      ) mo
    ), '[]'::json),
    'contribution_chart', json_build_object(
      'week', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(w.week_start, 'DD Mon'),
            'value', COALESCE(w.total, 0),
            'from', w.week_start::text,
            'to', (w.week_start + interval '6 days')::date::text
          )
          ORDER BY w.week_start
        )
        FROM (
          SELECT
            (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date AS week_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND ie.payment_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS total
          FROM generate_series(6, 0, -1) n
        ) w
      ), '[]'::json),
      'month', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(m.month_start, 'Mon'),
            'value', COALESCE(m.total, 0),
            'from', m.month_start::text,
            'to', (m.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY m.month_start
        )
        FROM (
          SELECT
            (date_trunc('month', v_today)::date - (n || ' months')::interval)::date AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS total
          FROM generate_series(6, 0, -1) n
        ) m
      ), '[]'::json),
      'quarter', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', 'T' || EXTRACT(quarter FROM q.quarter_start)::text || ' ' || to_char(q.quarter_start, 'YY'),
            'value', COALESCE(q.total, 0),
            'from', q.quarter_start::text,
            'to', (q.quarter_start + interval '3 months' - interval '1 day')::date::text
          )
          ORDER BY q.quarter_start
        )
        FROM (
          SELECT
            (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date AS quarter_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS total
          FROM generate_series(3, 0, -1) n
        ) q
      ), '[]'::json),
      'year', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(y.month_start, 'Mon'),
            'value', COALESCE(y.total, 0),
            'from', y.month_start::text,
            'to', (y.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY y.month_start
        )
        FROM (
          SELECT
            make_date(EXTRACT(year FROM v_today)::integer, n, 1) AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = false
                AND ie.payment_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND ie.payment_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS total
          FROM generate_series(1, 12) n
        ) y
      ), '[]'::json)
    ),
    'ledger_chart', json_build_object(
      'week', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(w.week_start, 'DD Mon'),
            'income', COALESCE(w.income_total, 0),
            'expense', COALESCE(w.expense_total, 0),
            'from', w.week_start::text,
            'to', (w.week_start + interval '6 days')::date::text
          )
          ORDER BY w.week_start
        )
        FROM (
          SELECT
            (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date AS week_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND ie.payment_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('week', v_today)::date - (n || ' weeks')::interval)::date
                AND t.transaction_date <= (date_trunc('week', v_today)::date - (n || ' weeks')::interval + interval '6 days')::date
            ) AS expense_total
          FROM generate_series(6, 0, -1) n
        ) w
      ), '[]'::json),
      'month', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(m.month_start, 'Mon'),
            'income', COALESCE(m.income_total, 0),
            'expense', COALESCE(m.expense_total, 0),
            'from', m.month_start::text,
            'to', (m.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY m.month_start
        )
        FROM (
          SELECT
            (date_trunc('month', v_today)::date - (n || ' months')::interval)::date AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('month', v_today)::date - (n || ' months')::interval)::date
                AND t.transaction_date < (date_trunc('month', v_today)::date - (n || ' months')::interval + interval '1 month')::date
            ) AS expense_total
          FROM generate_series(6, 0, -1) n
        ) m
      ), '[]'::json),
      'quarter', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', 'T' || EXTRACT(quarter FROM q.quarter_start)::text || ' ' || to_char(q.quarter_start, 'YY'),
            'income', COALESCE(q.income_total, 0),
            'expense', COALESCE(q.expense_total, 0),
            'from', q.quarter_start::text,
            'to', (q.quarter_start + interval '3 months' - interval '1 day')::date::text
          )
          ORDER BY q.quarter_start
        )
        FROM (
          SELECT
            (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date AS quarter_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND ie.payment_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval)::date
                AND t.transaction_date < (date_trunc('quarter', v_today)::date - (n * 3 || ' months')::interval + interval '3 months')::date
            ) AS expense_total
          FROM generate_series(3, 0, -1) n
        ) q
      ), '[]'::json),
      'year', COALESCE((
        SELECT json_agg(
          json_build_object(
            'label', to_char(y.month_start, 'Mon'),
            'income', COALESCE(y.income_total, 0),
            'expense', COALESCE(y.expense_total, 0),
            'from', y.month_start::text,
            'to', (y.month_start + interval '1 month' - interval '1 day')::date::text
          )
          ORDER BY y.month_start
        )
        FROM (
          SELECT
            make_date(EXTRACT(year FROM v_today)::integer, n, 1) AS month_start,
            (
              SELECT SUM(ie.amount)
              FROM income_entries ie
              INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
              WHERE ie.church_id = p_church_id
                AND COALESCE(itc.is_operational, false) = true
                AND ie.payment_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND ie.payment_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS income_total,
            (
              SELECT SUM(t.transaction_amount)
              FROM transactions t
              WHERE t.church_id = p_church_id
                AND t.authorization_status = 'APPROVED'
                AND t.transaction_date >= make_date(EXTRACT(year FROM v_today)::integer, n, 1)
                AND t.transaction_date < (make_date(EXTRACT(year FROM v_today)::integer, n, 1) + interval '1 month')::date
            ) AS expense_total
          FROM generate_series(1, 12) n
        ) y
      ), '[]'::json)
    ),
    'kpi_month', json_build_object(
      'contributions_this_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = false
          AND ie.payment_date >= date_trunc('month', v_today)::date
          AND ie.payment_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'contributions_prev_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = false
          AND ie.payment_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND ie.payment_date < date_trunc('month', v_today)::date
      ), 0),
      'ledger_income_this_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = true
          AND ie.payment_date >= date_trunc('month', v_today)::date
          AND ie.payment_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'ledger_income_prev_month', COALESCE((
        SELECT SUM(ie.amount)
        FROM income_entries ie
        INNER JOIN income_type_catalog itc ON itc.id = ie.income_type_id
        WHERE ie.church_id = p_church_id
          AND COALESCE(itc.is_operational, false) = true
          AND ie.payment_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND ie.payment_date < date_trunc('month', v_today)::date
      ), 0),
      'ledger_expense_this_month', COALESCE((
        SELECT SUM(t.transaction_amount)
        FROM transactions t
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'APPROVED'
          AND t.transaction_date >= date_trunc('month', v_today)::date
          AND t.transaction_date < (date_trunc('month', v_today) + interval '1 month')::date
      ), 0),
      'ledger_expense_prev_month', COALESCE((
        SELECT SUM(t.transaction_amount)
        FROM transactions t
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'APPROVED'
          AND t.transaction_date >= (date_trunc('month', v_today) - interval '1 month')::date
          AND t.transaction_date < date_trunc('month', v_today)::date
      ), 0)
    ),
    'pending_authorizations', COALESCE((
      SELECT json_agg(row_to_json(p) ORDER BY p.movement_date DESC)
      FROM (
        SELECT
          t.transaction_id::text AS id,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN 'fund_transfer'
            ELSE 'expense'
          END AS kind,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN 'Transferencia entre fondos'
            ELSE COALESCE(NULLIF(TRIM(t.transaction_description), ''), et.expenses_name, 'Egreso pendiente')
          END AS title,
          CASE
            WHEN ft.transfer_id IS NOT NULL THEN
              COALESCE(sf.fund_name, f.fund_name) || ' → ' || COALESCE(df.fund_name, '—')
            ELSE f.fund_name || ' · ' || COALESCE(
              NULLIF(TRIM(CONCAT(pc.first_name, ' ', pc.last_name)), ''),
              '—'
            )
          END AS subtitle,
          t.transaction_amount AS amount,
          t.transaction_date::text AS movement_date
        FROM transactions t
        INNER JOIN funds f ON f.fund_id = t.fund_id AND f.church_id = t.church_id::integer
        LEFT JOIN expenses_type et ON et.expenses_type_id = t.expenses_type_id
        LEFT JOIN profiles pc ON pc.id = t.created_by_profile_id
        LEFT JOIN fund_transfers ft ON ft.expense_transaction_id = t.transaction_id
        LEFT JOIN funds sf ON sf.fund_id = ft.source_fund_id
        LEFT JOIN funds df ON df.fund_id = ft.destination_fund_id
        WHERE t.church_id = p_church_id
          AND t.authorization_status = 'PENDING'
        ORDER BY t.transaction_date DESC, t.created_at DESC
        LIMIT 8
      ) p
    ), '[]'::json)
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Error al cargar el dashboard: ' || SQLERRM
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_get_dashboard_summary(integer, integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.sp_get_dashboard_summary(integer, integer)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
