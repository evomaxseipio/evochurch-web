-- Reporte CONCILIO F.001 — permisos granulares read + export.

INSERT INTO public.app_permissions (permission_key, module, action, description) VALUES
  ('reports:financial_monthly_concilio_f001:read', 'reports', 'read', 'Ver informe financiero mensual CONCILIO F.001'),
  ('reports:financial_monthly_concilio_f001:export', 'reports', 'export', 'Exportar informe financiero mensual CONCILIO F.001')
ON CONFLICT (permission_key) DO NOTHING;

-- Tesorero (3) y Pastor (4): acceso al nuevo informe.
INSERT INTO public.app_role_permissions (app_role_id, permission_key)
SELECT role_id, k
FROM unnest(ARRAY[3, 4]) AS role_id
CROSS JOIN unnest(ARRAY[
  'reports:financial_monthly_concilio_f001:read',
  'reports:financial_monthly_concilio_f001:export'
]::text[]) AS k
ON CONFLICT DO NOTHING;
