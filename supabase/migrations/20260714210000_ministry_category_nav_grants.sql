-- P2.x — Ampliar grants de categorías de ministerios.
-- El seed inicial solo copiaba desde income_types:read; roles pastorales
-- a menudo no lo tienen y el ítem no aparece en el sidemenu.

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, 'settings:ministry_categories:read'
FROM public.app_role_permissions arp
WHERE arp.permission_key IN (
  'settings:income_types:read',
  'settings:expense_types:read',
  'settings:church:read',
  'ministerios:write',
  'roles:manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, 'settings:ministry_categories:write'
FROM public.app_role_permissions arp
WHERE arp.permission_key IN (
  'settings:income_types:write',
  'settings:expense_types:write',
  'settings:church:write',
  'ministerios:write',
  'roles:manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, 'settings:ministry_categories:read'
FROM public.church_role_permissions crp
WHERE crp.permission_key IN (
  'settings:income_types:read',
  'settings:expense_types:read',
  'settings:church:read',
  'ministerios:write',
  'roles:manage'
)
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, 'settings:ministry_categories:write'
FROM public.church_role_permissions crp
WHERE crp.permission_key IN (
  'settings:income_types:write',
  'settings:expense_types:write',
  'settings:church:write',
  'ministerios:write',
  'roles:manage'
)
ON CONFLICT DO NOTHING;
