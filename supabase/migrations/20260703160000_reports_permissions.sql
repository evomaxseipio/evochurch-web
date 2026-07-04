-- Reportes: permisos de lectura (hub) y exportación (PDF/XLSX).

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('reports:read', 'reports', 'read', 'Ver hub de reportes'),
  ('reports:export', 'reports', 'export', 'Descargar reportes PDF/XLSX')
ON CONFLICT (permission_key) DO NOTHING;

-- Admin (1) recibe todos los permisos vía fn_user_permissions_for.

-- Secretario (2), Tesorero (3), Pastor (4): read + export.
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT role_id, k
FROM unnest(ARRAY[2, 3, 4]) AS role_id
CROSS JOIN unnest(ARRAY['reports:read', 'reports:export']::text[]) AS k
ON CONFLICT DO NOTHING;

-- Propagar a overrides por iglesia existentes para esos roles.
INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT DISTINCT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY['reports:read', 'reports:export']::text[]) AS k
WHERE crp.app_role_id IN (2, 3, 4)
ON CONFLICT DO NOTHING;
