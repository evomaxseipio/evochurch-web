# AI Backend Guide — EvoChurch (Next.js)

Guía para Server Actions, servicios, autorización y patrones de backend en **evochurch-web**.

---

## Principios

1. **Server-first** — lectura en Server Components, mutación en Server Actions.
2. **Sesión desde BD** — `getAppSession()` / `getActionSession()`, nunca JWT metadata para autorizar.
3. **Servicios delgados** — `src/lib/services/` encapsula RPC + parseo; sin lógica de UI.
4. **Permisos explícitos** — `getActionSessionWith(permission)` en toda mutación sensible.
5. **Errores tipados** — retornar `{ ok: false, errorKey }` para i18n en UI.

---

## Capas

```
page.tsx (Server Component)
    │  getAppSession() / requireAppSession()
    │  src/lib/services/*.ts → supabase.rpc()
    ▼
UI (Client Component)
    │  form action / startTransition
    ▼
actions.ts ("use server")
    │  getActionSession() / getActionSessionWith(perm)
    │  src/lib/services/*.ts
    ▼
Supabase RPC (PostgreSQL)
```

---

## Sesión

### Lectura (páginas, layouts)

```typescript
import { getAppSession, requireAppSession } from "@/lib/auth/app-session";

// Opcional — redirect si no hay sesión
const session = await getAppSession();

// Obligatorio — throw si no hay iglesia vinculada
const session = await requireAppSession();
```

`getAppSession` usa `cache()` — una llamada por request.

### Mutación (Server Actions)

```typescript
import { getActionSession } from "@/lib/auth/app-session";
import { getActionSessionWith } from "@/lib/auth/permissions-server";

// Solo requiere sesión válida (sin permiso específico)
const { supabase, session } = await getActionSession();

// Requiere permiso RBAC
const { supabase, session } = await getActionSessionWith("members:write");
```

`getActionSession` también bloquea usuarios con contraseña temporal pendiente.

### Campos clave de `AppSession`

| Campo | Uso |
|-------|-----|
| `churchId` | Pasar a todo RPC como `p_church_id` |
| `profileId` | Auditoría, `p_created_by_profile_id` |
| `authUserId` | FK a `auth.users` donde aplique |
| `permissions` | Verificación RBAC |
| `churchBranding` | UI white-label |
| `churchNetwork` | Red headquarters/campus |

---

## Server Actions — patrón estándar

```typescript
"use server";

import { getActionSessionWith } from "@/lib/auth/permissions-server";
import { insertMember } from "@/lib/services/members";
import { revalidatePath } from "next/cache";

export type ActionResult =
  | { ok: true; member?: Member }
  | { ok: false; errorKey: string };

export async function createMemberAction(
  input: MemberProfileInput,
): Promise<ActionResult> {
  try {
    const { supabase, session } = await getActionSessionWith("members:write");
    const member = await insertMember(supabase, session.churchId, input);
    revalidatePath("/members");
    return { ok: true, member };
  } catch (error) {
    return { ok: false, errorKey: toErrorKey(error, "errors.generic") };
  }
}
```

### Reglas

- `"use server"` al inicio del archivo.
- Un archivo `actions.ts` por módulo/ruta (`members/actions.ts`, `settings/church/actions.ts`).
- Siempre `try/catch` — nunca dejar propagar errores crudos al cliente.
- `revalidatePath` / `revalidateTag` tras mutaciones que afectan listados.
- No importar componentes React en actions.

---

## Servicios (`src/lib/services/`)

Los servicios reciben `SupabaseClient` + parámetros explícitos (incluido `churchId`).

```typescript
// src/lib/services/members.ts
export async function fetchMembersPage(
  supabase: SupabaseClient,
  params: FetchMembersPageParams,
): Promise<MembersPageResult> {
  const { data, error } = await supabase.rpc("spgetprofiles", {
    p_church_id: params.churchId,
    p_page: params.page ?? 1,
    p_page_size: params.pageSize,
    p_filter: params.filter ?? "all",
    p_search: params.search?.trim() || null,
  });
  if (error) throw error;
  assertRpcSuccess(data, "No se pudieron cargar los miembros.");
  return parseMembersPageResponse(data);
}
```

### Convenciones

| Regla | Detalle |
|-------|---------|
| Parse separado | `src/lib/<dominio>/parse.ts` transforma JSON RPC → tipos TS |
| Tipos separados | `src/lib/<dominio>/types.ts` |
| Sin sesión en servicio | El caller pasa `churchId`; el servicio no llama `getAppSession` |
| `assertRpcSuccess` | Validar respuestas RPC con contrato `{ ok, ... }` |
| Cache | `unstable_cache` solo para catálogos estables con tags |

---

## Autorización

### RBAC — permisos atómicos

Definidos en `src/lib/auth/permission-keys.ts`. Sincronizados con seed BD.

```typescript
import { requirePermission, hasPermission } from "@/lib/auth/permissions";

requirePermission(session, "finances:transactions:write");
```

### Rutas protegidas

- `src/lib/auth/require-page-access.ts` — gate por ruta y permiso.
- `src/lib/auth/route-permissions.ts` — mapa ruta → permisos requeridos.
- Middleware en `src/lib/supabase/middleware.ts` — auth + redirect login.

### ABAC (ministerios, eventos)

Usar helpers que combinan permiso + atributo:

```typescript
canEditMinistryRecord(session, leaderProfileIds);
canEditEventWith(session.permissions, profileId, ministryId, leaderProfileIds);
```

---

## Manejo de errores

### En Server Actions

```typescript
function toErrorKey(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  if (message.includes("unauthorized")) return "errors.unauthorized";
  if (message.includes("forbidden") || message.includes("permission")) {
    return "errors.forbidden";
  }
  return fallback;
}
```

### En UI

Mapear `errorKey` a strings i18n — no mostrar mensajes SQL al usuario.

---

## Cliente Supabase

| Cliente | Archivo | Uso |
|---------|---------|-----|
| Server | `src/lib/supabase/server.ts` | Server Components, Actions |
| Browser | `src/lib/supabase/client.ts` | Client Components (mínimo) |
| Admin | `src/lib/supabase/admin.ts` | Service role — solo operaciones admin |
| Middleware | `src/lib/supabase/middleware.ts` | Refresh sesión, protección rutas |

**Regla:** Preferir server client en lecturas de datos sensibles. Evitar exponer service role al cliente.

---

## Caché y revalidación

```typescript
import { unstable_cache } from "next/cache";
import { catalogTags } from "@/lib/cache/catalog-tags";

// Catálogos estables (roles, tipos de ingreso)
const getRoles = unstable_cache(fetchRoles, ["member-roles"], {
  tags: [catalogTags.memberRoles(churchId)],
});
```

Tras mutación de catálogo: `revalidateTag(catalogTags.memberRoles(churchId))`.

---

## Logging y observabilidad

- `src/lib/observability/rpc-timing.ts` — timing de RPC (dev/diagnóstico).
- `console.error` en fallos de `sp_get_session_context` — no silenciar.
- Audit log vía `src/lib/services/audit-log.ts` para operaciones admin.

---

## Estructura por módulo

```
src/app/(app)/<modulo>/
├── page.tsx           ← Server Component, fetch inicial
├── actions.ts         ← Server Actions
├── components/        ← Client Components
└── loading.tsx        ← opcional

src/lib/
├── <modulo>/types.ts
├── <modulo>/parse.ts
└── services/<modulo>.ts
```

---

## Checklist antes de mergear

- [ ] Server Action usa `getActionSession` o `getActionSessionWith`.
- [ ] `session.churchId` pasado al servicio — no ID del formulario sin validar.
- [ ] Permiso correcto para la operación.
- [ ] `revalidatePath` tras mutación.
- [ ] `ActionResult` con `errorKey` — no throw al cliente.
- [ ] Servicio actualizado si hay RPC nuevo.
- [ ] `permission-keys.ts` actualizado si hay permiso nuevo.

---

## Anti-patrones

- Llamar `getChurchId(user)` de `tenant.ts` para autorizar.
- Mutaciones en Client Components con service role.
- Lógica de negocio duplicada en action y servicio.
- Fetch de datos sensibles en Client Component sin necesidad.
- Server Action sin permiso específico en operación destructiva.

---

## Documentos relacionados

- [AI_DATABASE_GUIDE.md](AI_DATABASE_GUIDE.md)
- [../architecture/MULTI_TENANT.md](../architecture/MULTI_TENANT.md)
- [AI_ENGINEERING_GUIDE.md](AI_ENGINEERING_GUIDE.md)
- `src/lib/auth/app-session.ts`
- `src/app/(app)/members/actions.ts` (referencia)
