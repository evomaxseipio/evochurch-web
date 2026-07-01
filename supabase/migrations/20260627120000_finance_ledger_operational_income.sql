-- =============================================================================
-- EvoChurch — ingresos operacionales + libro unificado (ledger)
-- =============================================================================

-- 1) Catálogo: distinguir ingresos espirituales vs operacionales
ALTER TABLE public.income_type_catalog
  ADD COLUMN IF NOT EXISTS is_operational boolean NOT NULL DEFAULT false;

UPDATE public.income_type_catalog
   SET is_operational = false
 WHERE category IN ('tithe', 'offering', 'donation');

COMMENT ON COLUMN public.income_type_catalog.is_operational IS
  'true = ingreso operacional (ventas, eventos…); false = diezmo/ofrenda/donación espiritual';

-- 2) Tipos operacionales por iglesia (idempotente)
INSERT INTO public.income_type_catalog (church_id, type_name, category, description, is_operational)
SELECT c.id, t.type_name, 'special', t.description, true
  FROM public.church c
 CROSS JOIN (
   VALUES
     ('Venta', 'Venta de libros, artículos, comida, rifas y otros productos.'),
     ('Evento', 'Conferencias pagadas, retiros con cuota, conciertos y actividades especiales.'),
     ('Subvención', 'Apoyos institucionales, fondos externos y patrocinios.'),
     ('Transferencia', 'Ingresos bancarios o transferencias externas sin categoría específica.'),
     ('Otro ingreso', 'Cualquier entrada de dinero no clasificada en las categorías anteriores.')
 ) AS t(type_name, description)
 WHERE NOT EXISTS (
   SELECT 1
     FROM public.income_type_catalog x
    WHERE x.church_id = c.id
      AND x.type_name = t.type_name
      AND x.is_operational = true
 );

-- 3) Contribuciones: solo ingresos espirituales (no operacionales)
CREATE OR REPLACE FUNCTION public.sp_get_income_entries(
  p_church_id integer,
  p_fund_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  income_id uuid,
  fund_id uuid,
  church_id integer,
  collection_mode text,
  contribution_kind text,
  amount numeric,
  payment_date date,
  payment_method text,
  receipt_number text,
  is_anonymous boolean,
  notes text,
  created_at timestamp with time zone,
  income_type_catalog jsonb,
  funds jsonb,
  income_contributors jsonb
)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    ie.income_id,
    ie.fund_id,
    ie.church_id,
    ie.collection_mode::text,
    ie.contribution_kind::text,
    ie.amount,
    ie.payment_date,
    ie.payment_method::text,
    ie.receipt_number::text,
    ie.is_anonymous,
    ie.notes,
    ie.created_at,
    jsonb_build_object(
      'type_name', itc.type_name,
      'category', itc.category,
      'is_operational', COALESCE(itc.is_operational, false)
    ) AS income_type_catalog,
    jsonb_build_object(
      'fund_name', f.fund_name
    ) AS funds,
    COALESCE(icj.income_contributors, '[]'::jsonb) AS income_contributors
  FROM income_entries ie
  LEFT JOIN income_type_catalog itc
    ON itc.id = ie.income_type_id
  LEFT JOIN funds f
    ON f.fund_id = ie.fund_id
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(
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
    INNER JOIN contributors co
      ON co.contributor_id = ic.contributor_id
    LEFT JOIN profiles pr
      ON pr.id = co.profile_id
    WHERE ic.income_id = ie.income_id
  ) icj ON true
  WHERE ie.church_id = p_church_id
    AND (p_fund_id IS NULL OR ie.fund_id = p_fund_id)
    AND COALESCE(itc.is_operational, false) = false
  ORDER BY ie.payment_date DESC, ie.created_at DESC;
$function$;

GRANT EXECUTE ON FUNCTION public.sp_get_income_entries(integer, uuid)
  TO anon, authenticated, service_role;

-- 4) Libro unificado: ingresos operacionales + egresos
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
        -- Ingresos operacionales
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
        WHERE ie.church_id = p_church_id
          AND (p_fund_id IS NULL OR ie.fund_id = p_fund_id)
          AND (p_date_from IS NULL OR ie.payment_date >= p_date_from)
          AND (p_date_to IS NULL OR ie.payment_date <= p_date_to)

        UNION ALL

        -- Egresos
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

GRANT EXECUTE ON FUNCTION public.sp_get_finance_ledger(integer, uuid, date, date)
  TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
