# AI Frontend Guide — EvoChurch (Next.js)

Guía para UI web: React Server Components, Client Components, Tailwind y design tokens.

---

## Stack

| Tecnología | Versión / nota |
|------------|----------------|
| Next.js | 16 — App Router |
| React | Server Components por defecto |
| TypeScript | Strict |
| Estilos | Tailwind + `src/styles/design.css` (tokens) |
| i18n | `next-intl` |
| Auth UI | `@supabase/ssr` |

---

## Estructura de carpetas

```
src/
├── app/
│   ├── (auth)/login/          ← páginas públicas
│   └── (app)/                 ← shell autenticado
│       ├── <modulo>/
│       │   ├── page.tsx       ← Server Component (fetch)
│       │   ├── actions.ts     ← Server Actions
│       │   └── loading.tsx
│       └── layout.tsx         ← AppShell + sesión
├── components/
│   ├── shell/                 ← app-shell, sidebar, topbar
│   ├── ui/                    ← primitivos reutilizables
│   ├── <modulo>/              ← componentes de dominio
│   └── auth/                  ← Can, login, guards
├── lib/                       ← lógica sin UI
└── styles/design.css          ← tokens — fuente única de color
```

---

## Patrón página + lista

### Server Component (`page.tsx`)

```typescript
import { requireAppSession } from "@/lib/auth/app-session";
import { requirePageAccess } from "@/lib/auth/require-page-access";
import { fetchMembersPage } from "@/lib/services/members";
import { createClient } from "@/lib/supabase/server";
import { MembersListView } from "@/components/members/members-list-view";

export default async function MembersPage({ searchParams }) {
  const session = await requireAppSession();
  requirePageAccess(session, "members");

  const supabase = await createClient();
  const result = await fetchMembersPage(supabase, {
    churchId: session.churchId,
    page: Number(searchParams.page) || 1,
  });

  return (
    <MembersListView
      members={result.members}
      permissions={session.permissions}
      churchId={session.churchId}
    />
  );
}
```

### Client Component (`*-list-view.tsx`)

```typescript
"use client";

import { Can } from "@/components/auth/can";
import { createMemberAction } from "@/app/(app)/members/actions";

export function MembersListView({ members, permissions, churchId }) {
  // interactividad: filtros, modales, transiciones
  return (
    <Can permission="members:write" permissions={permissions}>
      <button onClick={…}>Agregar</button>
    </Can>
  );
}
```

**Regla:** Fetch en servidor; interactividad en cliente.

---

## Server Actions desde UI

```typescript
import { useTransition } from "react";
import { saveMemberAction } from "@/app/(app)/members/actions";

const [pending, startTransition] = useTransition();

startTransition(async () => {
  const result = await saveMemberAction(input);
  if (!result.ok) {
    setError(t(result.errorKey));
    return;
  }
  router.refresh(); // o confiar en revalidatePath del action
});
```

---

## Permisos en UI

### Componente `Can`

```tsx
<Can permission="members:write" permissions={session.permissions}>
  <Button>Agregar miembro</Button>
</Can>
```

### Ocultar vs deshabilitar

- **Sin permiso:** ocultar acción (no mostrar botón gris que frustra).
- **Solo lectura:** mostrar datos sin controles de edición.

### Gate de ruta

`requirePageAccess(session, "members")` en `page.tsx` — redirect si no autorizado.

---

## Design system

**No usar colores hex sueltos.** Usar tokens CSS:

```css
/* design.css */
background: var(--bg-1);
color: var(--fg);
border: 1px solid var(--line);
```

| Token | Uso |
|-------|-----|
| `--accent` | Botones primarios, nav activo |
| `--ok`, `--danger`, `--warn` | Estados |
| `--d-people`, `--d-income`, `--d-funds` | Dominio en badges/charts |
| `--radius`, `--radius-lg` | Bordes |
| `--shadow-1` | Cards |

White-label: `ChurchBrandProvider` inyecta `--accent` desde `session.churchBranding`.

Ver [AI_DESIGN_SYSTEM.md](../product/AI_DESIGN_SYSTEM.md).

---

## Componentes UI reutilizables

| Componente | Uso |
|------------|-----|
| `DataTable` | Tablas desktop paginadas |
| `FilterToolbar` | Búsqueda + chips filtro |
| `PageHeader` | Título + acciones |
| `SectionCard` | Card con header |
| `CrudActionMenu` | Menú ⋮ por fila |
| `PaginationBar` | Paginación URL-based |
| `PlaceholderPage` | Módulo en construcción |

Drawers/modales: `*-form-drawer.tsx` por entidad (patrón CRUD).

---

## Layout shell

`AppShell` (`components/shell/app-shell.tsx`):
- Sidebar desktop / drawer móvil
- Topbar con tema, usuario, logout
- `BottomNav` en móvil
- Branding via `ChurchBrandProvider`

Breakpoints: ver [AI_UX_GUIDE.md](../product/AI_UX_GUIDE.md).

---

## Formularios

- Validación HTML5 + validación en Server Action.
- Normalizar catálogos (`normalizeGender`, etc.) antes de RPC.
- Drawers para crear/editar — modales para confirmar eliminar.
- Loading state en botón submit (`disabled={pending}`).

---

## i18n

```typescript
import { useTranslations } from "next-intl";

const t = useTranslations("members");
return <h1>{t("title")}</h1>;
```

- Strings en catálogos de mensajes — no hardcodear en lógica.
- `errorKey` de actions → `t(errorKey)`.
- Locale desde `session.preferredLocale`.

---

## Listados y URL state

Paginación y filtros en query params:

```typescript
// lib/members/pagination.ts
buildMembersListUrl({ page, filter, search });
```

Beneficio: enlaces compartibles, back button funciona.

---

## Gráficos (dashboard)

- Recharts o componentes custom en `components/dashboard/`.
- Datos desde `sp_get_dashboard_summary` — no mock en producción.
- Ocultar widgets sin permiso financiero.

---

## Accesibilidad

- Contraste WCAG AA (tokens ya calibrados).
- `aria-label` en icon buttons.
- Focus visible en inputs y menús.

---

## Checklist nueva pantalla

- [ ] `page.tsx` es Server Component con `requireAppSession`
- [ ] Permiso de ruta verificado
- [ ] Fetch vía `src/lib/services/` con `session.churchId`
- [ ] Client component solo para interactividad
- [ ] Tokens CSS — sin hex sueltos
- [ ] `<Can>` en acciones sensibles
- [ ] Estados: loading, vacío, error
- [ ] Responsive móvil/tablet/desktop
- [ ] i18n para strings nuevos

---

## Anti-patrones

- `useEffect` + fetch en cliente para datos iniciales (usar RSC).
- `getChurchId(user)` para mostrar datos tenant.
- Lógica de negocio en componentes (mover a services/actions).
- CSS modules con colores fuera de `design.css`.
- Client Component para toda la página cuando solo el botón necesita `"use client"`.

---

## Documentos relacionados

- [AI_BACKEND_GUIDE.md](AI_BACKEND_GUIDE.md)
- [AI_DESIGN_SYSTEM.md](../product/AI_DESIGN_SYSTEM.md)
- [AI_UX_GUIDE.md](../product/AI_UX_GUIDE.md)
- `src/styles/design.css`
- `src/components/shell/app-shell.tsx`
