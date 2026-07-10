-- Discount templates: configurable allocation lines linked to reports.

CREATE TABLE IF NOT EXISTS public.discount_template (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  organization_id integer REFERENCES public.organization(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  base_kind text NOT NULL DEFAULT 'tithe'
    CHECK (base_kind IN ('tithe', 'offering', 'donation', 'total_income')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_template_church
  ON public.discount_template (church_id, is_active);

CREATE TABLE IF NOT EXISTS public.discount_template_line (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.discount_template(id) ON DELETE CASCADE,
  label text NOT NULL,
  percent numeric(7, 4) NOT NULL
    CHECK (percent >= 0 AND percent <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_discount_template_line_template
  ON public.discount_template_line (template_id, sort_order);

CREATE TABLE IF NOT EXISTS public.report_discount_link (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  report_id text NOT NULL,
  template_id uuid NOT NULL REFERENCES public.discount_template(id) ON DELETE CASCADE,
  section_key text NOT NULL DEFAULT 'council_sends',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (church_id, report_id, section_key)
);

CREATE INDEX IF NOT EXISTS idx_report_discount_link_church_report
  ON public.report_discount_link (church_id, report_id)
  WHERE is_active = true;

ALTER TABLE public.discount_template ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.discount_template_line ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_discount_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_discount_template_select ON public.discount_template
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_discount_template_insert ON public.discount_template
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_discount_template_update ON public.discount_template
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_discount_template_delete ON public.discount_template
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_discount_template_line_select ON public.discount_template_line
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_template dt
      WHERE dt.id = template_id
        AND dt.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_discount_template_line_insert ON public.discount_template_line
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.discount_template dt
      WHERE dt.id = template_id
        AND dt.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_discount_template_line_update ON public.discount_template_line
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_template dt
      WHERE dt.id = template_id
        AND dt.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_discount_template_line_delete ON public.discount_template_line
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.discount_template dt
      WHERE dt.id = template_id
        AND dt.church_id = public.fn_get_session_church_id()
    )
  );

CREATE POLICY tenant_report_discount_link_select ON public.report_discount_link
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_report_discount_link_insert ON public.report_discount_link
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_report_discount_link_update ON public.report_discount_link
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY tenant_report_discount_link_delete ON public.report_discount_link
  FOR DELETE TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE OR REPLACE FUNCTION public.fn_validate_discount_lines(p_lines jsonb)
RETURNS void
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_sum numeric := 0;
  v_elem jsonb;
  v_label text;
  v_percent numeric;
BEGIN
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) = 0 THEN
    RAISE EXCEPTION 'La plantilla debe tener al menos una partida.';
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
    v_label := trim(COALESCE(v_elem->>'label', ''));
    IF v_label = '' THEN
      RAISE EXCEPTION 'Cada partida debe tener un nombre.';
    END IF;
    v_percent := (v_elem->>'percent')::numeric;
    IF v_percent IS NULL OR v_percent < 0 OR v_percent > 100 THEN
      RAISE EXCEPTION 'Porcentaje inválido en partida "%".', v_label;
    END IF;
    v_sum := v_sum + v_percent;
  END LOOP;

  IF abs(v_sum - 100) > 0.05 THEN
    RAISE EXCEPTION 'Los porcentajes deben sumar 100 (actual: %).', round(v_sum, 2);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_discount_templates(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  RETURN (
    SELECT json_build_object(
      'success', true,
      'status_code', 200,
      'templates', COALESCE(json_agg(row_data ORDER BY row_data->>'name'), '[]'::json)
    )
    FROM (
      SELECT json_build_object(
        'id', dt.id,
        'churchId', dt.church_id,
        'organizationId', dt.organization_id,
        'name', dt.name,
        'description', COALESCE(dt.description, ''),
        'baseKind', dt.base_kind,
        'isActive', dt.is_active,
        'lines', COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', dtl.id,
              'label', dtl.label,
              'percent', dtl.percent,
              'sortOrder', dtl.sort_order
            )
            ORDER BY dtl.sort_order, dtl.label
          )
          FROM public.discount_template_line dtl
          WHERE dtl.template_id = dt.id
        ), '[]'::json),
        'reportLinks', COALESCE((
          SELECT json_agg(
            json_build_object(
              'id', rdl.id,
              'reportId', rdl.report_id,
              'sectionKey', rdl.section_key,
              'isActive', rdl.is_active
            )
          )
          FROM public.report_discount_link rdl
          WHERE rdl.template_id = dt.id
            AND rdl.church_id = p_church_id
        ), '[]'::json)
      ) AS row_data
      FROM public.discount_template dt
      WHERE dt.church_id = p_church_id
    ) sub
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_maintain_discount_template(
  p_church_id integer,
  p_template_id uuid DEFAULT NULL,
  p_name text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_base_kind text DEFAULT 'tithe',
  p_is_active boolean DEFAULT true,
  p_lines jsonb DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_id uuid;
  v_elem jsonb;
  v_sort integer := 0;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_validate_discount_lines(p_lines);

  IF p_template_id IS NULL THEN
    INSERT INTO public.discount_template (
      church_id, name, description, base_kind, is_active
    )
    VALUES (
      p_church_id,
      trim(p_name),
      NULLIF(trim(COALESCE(p_description, '')), ''),
      COALESCE(NULLIF(trim(p_base_kind), ''), 'tithe'),
      COALESCE(p_is_active, true)
    )
    RETURNING id INTO v_id;
  ELSE
    v_id := p_template_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.discount_template
      WHERE id = v_id AND church_id = p_church_id
    ) THEN
      RAISE EXCEPTION 'Plantilla no encontrada.';
    END IF;

    UPDATE public.discount_template
    SET
      name = trim(p_name),
      description = NULLIF(trim(COALESCE(p_description, '')), ''),
      base_kind = COALESCE(NULLIF(trim(p_base_kind), ''), 'tithe'),
      is_active = COALESCE(p_is_active, true),
      updated_at = now()
    WHERE id = v_id;
  END IF;

  DELETE FROM public.discount_template_line WHERE template_id = v_id;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_lines)
  LOOP
  v_sort := v_sort + 1;
    INSERT INTO public.discount_template_line (template_id, label, percent, sort_order)
    VALUES (
      v_id,
      trim(v_elem->>'label'),
      (v_elem->>'percent')::numeric,
      COALESCE((v_elem->>'sortOrder')::integer, v_sort)
    );
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'template_id', v_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_delete_discount_template(
  p_church_id integer,
  p_template_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  DELETE FROM public.discount_template
  WHERE id = p_template_id AND church_id = p_church_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Plantilla no encontrada.');
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_maintain_report_discount_link(
  p_church_id integer,
  p_report_id text,
  p_template_id uuid DEFAULT NULL,
  p_section_key text DEFAULT 'council_sends',
  p_is_active boolean DEFAULT true,
  p_delete boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_section text := COALESCE(NULLIF(trim(p_section_key), ''), 'council_sends');
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_delete THEN
    DELETE FROM public.report_discount_link
    WHERE church_id = p_church_id
      AND report_id = p_report_id
      AND section_key = v_section;
    RETURN json_build_object('success', true, 'status_code', 200);
  END IF;

  IF p_template_id IS NULL THEN
    RAISE EXCEPTION 'template_id es obligatorio.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.discount_template
    WHERE id = p_template_id AND church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Plantilla no pertenece a esta iglesia.';
  END IF;

  INSERT INTO public.report_discount_link (
    church_id, report_id, template_id, section_key, is_active
  )
  VALUES (
    p_church_id, trim(p_report_id), p_template_id, v_section, COALESCE(p_is_active, true)
  )
  ON CONFLICT (church_id, report_id, section_key)
  DO UPDATE SET
    template_id = EXCLUDED.template_id,
    is_active = EXCLUDED.is_active,
    updated_at = now();

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_report_discount_link(
  p_church_id integer,
  p_report_id text,
  p_section_key text DEFAULT 'council_sends'
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_template_id uuid;
  v_section text := COALESCE(NULLIF(trim(p_section_key), ''), 'council_sends');
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT rdl.template_id INTO v_template_id
  FROM public.report_discount_link rdl
  INNER JOIN public.discount_template dt ON dt.id = rdl.template_id AND dt.is_active
  WHERE rdl.church_id = p_church_id
    AND rdl.report_id = p_report_id
    AND rdl.section_key = v_section
    AND rdl.is_active = true
  LIMIT 1;

  IF v_template_id IS NULL THEN
    RETURN json_build_object(
      'success', true,
      'status_code', 204,
      'linked', false,
      'template_id', NULL
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'linked', true,
    'template_id', v_template_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_compute_discount_allocation(
  p_church_id integer,
  p_template_id uuid,
  p_date_from date,
  p_date_to date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_base_kind text;
  v_base_amount numeric := 0;
  v_lines json;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT dt.base_kind INTO v_base_kind
  FROM public.discount_template dt
  WHERE dt.id = p_template_id
    AND dt.church_id = p_church_id
    AND dt.is_active = true;

  IF v_base_kind IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Plantilla no encontrada.');
  END IF;

  IF v_base_kind = 'total_income' THEN
    SELECT COALESCE(SUM(ie.amount), 0) INTO v_base_amount
    FROM public.income_entries ie
    WHERE ie.church_id = p_church_id
      AND ie.payment_date >= p_date_from
      AND ie.payment_date <= p_date_to;
  ELSE
    SELECT COALESCE(SUM(ie.amount), 0) INTO v_base_amount
    FROM public.income_entries ie
    INNER JOIN public.income_type_catalog itc
      ON itc.id = ie.income_type_id
      AND itc.church_id = ie.church_id
    WHERE ie.church_id = p_church_id
      AND ie.payment_date >= p_date_from
      AND ie.payment_date <= p_date_to
      AND itc.category = v_base_kind;
  END IF;

  SELECT COALESCE(json_agg(line_row ORDER BY sort_order, label), '[]'::json)
  INTO v_lines
  FROM (
    SELECT
      dtl.label,
      dtl.percent,
      dtl.sort_order,
      round(v_base_amount * (dtl.percent / 100.0), 2) AS amount
    FROM public.discount_template_line dtl
    WHERE dtl.template_id = p_template_id
  ) line_row;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'baseKind', v_base_kind,
    'baseAmount', v_base_amount,
    'dateFrom', p_date_from,
    'dateTo', p_date_to,
    'lines', v_lines
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_discount_templates(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_maintain_discount_template(integer, uuid, text, text, text, boolean, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_delete_discount_template(integer, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_maintain_report_discount_link(integer, text, uuid, text, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_report_discount_link(integer, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_compute_discount_allocation(integer, uuid, date, date) TO authenticated, service_role;
