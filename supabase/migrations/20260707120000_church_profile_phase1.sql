-- Fase 1 — Perfil de iglesia: columnas, permisos, RPCs, storage, session branding.

-- ---------------------------------------------------------------------------
-- CP-1: schema church + slug backfill
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_slugify_church_slug(p_name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v text;
BEGIN
  v := lower(trim(COALESCE(p_name, '')));
  v := translate(v, 'áàäâãéèëêíìïîóòöôõúùüûñç', 'aaaaaeeeeiiiiooooouuuunc');
  v := regexp_replace(v, '[^a-z0-9]+', '-', 'g');
  v := trim(both '-' from v);
  IF v = '' THEN
    RETURN 'iglesia';
  END IF;
  RETURN left(v, 80);
END;
$$;

ALTER TABLE public.church
  ADD COLUMN IF NOT EXISTS short_name text,
  ADD COLUMN IF NOT EXISTS legal_name text,
  ADD COLUMN IF NOT EXISTS slug text,
  ADD COLUMN IF NOT EXISTS address_line1 text,
  ADD COLUMN IF NOT EXISTS address_line2 text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state_province text,
  ADD COLUMN IF NOT EXISTS country_code char(2) DEFAULT 'DO',
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS primary_color char(7) NOT NULL DEFAULT '#5B21B6',
  ADD COLUMN IF NOT EXISTS secondary_color char(7) NOT NULL DEFAULT '#4C1D95',
  ADD COLUMN IF NOT EXISTS accent_color char(7) NOT NULL DEFAULT '#1E0A4C',
  ADD COLUMN IF NOT EXISTS external_code text,
  ADD COLUMN IF NOT EXISTS presbytery_name text,
  ADD COLUMN IF NOT EXISTS default_locale text NOT NULL DEFAULT 'es',
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by_profile_id uuid REFERENCES public.profiles(id);

ALTER TABLE public.church
  DROP CONSTRAINT IF EXISTS church_primary_color_check;

ALTER TABLE public.church
  ADD CONSTRAINT church_primary_color_check
  CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.church
  DROP CONSTRAINT IF EXISTS church_secondary_color_check;

ALTER TABLE public.church
  ADD CONSTRAINT church_secondary_color_check
  CHECK (secondary_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.church
  DROP CONSTRAINT IF EXISTS church_accent_color_check;

ALTER TABLE public.church
  ADD CONSTRAINT church_accent_color_check
  CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$');

ALTER TABLE public.church
  DROP CONSTRAINT IF EXISTS church_default_locale_check;

ALTER TABLE public.church
  ADD CONSTRAINT church_default_locale_check
  CHECK (default_locale IN ('es', 'en', 'fr'));

-- Backfill slug from name (unique suffix on collision)
DO $backfill$
DECLARE
  r record;
  v_base text;
  v_slug text;
  v_suffix integer;
BEGIN
  FOR r IN SELECT c.id, c.name FROM public.church c WHERE c.slug IS NULL OR trim(c.slug) = '' LOOP
    v_base := public.fn_slugify_church_slug(r.name);
    v_slug := v_base;
    v_suffix := 2;
    WHILE EXISTS (
      SELECT 1 FROM public.church c2
      WHERE c2.slug = v_slug AND c2.id <> r.id
    ) LOOP
      v_slug := v_base || '-' || v_suffix::text;
      v_suffix := v_suffix + 1;
    END LOOP;
    UPDATE public.church SET slug = v_slug WHERE id = r.id;
  END LOOP;
END;
$backfill$;

ALTER TABLE public.church
  ALTER COLUMN slug SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_church_slug_unique ON public.church (slug);

-- ---------------------------------------------------------------------------
-- CP-2: permissions
-- ---------------------------------------------------------------------------

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('settings:church:read', 'settings', 'read', 'Ver perfil de iglesia'),
  ('settings:church:write', 'settings', 'write', 'Editar perfil de iglesia')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 1, k FROM unnest(ARRAY['settings:church:read', 'settings:church:write']::text[]) AS k
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 4, k FROM unnest(ARRAY['settings:church:read', 'settings:church:write']::text[]) AS k
ON CONFLICT DO NOTHING;

-- Secretario/Tesorero: read only
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 2, 'settings:church:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 3, 'settings:church:read'
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- CP-3: helpers + RPCs
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.fn_church_profile_row(p_church_id integer)
RETURNS json
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT row_to_json(r)
  FROM (
    SELECT
      ch.id,
      ch.name,
      ch.short_name,
      ch.legal_name,
      ch.slug,
      ch.address_line1,
      ch.address_line2,
      ch.city,
      ch.state_province,
      ch.country_code,
      ch.postal_code,
      ch.phone,
      ch.email,
      ch.website_url,
      ch.logo_url,
      ch.primary_color,
      ch.secondary_color,
      ch.accent_color,
      ch.external_code,
      ch.presbytery_name,
      ch.timezone,
      ch.default_locale,
      ch.updated_at,
      ch.updated_by_profile_id
    FROM public.church ch
    WHERE ch.id = p_church_id
  ) r;
$$;

CREATE OR REPLACE FUNCTION public.fn_sync_church_auth_metadata(p_church_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT au.id
    FROM public.auth_users au
    INNER JOIN public.profiles p ON p.id = au.profile_id
    WHERE p.church_id = p_church_id
      AND COALESCE(au.is_active, true) = true
  LOOP
    PERFORM public.fn_sync_auth_app_metadata(r.id);
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_church_profile(p_church_id integer)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('settings:church:read');

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'profile', public.fn_church_profile_row(p_church_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_get_public_church_profile(p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_slug text := lower(trim(COALESCE(p_slug, '')));
  v_row json;
BEGIN
  IF v_slug = '' OR v_slug !~ '^[a-z0-9-]+$' THEN
    RETURN json_build_object('success', false, 'status_code', 400, 'message', 'slug inválido');
  END IF;

  SELECT row_to_json(r)
  INTO v_row
  FROM (
    SELECT
      ch.slug,
      ch.name,
      ch.short_name,
      ch.logo_url,
      ch.primary_color,
      ch.secondary_color,
      ch.accent_color,
      ch.city,
      ch.state_province,
      ch.country_code,
      ch.website_url
    FROM public.church ch
    WHERE ch.slug = v_slug
    LIMIT 1
  ) r;

  IF v_row IS NULL THEN
    RETURN json_build_object('success', false, 'status_code', 404, 'message', 'iglesia no encontrada');
  END IF;

  RETURN json_build_object('success', true, 'status_code', 200, 'profile', v_row);
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_update_church_profile(
  p_church_id integer,
  p_payload jsonb
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_profile_id uuid;
  v_slug text;
  v_primary text;
  v_secondary text;
  v_accent text;
  v_locale text;
  v_name text;
  v_old_name text;
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('settings:church:write');

  SELECT au.profile_id INTO v_profile_id
  FROM public.auth_users au
  WHERE au.id = v_uid
  LIMIT 1;

  v_slug := lower(trim(COALESCE(p_payload->>'slug', '')));
  IF v_slug = '' OR v_slug !~ '^[a-z0-9-]+$' THEN
    RAISE EXCEPTION 'El slug debe usar solo letras minúsculas, números y guiones.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.church c
    WHERE c.slug = v_slug AND c.id <> p_church_id
  ) THEN
    RAISE EXCEPTION 'El slug ya está en uso por otra iglesia.';
  END IF;

  v_primary := COALESCE(NULLIF(trim(p_payload->>'primary_color'), ''), '#5B21B6');
  v_secondary := COALESCE(NULLIF(trim(p_payload->>'secondary_color'), ''), '#4C1D95');
  v_accent := COALESCE(NULLIF(trim(p_payload->>'accent_color'), ''), '#1E0A4C');

  IF v_primary !~ '^#[0-9A-Fa-f]{6}$'
     OR v_secondary !~ '^#[0-9A-Fa-f]{6}$'
     OR v_accent !~ '^#[0-9A-Fa-f]{6}$' THEN
    RAISE EXCEPTION 'Los colores deben ser hex válidos (#RRGGBB).';
  END IF;

  v_locale := COALESCE(NULLIF(trim(p_payload->>'default_locale'), ''), 'es');
  IF v_locale NOT IN ('es', 'en', 'fr') THEN
    RAISE EXCEPTION 'Idioma predeterminado inválido.';
  END IF;

  v_name := NULLIF(trim(COALESCE(p_payload->>'name', '')), '');
  IF v_name IS NULL THEN
    RAISE EXCEPTION 'El nombre de la iglesia es obligatorio.';
  END IF;

  SELECT ch.name INTO v_old_name FROM public.church ch WHERE ch.id = p_church_id;

  UPDATE public.church
  SET
    name = v_name,
    short_name = NULLIF(trim(COALESCE(p_payload->>'short_name', '')), ''),
    legal_name = NULLIF(trim(COALESCE(p_payload->>'legal_name', '')), ''),
    slug = v_slug,
    address_line1 = NULLIF(trim(COALESCE(p_payload->>'address_line1', '')), ''),
    address_line2 = NULLIF(trim(COALESCE(p_payload->>'address_line2', '')), ''),
    city = NULLIF(trim(COALESCE(p_payload->>'city', '')), ''),
    state_province = NULLIF(trim(COALESCE(p_payload->>'state_province', '')), ''),
    country_code = COALESCE(NULLIF(upper(trim(COALESCE(p_payload->>'country_code', ''))), ''), 'DO'),
    postal_code = NULLIF(trim(COALESCE(p_payload->>'postal_code', '')), ''),
    phone = NULLIF(trim(COALESCE(p_payload->>'phone', '')), ''),
    email = NULLIF(trim(COALESCE(p_payload->>'email', '')), ''),
    website_url = NULLIF(trim(COALESCE(p_payload->>'website_url', '')), ''),
    logo_url = COALESCE(
      NULLIF(trim(COALESCE(p_payload->>'logo_url', '')), ''),
      logo_url
    ),
    primary_color = v_primary,
    secondary_color = v_secondary,
    accent_color = v_accent,
    external_code = NULLIF(trim(COALESCE(p_payload->>'external_code', '')), ''),
    presbytery_name = NULLIF(trim(COALESCE(p_payload->>'presbytery_name', '')), ''),
    timezone = COALESCE(
      NULLIF(trim(COALESCE(p_payload->>'timezone', '')), ''),
      timezone
    ),
    default_locale = v_locale,
    updated_at = now(),
    updated_by_profile_id = v_profile_id
  WHERE id = p_church_id;

  IF v_old_name IS DISTINCT FROM v_name THEN
    PERFORM public.fn_sync_church_auth_metadata(p_church_id);
  END IF;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'settings',
    'update',
    'church_profile',
    p_church_id::text,
    'Actualizó perfil de iglesia',
    'actions.settings.church_profile.update',
    jsonb_build_object('name', v_name, 'slug', v_slug)
  );

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'profile', public.fn_church_profile_row(p_church_id)
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.sp_confirm_church_logo(
  p_church_id integer,
  p_storage_path text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_path text := trim(COALESCE(p_storage_path, ''));
  v_expected_prefix text := p_church_id::text || '/';
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  PERFORM public.fn_assert_permission('settings:church:write');

  IF v_path = '' OR position(v_expected_prefix in v_path) <> 1 THEN
    RAISE EXCEPTION 'Ruta de logo inválida para esta iglesia.';
  END IF;

  IF v_path !~ ('^' || p_church_id::text || '/logo\\.[a-zA-Z0-9]+$') THEN
    RAISE EXCEPTION 'El archivo debe llamarse logo con extensión válida.';
  END IF;

  UPDATE public.church
  SET
    logo_url = v_path,
    updated_at = now(),
    updated_by_profile_id = (
      SELECT au.profile_id FROM public.auth_users au WHERE au.id = auth.uid() LIMIT 1
    )
  WHERE id = p_church_id;

  PERFORM public.fn_append_church_audit_log(
    p_church_id,
    'settings',
    'update',
    'church_profile',
    p_church_id::text,
    'Actualizó logo de iglesia',
    'actions.settings.church_profile.logo',
    jsonb_build_object('logo_url', v_path)
  );

  RETURN json_build_object(
    'success', true,
    'status_code', 200,
    'logo_url', v_path
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'status_code', 500,
      'message', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_get_church_profile(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_update_church_profile(integer, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_get_public_church_profile(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sp_confirm_church_logo(integer, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_church_profile_row(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_sync_church_auth_metadata(integer) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- CP-4: storage bucket church-assets
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'church-assets',
  'church-assets',
  false,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY church_assets_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1] = public.fn_get_session_church_id()::text
    AND public.fn_user_has_permission('settings:church:read')
  );

CREATE POLICY church_assets_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1] = public.fn_get_session_church_id()::text
    AND public.fn_user_has_permission('settings:church:write')
    AND name ~ ('^' || public.fn_get_session_church_id()::text || '/logo\\.[a-zA-Z0-9]+$')
  );

CREATE POLICY church_assets_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1] = public.fn_get_session_church_id()::text
    AND public.fn_user_has_permission('settings:church:write')
  )
  WITH CHECK (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1] = public.fn_get_session_church_id()::text
    AND public.fn_user_has_permission('settings:church:write')
  );

CREATE POLICY church_assets_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'church-assets'
    AND (storage.foldername(name))[1] = public.fn_get_session_church_id()::text
    AND public.fn_user_has_permission('settings:church:write')
  );

-- ---------------------------------------------------------------------------
-- CP-5: extend sp_get_session_context with church_branding
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sp_get_session_context()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_result json;
  v_church_id integer;
  v_app_role_id integer;
  v_permissions json;
  v_branding json;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT json_build_object(
    'auth_user_id', au.id,
    'profile_id', au.profile_id,
    'email', COALESCE(au.email, ''),
    'church_id', p.church_id,
    'full_name', NULLIF(
      TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))),
      ''
    ),
    'church_name', ch.name,
    'app_role_id', au.app_role_id,
    'app_role_name', aur.app_users_role_name,
    'membership_role_id', m.member_role_id,
    'membership_role', m.role_name,
    'can_authorize_finances', public.fn_user_has_permission('finances:transactions:authorize'),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false),
    'is_temp_password', COALESCE(au.is_temp_password, false),
    'preferred_locale', COALESCE(au.preferred_locale, 'es')
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.member_role_id, mr.role_name
    FROM public.membership m2
    INNER JOIN public.member_roles mr ON mr.id = m2.member_role_id
    WHERE m2.profile_id = au.profile_id
      AND m2.church_id = p.church_id
    ORDER BY m2.updated_at DESC NULLS LAST, m2.id DESC
    LIMIT 1
  ) m ON true
  WHERE au.id = v_uid
    AND COALESCE(au.is_active, true) = true
    AND p.church_id IS NOT NULL;

  IF v_result IS NULL THEN
    RETURN NULL;
  END IF;

  v_church_id := (v_result->>'church_id')::integer;
  v_app_role_id := NULLIF(v_result->>'app_role_id', '')::integer;

  SELECT COALESCE(
    to_json(
      public.fn_user_permissions_for(v_church_id, v_app_role_id)
    ),
    '[]'::json
  )
  INTO v_permissions;

  SELECT json_build_object(
    'short_name', ch.short_name,
    'logo_url', ch.logo_url,
    'primary_color', ch.primary_color,
    'secondary_color', ch.secondary_color,
    'accent_color', ch.accent_color
  )
  INTO v_branding
  FROM public.church ch
  WHERE ch.id = v_church_id;

  RETURN (
    v_result::jsonb
    || jsonb_build_object('permissions', v_permissions)
    || jsonb_build_object('church_branding', COALESCE(v_branding, '{}'::json))
  )::json;
END;
$$;

NOTIFY pgrst, 'reload schema';
