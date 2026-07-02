-- spgetprofiles: corrige CTEs fuera de alcance en el segundo SELECT (PL/pgSQL).
-- Antes el json_build_object referenciaba paged_rows/stats de un WITH ya cerrado,
-- lo que devolvía success=false y member_list vacío sin error HTTP.

CREATE OR REPLACE FUNCTION public.spgetprofiles(
  p_church_id integer DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_search text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer;
  v_offset integer;
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_session_church_id integer;
BEGIN
  v_session_church_id := public.fn_get_session_church_id();

  IF v_session_church_id IS NULL THEN
    RAISE EXCEPTION 'Sesión sin iglesia vinculada.';
  END IF;

  IF p_church_id IS NOT NULL AND p_church_id <> v_session_church_id THEN
    RAISE EXCEPTION 'Acceso denegado: iglesia no autorizada.';
  END IF;

  p_church_id := v_session_church_id;

  IF p_page_size IS NULL THEN
    v_page_size := NULL;
    v_offset := 0;
  ELSE
    v_page_size := LEAST(GREATEST(p_page_size, 1), 100);
    v_offset := (v_page - 1) * v_page_size;
  END IF;

  WITH scoped AS (
    SELECT
      p.id,
      p.church_id,
      p.first_name,
      p.last_name,
      p.nick_name,
      p.date_of_birth,
      p.gender,
      p.marital_status,
      p.nationality,
      p.id_type,
      p.id_number,
      p.is_active,
      p.is_member,
      p.bio,
      COALESCE(a.country, '') AS country,
      COALESCE(a.city_state, '') AS city_state,
      COALESCE(a.street_address, '') AS street_address,
      COALESCE(a.state_province, '') AS state_province,
      COALESCE(c.email, '') AS email,
      COALESCE(c.phone, '') AS phone,
      COALESCE(c.mobile_phone, '') AS mobile_phone,
      COALESCE(m.membership_role, 'Visita') AS membership_role
    FROM profiles p
    LEFT JOIN address a ON a.profile_id = p.id
    LEFT JOIN contacts c ON c.profile_id = p.id
    LEFT JOIN LATERAL (
      SELECT m2.membership_role
      FROM membership m2
      WHERE m2.profile_id = p.id
      LIMIT 1
    ) m ON true
    WHERE p.church_id = p_church_id
  ),
  stats AS (
    SELECT
      COUNT(*)::bigint AS total,
      COUNT(*) FILTER (WHERE is_member)::bigint AS members,
      COUNT(*) FILTER (WHERE NOT is_member)::bigint AS visits,
      COUNT(*) FILTER (WHERE is_active)::bigint AS active,
      COUNT(*) FILTER (WHERE NOT is_active)::bigint AS inactive
    FROM scoped
  ),
  filtered AS (
    SELECT *
    FROM scoped s
    WHERE (
      p_page_size IS NULL
      OR p_filter IS NULL
      OR p_filter = 'all'
      OR (p_filter = 'members' AND s.is_member = true)
      OR (p_filter = 'visits' AND s.is_member = false)
      OR (p_filter = 'active' AND s.is_active = true)
      OR (p_filter = 'inactive' AND s.is_active = false)
    )
    AND (
      p_page_size IS NULL
      OR v_search IS NULL
      OR s.first_name ILIKE '%' || v_search || '%'
      OR s.last_name ILIKE '%' || v_search || '%'
      OR s.nick_name ILIKE '%' || v_search || '%'
      OR s.membership_role ILIKE '%' || v_search || '%'
      OR s.nationality ILIKE '%' || v_search || '%'
      OR s.email ILIKE '%' || v_search || '%'
      OR s.phone ILIKE '%' || v_search || '%'
      OR s.mobile_phone ILIKE '%' || v_search || '%'
      OR s.city_state ILIKE '%' || v_search || '%'
    )
  ),
  paged_rows AS (
    SELECT *
    FROM filtered
    ORDER BY last_name, first_name, id
    OFFSET v_offset
    LIMIT v_page_size
  ),
  counted AS (
    SELECT COUNT(*)::bigint AS total FROM filtered
  )
  SELECT json_build_object(
    'success', true,
    'status_code', 200,
    'message', 'Success',
    'member_list', COALESCE((
      SELECT json_agg(
        json_build_object(
          'memberId', row.id,
          'churchId', row.church_id,
          'firstName', row.first_name,
          'lastName', row.last_name,
          'nickName', row.nick_name,
          'dateOfBirth', row.date_of_birth,
          'gender', row.gender,
          'maritalStatus', row.marital_status,
          'nationality', row.nationality,
          'idType', row.id_type,
          'idNumber', row.id_number,
          'isActive', row.is_active,
          'isMember', row.is_member,
          'membershipRole', row.membership_role,
          'bio', row.bio,
          'address', json_build_object(
            'country', row.country,
            'cityState', row.city_state,
            'streetAddress', row.street_address,
            'stateProvince', row.state_province
          ),
          'contact', json_build_object(
            'email', row.email,
            'phone', row.phone,
            'mobilePhone', row.mobile_phone
          )
        )
        ORDER BY row.last_name, row.first_name, row.id
      )
      FROM paged_rows row
    ), '[]'::json),
    'pagination', json_build_object(
      'page', v_page,
      'page_size', COALESCE(v_page_size, (SELECT total FROM counted)),
      'total', (SELECT total FROM counted),
      'total_pages', CASE
        WHEN v_page_size IS NULL OR v_page_size = 0 THEN 1
        ELSE GREATEST(
          CEIL((SELECT total FROM counted)::numeric / v_page_size::numeric),
          1
        )
      END
    ),
    'stats', (
      SELECT json_build_object(
        'total', stats.total,
        'members', stats.members,
        'visits', stats.visits,
        'active', stats.active,
        'inactive', stats.inactive
      )
      FROM stats
    )
  ) INTO result;

  RETURN result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', 'An error occurred while fetching profiles: ' || SQLERRM,
      'member_list', '[]'::json
    );
END;
$$;

NOTIFY pgrst, 'reload schema';
