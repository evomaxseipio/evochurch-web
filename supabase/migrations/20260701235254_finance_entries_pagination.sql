-- Sprint 2: income_type_id in RPC, server-side pagination for income entries + finance ledger.

DROP FUNCTION IF EXISTS public.sp_get_income_entries(integer, uuid);

CREATE OR REPLACE FUNCTION public.sp_get_income_entries(
  p_church_id integer,
  p_fund_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_category text DEFAULT NULL,
  p_page integer DEFAULT NULL,
  p_page_size integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_page_size integer;
  v_offset integer;
  v_total integer;
  v_tithes numeric := 0;
  v_offerings numeric := 0;
  v_donations numeric := 0;
  v_entries json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_page IS NOT NULL THEN
    v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
    v_offset := (GREATEST(p_page, 1) - 1) * v_page_size;
  END IF;

  WITH base AS (
    SELECT
      ie.income_id,
      ie.fund_id,
      ie.church_id,
      ie.income_type_id,
      ie.collection_mode::text AS collection_mode,
      ie.contribution_kind::text AS contribution_kind,
      ie.amount,
      ie.payment_date,
      ie.payment_method::text AS payment_method,
      ie.receipt_number::text AS receipt_number,
      ie.is_anonymous,
      ie.notes,
      ie.created_at,
      itc.category AS income_category,
      jsonb_build_object(
        'type_name', itc.type_name,
        'category', itc.category,
        'is_operational', COALESCE(itc.is_operational, false)
      ) AS income_type_catalog,
      jsonb_build_object('fund_name', f.fund_name) AS funds,
      COALESCE(icj.income_contributors, '[]'::jsonb) AS income_contributors
    FROM income_entries ie
    LEFT JOIN income_type_catalog itc ON itc.id = ie.income_type_id
    LEFT JOIN funds f ON f.fund_id = ie.fund_id
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'amount', ic.amount,
            'is_primary', ic.is_primary,
            'contributors', jsonb_build_object(
              'contributor_type', co.contributor_type,
              'profile_id', co.profile_id,
              'company_name', co.company_name,
              'is_anonymous', co.is_anonymous,
              'profiles', jsonb_strip_nulls(
                jsonb_build_object(
                  'first_name', pr.first_name,
                  'last_name', pr.last_name
                )
              )
            )
          )
          ORDER BY ic.is_primary DESC NULLS LAST, ic.amount DESC
        ),
        '[]'::jsonb
      ) AS income_contributors
      FROM income_contributors ic
      INNER JOIN contributors co ON co.contributor_id = ic.contributor_id
      LEFT JOIN profiles pr ON pr.id = co.profile_id
      WHERE ic.income_id = ie.income_id
    ) icj ON true
    WHERE ie.church_id = p_church_id
      AND (p_fund_id IS NULL OR ie.fund_id = p_fund_id)
      AND COALESCE(itc.is_operational, false) = false
      AND (p_date_from IS NULL OR ie.payment_date >= p_date_from)
      AND (p_date_to IS NULL OR ie.payment_date <= p_date_to)
      AND (
        p_category IS NULL
        OR p_category = 'all'
        OR itc.category = p_category
      )
  ),
  stats AS (
    SELECT
      COUNT(*)::integer AS total_count,
      COALESCE(SUM(CASE WHEN income_category = 'tithe' THEN amount ELSE 0 END), 0) AS tithes,
      COALESCE(SUM(CASE WHEN income_category = 'offering' THEN amount ELSE 0 END), 0) AS offerings,
      COALESCE(SUM(CASE WHEN income_category = 'donation' THEN amount ELSE 0 END), 0) AS donations
    FROM base
  ),
  page_rows AS (
    SELECT *
    FROM base
    ORDER BY payment_date DESC, created_at DESC
    LIMIT CASE WHEN p_page IS NOT NULL THEN v_page_size END
    OFFSET CASE WHEN p_page IS NOT NULL THEN v_offset ELSE 0 END
  )
  SELECT
    s.total_count,
    s.tithes,
    s.offerings,
    s.donations,
    COALESCE(
      (
        SELECT json_agg(
          json_build_object(
            'income_id', pr.income_id,
            'fund_id', pr.fund_id,
            'church_id', pr.church_id,
            'income_type_id', pr.income_type_id,
            'collection_mode', pr.collection_mode,
            'contribution_kind', pr.contribution_kind,
            'amount', pr.amount,
            'payment_date', pr.payment_date,
            'payment_method', pr.payment_method,
            'receipt_number', pr.receipt_number,
            'is_anonymous', pr.is_anonymous,
            'notes', pr.notes,
            'created_at', pr.created_at,
            'income_type_catalog', pr.income_type_catalog,
            'funds', pr.funds,
            'income_contributors', pr.income_contributors
          )
          ORDER BY pr.payment_date DESC, pr.created_at DESC
        )
        FROM page_rows pr
      ),
      '[]'::json
    )
  INTO v_total, v_tithes, v_offerings, v_donations, v_entries
  FROM stats s;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'entries', v_entries,
    'total_count', v_total,
    'period_stats', json_build_object(
      'total', v_tithes + v_offerings + v_donations,
      'tithes', v_tithes,
      'offerings', v_offerings,
      'donations', v_donations
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Acceso denegado%' OR SQLERRM LIKE '%iglesia no autorizada%' OR SQLERRM LIKE '%Sesión sin iglesia%' THEN
      RAISE;
    END IF;
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Error al cargar contribuciones: ' || SQLERRM,
      'entries', '[]'::json,
      'total_count', 0,
      'period_stats', json_build_object(
        'total', 0,
        'tithes', 0,
        'offerings', 0,
        'donations', 0
      )
    );
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_get_income_entries(
  integer, uuid, date, date, text, integer, integer
) FROM anon;
GRANT EXECUTE ON FUNCTION public.sp_get_income_entries(
  integer, uuid, date, date, text, integer, integer
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Finance ledger: pagination + period stats
-- ---------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.sp_get_finance_ledger(integer, uuid, date, date);

CREATE OR REPLACE FUNCTION public.sp_get_finance_ledger(
  p_church_id integer,
  p_fund_id uuid DEFAULT NULL,
  p_date_from date DEFAULT NULL,
  p_date_to date DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_page integer DEFAULT NULL,
  p_page_size integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_page_size integer;
  v_offset integer;
  v_result json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_page IS NOT NULL THEN
    v_page_size := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
    v_offset := (GREATEST(p_page, 1) - 1) * v_page_size;
  END IF;

  WITH combined AS (
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
    LEFT JOIN auth_users au ON au.id = ie.recorded_by
    LEFT JOIN profiles pr ON pr.id = au.profile_id
    LEFT JOIN fund_transfers ft_in ON ft_in.income_id = ie.income_id
    LEFT JOIN funds sf_in ON sf_in.fund_id = ft_in.source_fund_id
    LEFT JOIN funds df_in ON df_in.fund_id = ft_in.destination_fund_id
    LEFT JOIN LATERAL (
      SELECT
        COALESCE(
          NULLIF(TRIM(CONCAT(prc.first_name, ' ', prc.last_name)), ''),
          NULLIF(TRIM(co.contact_name), ''),
          NULLIF(TRIM(co.company_name), '')
        ) AS contributor_name
      FROM income_contributors ic
      INNER JOIN contributors co ON co.contributor_id = ic.contributor_id
      LEFT JOIN profiles prc ON prc.id = co.profile_id
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
    LEFT JOIN expenses_type et ON et.expenses_type_id = t.expenses_type_id
    LEFT JOIN profiles pc ON pc.id = t.created_by_profile_id
    LEFT JOIN profiles pa ON pa.id = t.authorized_by_profile_id
    LEFT JOIN fund_transfers ft_ex ON ft_ex.expense_transaction_id = t.transaction_id
    LEFT JOIN funds sf_ex ON sf_ex.fund_id = ft_ex.source_fund_id
    LEFT JOIN funds df_ex ON df_ex.fund_id = ft_ex.destination_fund_id
    WHERE t.church_id = p_church_id
      AND (p_fund_id IS NULL OR t.fund_id = p_fund_id)
      AND (p_date_from IS NULL OR t.transaction_date >= p_date_from)
      AND (p_date_to IS NULL OR t.transaction_date <= p_date_to)
  ),
  filtered AS (
    SELECT *
    FROM combined c
    WHERE c.status <> 'REJECTED'
      AND (
        p_status IS NULL
        OR p_status = 'all'
        OR (
          p_status = 'pending'
          AND c.direction = 'expense'
          AND c.status = 'PENDING'
        )
        OR (
          p_status = 'approved'
          AND (
            c.direction = 'income'
            OR c.status = 'APPROVED'
          )
        )
      )
  ),
  stats AS (
    SELECT
      COUNT(*)::integer AS total_count,
      COUNT(*) FILTER (
        WHERE direction = 'expense' AND status = 'PENDING'
      )::integer AS pending_authorization,
      COALESCE(SUM(CASE WHEN direction = 'income' THEN amount ELSE 0 END), 0) AS income_amount,
      COALESCE(
        SUM(
          CASE
            WHEN direction = 'expense' AND status = 'APPROVED' THEN amount
            ELSE 0
          END
        ),
        0
      ) AS expense_amount,
      COUNT(*)::integer AS movements
    FROM filtered
  )
  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'ledger_list', COALESCE((
      SELECT json_agg(row_to_json(x) ORDER BY x.movement_date DESC, x.sort_key DESC)
      FROM (
        SELECT *
        FROM filtered
        ORDER BY movement_date DESC, sort_key DESC
        LIMIT CASE WHEN p_page IS NOT NULL THEN v_page_size END
        OFFSET CASE WHEN p_page IS NOT NULL THEN v_offset ELSE 0 END
      ) x
    ), '[]'::json),
    'total_count', (SELECT total_count FROM stats),
    'period_stats', (
      SELECT json_build_object(
        'movements', s.movements,
        'income_amount', s.income_amount,
        'expense_amount', s.expense_amount,
        'pending_authorization', s.pending_authorization
      )
      FROM stats s
    ),
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
    IF SQLERRM LIKE '%Acceso denegado%' OR SQLERRM LIKE '%iglesia no autorizada%' OR SQLERRM LIKE '%Sesión sin iglesia%' THEN
      RAISE;
    END IF;
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Error al cargar el libro de transacciones: ' || SQLERRM,
      'ledger_list', '[]'::json,
      'total_count', 0,
      'period_stats', json_build_object(
        'movements', 0,
        'income_amount', 0,
        'expense_amount', 0,
        'pending_authorization', 0
      ),
      'pending_authorization_count', 0
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_finance_ledger(
  integer, uuid, date, date, text, integer, integer
) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
