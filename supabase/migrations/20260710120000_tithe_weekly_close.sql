-- Weekly tithe close: discount_period_run + permissions + RPCs.

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('finances:tithe_close:read', 'finances', 'read', 'Ver cierre semanal de diezmos'),
  ('finances:tithe_close:write', 'finances', 'write', 'Cerrar semana y exportar cierre de diezmos')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT r.role_id, k
FROM (VALUES (1), (3), (4)) AS r(role_id)
CROSS JOIN unnest(ARRAY[
  'finances:tithe_close:read',
  'finances:tithe_close:write'
]::text[]) AS k
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY[
  'finances:tithe_close:read',
  'finances:tithe_close:write'
]::text[]) AS k
WHERE crp.permission_key IN ('finances:contributions:read', 'finances:write')
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.discount_period_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.discount_template(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'closed')),
  base_amount numeric(14, 2) NOT NULL DEFAULT 0,
  allocation_json jsonb NOT NULL DEFAULT '[]'::jsonb,
  contributions_json jsonb,
  closed_at timestamptz,
  closed_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, period_start)
);

CREATE INDEX IF NOT EXISTS idx_discount_period_run_church_start
  ON public.discount_period_run (church_id, period_start DESC);

ALTER TABLE public.discount_period_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_discount_period_run_select ON public.discount_period_run
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_discount_period_run_insert ON public.discount_period_run
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_discount_period_run_update ON public.discount_period_run
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

GRANT SELECT, INSERT, UPDATE ON TABLE public.discount_period_run TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_active_tithe_template_id(p_church_id integer)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT dt.id
  FROM public.discount_template dt
  WHERE dt.church_id = p_church_id
    AND dt.base_kind = 'tithe'
    AND dt.is_active = true
  ORDER BY dt.updated_at DESC, dt.name
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.sp_seed_default_tithe_template(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  v_id := public.fn_active_tithe_template_id(p_church_id);
  IF v_id IS NOT NULL THEN
    RETURN json_build_object(
      'success', true,
      'status_code', 200,
      'template_id', v_id,
      'created', false
    );
  END IF;

  INSERT INTO public.discount_template (
    church_id, name, description, base_kind, is_active
  )
  VALUES (
    p_church_id,
    'Reparto diezmo dominical',
    'Distribución semanal 70% Pastor, 15% Concilio, 15% Iglesia local',
    'tithe',
    true
  )
  RETURNING id INTO v_id;

  INSERT INTO public.discount_template_line (template_id, label, percent, sort_order)
  VALUES
    (v_id, 'Pastor', 70, 1),
    (v_id, 'Concilio', 15, 2),
    (v_id, 'Iglesia local', 15, 3);

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'template_id', v_id,
    'created', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_tithe_contributions_for_period(
  p_church_id integer,
  p_date_from date,
  p_date_to date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('finances:tithe_close:read');

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'contributions', COALESCE((
      SELECT json_agg(row_data ORDER BY row_data->>'paymentDate', row_data->>'memberName')
      FROM (
        SELECT json_build_object(
          'incomeId', ie.income_id,
          'paymentDate', ie.payment_date,
          'amount', ie.amount,
          'fundId', ie.fund_id,
          'fundName', COALESCE(f.fund_name, ''),
          'memberName', COALESCE(
            NULLIF(trim(concat_ws(' ', p.first_name, p.last_name)), ''),
            ie.contributor_name,
            ''
          ),
          'receiptNumber', COALESCE(ie.receipt_number, '')
        ) AS row_data
        FROM public.income_entries ie
        INNER JOIN public.income_type_catalog itc
          ON itc.id = ie.income_type_id
         AND itc.church_id = ie.church_id
        LEFT JOIN public.funds f ON f.fund_id = ie.fund_id
        LEFT JOIN public.profiles p ON p.id = ie.profile_id
        WHERE ie.church_id = p_church_id
          AND ie.payment_date >= p_date_from
          AND ie.payment_date <= p_date_to
          AND itc.category = 'tithe'
          AND COALESCE(itc.is_operational, false) = false
      ) sub
    ), '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_discount_period_run(
  p_church_id integer,
  p_period_start date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_row public.discount_period_run%ROWTYPE;
  v_template_id uuid;
  v_allocation json;
  v_contributions json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('finances:tithe_close:read');

  SELECT * INTO v_row
  FROM public.discount_period_run dpr
  WHERE dpr.church_id = p_church_id
    AND dpr.period_start = p_period_start;

  IF FOUND THEN
    RETURN json_build_object(
      'success', true,
      'status_code', 200,
      'run', json_build_object(
        'id', v_row.id,
        'churchId', v_row.church_id,
        'templateId', v_row.template_id,
        'periodStart', v_row.period_start,
        'periodEnd', v_row.period_end,
        'status', v_row.status,
        'baseAmount', v_row.base_amount,
        'allocation', v_row.allocation_json,
        'contributions', COALESCE(v_row.contributions_json, '[]'::jsonb),
        'closedAt', v_row.closed_at,
        'closedBy', v_row.closed_by,
        'notes', COALESCE(v_row.notes, '')
      )
    );
  END IF;

  v_template_id := public.fn_active_tithe_template_id(p_church_id);
  IF v_template_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'status_code', 204,
      'run', NULL,
      'noTemplate', true
    );
  END IF;

  v_allocation := public.sp_compute_discount_allocation(
    p_church_id, v_template_id, p_period_start, p_period_start + 6
  );
  v_contributions := public.sp_list_tithe_contributions_for_period(
    p_church_id, p_period_start, p_period_start + 6
  );

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'run', json_build_object(
      'id', NULL,
      'churchId', p_church_id,
      'templateId', v_template_id,
      'periodStart', p_period_start,
      'periodEnd', p_period_start + 6,
      'status', 'open',
      'baseAmount', COALESCE((v_allocation->>'baseAmount')::numeric, 0),
      'allocation', COALESCE(v_allocation->'lines', '[]'::json),
      'contributions', COALESCE(v_contributions->'contributions', '[]'::json),
      'closedAt', NULL,
      'closedBy', NULL,
      'notes', ''
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_discount_period_runs(
  p_church_id integer,
  p_year integer DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_year integer := COALESCE(p_year, EXTRACT(YEAR FROM current_date)::integer);
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('finances:tithe_close:read');

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'runs', COALESCE((
      SELECT json_agg(row_data ORDER BY row_data->>'periodStart' DESC)
      FROM (
        SELECT json_build_object(
          'id', dpr.id,
          'periodStart', dpr.period_start,
          'periodEnd', dpr.period_end,
          'status', dpr.status,
          'baseAmount', dpr.base_amount,
          'closedAt', dpr.closed_at
        ) AS row_data
        FROM public.discount_period_run dpr
        WHERE dpr.church_id = p_church_id
          AND EXTRACT(YEAR FROM dpr.period_start) = v_year
      ) sub
    ), '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_close_discount_period_run(
  p_church_id integer,
  p_period_start date,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_template_id uuid;
  v_period_end date := p_period_start + 6;
  v_allocation json;
  v_contributions json;
  v_base numeric;
  v_lines jsonb;
  v_contrib jsonb;
  v_id uuid;
  v_existing public.discount_period_run%ROWTYPE;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('finances:tithe_close:write');

  SELECT * INTO v_existing
  FROM public.discount_period_run dpr
  WHERE dpr.church_id = p_church_id
    AND dpr.period_start = p_period_start;

  IF FOUND AND v_existing.status = 'closed' THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 409,
      'message', 'La semana ya está cerrada.'
    );
  END IF;

  v_template_id := public.fn_active_tithe_template_id(p_church_id);
  IF v_template_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'No hay plantilla de diezmo activa.'
    );
  END IF;

  v_allocation := public.sp_compute_discount_allocation(
    p_church_id, v_template_id, p_period_start, v_period_end
  );
  IF COALESCE((v_allocation->>'success')::boolean, false) IS NOT TRUE THEN
    RETURN v_allocation;
  END IF;

  v_contributions := public.sp_list_tithe_contributions_for_period(
    p_church_id, p_period_start, v_period_end
  );

  v_base := COALESCE((v_allocation->>'baseAmount')::numeric, 0);
  v_lines := COALESCE(v_allocation->'lines', '[]'::json)::jsonb;
  v_contrib := COALESCE(v_contributions->'contributions', '[]'::json)::jsonb;

  INSERT INTO public.discount_period_run (
    church_id, template_id, period_start, period_end, status,
    base_amount, allocation_json, contributions_json,
    closed_at, closed_by, notes, updated_at
  )
  VALUES (
    p_church_id, v_template_id, p_period_start, v_period_end, 'closed',
    v_base, v_lines, v_contrib,
    now(), auth.uid(), NULLIF(trim(COALESCE(p_notes, '')), ''), now()
  )
  ON CONFLICT (church_id, period_start)
  DO UPDATE SET
    template_id = EXCLUDED.template_id,
    period_end = EXCLUDED.period_end,
    status = 'closed',
    base_amount = EXCLUDED.base_amount,
    allocation_json = EXCLUDED.allocation_json,
    contributions_json = EXCLUDED.contributions_json,
    closed_at = now(),
    closed_by = auth.uid(),
    notes = COALESCE(EXCLUDED.notes, public.discount_period_run.notes),
    updated_at = now()
  RETURNING id INTO v_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'finances',
    'close',
    'tithe_period',
    v_id::text,
    'Cerró semana de diezmos: ' || to_char(p_period_start, 'YYYY-MM-DD'),
    'actions.finances.tithe_close.close',
    jsonb_build_object(
      'periodStart', p_period_start::text,
      'baseAmount', v_base::text
    )
  );

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'runId', v_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_active_tithe_template_id(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_seed_default_tithe_template(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_tithe_contributions_for_period(integer, date, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_discount_period_run(integer, date) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_discount_period_runs(integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_close_discount_period_run(integer, date, text) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
