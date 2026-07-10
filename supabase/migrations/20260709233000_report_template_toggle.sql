-- Per-church toggle: which reports accept discount templates (default off).
-- Permission: settings:discount_templates:write (delegable via roles).

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  (
    'settings:discount_templates:write',
    'settings',
    'write',
    'Configurar plantillas de descuento y vincular reportes'
  )
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, 'settings:discount_templates:write'
FROM public.app_role_permissions arp
WHERE arp.permission_key = 'settings:church:write'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, 'settings:discount_templates:write'
FROM public.church_role_permissions crp
WHERE crp.permission_key = 'settings:church:write'
ON CONFLICT DO NOTHING;

ALTER TABLE public.church_report_setting
  ADD COLUMN IF NOT EXISTS template_enabled boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.fn_report_template_enabled(
  p_church_id integer,
  p_report_id text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT COALESCE(rd.supports_discount_templates, false)
    AND COALESCE(crs.template_enabled, false)
    AND public.fn_report_effective_active(p_church_id, p_report_id)
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
          'platformSupportsDiscountTemplates', rd.supports_discount_templates,
          'templateEnabled', COALESCE(crs.template_enabled, false),
          'supportsDiscountTemplates',
            rd.supports_discount_templates
            AND COALESCE(crs.template_enabled, false),
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

CREATE OR REPLACE FUNCTION public.sp_maintain_church_report_template_setting(
  p_church_id integer,
  p_report_id text,
  p_template_enabled boolean
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_report_id text := NULLIF(trim(COALESCE(p_report_id, '')), '');
  v_prev_enabled boolean;
  v_next_enabled boolean := COALESCE(p_template_enabled, false);
  v_platform boolean;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('settings:discount_templates:write');

  IF v_report_id IS NULL THEN
    RAISE EXCEPTION 'report_id es obligatorio.';
  END IF;

  SELECT rd.supports_discount_templates INTO v_platform
  FROM public.report_definition rd
  WHERE rd.report_id = v_report_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reporte no encontrado.';
  END IF;

  IF NOT v_platform THEN
    RAISE EXCEPTION 'Este reporte no admite plantillas de descuento.';
  END IF;

  SELECT COALESCE(crs.template_enabled, false) INTO v_prev_enabled
  FROM public.church_report_setting crs
  WHERE crs.church_id = p_church_id
    AND crs.report_id = v_report_id;

  IF NOT FOUND THEN
    v_prev_enabled := false;
  END IF;

  INSERT INTO public.church_report_setting (
    church_id, report_id, is_active, template_enabled, updated_at
  )
  VALUES (p_church_id, v_report_id, true, v_next_enabled, now())
  ON CONFLICT (church_id, report_id)
  DO UPDATE SET
    template_enabled = EXCLUDED.template_enabled,
    updated_at = now();

  IF v_prev_enabled IS DISTINCT FROM v_next_enabled THEN
    PERFORM public.fn_append_church_audit_log(
      p_church_id,
      'reports',
      CASE WHEN v_next_enabled THEN 'activate' ELSE 'deactivate' END,
      'report_template',
      v_report_id,
      CASE
        WHEN v_next_enabled THEN 'Activó plantillas en reporte: ' || v_report_id
        ELSE 'Desactivó plantillas en reporte: ' || v_report_id
      END,
      CASE
        WHEN v_next_enabled THEN 'actions.reports.template_enable'
        ELSE 'actions.reports.template_disable'
      END,
      jsonb_build_object('reportId', v_report_id)
    );
  END IF;

  IF NOT v_next_enabled THEN
    DELETE FROM public.report_discount_link
    WHERE church_id = p_church_id
      AND report_id = v_report_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'reportId', v_report_id,
    'templateEnabled', v_next_enabled
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

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

  IF public.fn_report_template_enabled(p_church_id, v_report) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'El reporte no tiene plantillas de descuento activadas.';
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
  PERFORM public.fn_assert_permission('settings:discount_templates:write');
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
  PERFORM public.fn_assert_permission('settings:discount_templates:write');

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

GRANT EXECUTE ON FUNCTION public.fn_report_template_enabled(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_maintain_church_report_template_setting(integer, text, boolean)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
