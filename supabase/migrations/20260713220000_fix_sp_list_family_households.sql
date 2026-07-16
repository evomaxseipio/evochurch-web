-- Fix sp_list_family_households: CTEs are statement-scoped in PL/pgSQL, so
-- `FROM filtered` / `FROM households` after the first SELECT INTO raised
-- 42P01 relation "filtered" does not exist.

CREATE OR REPLACE FUNCTION public.sp_list_family_households(
  p_church_id integer,
  p_search text DEFAULT NULL,
  p_filter text DEFAULT 'all',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_search text := NULLIF(TRIM(COALESCE(p_search, '')), '');
  v_filter text := LOWER(NULLIF(TRIM(COALESCE(p_filter, 'all')), ''));
  v_page integer := GREATEST(COALESCE(p_page, 1), 1);
  v_page_size integer := LEAST(GREATEST(COALESCE(p_page_size, 25), 1), 100);
  v_offset integer;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('members:read');

  IF v_filter IS NULL OR v_filter NOT IN (
    'all', 'complete', 'incomplete', 'adults_only', 'with_ministry_children'
  ) THEN
    v_filter := 'all';
  END IF;

  v_offset := (v_page - 1) * v_page_size;

  /*
    Dedup rule (documented):
    - Couples with bidirectional profile_spouse rows: one household,
      anchorProfileId = LEAST(profile_id, spouse_profile_id).
    - Single parents (children via profile_parent_child, no spouse):
      anchor = that parent.
    - Adults who are only the GREATER uuid of a spouse pair are not listed.
  */
  RETURN (
    WITH undirected_spouses AS (
      SELECT
        ps.church_id,
        LEAST(ps.profile_id, ps.spouse_profile_id) AS anchor_id,
        GREATEST(ps.profile_id, ps.spouse_profile_id) AS other_id
      FROM public.profile_spouse ps
      WHERE ps.church_id = p_church_id
        AND ps.profile_id < ps.spouse_profile_id
    ),
    parent_ids AS (
      SELECT DISTINCT ppc.parent_profile_id AS profile_id
      FROM public.profile_parent_child ppc
      INNER JOIN public.profiles p ON p.id = ppc.parent_profile_id
      WHERE ppc.church_id = p_church_id
        AND p.church_id = p_church_id
        AND p.is_child = false
    ),
    anchors AS (
      SELECT us.anchor_id AS anchor_id, us.other_id AS spouse_id
      FROM undirected_spouses us
      UNION
      SELECT pi.profile_id AS anchor_id, NULL::uuid AS spouse_id
      FROM parent_ids pi
      WHERE NOT EXISTS (
        SELECT 1
        FROM undirected_spouses us
        WHERE us.other_id = pi.profile_id OR us.anchor_id = pi.profile_id
      )
    ),
    household_base AS (
      SELECT
        a.anchor_id,
        a.spouse_id,
        ap.first_name AS anchor_first_name,
        ap.last_name AS anchor_last_name,
        sp.first_name AS spouse_first_name,
        sp.last_name AS spouse_last_name,
        COALESCE(
          NULLIF(TRIM(ap.last_name), ''),
          NULLIF(TRIM(sp.last_name), ''),
          NULLIF(TRIM(ap.first_name), ''),
          '—'
        ) AS family_surname,
        COALESCE(
          NULLIF(TRIM(COALESCE(ac.mobile_phone, '')), ''),
          NULLIF(TRIM(COALESCE(ac.phone, '')), ''),
          NULLIF(TRIM(COALESCE(sc.mobile_phone, '')), ''),
          NULLIF(TRIM(COALESCE(sc.phone, '')), '')
        ) AS phone,
        (
          SELECT COUNT(DISTINCT ppc.child_profile_id)::integer
          FROM public.profile_parent_child ppc
          WHERE ppc.church_id = p_church_id
            AND ppc.parent_profile_id IN (
              a.anchor_id,
              COALESCE(a.spouse_id, '00000000-0000-0000-0000-000000000000'::uuid)
            )
        ) AS children_count,
        (
          SELECT COUNT(DISTINCT ppc.child_profile_id)::integer
          FROM public.profile_parent_child ppc
          INNER JOIN public.profiles cp ON cp.id = ppc.child_profile_id
          WHERE ppc.church_id = p_church_id
            AND cp.church_id = p_church_id
            AND cp.is_child = true
            AND ppc.parent_profile_id IN (
              a.anchor_id,
              COALESCE(a.spouse_id, '00000000-0000-0000-0000-000000000000'::uuid)
            )
        ) AS ministry_children_count
      FROM anchors a
      INNER JOIN public.profiles ap
        ON ap.id = a.anchor_id
       AND ap.church_id = p_church_id
       AND ap.is_child = false
      LEFT JOIN public.profiles sp
        ON sp.id = a.spouse_id
       AND sp.church_id = p_church_id
       AND sp.is_child = false
      LEFT JOIN public.contacts ac ON ac.profile_id = ap.id
      LEFT JOIN public.contacts sc ON sc.profile_id = sp.id
    ),
    households AS (
      SELECT
        hb.*,
        (hb.spouse_id IS NOT NULL) AS has_spouse,
        (1 + CASE WHEN hb.spouse_id IS NOT NULL THEN 1 ELSE 0 END + hb.children_count)
          AS member_count,
        CASE
          WHEN hb.spouse_id IS NOT NULL AND hb.children_count > 0 THEN 'complete'
          WHEN hb.spouse_id IS NULL AND hb.children_count > 0 THEN 'incomplete'
          WHEN hb.spouse_id IS NOT NULL AND hb.children_count = 0 THEN 'complete'
          ELSE 'alerts'
        END AS status,
        ('Familia ' || hb.family_surname) AS family_label,
        TRIM(
          BOTH ' '
          FROM CONCAT_WS(
            ' · ',
            NULLIF(TRIM(CONCAT_WS(' ', hb.anchor_first_name, hb.anchor_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', hb.spouse_first_name, hb.spouse_last_name)), '')
          )
        ) AS adults_label
      FROM household_base hb
    ),
    filtered AS (
      SELECT h.*
      FROM households h
      WHERE (
        v_search IS NULL
        OR h.family_label ILIKE '%' || v_search || '%'
        OR h.adults_label ILIKE '%' || v_search || '%'
        OR COALESCE(h.anchor_first_name, '') ILIKE '%' || v_search || '%'
        OR COALESCE(h.anchor_last_name, '') ILIKE '%' || v_search || '%'
        OR COALESCE(h.spouse_first_name, '') ILIKE '%' || v_search || '%'
        OR COALESCE(h.spouse_last_name, '') ILIKE '%' || v_search || '%'
      )
      AND (
        v_filter = 'all'
        OR (v_filter = 'complete' AND h.status = 'complete')
        OR (v_filter = 'incomplete' AND h.status = 'incomplete')
        OR (v_filter = 'adults_only' AND h.has_spouse AND h.children_count = 0)
        OR (v_filter = 'with_ministry_children' AND h.ministry_children_count > 0)
      )
    ),
    page_rows AS (
      SELECT *
      FROM filtered
      ORDER BY family_surname, anchor_last_name, anchor_first_name, anchor_id
      LIMIT v_page_size
      OFFSET v_offset
    ),
    items_json AS (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'familyLabel', f.family_label,
            'anchorProfileId', f.anchor_id,
            'adultsLabel', f.adults_label,
            'anchorFirstName', f.anchor_first_name,
            'anchorLastName', f.anchor_last_name,
            'spouseFirstName', f.spouse_first_name,
            'spouseLastName', f.spouse_last_name,
            'memberCount', f.member_count,
            'childrenCount', f.children_count,
            'ministryChildrenCount', f.ministry_children_count,
            'hasSpouse', f.has_spouse,
            'hasMinistryChildren', f.ministry_children_count > 0,
            'status', f.status,
            'phone', f.phone
          )
          ORDER BY f.family_surname, f.anchor_last_name, f.anchor_first_name, f.anchor_id
        ),
        '[]'::jsonb
      ) AS items
      FROM page_rows f
    ),
    summary_json AS (
      SELECT jsonb_build_object(
        'households', COUNT(*)::integer,
        'complete', COUNT(*) FILTER (WHERE status = 'complete')::integer,
        'incomplete', COUNT(*) FILTER (WHERE status = 'incomplete')::integer,
        'withMinistryChildren', COUNT(*) FILTER (WHERE ministry_children_count > 0)::integer
      ) AS summary
      FROM households
    )
    SELECT jsonb_build_object(
      'success', true,
      'status_code', 200,
      'items', (SELECT items FROM items_json),
      'total', (SELECT COUNT(*)::integer FROM filtered),
      'page', v_page,
      'pageSize', v_page_size,
      'summary', COALESCE(
        (SELECT summary FROM summary_json),
        jsonb_build_object(
          'households', 0,
          'complete', 0,
          'incomplete', 0,
          'withMinistryChildren', 0
        )
      )
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_list_family_households(integer, text, text, integer, integer)
  TO authenticated;
