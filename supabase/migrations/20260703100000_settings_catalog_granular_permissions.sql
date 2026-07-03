-- Catálogos de configuración: permisos granulares por tipo (gasto / ingreso).

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('settings:expense_types:read', 'settings', 'read', 'Ver tipos de gasto'),
  ('settings:expense_types:write', 'settings', 'write', 'Crear y editar tipos de gasto'),
  ('settings:expense_types:delete', 'settings', 'delete', 'Eliminar tipos de gasto'),
  ('settings:income_types:read', 'settings', 'read', 'Ver tipos de ingreso'),
  ('settings:income_types:write', 'settings', 'write', 'Crear y editar tipos de ingreso'),
  ('settings:income_types:delete', 'settings', 'delete', 'Eliminar tipos de ingreso')
ON CONFLICT (permission_key) DO NOTHING;

-- Migrar settings:catalogs → ambos catálogos (read + write + delete)
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY[
  'settings:expense_types:read',
  'settings:expense_types:write',
  'settings:expense_types:delete',
  'settings:income_types:read',
  'settings:income_types:write',
  'settings:income_types:delete'
]::text[]) AS k
WHERE arp.permission_key = 'settings:catalogs'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY[
  'settings:expense_types:read',
  'settings:expense_types:write',
  'settings:expense_types:delete',
  'settings:income_types:read',
  'settings:income_types:write',
  'settings:income_types:delete'
]::text[]) AS k
WHERE crp.permission_key = 'settings:catalogs'
ON CONFLICT DO NOTHING;

DELETE FROM public.app_role_permissions
WHERE permission_key = 'settings:catalogs';

DELETE FROM public.church_role_permissions
WHERE permission_key = 'settings:catalogs';

DELETE FROM public.app_permissions
WHERE permission_key = 'settings:catalogs';
