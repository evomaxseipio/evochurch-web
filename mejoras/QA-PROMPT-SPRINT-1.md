# Agent prompt — QA Sprint 1 (auth deduplicada)

Copia este bloque al iniciar una sesión de QA, o referencia con `@mejoras/QA-PROMPT-SPRINT-1.md`.

**Rama:** `perf/sprint-1-auth-dedup`  
**Commit de referencia:** `perf(auth): deduplicate session lookups in Sprint 1 (P0-AUTH-1–4).`

---

## Rol

Eres QA engineer probando el **Sprint 1 de performance** (deduplicación auth/sesión). No implementes fixes salvo bugs bloqueantes documentados. Reporta resultados en formato **Pass / Fail / Blocked** con pasos de reproducción.

## Alcance del sprint (qué se cambió)

| ID | Cambio | Archivos clave |
|----|--------|----------------|
| P0-AUTH-1 | `getVerifiedUser` cacheado con `React.cache()` | `src/lib/supabase/session.ts` |
| P0-AUTH-2 | Layout usa solo `getAppSession()`; fallback sin perfil de iglesia | `src/app/(app)/layout.tsx` |
| P0-AUTH-3 | Middleware: JWT fast-path `app_metadata.is_temp_password`; RPC solo si flag ausente | `src/lib/supabase/middleware.ts`, `src/lib/auth/fetch-session-password-gate.ts` |
| P0-AUTH-4 | `getActionSession`: una sesión, un cliente (orden corregido) | `src/lib/auth/app-session.ts` |

**Fuera de alcance Sprint 1:** P0-AUTH-5 (paralelizar `fetchChurchAuthUsers` en members) — no bloquea QA de auth.

## Pre-requisitos

- [ ] `.env.local` configurado (`.env.example`)
- [ ] Migraciones aplicadas en Supabase, incl. `20260701180000_session_temp_password_flow.sql` y `20260701190000_sync_temp_password_app_metadata.sql`
- [ ] `npm run dev` en `http://localhost:3000`
- [ ] Al menos **2 usuarios de prueba:**
  - **U1:** usuario normal (password definitiva, perfil vinculado a iglesia)
  - **U2:** usuario con password temporal (`is_temp_password = true` en BD)
- [ ] (Opcional) **U3:** auth user sin perfil de iglesia vinculado

## Cómo reportar

Por cada caso:

```
### [ID] Título
Estado: PASS | FAIL | BLOCKED
Pasos: ...
Esperado: ...
Actual: ...
Evidencia: (screenshot / Network / consola)
Severidad: blocker | major | minor
```

---

## Matriz de pruebas funcionales

### AUTH-01 — Visitante anónimo en login (fast-path middleware)

**Pasos:** Abrir ventana incógnito → `GET /login` (sin cookies Supabase).

**Esperado:** Página de login carga; no redirect loop; no error 500.

**Verificar:** DevTools Network — no debería haber llamadas innecesarias a Supabase Auth antes de submit (fast-path ya existía; regresión = FAIL).

---

### AUTH-02 — Ruta protegida sin sesión

**Pasos:** Incógnito → navegar a `/dashboard`.

**Esperado:** Redirect a `/login?next=/dashboard`.

---

### AUTH-03 — Login usuario normal (U1)

**Pasos:**
1. Login con U1.
2. Debe llegar a `/dashboard`.
3. Shell muestra nombre/email/iglesia/rol.

**Esperado:**
- Dashboard carga datos.
- Sidebar y topbar correctos.
- No banner ámbar de “cuenta no vinculada”.

---

### AUTH-04 — Navegación entre rutas protegidas (U1)

**Pasos:** Con sesión U1, visitar en secuencia:
`/dashboard` → `/members` → `/finances/contributions` → `/settings` → `/dashboard`

**Esperado:**
- Sin logout involuntario.
- Sin redirect a update-password.
- Sin errores de sesión en UI.

**Regresión crítica:** Loop de redirects o 401 en cascada = **blocker**.

---

### AUTH-05 — Login usuario temp password (U2)

**Pasos:**
1. Login con U2.
2. Observar URL final.

**Esperado:** Redirect a `/login/update-password` (desde login action o middleware).

---

### AUTH-06 — Temp password: bloqueo de rutas protegidas (U2)

**Pasos:** Con sesión U2 (sin cambiar password), intentar abrir directamente:
- `/dashboard`
- `/members`
- `/finances/contributions`

**Esperado:** Redirect a `/login/update-password` en todas.

---

### AUTH-07 — Cambio de password temporal (U2)

**Pasos:**
1. En `/login/update-password`, nueva password ≥ 8 chars, confirmación igual.
2. Submit.

**Esperado:**
- Redirect a `/dashboard`.
- Navegación normal posterior (AUTH-04).
- Re-login con nueva password funciona.

**Regresión:** Quedar atrapado en update-password tras cambio exitoso = **blocker**.

---

### AUTH-08 — Usuario ya sin temp password en update-password route (U1)

**Pasos:** U1 logueado → navegar manualmente a `/login/update-password`.

**Esperado:** Redirect a `/dashboard` (middleware: `!mustChangePassword && isUpdatePasswordRoute`).

---

### AUTH-09 — Usuario auth sin perfil de iglesia (U3, si existe)

**Pasos:** Login U3.

**Esperado:**
- No crash 500.
- Banner ámbar: cuenta no vinculada a perfil de iglesia.
- Shell con email/nombre desde JWT si aplica.

**Nota:** Layout llama `getVerifiedUser` solo cuando `getAppSession()` es null — verificar que no hay redirect infinito a login si hay user pero no session de negocio.

---

### AUTH-10 — Logout

**Pasos:** U1 logueado → cerrar sesión.

**Esperado:** Redirect `/login`; `/dashboard` vuelve a pedir login.

---

### AUTH-11 — Server action post Sprint 1 (P0-AUTH-4)

**Pasos:** Con U1, ejecutar al menos **una mutación** por módulo:
- Crear/editar aporte (`/finances/contributions`)
- O crear/editar transacción (`/finances/transactions`)
- O acción en settings (catálogo income/expense) si permisos lo permiten

**Esperado:** Acción completa sin error “sesión no vinculada”; datos persisten tras refresh.

**Regresión:** Server actions rotas por `getActionSession` = **blocker**.

---

### AUTH-12 — Deep link con `next`

**Pasos:** Logout → ir a `/login?next=/members` → login U1.

**Esperado:** Llega a `/members` (o comportamiento documentado del login action).

---

## Matriz JWT / middleware (P0-AUTH-3)

### JWT-01 — Fast-path sin RPC en middleware (U1)

**Pasos:**
1. U1 logueado, JWT con `app_metadata.is_temp_password: false` (verificar en cookie decodificada o Supabase dashboard).
2. Hard refresh en `/dashboard`.

**Esperado:** Navegación OK. En condiciones ideales, middleware **no** debería necesitar `sp_get_session_context` si el flag JWT está presente.

**Cómo verificar (opcional):** Logs Supabase / RPC metrics — comparar frecuencia de `sp_get_session_context` en middleware antes vs después del sprint.

---

### JWT-02 — Legacy session sin flag JWT (simulación)

**Pasos:** Si es posible en staging, usuario con `is_temp_password` en BD pero JWT sin `app_metadata.is_temp_password` (sesión antigua pre-sync).

**Esperado:** Middleware cae en RPC fallback (`fetchSessionRequiresPasswordChange`) y sigue redirigiendo correctamente según BD — **no fail-open** que deje pasar temp password a dashboard.

---

### JWT-03 — Post-login metadata sync

**Pasos:** Login U1 o U2 fresco.

**Esperado:** Tras login, `syncAuthAppMetadata` + `refreshSession` (`src/app/(auth)/login/actions.ts`) — JWT incluye `is_temp_password` coherente con BD.

---

## Matriz layout / sesión (P0-AUTH-1, P0-AUTH-2)

### LAY-01 — Una sola resolución de sesión por request

**Pasos:** Cargar `/dashboard` con sesión válida.

**Esperado:** Página renderiza; `getAppSession` deduplicado vía `React.cache` entre layout y page (no errores duplicados en logs).

---

### LAY-02 — Redirect temp password desde layout

**Pasos:** U2 intenta cargar cualquier ruta bajo `(app)/` si middleware no interceptó (edge case).

**Esperado:** Layout `sessionRequiresPasswordChange(session)` → redirect `/login/update-password`.

---

## Regresiones de seguridad (must not break)

| # | Verificación | FAIL si… |
|---|--------------|----------|
| SEC-01 | Usuario sin sesión accede `/settings/users` | Ve datos admin |
| SEC-02 | Temp password accede finanzas | Ve o muta datos antes de cambiar password |
| SEC-03 | JWT `is_temp_password: false` pero BD `true` | Accede dashboard sin cambiar password (fail-open) |
| SEC-04 | RPC `sp_get_session_context` error en middleware | Usuario temp password entra a app protegida |

**Nota:** Si SEC-03/04 fallan, documentar si es pre-existente o introducido por Sprint 1.

---

## Smoke build

```bash
npm run build
npm run lint
```

**Esperado:** Exit code 0.

---

## Checklist resumen Sprint 1

| ID | Caso | Pass |
|----|------|------|
| AUTH-01 | Login anónimo | ☐ |
| AUTH-02 | Protegida sin sesión | ☐ |
| AUTH-03 | Login normal | ☐ |
| AUTH-04 | Navegación multi-ruta | ☐ |
| AUTH-05 | Login temp password | ☐ |
| AUTH-06 | Bloqueo rutas temp | ☐ |
| AUTH-07 | Cambio password temp | ☐ |
| AUTH-08 | U1 en update-password URL | ☐ |
| AUTH-09 | Sin perfil iglesia | ☐ |
| AUTH-10 | Logout | ☐ |
| AUTH-11 | Server actions | ☐ |
| AUTH-12 | Deep link next | ☐ |
| JWT-01 | Fast-path middleware | ☐ |
| JWT-03 | Sync metadata login | ☐ |
| LAY-01 | Sesión deduplicada | ☐ |
| SEC-01–04 | Seguridad | ☐ |
| BUILD | build + lint | ☐ |

**Criterio de release Sprint 1:** Todos los casos **blocker** en PASS; major documentados con ticket.

---

## Prompt listo para pegar (agente QA)

```
@mejoras/QA-PROMPT-SPRINT-1.md @mejoras/PERFORMANCE-ROADMAP.md

Ejecuta QA completo del Sprint 1 (P0-AUTH-1 a P0-AUTH-4) en rama perf/sprint-1-auth-dedup.

Entorno: npm run dev en localhost:3000.
Usuarios: [describe U1 normal, U2 temp password, U3 sin perfil si aplica].

Para cada caso AUTH/JWT/LAY/SEC del documento:
- Ejecuta los pasos manualmente o con herramientas disponibles.
- Marca PASS/FAIL/BLOCKED.
- Si FAIL: pasos exactos, esperado vs actual, severidad.
- Al final: tabla resumen + veredicto GO/NO-GO para merge a main.

No implementes fixes salvo que encuentres un blocker trivial documentado.
Prioriza regresiones de seguridad (SEC-*) y server actions (AUTH-11).
```
