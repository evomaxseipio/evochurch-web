-- Multitenant P0: helper de perfil + guards en RPCs de miembros y finanzas.

CREATE OR REPLACE FUNCTION public.fn_assert_profile_in_session_church(p_profile_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_church_id integer;
BEGIN
  IF p_profile_id IS NULL THEN
    RAISE EXCEPTION 'profile_id requerido.';
  END IF;

  v_church_id := public.fn_get_session_church_id();

  IF v_church_id IS NULL THEN
    RAISE EXCEPTION 'Sesión sin iglesia vinculada.';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.church_id = v_church_id
  ) THEN
    RAISE EXCEPTION 'Acceso denegado: perfil no pertenece a la iglesia.';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_assert_profile_in_session_church(uuid)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Miembros
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.spinsertprofiles(
  p_church_id integer,
  p_first_name character varying,
  p_last_name character varying,
  p_nick_name character varying DEFAULT NULL::character varying,
  p_date_of_birth date DEFAULT NULL::date,
  p_gender character varying DEFAULT NULL::character varying,
  p_marital_status character varying DEFAULT NULL::character varying,
  p_nationality character varying DEFAULT NULL::character varying,
  p_id_type character varying DEFAULT NULL::character varying,
  p_id_number character varying DEFAULT NULL::character varying,
  p_is_member boolean DEFAULT false,
  p_is_active boolean DEFAULT true,
  p_bio text DEFAULT NULL::text,
  p_street_address character varying DEFAULT NULL::character varying,
  p_state_province character varying DEFAULT NULL::character varying,
  p_city_state character varying DEFAULT NULL::character varying,
  p_country character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_mobile_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_id UUID;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  INSERT INTO public.profiles (
    first_name, last_name, nick_name, date_of_birth, gender, marital_status,
    nationality, id_type, id_number, is_member, is_active, bio, church_id
  )
  VALUES (
    p_first_name, p_last_name, p_nick_name, p_date_of_birth, p_gender, p_marital_status,
    p_nationality, p_id_type, p_id_number, p_is_member, p_is_active, p_bio, p_church_id
  )
  ON CONFLICT (id_number) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.profiles WHERE id_number = p_id_number;
    PERFORM public.fn_assert_profile_in_session_church(v_id);
  END IF;

  INSERT INTO public.address (
    profile_id, street_address, state_province, city_state, country
  )
  VALUES (
    v_id, p_street_address, p_state_province, p_city_state, p_country
  );

  INSERT INTO public.contacts (
    profile_id, phone, mobile_phone, email
  )
  VALUES (
    v_id, p_phone, p_mobile_phone, p_email
  );

  RETURN jsonb_build_object(
    'status', 'Success',
    'message', 'Profile added successfully',
    'profile_id', v_id
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'status', 'Error',
      'message', SQLERRM
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.spupdateprofiles(
  p_id uuid,
  p_first_name character varying,
  p_last_name character varying,
  p_nick_name character varying DEFAULT NULL::character varying,
  p_date_of_birth date DEFAULT NULL::date,
  p_gender character varying DEFAULT NULL::character varying,
  p_marital_status character varying DEFAULT NULL::character varying,
  p_nationality character varying DEFAULT NULL::character varying,
  p_id_type character varying DEFAULT NULL::character varying,
  p_id_number character varying DEFAULT NULL::character varying,
  p_is_member boolean DEFAULT false,
  p_is_active boolean DEFAULT true,
  p_bio text DEFAULT NULL::text,
  p_street_address character varying DEFAULT NULL::character varying,
  p_state_province character varying DEFAULT NULL::character varying,
  p_city_state character varying DEFAULT NULL::character varying,
  p_country character varying DEFAULT NULL::character varying,
  p_phone character varying DEFAULT NULL::character varying,
  p_mobile_phone character varying DEFAULT NULL::character varying,
  p_email character varying DEFAULT NULL::character varying
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_profile_exists BOOLEAN;
  v_address_exists BOOLEAN;
  v_contact_exists BOOLEAN;
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_id);

  SELECT EXISTS(SELECT 1 FROM public.profiles WHERE id = p_id) INTO v_profile_exists;
  SELECT EXISTS(SELECT 1 FROM public.address WHERE profile_id = p_id) INTO v_address_exists;
  SELECT EXISTS(SELECT 1 FROM public.contacts WHERE profile_id = p_id) INTO v_contact_exists;

  IF NOT v_profile_exists THEN
    RETURN jsonb_build_object(
      'success', true,
      'status_code', 500,
      'message', 'Profile not found',
      'profile_id', ''
    );
  END IF;

  UPDATE public.profiles
  SET
    first_name = p_first_name,
    last_name = p_last_name,
    nick_name = p_nick_name,
    date_of_birth = p_date_of_birth,
    gender = p_gender,
    marital_status = p_marital_status,
    nationality = p_nationality,
    id_type = p_id_type,
    id_number = p_id_number,
    is_member = p_is_member,
    is_active = p_is_active,
    bio = p_bio
  WHERE id = p_id;

  IF NOT v_address_exists THEN
    INSERT INTO public.address(profile_id, street_address, state_province, city_state, country)
    VALUES (p_id, p_street_address, p_state_province, p_city_state, p_country);
  ELSE
    UPDATE public.address
    SET
      street_address = p_street_address,
      state_province = p_state_province,
      city_state = p_city_state,
      country = p_country
    WHERE profile_id = p_id;
  END IF;

  IF NOT v_contact_exists THEN
    INSERT INTO public.contacts(profile_id, phone, mobile_phone, email)
    VALUES (p_id, p_phone, p_mobile_phone, p_email);
  ELSE
    UPDATE public.contacts
    SET
      phone = p_phone,
      mobile_phone = p_mobile_phone,
      email = p_email
    WHERE profile_id = p_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Profile updated successfully',
    'profile_id', p_id
  );

EXCEPTION
  WHEN others THEN
    RETURN jsonb_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'frofile_id', ''
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.spmaintancemembership(
  p_profile_id uuid,
  p_baptism_date date,
  p_baptism_church character varying,
  p_baptism_pastor character varying,
  p_membership_role character varying,
  p_baptism_church_city character varying,
  p_baptism_church_country character varying,
  p_has_credential boolean,
  p_is_baptized_in_spirit boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_membership_exists boolean;
  v_church_id integer;
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  SELECT p.church_id INTO v_church_id
  FROM public.profiles p
  WHERE p.id = p_profile_id;

  SELECT EXISTS(
    SELECT 1 FROM public.membership WHERE profile_id = p_profile_id
  ) INTO v_membership_exists;

  IF NOT v_membership_exists THEN
    INSERT INTO membership (
      profile_id,
      church_id,
      baptism_date,
      baptism_church,
      baptism_pastor,
      membership_role,
      baptism_church_city,
      baptism_church_country,
      hascredential,
      isbaptizedinspirit
    )
    VALUES (
      p_profile_id,
      v_church_id,
      p_baptism_date,
      NULLIF(trim(p_baptism_church), ''),
      NULLIF(trim(p_baptism_pastor), ''),
      p_membership_role,
      NULLIF(trim(p_baptism_church_city), ''),
      NULLIF(trim(p_baptism_church_country), ''),
      p_has_credential,
      p_is_baptized_in_spirit
    );
  ELSE
    UPDATE public.membership
    SET
      church_id = COALESCE(church_id, v_church_id),
      baptism_date = p_baptism_date,
      baptism_church = NULLIF(trim(p_baptism_church), ''),
      baptism_pastor = NULLIF(trim(p_baptism_pastor), ''),
      membership_role = p_membership_role,
      baptism_church_city = NULLIF(trim(p_baptism_church_city), ''),
      baptism_church_country = NULLIF(trim(p_baptism_church_country), ''),
      hascredential = p_has_credential,
      isbaptizedinspirit = p_is_baptized_in_spirit,
      updated_at = now()
    WHERE profile_id = p_profile_id;
  END IF;

  IF lower(trim(coalesce(p_membership_role, ''))) = 'visita' THEN
    UPDATE public.profiles SET is_member = false WHERE id = p_profile_id;
  ELSE
    UPDATE public.profiles SET is_member = true WHERE id = p_profile_id;
  END IF;

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Membership updated successfully',
    'membership', p_profile_id
  );

EXCEPTION
  WHEN others THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'membership', p_profile_id
    );
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_get_membership_history_by_profile(
  p_church_id integer,
  p_profile_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_result JSON;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  IF p_church_id IS NULL OR p_profile_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'Invalid input: church_id and member_id are required.',
      'membership', '[]'
    );
  END IF;

  WITH membership_history_cte AS (
    SELECT
      profile_id,
      church_id,
      COALESCE(
        json_agg(
          json_build_object(
            'history_id', id,
            'date_start', date_start,
            'date_returned', date_returned,
            'history_observations', observations
          )
          ORDER BY date_start
        ),
        '[]'
      ) AS history_data
    FROM membership_history
    GROUP BY profile_id, church_id
  )
  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'membership', COALESCE(json_agg(
      json_build_object(
        'profileId', m.profile_id,
        'baptismDate', m.baptism_date,
        'baptismChurch', m.baptism_church,
        'baptismPastor', m.baptism_pastor,
        'membershipRole', m.membership_role,
        'baptismChurchCity', m.baptism_church_city,
        'baptismChurchCountry', m.baptism_church_country,
        'hasCredential', m.hascredential,
        'isBaptizedInSpirit', m.isbaptizedinspirit,
        'membershipHistory', COALESCE(mh.history_data, '[]')
      )
    ), '[]')
  )
  INTO v_result
  FROM membership m
  LEFT JOIN membership_history_cte mh
    ON m.profile_id = mh.profile_id
   AND m.church_id = mh.church_id
  WHERE m.church_id = p_church_id
    AND m.profile_id = p_profile_id;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An unexpected error occurred: ' || SQLERRM,
      'membership', '[]'
    );
END;
$function$;

-- ---------------------------------------------------------------------------
-- Finanzas: lectura / mutación
-- ---------------------------------------------------------------------------

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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  RETURN QUERY
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
    ),
    jsonb_build_object('fund_name', f.fund_name),
    COALESCE(icj.income_contributors, '[]'::jsonb)
  FROM income_entries ie
  LEFT JOIN income_type_catalog itc ON itc.id = ie.income_type_id
  LEFT JOIN funds f ON f.fund_id = ie.fund_id
  LEFT JOIN LATERAL (
    SELECT COALESCE(
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
    INNER JOIN contributors co ON co.contributor_id = ic.contributor_id
    LEFT JOIN profiles pr ON pr.id = co.profile_id
    WHERE ic.income_id = ie.income_id
  ) icj ON true
  WHERE ie.church_id = p_church_id
    AND (p_fund_id IS NULL OR ie.fund_id = p_fund_id)
    AND COALESCE(itc.is_operational, false) = false
  ORDER BY ie.payment_date DESC, ie.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.sp_get_income_entries(integer, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.sp_get_income_entries(integer, uuid)
  TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_create_transaction(
  p_church_id integer,
  p_expenses_type_id integer,
  p_fund_id uuid,
  p_created_by_profile_id uuid,
  p_transaction_amount numeric,
  p_description text,
  p_payment_method text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  fund_amount NUMERIC := 0;
  transaction_amount_in_transit NUMERIC := 0;
  remaining_balance NUMERIC;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_session_profile(p_created_by_profile_id);

  SELECT
    COALESCE(f.total_contributions, 0),
    COALESCE(SUM(t.transaction_amount), 0)
  INTO fund_amount, transaction_amount_in_transit
  FROM funds f
  LEFT JOIN transactions t
    ON f.church_id = t.church_id
   AND f.fund_id = t.fund_id
  WHERE f.fund_id = p_fund_id
    AND f.church_id = p_church_id
  GROUP BY f.total_contributions;

  remaining_balance := fund_amount - transaction_amount_in_transit;

  IF p_transaction_amount > remaining_balance OR fund_amount = 0 THEN
    RAISE EXCEPTION 'Insufficient funds. Requested amount: %, Available balance: %',
      p_transaction_amount, remaining_balance;
  END IF;

  INSERT INTO transactions (
    church_id,
    expenses_type_id,
    fund_id,
    created_by_profile_id,
    transaction_amount,
    transaction_description,
    payment_method
  ) VALUES (
    p_church_id,
    p_expenses_type_id,
    p_fund_id,
    p_created_by_profile_id,
    p_transaction_amount,
    p_description,
    p_payment_method
  );
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
        'fund_id', fund_id,
        'church_id', church_id,
        'fund_name', fund_name,
        'description', description,
        'target_amount', target_amount,
        'start_date', start_date,
        'end_date', end_date,
        'total_contributions', total_contributions,
        'is_active', is_active,
        'created_at', created_at,
        'updated_at', updated_at,
        'is_primary', is_primary
      )
    ), '[]')
  ) INTO result
  FROM funds
  WHERE church_id = p_church_id;

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

CREATE OR REPLACE FUNCTION public.spgetexpensestypes(p_church_id bigint)
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
    'expense_types', COALESCE(json_agg(
      json_build_object(
        'expenses_type_id', expenses_type_id,
        'church_id', church_id,
        'expenses_name', expenses_name,
        'expenses_category', expenses_category,
        'expenses_description', expenses_description,
        'is_active', is_active,
        'created_at', created_at,
        'updated_at', updated_at
      )
    ), '[]')
  ) INTO result
  FROM expenses_type
  WHERE church_id = p_church_id;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An error occurred while fetching expenses types: ' || SQLERRM,
      'expense_types', '[]'
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
  p_total_contributions numeric DEFAULT NULL::numeric
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_fund_id uuid;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_church_id IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'church_id is required');
  END IF;

  IF trim(coalesce(p_fund_name, '')) = '' THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'Nombre del fondo es obligatorio');
  END IF;

  IF p_start_date IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'Fecha de inicio es obligatoria');
  END IF;

  IF p_fund_id IS NULL THEN
    v_fund_id := gen_random_uuid();
    INSERT INTO public.funds (
      fund_id, church_id, fund_name, description, target_amount,
      start_date, end_date, is_active, is_primary, total_contributions
    ) VALUES (
      v_fund_id, p_church_id, trim(p_fund_name),
      nullif(trim(coalesce(p_description, '')), ''),
      p_target_amount, p_start_date, p_end_date,
      coalesce(p_is_active, true), false,
      coalesce(p_total_contributions, 0)
    );
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
      target_amount = p_target_amount,
      start_date = p_start_date,
      end_date = p_end_date,
      is_active = coalesce(p_is_active, true),
      total_contributions = coalesce(p_total_contributions, total_contributions),
      updated_at = now()
    WHERE fund_id = p_fund_id AND church_id = p_church_id;
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

CREATE OR REPLACE FUNCTION public.sp_delete_fund(p_fund_id uuid, p_church_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_name text;
  v_has_entries boolean;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_fund_id IS NULL OR p_church_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 400,
      'message', 'fund_id y church_id son obligatorios'
    );
  END IF;

  SELECT fund_name INTO v_name
  FROM public.funds
  WHERE fund_id = p_fund_id AND church_id = p_church_id;

  IF v_name IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Fondo no encontrado'
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

CREATE OR REPLACE FUNCTION public.sp_change_primary_fund(p_fund_id uuid, p_church_id integer)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_old_primary_fund_id uuid;
  v_fund_name TEXT;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_fund_id IS NULL OR p_church_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Fund ID and Church ID cannot be null'
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.funds
    WHERE fund_id = p_fund_id
      AND church_id = p_church_id
      AND is_active = true
  ) THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'Fund does not exist, is not active, or does not belong to the specified church'
    );
  END IF;

  BEGIN
    SELECT fund_id INTO v_old_primary_fund_id
    FROM public.funds
    WHERE church_id = p_church_id
      AND is_primary = true;

    IF v_old_primary_fund_id IS NOT NULL AND v_old_primary_fund_id <> p_fund_id THEN
      UPDATE public.funds
      SET is_primary = false, updated_at = now()
      WHERE fund_id = v_old_primary_fund_id;
    END IF;

    UPDATE public.funds
    SET is_primary = true, updated_at = now()
    WHERE fund_id = p_fund_id;

    SELECT funds.fund_name INTO v_fund_name
    FROM public.funds
    WHERE church_id = p_church_id
      AND funds.fund_id = p_fund_id
      AND is_primary = true;

    RETURN json_build_object(
      'success', true,
      'status_code', 200,
      'message', 'Fund ' || v_fund_name || ' updated at primary successfully'
    );

  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An error occurred while changing primary funds: ' || SQLERRM
    );
  END;
END;
$function$;

CREATE OR REPLACE FUNCTION public.sp_update_fund_transfer(
  p_church_id integer,
  p_transfer_id uuid,
  p_source_fund_id uuid,
  p_destination_fund_id uuid,
  p_amount numeric,
  p_user_comment text,
  p_payment_method text,
  p_movement_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_ft public.fund_transfers%ROWTYPE;
  v_source_name text;
  v_dest_name text;
  v_description text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  SELECT * INTO v_ft
  FROM public.fund_transfers ft
  WHERE ft.transfer_id = p_transfer_id
    AND ft.church_id = p_church_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transferencia no encontrada.';
  END IF;

  IF v_ft.status <> 'PENDING' THEN
    RAISE EXCEPTION 'Solo se pueden editar transferencias pendientes.';
  END IF;

  IF p_source_fund_id = p_destination_fund_id THEN
    RAISE EXCEPTION 'El fondo origen y destino deben ser diferentes.';
  END IF;

  SELECT f.fund_name INTO v_source_name
  FROM public.funds f
  WHERE f.fund_id = p_source_fund_id AND f.church_id = p_church_id;

  SELECT f.fund_name INTO v_dest_name
  FROM public.funds f
  WHERE f.fund_id = p_destination_fund_id AND f.church_id = p_church_id;

  v_description := public.fn_build_fund_transfer_description(
    v_source_name, v_dest_name, p_user_comment
  );

  IF char_length(v_description) > 250 THEN
    RAISE EXCEPTION 'La descripción no puede superar 250 caracteres.';
  END IF;

  UPDATE public.fund_transfers
  SET
    source_fund_id = p_source_fund_id,
    destination_fund_id = p_destination_fund_id,
    amount = p_amount,
    user_comment = NULLIF(TRIM(COALESCE(p_user_comment, '')), ''),
    payment_method = COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Transfer'),
    movement_date = COALESCE(p_movement_date, movement_date),
    updated_at = now()
  WHERE transfer_id = p_transfer_id;

  UPDATE public.transactions
  SET
    fund_id = p_source_fund_id,
    transaction_amount = p_amount,
    transaction_description = v_description,
    payment_method = COALESCE(NULLIF(TRIM(p_payment_method), ''), 'Transfer'),
    transaction_date = COALESCE(p_movement_date, transaction_date),
    updated_at = now()
  WHERE transaction_id = v_ft.expense_transaction_id
    AND church_id = p_church_id;

  RETURN json_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.fn_can_authorize_finances(
  p_profile_id uuid,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
  SELECT
    p_profile_id = public.fn_get_session_profile_id()
    AND p_auth_user_id = auth.uid()
    AND public.fn_get_session_church_id() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.auth_users au
        INNER JOIN public.profiles p ON p.id = au.profile_id
        WHERE au.app_role_id = 1
          AND au.id = p_auth_user_id
          AND au.profile_id = p_profile_id
          AND p.church_id = public.fn_get_session_church_id()
      )
      OR EXISTS (
        SELECT 1
        FROM public.membership m
        WHERE m.profile_id = p_profile_id
          AND m.church_id = public.fn_get_session_church_id()
          AND LOWER(TRIM(m.membership_role)) = 'pastor'
      )
    );
$function$;

CREATE OR REPLACE FUNCTION public.sp_get_collection_by_member(
  p_church_id integer,
  p_profile_id uuid
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $function$
DECLARE
  v_result JSON;
  v_total_transation INTEGER;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);

  IF p_profile_id IS NOT NULL THEN
    PERFORM public.fn_assert_profile_in_session_church(p_profile_id);
  END IF;

  SELECT COALESCE(COUNT(*), 0)
    INTO v_total_transation
   FROM collections c
   WHERE c.church_id = p_church_id
     AND c.profile_id = COALESCE(p_profile_id, c.profile_id)
     AND EXTRACT(YEAR FROM c.collection_date) = EXTRACT(YEAR FROM CURRENT_DATE);

  IF v_total_transation = 0 THEN
    RETURN json_build_object(
      'success', TRUE,
      'status_code', 204,
      'message', 'Esta persona no tiene ninguna transaccion ',
      'collection_header_details', '{}'::json,
      'collection_chart_data', '[]'::json,
      'collection_list', '[]'::json
    );
  END IF;

  WITH collectionHeaderDetails AS (
    SELECT
      c.church_id,
      c.profile_id,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type = 1), 0) AS tithes_amount,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type = 2), 0) AS offering_amount,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type = 3), 0) AS donation_amount,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type IN (1, 2, 3)), 0) AS total_contributions
    FROM public.collections c
    WHERE c.church_id = p_church_id
      AND c.profile_id = COALESCE(p_profile_id, c.profile_id)
      AND EXTRACT(YEAR FROM c.collection_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY c.church_id, c.profile_id
  ),
  collectionMonthlyDetails AS (
    SELECT
      extract(MONTH FROM c.collection_date) AS month_number,
      to_char(c.collection_date, 'MON') AS month_collection,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type = 1), 0) AS tithes_amount,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type = 2), 0) AS offering_amount,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type = 3), 0) AS donation_amount,
      COALESCE(SUM(c.collection_amount) FILTER (WHERE c.collection_type IN (1, 2, 3)), 0) AS total_contributions
    FROM public.collections c
    WHERE c.church_id = p_church_id
      AND c.profile_id = COALESCE(p_profile_id, c.profile_id)
      AND EXTRACT(YEAR FROM c.collection_date) = EXTRACT(YEAR FROM CURRENT_DATE)
    GROUP BY c.church_id, c.profile_id, to_char(c.collection_date, 'MON'), extract(MONTH FROM c.collection_date)
    ORDER BY extract(MONTH FROM c.collection_date)
  ),
  collectionDetails AS (
    SELECT
      c.collection_id,
      c.church_id,
      c.fund_id,
      c.collection_type,
      t.collection_type_name,
      c.collection_amount,
      c.collection_date,
      c.is_anonymous,
      c.payment_method,
      c.comments,
      c.is_active
    FROM public.collections c
    INNER JOIN public.collection_type t
      ON c.church_id = t.church_id
     AND c.collection_type = t.collection_type_id
    WHERE c.church_id = p_church_id
      AND c.profile_id = COALESCE(p_profile_id, c.profile_id)
      AND EXTRACT(YEAR FROM c.collection_date) = EXTRACT(YEAR FROM CURRENT_DATE)
  )
  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'success',
    'collection_header_details', (
      SELECT json_build_object(
        'church_id', c.church_id,
        'profile_id', c.profile_id,
        'offering_amount', c.offering_amount,
        'donation_amount', c.donation_amount,
        'tithes_amount', c.tithes_amount,
        'total_contributions', c.total_contributions
      )
      FROM collectionHeaderDetails c
    ),
    'collection_chart_data', (
      SELECT json_agg(
        json_build_object(
          'month', m.month_collection,
          'tithes', m.tithes_amount,
          'offering', m.offering_amount,
          'donation', m.donation_amount
        )
      )
      FROM collectionMonthlyDetails m
    ),
    'collection_list', COALESCE(
      json_agg(
        json_build_object(
          'church_id', d.church_id,
          'collection_id', d.collection_id,
          'collection_type', d.collection_type,
          'collection_type_name', d.collection_type_name,
          'collection_date', d.collection_date,
          'collection_amount', d.collection_amount,
          'is_anonymous', d.is_anonymous,
          'payment_method', d.payment_method,
          'comments', d.comments,
          'is_active', d.is_active,
          'fund_id', d.fund_id
        )
        ORDER BY d.collection_date DESC
      ),
      '[]'::json
    )
  )
  INTO v_result
  FROM collectionDetails d;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An error occurred while fetching transactions: ' || SQLERRM,
      'transaction_list', '[]'::json
    );
END;
$function$;

NOTIFY pgrst, 'reload schema';
