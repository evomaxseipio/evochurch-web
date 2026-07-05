-- Un operativo por ministerio; auto-principal al crear; no eliminar operativo de ministerio.

CREATE UNIQUE INDEX IF NOT EXISTS idx_funds_one_operating_per_ministry
  ON public.funds (church_id, ministry_id)
  WHERE ministry_id IS NOT NULL AND fund_kind = 'operating';

CREATE OR REPLACE FUNCTION public.sp_maintance_funds(
  p_fund_id uuid,
  p_church_id integer,
  p_fund_name text,
  p_description text,
  p_target_amount numeric,
  p_start_date date,
  p_end_date date,
  p_is_active boolean,
  p_is_primary boolean,
  p_total_contributions numeric DEFAULT NULL::numeric,
  p_ministry_id uuid DEFAULT NULL::uuid,
  p_fund_kind text DEFAULT 'operating'::text,
  p_set_as_ministry_default boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_fund_id uuid;
  v_kind text := coalesce(nullif(trim(p_fund_kind), ''), 'operating');
  v_existing_operating uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_fund_ministry(p_church_id, p_ministry_id);

  IF p_church_id IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'church_id is required');
  END IF;

  IF trim(coalesce(p_fund_name, '')) = '' THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'Nombre del fondo es obligatorio');
  END IF;

  IF p_start_date IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'Fecha de inicio es obligatoria');
  END IF;

  IF v_kind NOT IN ('operating', 'project', 'event') THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'fund_kind inválido');
  END IF;

  IF p_fund_id IS NULL THEN
    IF p_ministry_id IS NOT NULL AND v_kind = 'operating' THEN
      SELECT f.fund_id INTO v_existing_operating
      FROM public.funds f
      WHERE f.church_id = p_church_id
        AND f.ministry_id = p_ministry_id
        AND f.fund_kind = 'operating'
      LIMIT 1;

      IF v_existing_operating IS NOT NULL THEN
        RETURN json_build_object(
          'success', false,
          'status_code', 409,
          'message', 'Este ministerio ya tiene un fondo operativo. Crea un fondo de proyecto o evento.'
        );
      END IF;
    END IF;

    v_fund_id := gen_random_uuid();
    INSERT INTO public.funds (
      fund_id, church_id, fund_name, description, target_amount,
      start_date, end_date, is_active, is_primary, total_contributions,
      ministry_id, fund_kind
    ) VALUES (
      v_fund_id, p_church_id, trim(p_fund_name),
      nullif(trim(coalesce(p_description, '')), ''),
      coalesce(p_target_amount, 0), p_start_date, p_end_date,
      coalesce(p_is_active, true), false,
      coalesce(p_total_contributions, 0),
      p_ministry_id, v_kind
    );

    IF p_ministry_id IS NOT NULL AND v_kind = 'operating' THEN
      UPDATE public.church_ministries cm
      SET default_fund_id = v_fund_id
      WHERE cm.id = p_ministry_id
        AND cm.church_id = p_church_id;
    END IF;
  ELSE
    v_fund_id := p_fund_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.funds WHERE fund_id = p_fund_id AND church_id = p_church_id
    ) THEN
      RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Fondo no encontrado');
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.funds
      WHERE fund_id = p_fund_id
        AND church_id = p_church_id
        AND ministry_id IS NOT NULL
        AND fund_kind = 'operating'
        AND v_kind <> 'operating'
    ) THEN
      RETURN json_build_object(
        'success', false,
        'status_code', 400,
        'message', 'No se puede cambiar el tipo del fondo operativo del ministerio'
      );
    END IF;

    IF p_ministry_id IS NOT NULL AND v_kind = 'operating' THEN
      SELECT f.fund_id INTO v_existing_operating
      FROM public.funds f
      WHERE f.church_id = p_church_id
        AND f.ministry_id = p_ministry_id
        AND f.fund_kind = 'operating'
        AND f.fund_id <> p_fund_id
      LIMIT 1;

      IF v_existing_operating IS NOT NULL THEN
        RETURN json_build_object(
          'success', false,
          'status_code', 409,
          'message', 'Este ministerio ya tiene un fondo operativo'
        );
      END IF;
    END IF;

    UPDATE public.funds
    SET
      fund_name = trim(p_fund_name),
      description = nullif(trim(coalesce(p_description, '')), ''),
      target_amount = coalesce(p_target_amount, 0),
      start_date = p_start_date,
      end_date = p_end_date,
      is_active = coalesce(p_is_active, true),
      total_contributions = coalesce(p_total_contributions, total_contributions),
      ministry_id = p_ministry_id,
      fund_kind = v_kind,
      updated_at = now()
    WHERE fund_id = p_fund_id AND church_id = p_church_id;

    IF coalesce(p_is_active, true) = false THEN
      UPDATE public.church_ministries cm
      SET default_fund_id = NULL
      WHERE cm.default_fund_id = p_fund_id
        AND cm.church_id = p_church_id;
    ELSIF EXISTS (
      SELECT 1 FROM public.funds
      WHERE fund_id = p_fund_id
        AND ministry_id IS NOT NULL
        AND fund_kind = 'operating'
    ) THEN
      UPDATE public.church_ministries cm
      SET default_fund_id = p_fund_id
      WHERE cm.id = (SELECT ministry_id FROM public.funds WHERE fund_id = p_fund_id)
        AND cm.church_id = p_church_id;
    END IF;
  END IF;

  IF coalesce(p_is_primary, false) = true THEN
    PERFORM public.sp_change_primary_fund(v_fund_id, p_church_id);
  END IF;

  RETURN json_build_object(
    'success', true, 'status_code', 200,
    'message', 'Fondo guardado correctamente', 'fund_id', v_fund_id
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 409,
      'message', 'Este ministerio ya tiene un fondo operativo'
    );
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_delete_fund(p_fund_id uuid, p_church_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_name text;
  v_has_entries boolean;
  v_ministry_id uuid;
  v_fund_kind text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_fund_id IS NULL OR p_church_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'fund_id y church_id son obligatorios'
    );
  END IF;

  SELECT fund_name, ministry_id, fund_kind
  INTO v_name, v_ministry_id, v_fund_kind
  FROM public.funds
  WHERE fund_id = p_fund_id AND church_id = p_church_id;

  IF v_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Fondo no encontrado'
    );
  END IF;

  IF v_ministry_id IS NOT NULL AND v_fund_kind = 'operating' THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 403,
      'message', 'El fondo operativo del ministerio no se puede eliminar. Solo editar.'
    );
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.income_entries WHERE fund_id = p_fund_id
  ) INTO v_has_entries;

  IF v_has_entries THEN
    UPDATE public.funds
    SET is_active = false, is_primary = false, updated_at = now()
    WHERE fund_id = p_fund_id AND church_id = p_church_id;

    RETURN json_build_object(
      'success', true,
      'status_code', 200,
      'message', 'Fondo desactivado (tiene movimientos asociados)',
      'fund_id', p_fund_id
    );
  END IF;

  DELETE FROM public.funds
  WHERE fund_id = p_fund_id AND church_id = p_church_id;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Fondo eliminado',
    'fund_id', p_fund_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$function$;
