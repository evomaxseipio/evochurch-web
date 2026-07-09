# Modules — EvoChurch

Documentación funcional de módulos activos. Para arquitectura general ver [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md).

**Convención:** cada módulo lista propósito, entidades, RPCs/servicios, permisos, pantallas y notas de integración.

---

## Auth y sesión

**Propósito:** Autenticación Supabase + sesión multitenant de negocio.

| Aspecto | Detalle |
|---------|---------|
| RPC | `sp_get_session_context`, `sp_sync_my_app_metadata` |
| Web | `src/lib/auth/app-session.ts`, middleware |
| Flutter | `features/auth/` — `authProvider` |
| Permisos | N/A — prerequisito de todo |

**Flujo:** Login → `auth.uid()` → RPC sesión → `churchId`, `profileId`, `permissions[]`.

---

## Miembros (Personas)

**Propósito:** Ciclo de vida del miembro — perfil, contacto, membresía, finanzas individuales.

| Aspecto | Detalle |
|---------|---------|
| Entidades | `profiles`, `membership`, contacto/dirección embebidos |
| RPC | `spgetprofiles`, `sp_get_profile_by_id`, `spinsertprofiles`, `spupdateprofiles`, `spmaintancemembership` |
| Servicio web | `src/lib/services/members.ts` |
| Flutter | `features/members/` |
| Rutas web | `/members`, `/members/profile` |

**Permisos:** `members:read`, `members:write`, `members:delete`

**Conceptos:**
- `is_member` — miembro vs visita
- `is_active` — activo vs inactivo (Sprint 01)
- Rol eclesiástico en `membership` vs rol operativo en `auth_users`

**Riesgos Flutter:** `selectedMember` vs `extra` en navegación — ver `uploads/CONTEXT.md`.

---

## Finanzas — Fondos

**Propósito:** Fondos de la iglesia (General, Misiones, etc.) con meta y fondo primario.

| Aspecto | Detalle |
|---------|---------|
| Entidades | `funds` |
| RPC | `spgetfunds`, `sp_maintance_funds`, `sp_delete_fund`, `sp_change_primary_fund` |
| Servicio | `src/lib/services/funds.ts` |
| Rutas | `/finances/funds` |

**Permisos:** `finances:funds:read|write|delete|export`

**Reglas:** Un fondo primario por iglesia; ministerio puede tener `default_fund_id`.

---

## Finanzas — Transacciones

**Propósito:** Egresos/gastos por fondo con flujo de autorización.

| Aspecto | Detalle |
|---------|---------|
| Entidades | `transactions`, tipos de gasto |
| RPC | `fn_create_transaction`, `sp_authorize_transaction`, `spgetexpensestypes` |
| Servicio | `src/lib/services/transactions.ts`, `ledger.ts` |
| Rutas | `/finances/transactions` |

**Permisos:** `finances:transactions:read|write|authorize|delete|export`

**Estados:** `PENDING` → `APPROVED` (requiere `finances:transactions:authorize`).

---

## Finanzas — Contribuciones

**Propósito:** Ingresos — diezmos, ofrendas, donaciones (individual/colectivo).

| Aspecto | Detalle |
|---------|---------|
| Entidades | `income_entries`, `income_contributors` |
| RPC | `sp_get_income_entries`, `sp_get_collection_by_member` |
| Servicio | `src/lib/services/contributions.ts` |
| Rutas | `/finances/contributions` |

**Permisos:** `finances:contributions:read|write|delete|export`

**Regla:** `recorded_by` → `auth.users.id`, no `profile_id` salvo coincidencia.

---

## Finanzas — Transferencias entre fondos

**Propósito:** Mover saldo entre fondos con autorización.

| Entidades | `fund_transfers` |
| RPC | `sp_create_fund_transfer`, `sp_authorize_fund_transfer`, `sp_reject_fund_transfer` |
| Servicio | `src/lib/services/fund-transfers.ts` |

---

## Dashboard

**Propósito:** Vista ejecutiva — KPIs, gráficos, transacciones pendientes.

| RPC | `sp_get_dashboard_summary` |
| Servicio | `src/lib/services/dashboard.ts` |
| Ruta | `/dashboard` |

**Permisos:** `dashboard:read` + permisos financieros granulares para widgets.

**Sprint 01:** Montos completos — ver `sprints/sprint-01/TASK-002.md`.

---

## Ministerios

**Propósito:** Gestión de ministerios con líderes, miembros y fondo opcional.

| Entidades | `church_ministries` |
| Acceso | PostgREST directo + RLS (no solo RPC) |
| Servicio | `src/lib/services/ministries.ts` |
| Ruta | `/ministerios` |

**Permisos:** `ministerios:read`, `ministerios:write`, `ministerios:write_own` (ABAC por líder).

---

## Eventos

**Propósito:** Calendario de eventos con visibilidad web y vínculo a ministerio.

| Entidades | `church_events` |
| RPC | `sp_get_events`, `sp_maintain_event`, `sp_delete_event` |
| Servicio | `src/lib/services/events.ts` |
| Ruta | `/eventos` |

**Permisos:** `eventos:read|write|write_own|delete`

---

## Comunicación

**Propósito:** Módulo de comunicaciones institucionales.

| Ruta | `/comunicacion` |
| Permisos | `comunicacion:read|write|delete` |

---

## Reportes

**Propósito:** Generación y export de reportes regulatorios y operativos.

| Generadores | `src/lib/reports/generators/*` |
| Formatos | PDF, XLSX |
| Ruta | `/reports` |

**Reportes clave:**
- CEAD mensual financiero
- Concilio F001
- Directorio de membresía
- Resumen ejecutivo mensual

**Permisos:** `reports:<id>:read|export` por cada reporte.

---

## Configuración — Iglesia

**Propósito:** Perfil institucional, branding, logo.

| RPC | `sp_get_church_profile`, `sp_update_church_profile`, `sp_confirm_church_logo` |
| Servicio | `src/lib/services/church-profile.ts` |
| Ruta | `/settings/church` |

**Permisos:** `settings:church:read|write`

---

## Configuración — Usuarios admin

**Propósito:** Usuarios con acceso al sistema, roles, contraseñas temporales.

| RPC | `sp_list_church_auth_users`, `sp_register_church_auth_user`, `sp_reset_church_auth_user_password`, … |
| Servicio | `src/lib/services/admin-users.ts` |
| Ruta | `/settings/users` |

**Permisos:** `admin_users:manage`

---

## Configuración — Roles

**Propósito:** Roles custom por iglesia con permisos RBAC.

| RPC | `sp_create_church_role`, `sp_set_church_role_permissions`, `sp_deactivate_church_role` |
| Servicio | `src/lib/services/roles.ts` |
| Ruta | `/settings/roles` |

**Permisos:** `roles:manage`

---

## Configuración — Catálogos

**Tipos de ingreso y gasto** — catálogos por iglesia.

| Rutas | `/settings/income-types`, `/settings/expenses` |
| Permisos | `settings:income_types:*`, `settings:expense_types:*` |

---

## Red de iglesias (Network)

**Propósito:** Headquarters con campus — dashboard de red.

| RPC | `sp_get_network_dashboard`, `sp_list_network_churches` |
| Servicio | `src/lib/services/church-network.ts` |
| Ruta | `/network` |

**Permisos:** `network:churches:read`

---

## Org Portal (Enterprise)

**Propósito:** Portal para organizaciones con múltiples iglesias (concilios, reportes consolidados).

| Entidades | `organization`, `org_unit`, `org_submitted_report`, `org_api_key` |
| Servicio | `src/lib/services/org-portal.ts` |
| Host | Subdominio org — `src/lib/org/host.ts` |

---

## Auditoría

**Propósito:** Log de operaciones admin y financieras.

| Entidades | `church_audit_log` |
| RPC | `sp_list_church_audit_log` |
| Permisos | `audit:read|export` |

---

## Módulos planificados (no implementados)

| Módulo | EPIC | Dependencia |
|--------|------|-------------|
| Attendance Engine | 03 | Motor genérico primero |
| CRM Pastoral (timeline, notas) | 05 | Personas estable |
| Automatización / alertas | 07 | — |
| IA / asistente | 08 | Datos limpios |

Ver [../product/PRODUCT_ROADMAP.md](../product/PRODUCT_ROADMAP.md).

---

## Matriz módulo → permiso (resumen)

| Módulo | Permiso lectura mínimo |
|--------|------------------------|
| Dashboard | `dashboard:read` |
| Miembros | `members:read` |
| Fondos | `finances:funds:read` |
| Transacciones | `finances:transactions:read` |
| Contribuciones | `finances:contributions:read` |
| Ministerios | `ministerios:read` |
| Eventos | `eventos:read` |
| Reportes | `reports:*:read` (por reporte) |
| Settings | `settings:read` |

---

## Documentos relacionados

- [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- [MULTI_TENANT.md](MULTI_TENANT.md)
- [../product/AI_BUSINESS_RULES.md](../product/AI_BUSINESS_RULES.md)
