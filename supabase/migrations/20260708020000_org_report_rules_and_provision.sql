-- Fase 3/4 complemento: reglas org para reportes + alta iglesia bajo concilio.

CREATE OR REPLACE FUNCTION public.sp_get_church_org_report_rules(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_org_id integer;
  v_rules jsonb;
  v_org_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT ch.organization_id, o.report_rules, o.name
  INTO v_org_id, v_rules, v_org_name
  FROM public.church ch
  LEFT JOIN public.organization o ON o.id = ch.organization_id
  WHERE ch.id = p_church_id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'organization_id', v_org_id,
    'organization_name', v_org_name,
    'report_rules', COALESCE(v_rules, '{}'::jsonb)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_provision_church_under_org(
  p_org_id integer,
  p_payload jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_name text := trim(COALESCE(p_payload->>'name', ''));
  v_slug text := lower(trim(COALESCE(p_payload->>'slug', '')));
  v_org_unit_id integer;
  v_church_id integer;
BEGIN
  PERFORM public.fn_assert_org_permission(p_org_id, 'org:churches:provision');

  IF v_name = '' THEN
    RAISE EXCEPTION 'Nombre de iglesia requerido.';
  END IF;

  IF v_slug = '' OR v_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'Slug inválido.';
  END IF;

  IF EXISTS (SELECT 1 FROM public.church ch WHERE ch.slug = v_slug) THEN
    RAISE EXCEPTION 'El slug ya está en uso.';
  END IF;

  v_org_unit_id := NULLIF(trim(COALESCE(p_payload->>'org_unit_id', '')), '')::integer;

  IF v_org_unit_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.org_unit ou
    WHERE ou.id = v_org_unit_id AND ou.organization_id = p_org_id
  ) THEN
    RAISE EXCEPTION 'Distrito inválido para esta organización.';
  END IF;

  INSERT INTO public.church (
    name,
    short_name,
    slug,
    church_kind,
    organization_id,
    org_unit_id,
    city,
    external_code,
    presbytery_name
  )
  VALUES (
    v_name,
    NULLIF(trim(COALESCE(p_payload->>'short_name', '')), ''),
    v_slug,
    COALESCE(NULLIF(trim(p_payload->>'church_kind'), ''), 'standalone'),
    p_org_id,
    v_org_unit_id,
    NULLIF(trim(COALESCE(p_payload->>'city', '')), ''),
    NULLIF(trim(COALESCE(p_payload->>'external_code', '')), ''),
    NULLIF(trim(COALESCE(p_payload->>'presbytery_name', '')), '')
  )
  RETURNING id INTO v_church_id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'church_id', v_church_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_church_org_report_rules(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_provision_church_under_org(integer, jsonb) TO authenticated, service_role;
