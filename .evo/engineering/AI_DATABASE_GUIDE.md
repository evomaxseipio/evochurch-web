# AI Database Guide — EvoChurch

Guía para agentes y desarrolladores que modifican PostgreSQL, RPC, RLS, triggers o migraciones en EvoChurch.

---

## Principios

1. **RPC primero** — lógica de negocio compartida entre Next.js y Flutter vive en stored procedures.
2. **Tenant en cada operación** — validar `church_id` / `profile_id` dentro del RPC.
3. **RLS como red de seguridad** — no sustituye guards en RPC, los complementa.
4. **Migraciones atómicas** — un cambio lógico por archivo, reversible cuando sea posible.
5. **Nombres explícitos** — convenciones consistentes (ver abajo).

---

## Stack

| Componente | Ubicación |
|------------|-----------|
| Migraciones | `supabase/migrations/` |
| RPC (runtime) | PostgreSQL `public` schema |
| Cliente web | `src/lib/services/*.ts` |
| Cliente Flutter | `lib/src/features/*/data/*_repository.dart` |
| Tipos/parse web | `src/lib/*/parse.ts`, `src/lib/*/types.ts` |

---

## Convenciones de nombres

### Funciones RPC

| Patrón | Ejemplo | Uso |
|--------|---------|-----|
| `sp_<verbo>_<entidad>` | `sp_get_session_context` | Lectura |
| `sp<verbo><entidad>` (legacy) | `spgetprofiles`, `spinsertprofiles` | Miembros — no renombrar sin migración |
| `sp_maintance_<entidad>` | `sp_maintance_funds` | Upsert/merge |
| `fn_<acción>_<contexto>` | `fn_assert_session_church` | Helpers internos |

### Parámetros

| Prefijo | Tipo típico | Ejemplo |
|---------|-------------|---------|
| `p_church_id` | `integer` | Tenant |
| `p_profile_id` | `uuid` | Persona/miembro |
| `p_page`, `p_page_size` | `integer` | Paginación |
| `p_filter`, `p_search` | `varchar` | Filtros de listado |

### Migraciones

Formato: `YYYYMMDDHHMMSS_descripcion_snake_case.sql`

Ejemplos reales del repo:
- `20260629120000_session_context.sql`
- `20260701120000_tenant_profile_assert_and_rpc_guards.sql`
- `20260702120000_rbac_permissions_foundation.sql`

---

## Funciones de sesión y tenant (obligatorias)

```sql
-- Contexto completo de sesión
sp_get_session_context() → json

-- Guards — llamar al inicio de RPC sensibles
fn_get_session_church_id() → integer
fn_assert_session_church(p_church_id integer) → void
fn_assert_profile_in_session_church(p_profile_id uuid) → void
```

**Plantilla mínima para RPC con church_id:**

```sql
CREATE OR REPLACE FUNCTION public.sp_ejemplo(
  p_church_id integer,
  ...
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  PERFORM public.fn_assert_session_church(p_church_id);
  -- lógica...
END;
$$;

GRANT EXECUTE ON FUNCTION public.sp_ejemplo(integer, ...)
  TO authenticated, service_role;
```

---

## RPC por dominio (referencia)

### Sesión y auth

| RPC | Descripción |
|-----|-------------|
| `sp_get_session_context` | Sesión multitenant completa |
| `sync_my_app_metadata` | Sincroniza JWT app_metadata desde BD |

### Miembros

| RPC | Servicio web |
|-----|--------------|
| `spgetprofiles` | `src/lib/services/members.ts` — listado paginado |
| `sp_get_profile_by_id` | `fetchMemberById` |
| `spinsertprofiles` | `insertMember` |
| `spupdateprofiles` | `updateMember` |
| `spmaintancemembership` | `saveMembership` |
| `sp_get_membership_history_by_profile` | historial membresía |

### Finanzas

| RPC | Área |
|-----|------|
| `sp_get_collection_by_member` | Contribuciones por miembro/iglesia |
| `sp_maintance_funds` | CRUD fondos |
| Ledger / transactions RPCs | `src/lib/services/transactions.ts`, `ledger.ts` |

### Dashboard y reportes

| RPC | Área |
|-----|------|
| `sp_get_dashboard_summary` | KPIs dashboard |
| Report generators | `src/lib/reports/generators/*` |

> Para lista completa: buscar `.rpc(` en `src/lib/services/` y `supabase/migrations/`.

---

## Row Level Security (RLS)

### Cuándo usar RLS

- Tablas accesibles vía PostgREST (select/insert/update directo).
- Datos que deben filtrarse por `church_id` aunque el cliente use SDK.

### Cuándo usar SECURITY DEFINER + guards

- Lógica de negocio compleja (transacciones, validaciones cruzadas).
- Operaciones que cruzan tablas con reglas de autorización.

### Reglas

- Toda política debe filtrar por tenant.
- Revocar `anon` en tablas financieras y PII.
- Probar con usuario de otra iglesia — debe retornar vacío o error.

---

## Migraciones — workflow

### Crear migración

```bash
# Nombre descriptivo con timestamp
supabase/migrations/20260709120000_descripcion.sql
```

### Contenido mínimo

1. Comentario al inicio explicando el cambio y por qué.
2. `CREATE OR REPLACE` para funciones (idempotente en re-deploy).
3. `GRANT EXECUTE` explícito a `authenticated` y `service_role`.
4. `COMMENT ON FUNCTION` para documentar RPC públicos.
5. Índices si hay queries nuevas con filtro tenant.

### Checklist pre-merge

- [ ] RPC nuevos llaman guards de tenant.
- [ ] Grants correctos (no dejar funciones sin grant).
- [ ] Compatible con datos existentes (migración de datos si cambia schema).
- [ ] Servicio web actualizado en `src/lib/services/`.
- [ ] `permission-keys.ts` actualizado si hay permisos nuevos.
- [ ] Seed de `app_permissions` en migración si aplica.

### Rollback

Documentar en el PR cómo revertir. Para RPC: restaurar versión anterior con `CREATE OR REPLACE`. Para schema: migración inversa separada.

---

## Triggers y auditoría

Triggers existentes en áreas críticas:

- Sync `app_metadata` en cambios de `auth_users`.
- Auditoría financiera (`20260708170000_finance_audit_triggers.sql`).
- Módulo audit log (`20260706153951_church_audit_log_module.sql`).

**Regla:** No agregar triggers que modifiquen datos de otro tenant. Validar `church_id` en el trigger si aplica.

---

## Soft delete y auditoría

- Preferir `is_active = false` sobre DELETE físico en entidades de negocio (miembros, fondos).
- DELETE físico solo con permiso explícito (`members:delete`, etc.) y registro en audit log.
- Campos de auditoría: `created_at`, `updated_at`, `created_by_profile_id` donde aplique.

---

## Índices

Crear índices compuestos con `church_id` primero para queries tenant-scoped:

```sql
CREATE INDEX idx_profiles_church_active
  ON public.profiles (church_id, is_active)
  WHERE is_active = true;
```

Ver migraciones `*_indexes.sql` como referencia.

---

## Buenas prácticas SQL

- `SET search_path TO public` en funciones `SECURITY DEFINER`.
- Evitar SQL dinámico sin sanitizar.
- Usar `RAISE EXCEPTION` con mensajes claros (el cliente los mapea a error keys).
- Retornar `json`/`jsonb` estructurado con `{ ok, data, error }` cuando el patrón del RPC lo use.
- No exponer columnas sensibles en vistas públicas.

---

## Sincronización web ↔ Flutter

Cuando se crea o modifica un RPC:

1. Actualizar migración SQL.
2. Actualizar `src/lib/services/<dominio>.ts` + parse/types.
3. Actualizar repositorio Flutter equivalente.
4. Documentar en `.evo/architecture/MODULES.md` (cuando exista).

---

## Anti-patrones

- Queries desde el cliente sin RPC para lógica de negocio compartida.
- `p_church_id` tomado del body sin `fn_assert_session_church`.
- Migraciones que alteran RPC legacy sin actualizar todos los overloads.
- Permisos nuevos en BD sin actualizar `permission-keys.ts`.
- `SECURITY DEFINER` sin `search_path` fijo (riesgo de hijacking).

---

## Documentos relacionados

- [../architecture/MULTI_TENANT.md](../architecture/MULTI_TENANT.md)
- [AI_BACKEND_GUIDE.md](AI_BACKEND_GUIDE.md)
- `supabase/migrations/`
- `uploads/CONTEXT.md` (RPC Flutter legacy)
