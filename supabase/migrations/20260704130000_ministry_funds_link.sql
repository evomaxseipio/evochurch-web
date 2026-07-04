-- Ministerios ↔ Fondos: ministry_id + fund_kind en funds, default_fund_id en church_ministries.

ALTER TABLE public.funds
  ADD COLUMN IF NOT EXISTS ministry_id uuid NULL
    REFERENCES public.church_ministries(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS fund_kind text NOT NULL DEFAULT 'operating';

ALTER TABLE public.funds
  DROP CONSTRAINT IF EXISTS funds_fund_kind_check;

ALTER TABLE public.funds
  ADD CONSTRAINT funds_fund_kind_check
  CHECK (fund_kind IN ('operating', 'project', 'event'));

CREATE INDEX IF NOT EXISTS idx_funds_ministry_id
  ON public.funds (church_id, ministry_id)
  WHERE ministry_id IS NOT NULL;

ALTER TABLE public.church_ministries
  ADD COLUMN IF NOT EXISTS default_fund_id uuid NULL
    REFERENCES public.funds(fund_id) ON DELETE SET NULL;

COMMENT ON COLUMN public.funds.ministry_id IS 'Ministerio propietario opcional; NULL = fondo general de iglesia.';
COMMENT ON COLUMN public.funds.fund_kind IS 'operating | project | event';
COMMENT ON COLUMN public.church_ministries.default_fund_id IS 'Fondo operativo principal del ministerio (cuotas, ofrendas internas).';

CREATE OR REPLACE FUNCTION public.fn_validate_ministry_default_fund()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_fund record;
BEGIN
  IF NEW.default_fund_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT f.fund_id, f.church_id, f.ministry_id, f.fund_kind, f.is_active
  INTO v_fund
  FROM public.funds f
  WHERE f.fund_id = NEW.default_fund_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'default_fund_id references a missing fund';
  END IF;

  IF v_fund.church_id IS DISTINCT FROM NEW.church_id THEN
    RAISE EXCEPTION 'default fund must belong to the same church';
  END IF;

  IF v_fund.ministry_id IS DISTINCT FROM NEW.id THEN
    RAISE EXCEPTION 'default fund must belong to this ministry';
  END IF;

  IF v_fund.fund_kind <> 'operating' THEN
    RAISE EXCEPTION 'default fund must be operating kind';
  END IF;

  IF coalesce(v_fund.is_active, true) = false THEN
    RAISE EXCEPTION 'default fund must be active';
  END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_validate_ministry_default_fund ON public.church_ministries;

CREATE TRIGGER trg_validate_ministry_default_fund
  BEFORE INSERT OR UPDATE OF default_fund_id ON public.church_ministries
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_validate_ministry_default_fund();

CREATE OR REPLACE FUNCTION public.fn_assert_fund_ministry(
  p_church_id integer,
  p_ministry_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  IF p_ministry_id IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.church_ministries cm
    WHERE cm.id = p_ministry_id
      AND cm.church_id = p_church_id
  ) THEN
    RAISE EXCEPTION 'Ministerio no encontrado para esta iglesia';
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_set_ministry_default_fund(
  p_church_id integer,
  p_ministry_id uuid,
  p_fund_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_fund_ministry(p_church_id, p_ministry_id);

  IF p_ministry_id IS NULL OR p_fund_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'ministry_id y fund_id son obligatorios'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.funds f
    WHERE f.fund_id = p_fund_id
      AND f.church_id = p_church_id
      AND f.ministry_id = p_ministry_id
      AND f.fund_kind = 'operating'
      AND coalesce(f.is_active, true) = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'El fondo debe ser operativo, activo y pertenecer al ministerio'
    );
  END IF;

  UPDATE public.church_ministries
  SET default_fund_id = p_fund_id
  WHERE id = p_ministry_id
    AND church_id = p_church_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Ministerio no encontrado'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Fondo principal del ministerio actualizado'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;

CREATE OR REPLACE FUNCTION public.spgetfunds(p_church_id bigint)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  result JSON;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id::integer);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'fund_list', COALESCE(json_agg(
      json_build_object(
        'fund_id', f.fund_id,
        'church_id', f.church_id,
        'fund_name', f.fund_name,
        'description', f.description,
        'target_amount', f.target_amount,
        'start_date', f.start_date,
        'end_date', f.end_date,
        'total_contributions', f.total_contributions,
        'is_active', f.is_active,
        'created_at', f.created_at,
        'updated_at', f.updated_at,
        'is_primary', f.is_primary,
        'ministry_id', f.ministry_id,
        'fund_kind', f.fund_kind
      )
      ORDER BY f.is_primary DESC, f.fund_name
    ), '[]')
  ) INTO result
  FROM public.funds f
  WHERE f.church_id = p_church_id;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An error occurred while fetching funds: ' || SQLERRM,
      'fund_list', json_build_object()
    );
END;
$function$;

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
  p_fund_kind text DEFAULT 'operating'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_fund_id uuid;
  v_kind text := coalesce(nullif(trim(p_fund_kind), ''), 'operating');
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
        AND cm.church_id = p_church_id
        AND cm.default_fund_id IS NULL;
    END IF;
  ELSE
    v_fund_id := p_fund_id;
    IF NOT EXISTS (
      SELECT 1 FROM public.funds WHERE fund_id = p_fund_id AND church_id = p_church_id
    ) THEN
      RETURN json_build_object('success', false, 'status_code', 404, 'message', 'Fondo no encontrado');
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
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'status_code', 500, 'message', SQLERRM);
END;
$function$;
