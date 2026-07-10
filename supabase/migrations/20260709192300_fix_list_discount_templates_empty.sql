-- Fix: sp_list_discount_templates returned NULL when church had zero templates,
-- which broke the settings page parser client-side.

CREATE OR REPLACE FUNCTION public.sp_list_discount_templates(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  RETURN COALESCE(
    (
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
    ),
    json_build_object(
      'success', true,
      'status_code', 200,
      'templates', '[]'::json
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;
