-- Finanzas: permisos granulares por recurso (funds, transactions, contributions).

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('finances:funds:read', 'finances', 'read', 'Ver fondos'),
  ('finances:funds:write', 'finances', 'write', 'Registrar/editar fondos'),
  ('finances:funds:delete', 'finances', 'delete', 'Eliminar fondos'),
  ('finances:funds:export', 'finances', 'export', 'Exportar fondos'),
  ('finances:transactions:read', 'finances', 'read', 'Ver transacciones'),
  ('finances:transactions:write', 'finances', 'write', 'Registrar transacciones'),
  ('finances:transactions:authorize', 'finances', 'authorize', 'Autorizar egresos/transferencias'),
  ('finances:transactions:delete', 'finances', 'delete', 'Eliminar transacciones'),
  ('finances:transactions:export', 'finances', 'export', 'Exportar transacciones'),
  ('finances:contributions:read', 'finances', 'read', 'Ver contribuciones'),
  ('finances:contributions:write', 'finances', 'write', 'Registrar contribuciones'),
  ('finances:contributions:delete', 'finances', 'delete', 'Eliminar contribuciones'),
  ('finances:contributions:export', 'finances', 'export', 'Exportar contribuciones')
ON CONFLICT (permission_key) DO NOTHING;

-- Migrar asignaciones globales por rol
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY[
  'finances:funds:read',
  'finances:transactions:read',
  'finances:contributions:read',
  'finances:funds:export',
  'finances:transactions:export',
  'finances:contributions:export'
]::text[]) AS k
WHERE arp.permission_key = 'finances:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY[
  'finances:funds:write',
  'finances:transactions:write',
  'finances:contributions:write',
  'finances:funds:delete',
  'finances:transactions:delete',
  'finances:contributions:delete'
]::text[]) AS k
WHERE arp.permission_key = 'finances:write'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, 'finances:transactions:authorize'
FROM public.app_role_permissions arp
WHERE arp.permission_key = 'finances:authorize'
ON CONFLICT DO NOTHING;

-- Migrar overrides por iglesia
INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY[
  'finances:funds:read',
  'finances:transactions:read',
  'finances:contributions:read',
  'finances:funds:export',
  'finances:transactions:export',
  'finances:contributions:export'
]::text[]) AS k
WHERE crp.permission_key = 'finances:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY[
  'finances:funds:write',
  'finances:transactions:write',
  'finances:contributions:write',
  'finances:funds:delete',
  'finances:transactions:delete',
  'finances:contributions:delete'
]::text[]) AS k
WHERE crp.permission_key = 'finances:write'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, 'finances:transactions:authorize'
FROM public.church_role_permissions crp
WHERE crp.permission_key = 'finances:authorize'
ON CONFLICT DO NOTHING;

DELETE FROM public.app_role_permissions
WHERE permission_key IN ('finances:read', 'finances:write', 'finances:authorize');

DELETE FROM public.church_role_permissions
WHERE permission_key IN ('finances:read', 'finances:write', 'finances:authorize');

DELETE FROM public.app_permissions
WHERE permission_key IN ('finances:read', 'finances:write', 'finances:authorize');

CREATE OR REPLACE FUNCTION public.fn_can_authorize_finances(
  p_profile_id uuid,
  p_auth_user_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT
    p_profile_id = public.fn_get_session_profile_id()
    AND p_auth_user_id = auth.uid()
    AND public.fn_get_session_church_id() IS NOT NULL
    AND public.fn_user_has_permission('finances:transactions:authorize');
$$;

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
    'membership_role', m.membership_role,
    'can_authorize_finances', public.fn_user_has_permission('finances:transactions:authorize'),
    'is_active', COALESCE(au.is_active, false),
    'is_verified', COALESCE(au.is_verified, false),
    'is_temp_password', COALESCE(au.is_temp_password, false)
  )
  INTO v_result
  FROM public.auth_users au
  INNER JOIN public.profiles p ON p.id = au.profile_id
  LEFT JOIN public.church ch ON ch.id = p.church_id
  LEFT JOIN public.app_users_role aur ON aur.app_users_role_id = au.app_role_id
  LEFT JOIN LATERAL (
    SELECT m2.membership_role
    FROM public.membership m2
    WHERE m2.profile_id = au.profile_id AND m2.church_id = p.church_id
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

  RETURN v_result || json_build_object('permissions', v_permissions);
END;
$$;
