-- Allow discount line percents to sum up to 100% (not required to equal 100%).
-- One template may link to at most one report (enforced in app + RPC).

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
    IF v_percent IS NULL OR v_percent <= 0 OR v_percent > 100 THEN
      RAISE EXCEPTION 'Porcentaje inválido en partida "%".', v_label;
    END IF;
    v_sum := v_sum + v_percent;
  END LOOP;

  IF v_sum > 100.05 THEN
    RAISE EXCEPTION 'Los porcentajes no pueden superar 100 (actual: %).', round(v_sum, 2);
  END IF;
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

GRANT EXECUTE ON FUNCTION public.sp_set_template_report_link(integer, uuid, text, text)
  TO authenticated, service_role;
