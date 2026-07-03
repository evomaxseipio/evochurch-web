# Agent prompt — Sprint RBAC (roles, rutas y acciones)

Copia el bloque **Prompt para agente** al iniciar una sesión, o referencia con `@mejoras/AGENT-PROMPT-RBAC-SPRINT.md`.

**Rama sugerida:** `feat/rbac-sprint`  
**Alcance:** un solo sprint — BD + Next.js + UI + ministerios ABAC mínimo  
**Principios:** **DRY** (una fuente de verdad) + **KISS** (sin frameworks extra, sin duplicar reglas)

---

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Postgres/Supabase multitenant en evochurch-web.

Implementa el Sprint RBAC completo según @mejoras/AGENT-PROMPT-RBAC-SPRINT.md.

Reglas:
- Lee AGENTS.md y uploads/CONTEXT.md antes de codear.
- BD autoriza; UI solo refleja. Nunca confiar en JWT/app_metadata para permisos.
- Tenant: church_id solo desde getAppSession() / getActionSession() → sp_get_session_context().
- Migraciones: supabase migration new <nombre> antes de escribir SQL.
- DRY: un catálogo app_permissions, fn_user_has_permission, session.permissions[].
- KISS: no librerías RBAC externas; no permisos en middleware (solo pages + actions + RPC).
- Diff mínimo: wrappers sobre checks existentes (canManageAdminUsers → hasPermission).
- No commits salvo que el usuario lo pida.
- Al terminar: npm run build + npm run qa:rbac:full (tras migración aplicada)

Orden de trabajo: § Tareas del sprint (RBAC-1 → RBAC-7).
Marca DoD de cada tarea antes de pasar a la siguiente.
QA cierre: npm run qa:rbac:full exit 0 — ver @mejoras/QA-PROMPT-RBAC-SPRINT.md.
```

---

## Contexto obligatorio (leer antes de codear)

| Archivo | Por qué |
|---------|---------|
| `AGENTS.md` | Multitenant, `sp_get_session_context`, convenciones repo |
| `uploads/CONTEXT.md` | RPCs, módulos, riesgos members |
| `src/lib/auth/app-session.ts` | Sesión actual (`appRoleId`, `canAuthorizeFinances`) |
| `src/lib/auth/require-admin-session.ts` | Check admin hardcodeado → migrar |
| `src/lib/admin-users/roles.ts` | Roles UI (`PROJECT_USER_ROLES`) |
| `src/lib/navigation.ts` | Nav estática → filtrar por permiso |
| `supabase/migrations/20260701130000_church_auth_users_admin.sql` | `app_users_role`, admin guards |
| `supabase/migrations/20260701120000_tenant_profile_assert_and_rpc_guards.sql` | `fn_can_authorize_finances` |

---

## Decisiones de producto (cerradas — no renegociar en código)

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Usuario sin `app_role_id` | **Solo lectura**: perfil propio + `/settings` (pestaña perfil). Sin acceso a módulos operativos. |
| 2 | Pastor y finanzas | Pastor = **admin con menos privilegios**. **Todo en finanzas** (read, write, authorize). **No** usar `membership_role = pastor` para autorizar (eliminar regla híbrida actual). |
| 3 | Permisos por iglesia | **Sí**, multitenant: matriz **por iglesia** (`church_role_permissions`). |
| 4 | Líder y ministerios | **ABAC mínimo en este sprint**: ver **todos** los ministerios; **editar/eliminar solo** donde `leader_profile_ids` incluye su `profile_id`. Crear ministerio nuevo → solo roles con `ministries:write`. |
| 5 | Miembro regular en consola | **No** por ahora. Sin `app_role_id` activo = sin acceso operativo (solo lectura perfil). |

### Matriz de roles (defaults globales)

Seed en `app_role_permissions`. IDs alineados con `app_users_role` existente:

| `app_role_id` | Rol | Permisos (resumen) |
|---------------|-----|-------------------|
| 1 | Administrador | `*` (todos los `permission_key`) |
| 2 | Secretario | `dashboard:read`, `members:read`, `members:write`, `ministerios:read`, `ministerios:write`, `settings:read` |
| 3 | Tesorero | `dashboard:read`, `finances:read`, `finances:write`, `finances:authorize`, `settings:read` |
| 4 | Pastor *(nuevo en BD si no existe)* | Como admin **sin** `admin_users:manage`, `roles:manage`, `settings:catalogs`. **Incluye** `finances:*`, `members:*`, `ministerios:*`, `dashboard:read`, `settings:read` |
| 10 | Líder | `dashboard:read`, `members:read`, `ministerios:read`, `ministerios:write_own` |
| — | Sin rol (`app_role_id` NULL) | `profile:read`, `settings:read` |

> **Pastor:** asignar `app_role_id` real en `app_users_role` (id 4 o el que exista). Actualizar `PROJECT_USER_ROLES` para que `Pastor.appRoleId !== null`. Dejar de depender de `membership_role` para permisos de app.

---

## Arquitectura (DRY + KISS)

```
Postgres                          Next.js Server                    UI
────────                          ──────────────                    ──
app_permissions                   permissions.ts                    filterNavByPermissions()
app_role_permissions (defaults)   requirePermission()               <Can permission="…">
church_role_permissions (tenant)  route-permissions.ts              props desde layout
fn_user_has_permission()          getActionSessionWith(perm)        
fn_assert_permission()            page guards                       
sp_get_session_context            server actions                    
  → permissions[]                                                     
```

**Regla de oro:** si la UI oculta un botón, el server action **y** el RPC **igual** deben rechazar la acción.

**Resolución de permisos (una función SQL):**

```sql
-- Pseudocódigo — implementar en fn_user_has_permission(p_key text)
1. Usuario activo + auth.uid() + church_id de sesión
2. Si app_role_id IS NULL → solo keys: profile:read, settings:read
3. Si app_role_id = 1 → true (admin)
4. Si EXISTS filas en church_role_permissions para (church_id, app_role_id):
     usar SOLO esa matriz
5. Else usar app_role_permissions (defaults globales)
6. Excepciones ABAC (ministerios write_own) → función aparte fn_can_edit_ministry(p_ministry_id)
```

---

## Catálogo de permisos (`permission_key`)

Convención: `{recurso}:{acción}`. Acciones estándar: `read`, `write`, `delete`, `authorize`, `write_own` (ABAC).

```text
profile:read
settings:read
settings:catalogs
dashboard:read
members:read
members:write
members:delete
ministerios:read
ministerios:write
ministerios:write_own
finances:read
finances:write
finances:authorize
admin_users:manage
roles:manage
```

### Mapa ruta → permiso mínimo

| Ruta | Permiso |
|------|---------|
| `/dashboard` | `dashboard:read` |
| `/members`, `/members/profile` | `members:read` (perfil ajeno); propio con `profile:read` |
| `/ministerios` | `ministerios:read` |
| `/finances/*` | `finances:read` |
| `/settings` | `settings:read` |
| `/settings/users` | `admin_users:manage` |
| `/settings/expenses`, `/settings/income-types` | `settings:catalogs` |
| `/eventos`, `/comunicacion` | `dashboard:read` *(placeholder hasta módulos reales)* |

### Mapa acción UI → permiso

| Acción | Permiso |
|--------|---------|
| Agregar/editar miembro | `members:write` |
| Eliminar miembro | `members:delete` |
| Dar acceso sistema desde miembros | `admin_users:manage` |
| Crear/editar ministerio (cualquiera) | `ministerios:write` |
| Editar ministerio donde soy líder | `ministerios:write_own` + ABAC |
| Registrar transacción/aporte | `finances:write` |
| Autorizar/rechazar egreso/transferencia | `finances:authorize` |
| CRUD tipos gasto/ingreso | `settings:catalogs` |
| CRUD usuarios admin | `admin_users:manage` |
| Editar matriz roles iglesia | `roles:manage` |

---

## Estado actual (baseline)

| Qué hay | Gap |
|---------|-----|
| `sp_get_session_context()` con `app_role_id`, `can_authorize_finances` | Falta `permissions[]` |
| `canManageAdminUsers` → `appRoleId === 1` | Hardcode; migrar a `admin_users:manage` |
| `fn_can_authorize_finances` → admin OR membership pastor | Migrar a `finances:authorize` vía matriz; quitar regla membership |
| Nav estática (`MAIN_NAV`, `CONFIG_NAV`) | Sin filtro por rol |
| Middleware solo auth, no RBAC | OK — no añadir RBAC aquí |
| `/settings/users` page guard parcial | Generalizar |
| `settings-view.tsx` tab Roles = mock `SYSTEM_ROLES` | Conectar a BD o dejar read-only este sprint |
| `ministerios/actions.ts` sin permisos | Añadir guards + ABAC líder |

---

## Tareas del sprint (orden estricto)

### RBAC-1 — Migración SQL: catálogo + matriz + funciones

**Archivo:** `supabase migration new rbac_permissions_foundation`

**Crear tablas:**

```sql
app_permissions (permission_key PK, module, action, description, is_system)
app_role_permissions (app_role_id, permission_key, PK compuesta)
church_role_permissions (church_id, app_role_id, permission_key, PK compuesta)
```

**Seed:**

- Todos los `permission_key` del catálogo anterior.
- Defaults globales por rol (tabla § Matriz de roles).
- Rol Pastor en `app_users_role` si no existe (id 4 sugerido).
- Trigger o script one-shot: al crear iglesia nueva, copiar `app_role_permissions` → `church_role_permissions` *(opcional KISS: copiar on first access admin)*.

**Funciones:**

| Función | Uso |
|---------|-----|
| `fn_user_permissions(p_church_id)` | Retorna `text[]` resuelto para sesión actual |
| `fn_user_has_permission(p_key text)` | Boolean |
| `fn_assert_permission(p_key text)` | RAISE si no |
| `fn_can_edit_ministry(p_ministry_id uuid)` | `ministries:write` OR (`ministries:write_own` AND es líder) |

**Migrar existentes:**

- `fn_can_manage_admin_users()` → delegar en `fn_user_has_permission('admin_users:manage')`
- `fn_can_authorize_finances(...)` → delegar en `fn_user_has_permission('finances:authorize')` *(eliminar OR membership pastor)*
- `fn_assert_session_app_admin()` → `fn_assert_permission('admin_users:manage')`

**Extender `sp_get_session_context()`:**

```json
{
  "permissions": ["members:read", "finances:read", "..."]
}
```

**DoD RBAC-1:**

- [ ] Migración aplica sin error en local/remoto
- [ ] `SELECT fn_user_has_permission('finances:authorize')` coherente por rol
- [ ] Admin (role 1) tiene todos los keys
- [ ] `app_role_id` NULL → solo `profile:read`, `settings:read`
- [ ] `sp_get_session_context` incluye `permissions`

---

### RBAC-2 — Capa TypeScript: permisos tipados

**Archivos nuevos:**

- `src/lib/auth/permissions.ts` — `hasPermission`, `hasAnyPermission`, `requirePermission`, `getActionSessionWith`
- `src/lib/auth/permission-keys.ts` — union type `PermissionKey` + array `ALL_PERMISSION_KEYS`
- `src/lib/auth/route-permissions.ts` — `ROUTE_PERMISSIONS`, `permissionForPath()`

**Modificar:**

- `src/lib/auth/app-session.ts` — parsear `permissions: PermissionKey[]` desde RPC
- `src/lib/auth/require-admin-session.ts` — thin wrapper: `hasPermission(s, 'admin_users:manage')`
- `src/lib/auth/finance-permissions.ts` — deprecar o redirigir a `hasPermission(..., 'finances:authorize')`

**DoD RBAC-2:**

- [ ] `AppSession.permissions` tipado
- [ ] `npm run build` sin errores
- [ ] Tests manuales: parse con permissions vacío / null → `[]`

---

### RBAC-3 — Guards en pages y server actions

**Pages** — al inicio de cada `page.tsx` en `(app)/`:

```typescript
const session = await requireAppSession();
requirePermission(session, permissionForPath('/members')!);
// o redirect('/settings?denied=1') si solo falta permiso de módulo
```

Archivos:

- `dashboard/page.tsx`
- `members/page.tsx`, `members/profile/page.tsx`
- `ministerios/page.tsx`
- `finances/**/page.tsx`
- `settings/**/page.tsx`

**Casos especiales:**

- Sin rol: redirect a `/settings` (solo perfil).
- `/members/profile?id=self`: permitir con `profile:read` si es propio perfil.

**Server actions** — reemplazar checks sueltos:

| Archivo | Permiso |
|---------|---------|
| `members/actions.ts` | `members:write` / `members:delete` |
| `ministerios/actions.ts` | `ministerios:write` o ABAC `fn_can_edit_ministry` |
| `finances/*/actions.ts` | `finances:write`, `finances:authorize` |
| `settings/users/actions.ts` | `admin_users:manage` |
| `settings/expenses/actions.ts`, `income-types/actions.ts` | `settings:catalogs` |
| `finances/funds/actions.ts` | `finances:write` |

Patrón:

```typescript
const { supabase, session } = await getActionSessionWith("members:write");
```

**DoD RBAC-3:**

- [ ] URL directa sin permiso → redirect o mensaje acceso denegado (no crash)
- [ ] Server action sin permiso → error controlado en español
- [ ] RPC sigue siendo última línea de defensa

---

### RBAC-4 — Nav y shell filtrados

**Modificar:**

- `src/lib/navigation.ts` — campo opcional `permission?: PermissionKey` en items; `filterNavByPermissions(entries, permissions)`
- `src/app/(app)/layout.tsx` — pasar `permissions={session.permissions}` a shell
- `src/components/shell/app-shell.tsx` — propagar permissions
- `src/components/shell/sidebar.tsx` — nav filtrada
- `src/components/shell/bottom-nav.tsx` — idem; ocultar Finanzas si no `finances:read`

**DoD RBAC-4:**

- [ ] Tesorero ve Finanzas, no Usuarios admin
- [ ] Líder ve Ministerios, no Finanzas
- [ ] Sin rol: nav vacía excepto Configuración

---

### RBAC-5 — Componente `<Can>` y props en vistas CRUD

**Nuevo:** `src/components/auth/can.tsx`

**Actualizar vistas** (pasar `permissions` desde page):

- `members-list-view.tsx` — botones agregar, menú CRUD, acceso sistema
- `transactions-list-view.tsx` — autorizar (`finances:authorize`)
- `contributions-list-view.tsx`, `funds/*` — crear/editar
- `ministerios` list — botón nuevo ministerio vs editar por card (ABAC)
- `admin-users-list-view.tsx` — ya gated por page; verificar menús

Reemplazar props sueltas donde aplique:

- `canManageUsers` → `hasPermission(permissions, 'admin_users:manage')`
- `canAuthorizeFinances` → `hasPermission(permissions, 'finances:authorize')`

**DoD RBAC-5:**

- [ ] Usuario sin permiso no ve botones de acción
- [ ] Intentar action vía DevTools igual falla en server

---

### RBAC-6 — Ministerios ABAC (líder)

**BD:** `fn_can_edit_ministry(p_ministry_id uuid)` (RBAC-1)

**App:**

- `src/lib/services/ministries.ts` — antes de save/delete, validar ABAC en server action
- RPC `save_ministry` / equivalente: `PERFORM fn_assert_permission('ministerios:write')` OR validar `fn_can_edit_ministry` en plpgsql

**UI:**

- Lista ministerios: botón editar visible si `ministerios:write` OR (`ministerios:write_own` AND es líder de ese ministerio)
- Botón "Nuevo ministerio" solo con `ministerios:write`

**DoD RBAC-6:**

- [ ] Líder edita su ministerio, no el de otro líder
- [ ] Líder ve todos los ministerios
- [ ] Secretario/Admin editan cualquiera

---

### RBAC-7 — Roles UI + RPC iglesia (KISS)

**BD:**

- `sp_get_church_role_permissions(p_church_id, p_app_role_id)` → json array keys
- `sp_set_church_role_permissions(p_church_id, p_app_role_id, p_keys text[])` — requiere `roles:manage`
- `sp_list_church_roles_with_permissions(p_church_id)` — para tabla settings

**App:**

- `src/lib/services/roles.ts` — fetch/update
- `src/components/settings/settings-view.tsx` — reemplazar mock `SYSTEM_ROLES` por datos reales (solo admin con `roles:manage` edita; resto read-only)

**DoD RBAC-7:**

- [ ] Tab "Roles y permisos" muestra roles reales de BD
- [ ] Admin puede ajustar permisos de un rol **para su iglesia**
- [ ] Cambio persiste en `church_role_permissions` y refleja en nav tras refresh

---

## RPCs existentes a revisar (checklist seguridad)

Al implementar RBAC-1, añadir `fn_assert_permission` donde hoy solo hay `fn_assert_session_church`:

- [ ] `sp_register_church_auth_user`, `sp_update_church_auth_user`
- [ ] Mutaciones members (create/update/delete profile)
- [ ] Mutaciones finanzas (income, ledger, fund transfer review)
- [ ] Mutaciones catálogos (expense types, income types, funds)
- [ ] Mutaciones ministerios

No es necesario proteger **lecturas** con permiso extra si RLS + `fn_assert_session_church` ya acota tenant — pero la **page** debe bloquear acceso UI.

---

## QA manual (mínimo antes de merge)

Probar con 4 usuarios de prueba (misma iglesia):

| Usuario | Rol | Verifica |
|---------|-----|----------|
| U1 | Administrador | Nav completa; CRUD usuarios; editar roles iglesia |
| U2 | Tesorero | Solo finanzas + dashboard; autoriza egresos |
| U3 | Líder | Ministerios read all; edit solo propio; sin finanzas |
| U4 | Sin app_role_id | Solo `/settings` perfil; redirect desde `/members` |

Casos negativos:

- [ ] GET `/settings/users` como Tesorero → acceso denegado
- [ ] POST server action `saveMinistryAction` como Líder en ministerio ajeno → error
- [ ] POST authorize transaction como Secretario → error

Opcional: `scripts/qa-rbac.mjs` con RPC calls (patrón `scripts/qa-sprint2.mjs`). **Obligatorio en cierre:** ver `@mejoras/QA-PROMPT-RBAC-SPRINT.md`.

---

## Fuera de alcance (no hacer en este sprint)

- Miembro regular con acceso consola
- Permisos granulares por ministerio en nav (solo ABAC en edit)
- RBAC en middleware / JWT hints
- Flutter (documentar contrato en `uploads/CONTEXT.md` solamente si se toca)
- ABAC avanzado (filtrar miembros por ministerio del líder)
- Eventos / Comunicación más allá de placeholder `dashboard:read`

---

## Entregables finales del sprint

1. Migración SQL aplicada
2. `permissions[]` en sesión
3. Nav + acciones filtradas
4. Guards en pages + actions + RPCs críticos
5. Pastor con rol app real y finanzas completas
6. Matriz editable por iglesia (admin)
7. `npm run build` verde
8. QA manual documentado en PR

---

## División sugerida entre agentes (paralelo)

Si usas varios agentes en paralelo, respeta dependencias:

| Agente | Tareas | Depende de |
|--------|--------|------------|
| A (BD) | RBAC-1 completo | — |
| B (Server TS) | RBAC-2, RBAC-3 | RBAC-1 mergeado |
| C (UI Nav) | RBAC-4, RBAC-5 | RBAC-2 |
| D (Ministerios) | RBAC-6 | RBAC-1 + RBAC-2 |
| E (Settings roles) | RBAC-7 | RBAC-1 + RBAC-2 |

**Un solo agente:** ejecutar RBAC-1 → RBAC-7 en orden.

---

## Prompt QA (opcional)

```
Eres QA en evochurch-web. Valida el Sprint RBAC según @mejoras/AGENT-PROMPT-RBAC-SPRINT.md § QA manual.

Usuarios de prueba: [pegar credenciales staging].
Reporta: rol → rutas visibles → acciones visibles → intentos negativos (URL directa, action POST).
Formato: tabla PASS/FAIL por caso.
```

---

## Referencia rápida — archivos tocados (estimado)

```
supabase/migrations/*_rbac_permissions_foundation.sql   (nuevo)
src/lib/auth/permissions.ts                             (nuevo)
src/lib/auth/permission-keys.ts                         (nuevo)
src/lib/auth/route-permissions.ts                       (nuevo)
src/lib/auth/app-session.ts                             (mod)
src/lib/auth/require-admin-session.ts                   (mod)
src/lib/navigation.ts                                   (mod)
src/app/(app)/layout.tsx                                (mod)
src/components/shell/*.tsx                              (mod)
src/components/auth/can.tsx                             (nuevo)
src/lib/services/roles.ts                               (nuevo)
src/components/settings/settings-view.tsx               (mod)
src/app/(app)/**/page.tsx                               (mod)
src/app/(app)/**/actions.ts                             (mod)
src/lib/admin-users/roles.ts                            (mod — Pastor appRoleId)
```
