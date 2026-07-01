-- Incluir nombre de contribuyente en ingresos operacionales del ledger
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
