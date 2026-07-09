# Multi-Tenant — EvoChurch

## Principio rector

**`church_id` es el eje del tenant.** Cada iglesia es un tenant aislado. Ningún dato de un tenant debe ser visible o modificable por otro.

La autorización **no** se resuelve desde metadata del cliente (JWT `user_metadata` / `app_metadata`). Se resuelve en **PostgreSQL** vía `auth.uid()` y funciones de sesión.

---

## Modelo de tenant

```
church (tenant root)
├── profiles          ← personas (miembros) — church_id FK
├── auth_users        ← usuarios de app vinculados a profile
├── membership        ← rol eclesiástico por iglesia
├── funds, transactions, income_entries, …
├── church_ministries, church_events, …
└── app_users_role    ← roles operativos con permisos RBAC
```

### Red de iglesias (fase 2)

Además del tenant simple, existe soporte para:

| `church_kind` | Descripción |
|---------------|-------------|
| `standalone` | Iglesia independiente |
| `headquarters` | Sede principal con campus |
| `campus` | Campus hijo de una sede |

Contexto de red expuesto en sesión: `churchNetwork`, `parentChurchId`, `campusCount`.

---

## Fuente de verdad de sesión

### RPC principal

```sql
sp_get_session_context() → json
```

Resuelve desde `auth.uid()`:

- `auth_user_id`, `profile_id`, `email`
- `church_id` (desde `profiles`, no desde JWT)
- `full_name`, `church_name`
- `app_role_id`, `app_role_name`, `membership_role`
- `permissions[]` (RBAC granular)
- `can_authorize_finances`, `is_active`, `is_verified`, `is_temp_password`
- `preferred_locale`, `church_branding`, `church_network`

**Migración:** `supabase/migrations/20260629120000_session_context.sql`

### Next.js

```typescript
// src/lib/auth/app-session.ts
getAppSession()        // lectura — cache() por request
requireAppSession()    // lectura — throw si no hay sesión
getActionSession()     // mutación — supabase + session + gate contraseña temporal
```

### Flutter

```dart
// authProvider → AuthState
final churchId = ref.read(authProvider).churchId;
final profileId = ref.read(authProvider).recorderProfileId;
```

`churchId` se resuelve en `AuthRepository` tras login, idealmente alineado con `sp_get_session_context`.

---

## Guards en base de datos

Funciones de defensa usadas dentro de RPC y triggers:

| Función | Propósito |
|---------|-----------|
| `fn_get_session_church_id()` | Obtiene `church_id` del usuario autenticado |
| `fn_assert_session_church(p_church_id)` | Falla si `p_church_id` ≠ iglesia de sesión |
| `fn_assert_profile_in_session_church(p_profile_id)` | Falla si el perfil no pertenece a la iglesia de sesión |

**Regla:** Todo RPC que recibe `p_church_id` o `p_profile_id` debe validar tenant **dentro de la función**, no confiar en el cliente.

**Migración de referencia:** `supabase/migrations/20260701120000_tenant_profile_assert_and_rpc_guards.sql`

---

## Row Level Security (RLS)

RLS es la **segunda línea de defensa** en tablas expuestas vía PostgREST.

- Políticas tenant-scoped en tablas operativas.
- RPC con `SECURITY DEFINER` + guards explícitos para lógica compleja.
- Revocar acceso `anon` en tablas sensibles (ej. `income_entries`).

**Migración de referencia:** `supabase/migrations/20260701120100_rls_tenant_policies.sql`

---

## JWT y app_metadata

`app_metadata` en el JWT se **sincroniza desde BD** (triggers en `auth_users` / membership). Es **caché de lectura** para UI legacy — no usar para autorizar mutaciones.

```typescript
// src/lib/tenant.ts — @deprecated para autorización
getChurchId(user)   // solo UI legacy
getProfileId(user)  // solo UI legacy
```

**Usar siempre** `getAppSession()` / `sp_get_session_context` para permisos y mutaciones.

---

## Permisos (RBAC)

Permisos atómicos definidos en `src/lib/auth/permission-keys.ts` — deben estar sincronizados con seed `app_permissions` en BD.

Ejemplos:

| Permiso | Acción |
|---------|--------|
| `members:read` | Ver listado y perfiles |
| `members:write` | Crear/editar miembros |
| `finances:transactions:authorize` | Autorizar transacciones |
| `admin_users:manage` | Gestionar usuarios admin |
| `roles:manage` | Gestionar roles personalizados |

### Verificación en Server Actions

```typescript
// Lectura sin permiso específico (solo sesión válida)
const { supabase, session } = await getActionSession();

// Mutación con permiso requerido
const { supabase, session } = await getActionSessionWith("members:write");
```

Helpers: `hasPermission`, `requirePermission` en `src/lib/auth/permissions.ts`.

### ABAC (atributo-based)

Algunos módulos combinan permiso global + propiedad:

- `ministerios:write` — edición global
- `ministerios:write_own` — solo si `profileId` está en `leaderProfileIds`
- `eventos:write_own` — solo eventos del ministerio donde es líder

---

## Flujo de contraseña temporal

Usuarios creados por admin pueden tener `is_temp_password = true`.

- `getActionSession()` bloquea mutaciones hasta cambiar contraseña.
- Gate en middleware y páginas según `sessionRequiresPasswordChange()`.

---

## Checklist multitenant (obligatorio)

Antes de mergear cualquier cambio que toque datos:

- [ ] ¿El RPC valida `fn_assert_session_church` o equivalente?
- [ ] ¿Los perfiles referenciados pasan por `fn_assert_profile_in_session_church`?
- [ ] ¿La Server Action usa `getActionSession` / `getActionSessionWith`?
- [ ] ¿Se pasa `session.churchId` al servicio, no un ID del cliente?
- [ ] ¿RLS cubre la tabla si hay acceso directo PostgREST?
- [ ] ¿Flutter obtiene `churchId` desde `authProvider`, no hardcodeado?
- [ ] ¿Se probó con usuario de otra iglesia (debe fallar)?

---

## Anti-patrones — nunca hacer

- Usar `user.user_metadata.church_id` para autorizar mutaciones.
- Confiar en `p_church_id` del request sin validar en RPC.
- Queries directas a tablas sin filtro `church_id` ni RLS.
- Exponer datos cross-tenant en reportes o exports.
- Saltarse `getActionSessionWith` en acciones sensibles.

---

## Documentos relacionados

- [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md)
- [../engineering/AI_DATABASE_GUIDE.md](../engineering/AI_DATABASE_GUIDE.md)
- [../engineering/AI_BACKEND_GUIDE.md](../engineering/AI_BACKEND_GUIDE.md)
- `src/lib/auth/app-session.ts`
- `AGENTS.md` (raíz del repo)
