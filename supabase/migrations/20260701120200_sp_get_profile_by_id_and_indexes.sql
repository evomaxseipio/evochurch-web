-- Multitenant P1: perfil puntual + índices por church_id.

CREATE OR REPLACE FUNCTION public.sp_get_profile_by_id(p_profile_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_result json;
BEGIN
  PERFORM public.fn_assert_profile_in_session_church(p_profile_id);

  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'member', json_build_object(
      'memberId', p.id,
      'churchId', p.church_id,
      'firstName', p.first_name,
      'lastName', p.last_name,
      'nickName', p.nick_name,
      'dateOfBirth', p.date_of_birth,
      'gender', p.gender,
      'maritalStatus', p.marital_status,
      'nationality', p.nationality,
      'idType', p.id_type,
      'idNumber', p.id_number,
      'isActive', p.is_active,
      'isMember', p.is_member,
      'membershipRole', COALESCE(m.membership_role, 'Visita'),
      'bio', p.bio,
      'address', json_build_object(
        'country', COALESCE(a.country, ''),
        'cityState', COALESCE(a.city_state, ''),
        'streetAddress', COALESCE(a.street_address, ''),
        'stateProvince', COALESCE(a.state_province, '')
      ),
      'contact', json_build_object(
        'email', COALESCE(c.email, ''),
        'phone', COALESCE(c.phone, ''),
        'mobilePhone', COALESCE(c.mobile_phone, '')
      )
    )
  )
  INTO v_result
  FROM public.profiles p
  LEFT JOIN public.address a ON a.profile_id = p.id
  LEFT JOIN public.contacts c ON c.profile_id = p.id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = p.id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE p.id = p_profile_id;

  IF v_result IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 404,
      'message', 'Profile not found',
      'member', NULL
    );
  END IF;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM,
      'member', NULL
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_profile_by_id(uuid)
  TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_profiles_church_id
  ON public.profiles (church_id);

CREATE INDEX IF NOT EXISTS idx_profiles_church_active_member
  ON public.profiles (church_id, is_active, is_member);

CREATE INDEX IF NOT EXISTS idx_income_entries_church_payment_date
  ON public.income_entries (church_id, payment_date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_church_status
  ON public.transactions (church_id, authorization_status);

CREATE INDEX IF NOT EXISTS idx_contributors_church_profile
  ON public.contributors (church_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_membership_church_profile
  ON public.membership (church_id, profile_id);

CREATE INDEX IF NOT EXISTS idx_funds_church_id
  ON public.funds (church_id);

CREATE INDEX IF NOT EXISTS idx_fund_transfers_church_status
  ON public.fund_transfers (church_id, status);

NOTIFY pgrst, 'reload schema';
