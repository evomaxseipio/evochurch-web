-- Report registry: metadata + per-church is_active override + audit on toggle.

CREATE TABLE IF NOT EXISTS public.report_definition (
  report_id text PRIMARY KEY,
  category text NOT NULL
    CHECK (category IN ('financial', 'membership', 'executive')),
  period_kind text NOT NULL
    CHECK (period_kind IN ('month', 'year', 'none')),
  formats text[] NOT NULL DEFAULT '{}'::text[],
  permission_resource text,
  supports_discount_templates boolean NOT NULL DEFAULT false,
  discount_section_key text NOT NULL DEFAULT 'council_sends',
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.church_report_setting (
  church_id integer NOT NULL REFERENCES public.church(id) ON DELETE CASCADE,
  report_id text NOT NULL REFERENCES public.report_definition(report_id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (church_id, report_id)
);

CREATE INDEX IF NOT EXISTS idx_church_report_setting_church
  ON public.church_report_setting (church_id, is_active);

ALTER TABLE public.report_definition ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.church_report_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY report_definition_select ON public.report_definition
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY church_report_setting_select ON public.church_report_setting
  FOR SELECT TO authenticated
  USING (church_id = public.fn_get_session_church_id());

CREATE POLICY church_report_setting_insert ON public.church_report_setting
  FOR INSERT TO authenticated
  WITH CHECK (church_id = public.fn_get_session_church_id());

CREATE POLICY church_report_setting_update ON public.church_report_setting
  FOR UPDATE TO authenticated
  USING (church_id = public.fn_get_session_church_id())
  WITH CHECK (church_id = public.fn_get_session_church_id());

GRANT SELECT ON TABLE public.report_definition TO authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.church_report_setting TO authenticated, service_role;

INSERT INTO public.report_definition (
  report_id, category, period_kind, formats, permission_resource,
  supports_discount_templates, discount_section_key, is_active, sort_order
) VALUES
  (
    'financial-monthly-cead', 'financial', 'month', ARRAY['pdf', 'xlsx'],
    'financial_monthly_cead', true, 'council_sends', true, 10
  ),
  (
    'financial-monthly-concilio-f001', 'financial', 'month', ARRAY['pdf', 'xlsx'],
    'financial_monthly_concilio_f001', true, 'council_sends', true, 20
  ),
  (
    'membership-directory', 'membership', 'none', ARRAY['pdf', 'xlsx'],
    'membership_directory', false, 'council_sends', true, 30
  ),
  (
    'membership-annual-cead', 'membership', 'year', ARRAY['pdf'],
    'membership_annual_cead', false, 'council_sends', true, 40
  ),
  (
    'executive-monthly-summary', 'executive', 'month', ARRAY['pdf'],
    'executive_monthly_summary', true, 'council_sends', true, 50
  ),
  (
    'financial-income-expense', 'financial', 'month', ARRAY['pdf', 'xlsx'],
    'financial_income_expense', false, 'council_sends', true, 60
  ),
  (
    'financial-by-fund', 'financial', 'month', ARRAY['pdf', 'xlsx'],
    'financial_by_fund', false, 'council_sends', true, 70
  ),
  (
    'financial-by-member', 'financial', 'month', ARRAY['pdf', 'xlsx'],
    'financial_by_member', false, 'council_sends', true, 80
  ),
  (
    'audit-activity-log', 'executive', 'none', ARRAY['pdf', 'xlsx'],
    NULL, false, 'council_sends', true, 90
  )
ON CONFLICT (report_id) DO UPDATE SET
  category = EXCLUDED.category,
  period_kind = EXCLUDED.period_kind,
  formats = EXCLUDED.formats,
  permission_resource = EXCLUDED.permission_resource,
  supports_discount_templates = EXCLUDED.supports_discount_templates,
  discount_section_key = EXCLUDED.discount_section_key,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.fn_report_effective_active(
  p_church_id integer,
  p_report_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(rd.is_active, false)
    AND COALESCE(crs.is_active, true)
  FROM public.report_definition rd
  LEFT JOIN public.church_report_setting crs
    ON crs.church_id = p_church_id
   AND crs.report_id = rd.report_id
  WHERE rd.report_id = p_report_id;
$$;

CREATE OR REPLACE FUNCTION public.sp_list_church_report_definitions(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'reports', COALESCE((
      SELECT json_agg(row_data ORDER BY (row_data->>'sortOrder')::integer, row_data->>'reportId')
      FROM (
        SELECT json_build_object(
          'reportId', rd.report_id,
          'category', rd.category,
          'periodKind', rd.period_kind,
          'formats', rd.formats,
          'permissionResource', rd.permission_resource,
          'supportsDiscountTemplates', rd.supports_discount_templates,
          'discountSectionKey', rd.discount_section_key,
          'isActive', rd.is_active AND COALESCE(crs.is_active, true),
          'globalActive', rd.is_active,
          'churchOverrideActive', crs.is_active,
          'hasChurchOverride', crs.church_id IS NOT NULL,
          'sortOrder', rd.sort_order
        ) AS row_data
        FROM public.report_definition rd
        LEFT JOIN public.church_report_setting crs
          ON crs.church_id = p_church_id
         AND crs.report_id = rd.report_id
        ORDER BY rd.sort_order, rd.report_id
      ) sub
    ), '[]'::json)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_maintain_church_report_setting(
  p_church_id integer,
  p_report_id text,
  p_is_active boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_report_id text := NULLIF(trim(COALESCE(p_report_id, '')), '');
  v_prev_active boolean;
  v_effective_active boolean;
  v_title text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('settings:church:write');

  IF v_report_id IS NULL THEN
    RAISE EXCEPTION 'report_id es obligatorio.';
  END IF;

  SELECT rd.report_id INTO v_title
  FROM public.report_definition rd
  WHERE rd.report_id = v_report_id;

  IF v_title IS NULL THEN
    RAISE EXCEPTION 'Reporte no encontrado.';
  END IF;

  v_title := v_report_id;

  SELECT public.fn_report_effective_active(p_church_id, v_report_id)
  INTO v_prev_active;

  INSERT INTO public.church_report_setting (church_id, report_id, is_active, updated_at)
  VALUES (p_church_id, v_report_id, COALESCE(p_is_active, true), now())
  ON CONFLICT (church_id, report_id)
  DO UPDATE SET
    is_active = EXCLUDED.is_active,
    updated_at = now();

  v_effective_active := public.fn_report_effective_active(p_church_id, v_report_id);

  IF v_prev_active IS DISTINCT FROM v_effective_active THEN
    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'reports',
      CASE WHEN v_effective_active THEN 'activate' ELSE 'deactivate' END,
      'report',
      v_report_id,
      CASE
        WHEN v_effective_active THEN 'Activó reporte: ' || v_report_id
        ELSE 'Desactivó reporte: ' || v_report_id
      END,
      CASE
        WHEN v_effective_active THEN 'actions.reports.activate'
        ELSE 'actions.reports.deactivate'
      END,
      jsonb_build_object('reportId', v_report_id)
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'reportId', v_report_id,
    'isActive', v_effective_active
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

-- Validate linkable reports against registry.
CREATE OR REPLACE FUNCTION public.sp_set_template_report_link(
  p_church_id integer,
  p_template_id uuid,
  p_report_id text DEFAULT NULL,
  p_section_key text DEFAULT 'council_sends'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_section text := COALESCE(NULLIF(trim(p_section_key), ''), 'council_sends');
  v_report text := NULLIF(trim(COALESCE(p_report_id, '')), '');
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF NOT EXISTS (
    SELECT 1 FROM public.discount_template
    WHERE id = p_template_id AND church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Plantilla no pertenece a esta iglesia.';
  END IF;

  DELETE FROM public.report_discount_link
  WHERE church_id = p_church_id
    AND template_id = p_template_id;

  IF v_report IS NULL THEN
    RETURN json_build_object('success', true, 'status_code', 200, 'linked', false);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.report_definition rd
    WHERE rd.report_id = v_report
      AND rd.supports_discount_templates = true
      AND public.fn_report_effective_active(p_church_id, v_report) = true
  ) THEN
    RAISE EXCEPTION 'El reporte no admite plantillas de descuento o está inactivo.';
  END IF;

  INSERT INTO public.report_discount_link (
    church_id, report_id, template_id, section_key, is_active
  )
  VALUES (
    p_church_id, v_report, p_template_id, v_section, true
  )
  ON CONFLICT (church_id, report_id, section_key)
  DO UPDATE SET
    template_id = EXCLUDED.template_id,
    is_active = true,
    updated_at = now();

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'linked', true,
    'report_id', v_report
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

-- Audit log for discount template CRUD and is_active changes.
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
  v_is_create boolean := p_template_id IS NULL;
  v_prev_active boolean;
  v_name text := trim(COALESCE(p_name, ''));
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_validate_discount_lines(p_lines);

  IF v_is_create THEN
    INSERT INTO public.discount_template (
      church_id, name, description, base_kind, is_active
    )
    VALUES (
      p_church_id,
      v_name,
      NULLIF(trim(COALESCE(p_description, '')), ''),
      COALESCE(NULLIF(trim(p_base_kind), ''), 'tithe'),
      COALESCE(p_is_active, true)
    )
    RETURNING id INTO v_id;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'settings',
      'create',
      'discount_template',
      v_id::text,
      'Creó plantilla de descuento: ' || v_name,
      'actions.settings.discount_template.create',
      jsonb_build_object('name', v_name, 'isActive', COALESCE(p_is_active, true))
    );
  ELSE
    v_id := p_template_id;

    SELECT dt.is_active INTO v_prev_active
    FROM public.discount_template dt
    WHERE dt.id = v_id AND dt.church_id = p_church_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Plantilla no encontrada.';
    END IF;

    UPDATE public.discount_template
    SET
      name = v_name,
      description = NULLIF(trim(COALESCE(p_description, '')), ''),
      base_kind = COALESCE(NULLIF(trim(p_base_kind), ''), 'tithe'),
      is_active = COALESCE(p_is_active, true),
      updated_at = now()
    WHERE id = v_id;

    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'settings',
      'update',
      'discount_template',
      v_id::text,
      'Editó plantilla de descuento: ' || v_name,
      'actions.settings.discount_template.update',
      jsonb_build_object('name', v_name, 'isActive', COALESCE(p_is_active, true))
    );

    IF v_prev_active IS DISTINCT FROM COALESCE(p_is_active, true) THEN
      PERFORM public.fn_append_church_audit_log(
        p_church_id,
        'settings',
        CASE WHEN COALESCE(p_is_active, true) THEN 'activate' ELSE 'deactivate' END,
        'discount_template',
        v_id::text,
        CASE
          WHEN COALESCE(p_is_active, true) THEN 'Activó plantilla de descuento: ' || v_name
          ELSE 'Desactivó plantilla de descuento: ' || v_name
        END,
        CASE
          WHEN COALESCE(p_is_active, true) THEN 'actions.settings.discount_template.activate'
          ELSE 'actions.settings.discount_template.deactivate'
        END,
        jsonb_build_object('name', v_name)
      );
    END IF;
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
DECLARE
  v_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT dt.name INTO v_name
  FROM public.discount_template dt
  WHERE dt.id = p_template_id AND dt.church_id = p_church_id;

  DELETE FROM public.discount_template
  WHERE id = p_template_id AND church_id = p_church_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Plantilla no encontrada.');
  END IF;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'settings',
    'delete',
    'discount_template',
    p_template_id::text,
    'Eliminó plantilla de descuento: ' || COALESCE(v_name, ''),
    'actions.settings.discount_template.delete',
    jsonb_build_object('name', COALESCE(v_name, ''))
  );

  RETURN json_build_object('success', true, 'status_code', 200);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_report_effective_active(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_list_church_report_definitions(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_maintain_church_report_setting(integer, text, boolean) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
