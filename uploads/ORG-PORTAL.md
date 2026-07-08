# Portal concilio (Fase 3) — Flutter / clientes

## RPCs compartidos (misma BD que la consola web)

| RPC | Uso |
|-----|-----|
| `sp_get_org_session_context()` | Sesión auditor concilio (`auth.uid()` + `org_membership`) |
| `sp_list_org_churches(p_org_id, p_unit_id?)` | Directorio iglesias afiliadas |
| `sp_get_org_dashboard(p_org_id)` | KPIs + últimos envíos |
| `sp_list_org_submitted_reports(p_org_id, …)` | Bandeja F.001 |
| `sp_submit_concilio_report(p_church_id, p_period_year, p_period_month, p_payload)` | Iglesia envía reporte |
| `sp_get_church_org_report_rules(p_church_id)` | Reglas CEAD/F.001 del concilio |
| `sp_provision_church_under_org(p_org_id, p_payload)` | Alta iglesia bajo org (admin concilio) |

## Permisos org (`org_role_permissions`)

Roles: `council_admin`, `district_auditor`, `org_viewer`.

No reutilizar `fn_user_has_permission` de iglesia — usar permisos devueltos en `sp_get_org_session_context`.

## Host portal web

- Prefijos: `concilio.*`, `org.*` (env `ORG_PORTAL_HOST_PREFIXES`)
- Rutas Next.js: `/org/login`, `/org/dashboard`, `/org/churches`, `/org/reports`

Flutter puede implementar las mismas pantallas llamando los RPCs anteriores; no requiere route group `(org)` del host web.

## `organization.report_rules` (JSON)

```json
{
  "cead": {
    "church_tithe_percent": 10,
    "ibcr_percent": 3,
    "christian_education_percent": 1,
    "fpj_percent": 1
  },
  "f001": {
    "council_header": "Concilio … dirección"
  }
}
```

La consola web aplica estas reglas al generar CEAD y F.001 cuando `church.organization_id` está definido.
