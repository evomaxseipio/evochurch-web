-- Eventos y Comunicación: permisos dedicados (reemplazan placeholder dashboard:read).

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('eventos:read', 'eventos', 'read', 'Ver calendario y eventos'),
  ('eventos:write', 'eventos', 'write', 'Crear y editar eventos'),
  ('eventos:delete', 'eventos', 'delete', 'Eliminar eventos'),
  ('comunicacion:read', 'comunicacion', 'read', 'Ver anuncios y mensajes'),
  ('comunicacion:write', 'comunicacion', 'write', 'Publicar anuncios y mensajes'),
  ('comunicacion:delete', 'comunicacion', 'delete', 'Eliminar anuncios y mensajes')
ON CONFLICT (permission_key) DO NOTHING;

-- Defaults globales: quien tenía dashboard:read recibe lectura; write/delete alineados con miembros.
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY['eventos:read', 'comunicacion:read']::text[]) AS k
WHERE arp.permission_key = 'dashboard:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY['eventos:write', 'comunicacion:write']::text[]) AS k
WHERE arp.permission_key = 'members:write'
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT DISTINCT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY['eventos:delete', 'comunicacion:delete']::text[]) AS k
WHERE arp.permission_key = 'members:delete'
ON CONFLICT DO NOTHING;

-- Overrides por iglesia
INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY['eventos:read', 'comunicacion:read']::text[]) AS k
WHERE crp.permission_key = 'dashboard:read'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY['eventos:write', 'comunicacion:write']::text[]) AS k
WHERE crp.permission_key = 'members:write'
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY['eventos:delete', 'comunicacion:delete']::text[]) AS k
WHERE crp.permission_key = 'members:delete'
ON CONFLICT DO NOTHING;
