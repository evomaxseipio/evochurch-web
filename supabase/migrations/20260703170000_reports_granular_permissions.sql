-- Reportes: permisos granulares por informe (read + export), como finanzas por recurso.

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('reports:financial_monthly_cead:read', 'reports', 'read', 'Ver informe financiero mensual CEAD'),
  ('reports:financial_monthly_cead:export', 'reports', 'export', 'Exportar informe financiero mensual CEAD'),
  ('reports:membership_directory:read', 'reports', 'read', 'Ver directorio de miembros'),
  ('reports:membership_directory:export', 'reports', 'export', 'Exportar directorio de miembros'),
  ('reports:membership_annual_cead:read', 'reports', 'read', 'Ver informe estadístico anual CEAD'),
  ('reports:membership_annual_cead:export', 'reports', 'export', 'Exportar informe estadístico anual CEAD'),
  ('reports:executive_monthly_summary:read', 'reports', 'read', 'Ver resumen ejecutivo mensual'),
  ('reports:executive_monthly_summary:export', 'reports', 'export', 'Exportar resumen ejecutivo mensual'),
  ('reports:financial_income_expense:read', 'reports', 'read', 'Ver estado de resultados'),
  ('reports:financial_income_expense:export', 'reports', 'export', 'Exportar estado de resultados'),
  ('reports:financial_by_fund:read', 'reports', 'read', 'Ver movimiento por fondo'),
  ('reports:financial_by_fund:export', 'reports', 'export', 'Exportar movimiento por fondo'),
  ('reports:financial_by_member:read', 'reports', 'read', 'Ver contribuciones por miembro'),
  ('reports:financial_by_member:export', 'reports', 'export', 'Exportar contribuciones por miembro')
ON CONFLICT (permission_key) DO NOTHING;

-- Secretario (2): solo reportes de membresía.
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT 2, k
FROM unnest(ARRAY[
  'reports:membership_directory:read',
  'reports:membership_directory:export',
  'reports:membership_annual_cead:read',
  'reports:membership_annual_cead:export'
]::text[]) AS k
ON CONFLICT DO NOTHING;

-- Tesorero (3) y Pastor (4): todos los reportes.
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT role_id, k
FROM unnest(ARRAY[3, 4]) AS role_id
CROSS JOIN unnest(ARRAY[
  'reports:financial_monthly_cead:read',
  'reports:financial_monthly_cead:export',
  'reports:membership_directory:read',
  'reports:membership_directory:export',
  'reports:membership_annual_cead:read',
  'reports:membership_annual_cead:export',
  'reports:executive_monthly_summary:read',
  'reports:executive_monthly_summary:export',
  'reports:financial_income_expense:read',
  'reports:financial_income_expense:export',
  'reports:financial_by_fund:read',
  'reports:financial_by_fund:export',
  'reports:financial_by_member:read',
  'reports:financial_by_member:export'
]::text[]) AS k
ON CONFLICT DO NOTHING;

-- Migrar permisos globales legacy → granulares por rol.
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY[
  'reports:membership_directory:read',
  'reports:membership_directory:export',
  'reports:membership_annual_cead:read',
  'reports:membership_annual_cead:export'
]::text[]) AS k
WHERE arp.app_role_id = 2
  AND arp.permission_key IN ('reports:read', 'reports:export')
ON CONFLICT DO NOTHING;

INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT arp.app_role_id, k
FROM public.app_role_permissions arp
CROSS JOIN unnest(ARRAY[
  'reports:financial_monthly_cead:read',
  'reports:financial_monthly_cead:export',
  'reports:membership_directory:read',
  'reports:membership_directory:export',
  'reports:membership_annual_cead:read',
  'reports:membership_annual_cead:export',
  'reports:executive_monthly_summary:read',
  'reports:executive_monthly_summary:export',
  'reports:financial_income_expense:read',
  'reports:financial_income_expense:export',
  'reports:financial_by_fund:read',
  'reports:financial_by_fund:export',
  'reports:financial_by_member:read',
  'reports:financial_by_member:export'
]::text[]) AS k
WHERE arp.app_role_id IN (3, 4)
  AND arp.permission_key IN ('reports:read', 'reports:export')
ON CONFLICT DO NOTHING;

-- Overrides por iglesia (misma lógica por rol).
INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY[
  'reports:membership_directory:read',
  'reports:membership_directory:export',
  'reports:membership_annual_cead:read',
  'reports:membership_annual_cead:export'
]::text[]) AS k
WHERE crp.app_role_id = 2
  AND crp.permission_key IN ('reports:read', 'reports:export')
ON CONFLICT DO NOTHING;

INSERT INTO public.church_role_permissions (church_id, app_role_id, permission_key)
SELECT crp.church_id, crp.app_role_id, k
FROM public.church_role_permissions crp
CROSS JOIN unnest(ARRAY[
  'reports:financial_monthly_cead:read',
  'reports:financial_monthly_cead:export',
  'reports:membership_directory:read',
  'reports:membership_directory:export',
  'reports:membership_annual_cead:read',
  'reports:membership_annual_cead:export',
  'reports:executive_monthly_summary:read',
  'reports:executive_monthly_summary:export',
  'reports:financial_income_expense:read',
  'reports:financial_income_expense:export',
  'reports:financial_by_fund:read',
  'reports:financial_by_fund:export',
  'reports:financial_by_member:read',
  'reports:financial_by_member:export'
]::text[]) AS k
WHERE crp.app_role_id IN (3, 4)
  AND crp.permission_key IN ('reports:read', 'reports:export')
ON CONFLICT DO NOTHING;

DELETE FROM public.church_role_permissions
WHERE permission_key IN ('reports:read', 'reports:export');

DELETE FROM public.app_role_permissions
WHERE permission_key IN ('reports:read', 'reports:export');

DELETE FROM public.app_permissions
WHERE permission_key IN ('reports:read', 'reports:export');
