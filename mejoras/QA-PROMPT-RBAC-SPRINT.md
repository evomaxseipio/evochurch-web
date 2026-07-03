# Agent prompt — QA Sprint RBAC (roles, rutas y acciones)

Copia este bloque al iniciar QA, o referencia con `@mejoras/QA-PROMPT-RBAC-SPRINT.md`.

**Prerequisito:** Sprint RBAC implementado según `@mejoras/AGENT-PROMPT-RBAC-SPRINT.md` (RBAC-1 → RBAC-7).  
**Rama:** `feat/rbac-sprint`  
**Script automático:** `node scripts/qa-rbac.mjs`  
**Orquestador full:** `npm run qa:rbac:full` (seed + build + lint + RPC + Playwright E2E)

---

## Ejecución automática (recomendada)

Un solo comando tras implementar RBAC:

```bash
# Requiere: SUPABASE_SERVICE_ROLE_KEY en .env.local (solo para --seed)
npm run qa:rbac:full
```

Equivale a:

1. `node scripts/seed-rbac-qa-users.mjs --write-env` — crea usuarios QA y escribe credenciales en `.env.local`
2. `npm run build` + `npm run lint`
3. Levanta `npm run dev` si no está corriendo
4. `node scripts/qa-rbac.mjs` — RPC + route guards HTTP
5. `npx playwright test e2e/rbac` — nav, rutas, UI (Fase B automatizada)

Flags del orquestador (`node scripts/qa-rbac-full.mjs`):

| Flag | Efecto |
|------|--------|
| `--seed` | Incluido en `npm run qa:rbac:full` |
| `--skip-build` | Omite build + lint |
| `--skip-e2e` | Solo script RPC/PAGE |
| `--keep-dev` | No mata el dev server al terminar |

Scripts npm:

| Comando | Uso |
|---------|-----|
| `npm run qa:rbac:seed` | Solo provisionar usuarios QA |
| `npm run qa:rbac` | Solo Fase A (RPC/PAGE) |
| `npm run qa:rbac:e2e` | Solo Playwright E2E |
| `npm run qa:rbac:full` | **Pipeline completo** |

**Primera vez:** `npx playwright install chromium` (post `npm install`).

---

## Regla de cierre (obligatoria)

**No declares el sprint en GO ni cierres el QA hasta que el 100 % de los casos aplicables estén en PASS.**

| Estado | ¿Cuenta para cierre? |
|--------|----------------------|
| **PASS** | Sí |
| **FAIL** | **No** — bloquea cierre; abrir bug o fix |
| **BLOCKED** | **No** — solo si falta dato de entorno; documentar causa y re-ejecutar cuando se resuelva |
| **N/A** | Sí — solo con justificación escrita (caso no aplicable al entorno) |

**Prohibido:** marcar GO con casos FAIL pendientes, “waivers” informales, o cerrar QA dejando BLOCKED sin plan de re-run.

**Secuencia obligatoria:**

1. `npm run qa:rbac:full` → exit code **0** (o pasos equivalentes abajo)
2. Casos **ROLE-02** (editar matriz iglesia) — manual si no automatizado
3. Tabla resumen final sin FAIL ni BLOCKED
4. Solo entonces: **GO merge**

Equivalente manual por pasos:

1. `npm run build` + `npm run lint` → PASS  
2. `node scripts/qa-rbac.mjs` → todos los casos automáticos PASS  
3. `npm run qa:rbac:e2e` → todos PASS (reemplaza Fase B browser salvo ROLE-02)  
4. ROLE-02 manual (matriz iglesia) → PASS + revertir permiso  
5. Solo entonces: **GO merge**

---

## Rol

Eres QA engineer validando el **Sprint RBAC**: permisos en BD, `permissions[]` en sesión, rutas y acciones filtradas, ABAC ministerios (líder), matriz por iglesia.

Reporta **PASS / FAIL / BLOCKED / N/A** con pasos, esperado vs actual, severidad.

**No implementes fixes** salvo typos en el script QA. Documenta bugs para el agente de implementación.

---

## Alcance

| ID sprint | Qué validar en QA |
|-----------|-------------------|
| RBAC-1 | Tablas permisos, `fn_user_has_permission`, `sp_get_session_context.permissions[]` |
| RBAC-2 | `AppSession.permissions`, `permissions.ts`, tipos |
| RBAC-3 | Page guards + server actions rechazan sin permiso |
| RBAC-4 | Nav sidebar/bottom filtrada por rol |
| RBAC-5 | Botones CRUD ocultos sin permiso (`<Can>`) |
| RBAC-6 | Líder: ver todos ministerios; editar solo propios |
| RBAC-7 | Settings roles: datos reales BD; admin edita matriz iglesia |

**Fuera de alcance QA:** Flutter, RBAC en middleware, miembro regular con consola.

---

## Pre-requisitos (checklist antes de empezar)

- [ ] Migración RBAC aplicada en Supabase (`*_rbac_permissions_foundation.sql`)
- [ ] `npm run build` PASS en rama `feat/rbac-sprint`
- [ ] `npm run dev` en `http://localhost:3000` (para pruebas browser)
- [ ] `.env.local` configurado (mismo criterio que `scripts/qa-sprint2.mjs`)

### Usuarios de prueba (misma iglesia)

Provisionar **4 cuentas** en staging/local. Anotar credenciales en `.env.local` o en tabla abajo (no commitear passwords).

| Alias | `app_role_id` | Rol esperado | Permisos clave |
|-------|---------------|--------------|----------------|
| **U-ADMIN** | 1 | Administrador | Todos; `admin_users:manage`, `roles:manage` |
| **U-TESORERO** | 3 | Tesorero | `finances:*`; **sin** `admin_users:manage` |
| **U-LIDER** | 10 | Líder | `ministerios:read`, `ministerios:write_own`; **sin** `finances:read` |
| **U-NOROLE** | NULL | Sin rol app | Solo `profile:read`, `settings:read` |

**Opcional pero recomendado:**

| Alias | `app_role_id` | Rol |
|-------|---------------|-----|
| **U-PASTOR** | 4 | Pastor — finanzas completas; **sin** `admin_users:manage`, `roles:manage`, `settings:catalogs` |

**Datos de ministerios (ABAC):**

- [ ] Ministerio **M-OWN**: U-LIDER está en `leader_profile_ids`
- [ ] Ministerio **M-OTHER**: otro líder (U-LIDER **no** está en leaders)

Anotar UUIDs: `M-OWN=___`, `M-OTHER=___`, `church_id=___`.

### Variables para script automático (`.env.local`)

```bash
# QA RBAC — opcional; si faltan, casos correspondientes = BLOCKED
QA_RBAC_ADMIN_EMAIL=
QA_RBAC_ADMIN_PASSWORD=
QA_RBAC_TESORERO_EMAIL=
QA_RBAC_TESORERO_PASSWORD=
QA_RBAC_LIDER_EMAIL=
QA_RBAC_LIDER_PASSWORD=
QA_RBAC_NOROLE_EMAIL=
QA_RBAC_NOROLE_PASSWORD=
QA_RBAC_PASTOR_EMAIL=
QA_RBAC_PASTOR_PASSWORD=
# UUID ministerio donde U-LIDER es líder
QA_RBAC_MINISTRY_OWN_ID=
# UUID ministerio donde U-LIDER NO es líder
QA_RBAC_MINISTRY_OTHER_ID=
```

---

## Cómo reportar cada caso

```
### [ID] Título
Estado: PASS | FAIL | BLOCKED | N/A
Pasos: ...
Esperado: ...
Actual: ...
Evidencia: (log script / screenshot / Network)
Severidad: blocker | major | minor
```

---

## Fase A — Automatizado (`node scripts/qa-rbac.mjs`)

Ejecutar **primero**. El script imprime tabla PASS/FAIL y exit code `1` si hay FAIL (NO-GO).

```bash
npm run build
node scripts/qa-rbac.mjs
```

### Casos del script (deben coincidir con salida)

| ID | Caso | Criterio PASS |
|----|------|---------------|
| AUTO-01 | Login usuarios configurados | Token obtenido para cada alias con credenciales en env |
| CTX-01 | `permissions` en session context | Campo `permissions` es array no null en `sp_get_session_context` |
| CTX-02 | U-ADMIN permisos | Incluye `admin_users:manage`, `finances:authorize`, `roles:manage` |
| CTX-03 | U-TESORERO permisos | Incluye `finances:read`, `finances:authorize`; **excluye** `admin_users:manage` |
| CTX-04 | U-LIDER permisos | Incluye `ministerios:write_own`; **excluye** `finances:read`, `ministerios:write` |
| CTX-05 | U-NOROLE permisos | Solo `profile:read` y `settings:read` (±2 keys) |
| CTX-06 | U-PASTOR permisos *(si configurado)* | `finances:authorize` presente; **sin** `admin_users:manage` |
| CTX-07 | Pastor **no** depende de membership | U-PASTOR con `membership_role` ≠ pastor sigue con `finances:authorize` |
| RPC-01 | `fn_user_has_permission` coherente | Misma respuesta que derivar de `permissions[]` para keys de prueba |
| RPC-02 | U-TESORERO RPC admin users | `sp_list_church_auth_users` → error acceso denegado |
| RPC-03 | U-ADMIN RPC admin users | Responde OK |
| PAGE-01 | U-NOROLE `/members` | Redirect o página sin listado operativo (≠ 200 con tabla miembros) |
| PAGE-02 | U-NOROLE `/dashboard` | Redirect a settings o acceso denegado |
| PAGE-03 | U-NOROLE `/settings` | 200 (perfil permitido) |
| PAGE-04 | U-TESORERO `/settings/users` | Acceso denegado (no listado admin) |
| PAGE-05 | U-TESORERO `/finances/transactions` | 200 |
| PAGE-06 | U-LIDER `/finances/contributions` | Acceso denegado |
| PAGE-07 | U-LIDER `/ministerios` | 200 |
| SEC-01 | Tenant permisos | `fn_user_has_permission` no true para otro church_id manipulado |
| BUILD-01 | Build | Documentado PASS en sesión QA |

**FAIL en cualquier AUTO/CTX/RPC/PAGE/SEC = NO-GO** hasta corregir y re-ejecutar script completo.

---

## Fase B — E2E Playwright (`npm run qa:rbac:e2e`)

Automatiza la antigua matriz manual browser (nav, rutas, UI básica, regresión).

| ID E2E | Caso manual equivalente |
|--------|-------------------------|
| RBAC-AUTH-01 | Login por rol |
| ROUTE-01–03 | URL directa sin permiso |
| NAV-01–04 | Sidebar por rol |
| UI-01–04, UI-06 | Botones CRUD visibles/ocultos |
| REG-01–02 | Smoke dashboard + paginación |

**Sigue siendo manual:**

| ID | Caso | Motivo |
|----|------|--------|
| ROLE-01–03 | Tab roles + editar matriz iglesia | Mutación BD + revert |
| UI-05 | Líder editar M-OWN vs M-OTHER | Requiere UUIDs ministerio en env |
| ACT-01–03 | Server actions vía DevTools | Cubierto parcialmente por RPC guards |
| RBAC-AUTH-02 | Temp password | Usuario U-temp aparte |
| NAV-05 | Bottom nav móvil | Viewport — ampliar E2E si se requiere |

Archivos: `e2e/rbac/rbac.spec.ts`, `e2e/rbac/helpers.ts`, `playwright.config.ts`

---

## Fase C — Matriz manual residual (solo si aplica)

Usar ventana normal + incógnito. DevTools Network abierto en casos de rutas.

### Sesión y contexto

#### RBAC-AUTH-01 — Login por rol

**Pasos:** Login U-ADMIN, U-TESORERO, U-LIDER, U-NOROLE.

**Esperado:** Llegan a ruta home coherente (admin→dashboard; norole→settings).

---

#### RBAC-AUTH-02 — Temp password no regresión

**Pasos:** Usuario temp password (si existe en entorno) → `/dashboard`.

**Esperado:** Redirect `/login/update-password` (Sprint 1 intacto).

---

### Navegación (RBAC-4)

#### NAV-01 — U-ADMIN sidebar

**Esperado:** Dashboard, Miembros, Ministerios, Finanzas (submenú), Configuración con Usuarios / catálogos.

---

#### NAV-02 — U-TESORERO sidebar

**Esperado:** Dashboard, Finanzas; **no** Usuarios admin; **no** Tipos gasto/ingreso (si requieren `settings:catalogs`).

---

#### NAV-03 — U-LIDER sidebar

**Esperado:** Dashboard, Miembros (read), Ministerios; **sin** Finanzas.

---

#### NAV-04 — U-NOROLE sidebar / bottom nav

**Esperado:** Solo Configuración (o nav mínima); **sin** Miembros, Finanzas, Dashboard operativo.

---

#### NAV-05 — Bottom nav móvil (<800px)

**Pasos:** Repetir NAV-01–04 en viewport móvil.

**Esperado:** Misma lógica de visibilidad que sidebar.

---

### Rutas directas (RBAC-3)

#### ROUTE-01 — URL directa sin permiso

**Pasos:** U-TESORERO → pegar `/settings/users` en barra de direcciones.

**Esperado:** Mensaje acceso denegado o redirect; **no** formulario de usuarios admin.

---

#### ROUTE-02 — U-NOROLE rutas operativas

**Pasos:** `/members`, `/finances/funds`, `/ministerios`.

**Esperado:** Redirect `/settings` o pantalla denegado en todas.

---

#### ROUTE-03 — U-NOROLE perfil propio

**Pasos:** `/settings` pestaña Perfil.

**Esperado:** 200; datos propios visibles; sin tabs admin.

---

### Acciones UI (RBAC-5)

#### UI-01 — U-TESORERO autorizar transacción

**Pasos:** `/finances/transactions` → fila pendiente → acciones autorizar.

**Esperado:** Botón autorizar **visible**; acción completa OK.

---

#### UI-02 — U-TESORERO sin gestión usuarios en miembros

**Pasos:** `/members` → menú miembro.

**Esperado:** **No** opción “acceso al sistema” / gestionar usuario.

---

#### UI-03 — U-ADMIN gestión usuarios

**Pasos:** `/members` → miembro con acceso.

**Esperado:** Opciones admin visibles.

---

#### UI-04 — U-LIDER botón nuevo ministerio

**Esperado:** **No** visible botón “Nuevo ministerio”.

---

#### UI-05 — U-LIDER editar ministerio propio vs ajeno

**Pasos:** En `/ministerios`, card M-OWN vs M-OTHER.

**Esperado:** Editar/eliminar solo en M-OWN.

---

#### UI-06 — U-ADMIN crear ministerio

**Esperado:** Botón nuevo + CRUD en cualquier ministerio.

---

### Server actions (RBAC-3 / RBAC-6)

#### ACT-01 — U-LIDER save ministerio ajeno

**Pasos:** DevTools o formulario → POST `saveMinistryAction` con id M-OTHER (si UI lo permite) o invocación directa.

**Esperado:** Error en español; sin persistir cambios.

---

#### ACT-02 — U-TESORERO register admin user

**Pasos:** Intentar action de `settings/users/actions.ts` sin permiso.

**Esperado:** Error acceso denegado.

---

#### ACT-03 — U-PASTOR autorizar finanzas *(si U-PASTOR)*

**Esperado:** PASS aunque `membership_role` no sea Pastor.

---

### Matriz roles iglesia (RBAC-7)

#### ROLE-01 — Tab roles datos reales

**Pasos:** U-ADMIN → `/settings` → Roles y permisos.

**Esperado:** Tabla desde BD (no mock `SYSTEM_ROLES` hardcode); roles con nombres reales.

---

#### ROLE-02 — Editar permisos iglesia

**Pasos:** Quitar `finances:write` a Tesorero **solo en esta iglesia** → guardar → login U-TESORERO → refrescar.

**Esperado:** Nav/action refleja cambio; U-TESORERO pierde escritura finanzas.

**Revertir** permiso al finalizar QA.

---

#### ROLE-03 — U-TESORERO no edita matriz

**Pasos:** U-TESORERO abre tab Roles.

**Esperado:** Solo lectura o tab oculto.

---

### Seguridad multitenant

| ID | Caso | FAIL si… |
|----|------|----------|
| SEC-RBAC-01 | Permisos no filtran por iglesia | Cambio en church A afecta church B sin copia |
| SEC-RBAC-02 | RPC mutación sin permiso | U-TESORERO crea usuario admin vía RPC directo |
| SEC-RBAC-03 | UI-only security | Botón oculto pero action/RPC aún funciona |

---

### Regresiones (smoke post-RBAC)

| ID | Caso | Esperado |
|----|------|----------|
| REG-01 | U-ADMIN dashboard KPIs | Carga OK (Sprint 2) |
| REG-02 | U-ADMIN paginación aportes | `?page=2` OK |
| REG-03 | U-ADMIN CRUD miembro | Crear/editar OK |
| REG-04 | Login/logout | Sin loop redirect |

---

## Checklist resumen (marcar todos antes de GO)

| ID | Caso | Auto | Pass |
|----|------|------|------|
| BUILD-01 | npm run build | manual | ☐ |
| LINT-01 | npm run lint | manual | ☐ |
| AUTO-01 | Login env users | script | ☐ |
| CTX-01–07 | Session permissions | script | ☐ |
| RPC-01–03 | RPC guards | script | ☐ |
| PAGE-01–07 | Route guards HTTP | script | ☐ |
| SEC-01 | Tenant | script | ☐ |
| RBAC-AUTH-01–02 | Login / temp pwd | manual | ☐ |
| NAV-01–05 | Nav por rol | manual | ☐ |
| ROUTE-01–03 | URL directa | manual | ☐ |
| UI-01–06 | Botones CRUD | manual | ☐ |
| ACT-01–03 | Server actions | manual | ☐ |
| ROLE-01–03 | Matriz iglesia | manual | ☐ |
| SEC-RBAC-01–03 | Seguridad | manual | ☐ |
| REG-01–04 | Regresiones | manual | ☐ |

**Conteo:** `___ / ___` casos PASS (debe ser **100 %** de aplicables).

---

## Criterio GO / NO-GO merge

**GO** solo si **simultáneamente**:

1. Checklist resumen: **0 FAIL**, **0 BLOCKED** (N/A documentados OK)
2. `node scripts/qa-rbac.mjs` exit code **0**
3. Casos **blocker** (CTX-02–05, PAGE-01–04, SEC-RBAC-02, ACT-01) todos PASS
4. ROLE-02 ejecutado y revertido (permiso restaurado)

**NO-GO** si cualquier FAIL/BLOCKED en casos anteriores.

---

## Prompt listo para pegar (agente QA)

```
@mejoras/QA-PROMPT-RBAC-SPRINT.md @mejoras/AGENT-PROMPT-RBAC-SPRINT.md

Ejecuta QA COMPLETO del Sprint RBAC en rama feat/rbac-sprint.

REGLA: NO cierres QA ni declares GO hasta exit code 0 de:
  npm run qa:rbac:full

Si falla: corrige, re-ejecuta full hasta GO.
ROLE-02 (editar matriz iglesia) validar manualmente y revertir.

Reporta: salida orquestador + conteo Playwright + ROLE-02 manual.
Solo GO si 100% PASS (0 FAIL, 0 BLOCKED).
```

---

## Prompt re-run (tras fix)

```
@mejoras/QA-PROMPT-RBAC-SPRINT.md

Re-ejecuta QA RBAC completo tras fix [descripción].
Casos que fallaron antes: [IDs].
Confirmar 100% PASS antes de GO.
```

---

## Entregable QA (archivo de cierre)

Al terminar, el agente QA debe dejar un comentario/PR con:

```markdown
## QA Sprint RBAC — [fecha]

- Rama: feat/rbac-sprint
- Commit: [sha]
- Script: node scripts/qa-rbac.mjs → [PASS / FAIL]
- Manual: [X/X PASS]
- **Veredicto: GO / NO-GO**

### Casos FAIL (si NO-GO)
| ID | Resumen |
|----|---------|

### N/A justificados
| ID | Motivo |
|----|--------|
```

**Sin este bloque con veredicto GO y 100 % PASS, el sprint RBAC no se considera cerrado.**
