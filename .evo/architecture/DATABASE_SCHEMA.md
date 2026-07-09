# Database Schema — EvoChurch

Referencia de tablas, relaciones y RPC principales. **No es un dump completo** — cubre entidades operativas críticas.

Migraciones: `supabase/migrations/`  
Servicios web: `src/lib/services/`

---

## Diagrama de entidades core

```
church (tenant)
  ├── profiles ──────────────┬── membership ── member_roles (catálogo)
  │                          └── contact / address (en profile o relacionado)
  ├── auth_users ────────── app_users_role ── app_role_permissions
  │         │                      └── church_role_permissions (custom)
  │         └── FK → auth.users (Supabase Auth)
  ├── funds ───────────────── transactions
  │         │                      └── expense_types
  │         └── fund_transfers
  ├── income_entries ──────── income_contributors
  ├── church_ministries
  ├── church_events
  ├── church_audit_log
  └── scripture_verses (dashboard)

organization (enterprise)
  ├── org_unit
  ├── org_membership
  ├── org_submitted_report
  └── org_api_key
```

---

## Tablas por dominio

### Tenant e iglesia

| Tabla | PK | Tenant key | Descripción |
|-------|-----|------------|-------------|
| `church` | `id` (int) | — | Raíz del tenant |
| `profiles` | `id` (uuid) | `church_id` | Persona / miembro |
| `auth_users` | `id` (uuid) | vía `profile.church_id` | Usuario de app |
| `membership` | — | `church_id`, `profile_id` | Rol eclesiástico e historial |

**Campos clave `profiles`:** `first_name`, `last_name`, `is_member`, `is_active`, `church_id`

**Campos clave `auth_users`:** `profile_id`, `app_role_id`, `is_active`, `is_verified`, `is_temp_password`

### RBAC

| Tabla | Descripción |
|-------|-------------|
| `app_permissions` | Catálogo global de `permission_key` |
| `app_role_permissions` | Permisos de roles sistema |
| `church_role_permissions` | Permisos de roles custom por iglesia |
| `app_users_role` | Catálogo de roles operativos |

### Finanzas

| Tabla | PK | Tenant | Descripción |
|-------|-----|--------|-------------|
| `funds` | int | `church_id` | Fondos de la iglesia |
| `transactions` | int | vía `fund` | Egresos con autorización |
| `income_entries` | int | `church_id` | Ingresos (diezmo, ofrenda…) |
| `income_contributors` | — | vía entry | Contribuyentes de un ingreso |
| `fund_transfers` | uuid | `church_id` | Transferencias entre fondos |
| `expense_types` | int | `church_id` | Catálogo tipos de gasto |
| `income_types` | int | `church_id` | Catálogo tipos de ingreso |

**Estados `transactions`:** `PENDING`, `APPROVED`

### Operaciones

| Tabla | Descripción |
|-------|-------------|
| `church_ministries` | Ministerios con `leader_profile_ids`, `default_fund_id` |
| `church_events` | Eventos con visibilidad web |
| `church_audit_log` | Auditoría operaciones |
| `scripture_verses` | Versículos dashboard |

### Enterprise / Org

| Tabla | Descripción |
|-------|-------------|
| `organization` | Organización padre (concilio, red) |
| `org_unit` | Unidades org |
| `org_membership` | Membresía org |
| `org_submitted_report` | Reportes enviados |
| `org_api_key` | API keys org |

---

## Funciones de sistema (tenant)

| Función | Retorno | Uso |
|---------|---------|-----|
| `fn_get_session_church_id()` | integer | Iglesia de sesión |
| `fn_get_session_profile_id()` | uuid | Perfil de sesión |
| `fn_assert_session_church(p_church_id)` | void | Guard tenant |
| `fn_assert_profile_in_session_church(p_profile_id)` | void | Guard perfil |
| `fn_can_authorize_finances(p_profile_id, p_auth_user_id)` | boolean | Autorización financiera |

---

## RPC por módulo

### Sesión

| RPC | Descripción |
|-----|-------------|
| `sp_get_session_context()` | JSON sesión completa |
| `sp_sync_my_app_metadata()` | Sync JWT metadata |

### Miembros

| RPC | Parámetros clave |
|-----|------------------|
| `spgetprofiles` | `p_church_id`, `p_page`, `p_page_size`, `p_filter`, `p_search` |
| `sp_get_profile_by_id` | `p_profile_id` |
| `spinsertprofiles` | `p_church_id`, datos personales |
| `spupdateprofiles` | `p_id`, `p_is_active`, … |
| `spmaintancemembership` | `p_profile_id`, datos bautismo |

### Finanzas

| RPC | Módulo |
|-----|--------|
| `spgetfunds` | Fondos |
| `sp_maintance_funds` | Fondos CRUD |
| `fn_create_transaction` | Transacciones |
| `sp_authorize_transaction` | Autorización |
| `sp_get_income_entries` | Contribuciones |
| `sp_get_finance_ledger` | Ledger |
| `sp_create_fund_transfer` | Transferencias |

### Dashboard y reportes

| RPC | Uso |
|-----|-----|
| `sp_get_dashboard_summary` | KPIs dashboard |
| `sp_get_church_org_report_rules` | Reglas reportes org |

### Admin

| RPC | Uso |
|-----|-----|
| `sp_list_church_auth_users` | Usuarios |
| `sp_register_church_auth_user` | Alta usuario |
| `sp_create_church_role` | Roles custom |

### Eventos

| RPC | Uso |
|-----|-----|
| `sp_get_events` | Listado |
| `sp_maintain_event` | Upsert |
| `sp_delete_event` | Eliminar |

> **Buscar RPC nuevos:** `rg '\.rpc\(' src/lib/services/`

---

## RLS (Row Level Security)

Políticas tenant-scoped en tablas expuestas vía PostgREST.

| Patrón | Ejemplo |
|--------|---------|
| SELECT | `church_id = fn_get_session_church_id()` |
| INSERT/UPDATE | Mismo filtro + validación en RPC |
| Revocar anon | `income_entries`, datos financieros |

Migración referencia: `20260701120100_rls_tenant_policies.sql`

---

## Triggers relevantes

| Área | Trigger |
|------|---------|
| Auth metadata | Sync `app_metadata` en cambios `auth_users` / `membership` |
| Finanzas | Audit triggers en operaciones sensibles |
| Temp password | Sync flag en JWT |

---

## Índices recomendados

Patrón: `(church_id, …)` como prefijo.

```sql
-- Ejemplo
CREATE INDEX idx_profiles_church_active ON profiles (church_id, is_active);
```

Ver migraciones `*_indexes.sql`.

---

## Convenciones de columnas

| Columna | Uso |
|---------|-----|
| `church_id` | FK tenant — obligatorio en tablas operativas |
| `created_at`, `updated_at` | Auditoría temporal |
| `created_by_profile_id` | Quién creó (uuid perfil) |
| `recorded_by` | FK `auth.users` en ingresos |
| `is_active` | Soft enable/disable |

---

## Migraciones — orden cronológico (muestra)

| Migración | Tema |
|-----------|------|
| `20260629120000_session_context` | Sesión multitenant |
| `20260629140000_tenant_guards_app_metadata` | Guards + metadata |
| `20260701120000_tenant_profile_assert_and_rpc_guards` | RPC guards miembros/finanzas |
| `20260702120000_rbac_permissions_foundation` | RBAC |
| `20260705120000_church_events_module` | Eventos |
| `20260706153951_church_audit_log_module` | Audit log |
| `20260707230000_church_network_phase2` | Red multi-sede |
| `20260708010000_org_enterprise_phase3` | Org portal |

---

## Sincronización con código

Al cambiar schema:

1. Migración SQL en `supabase/migrations/`
2. Actualizar `src/lib/services/<módulo>.ts`
3. Actualizar `src/lib/<módulo>/types.ts` y `parse.ts`
4. Actualizar repositorio Flutter
5. Actualizar este documento y [MODULES.md](MODULES.md)

---

## Documentos relacionados

- [../engineering/AI_DATABASE_GUIDE.md](../engineering/AI_DATABASE_GUIDE.md)
- [MULTI_TENANT.md](MULTI_TENANT.md)
- [MODULES.md](MODULES.md)
- [../templates/MIGRATION_TEMPLATE.md](../templates/MIGRATION_TEMPLATE.md)
