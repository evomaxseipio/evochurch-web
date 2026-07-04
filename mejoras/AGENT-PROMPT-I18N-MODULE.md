# Agent prompt — Internacionalización (i18n)

Copia **una sección** (bloque `Prompt para agente`) por sesión de agente, o referencia con `@mejoras/AGENT-PROMPT-I18N-MODULE.md`.

**Rama sugerida:** `feat/i18n-module`  
**Alcance:** soporte multilenguaje en consola web Next.js (UI, formateo, preferencia de usuario)  
**Principios:** KISS (next-intl, sin URLs prefijadas), DRY (claves compartibles con Flutter), diff incremental por módulo

---

## Cómo usar este documento

1. Ejecutar secciones **en orden** (I18N-0 → I18N-QA). No migrar módulos de UI antes de I18N-0 e I18N-1.
2. Cada sección es **autocontenida** para un agente: contexto, archivos, tareas, DoD, dependencias.
3. **No commits** salvo que el usuario lo pida.
4. Al cerrar el módulo completo: `npm run build` + checklist QA (§ I18N-QA).
5. Leer siempre `AGENTS.md` y `uploads/CONTEXT.md` antes de codear.

### Orden de ejecución

```
I18N-0  Infraestructura (next-intl, locales, middleware, provider)
  ↓
I18N-1  Shell + navegación + auth (login, layout, toasts comunes)
  ↓
I18N-2  Dashboard + placeholders (eventos, comunicación)
  ↓
I18N-3  Miembros
  ↓
I18N-4  Finanzas (fondos, transacciones, contribuciones)
  ↓
I18N-5  Ministerios + catálogos + settings (roles, usuarios, tipos)
  ↓
I18N-6  Reportes (UI + export PDF/XLSX)
  ↓
I18N-7  Persistencia BD (preferred_locale en perfil / sesión)
  ↓
I18N-QA QA manual + build + auditoría strings
```

### Dependencias entre secciones

| Sección | Depende de | Entrega clave |
|---------|------------|---------------|
| I18N-0 | — | `next-intl`, `src/i18n/*`, middleware, cookies |
| I18N-1 | I18N-0 | Shell traducido, selector conectado |
| I18N-2 | I18N-1 | Dashboard y páginas stub |
| I18N-3 | I18N-1 | Módulo miembros completo |
| I18N-4 | I18N-1 | Módulo finanzas completo |
| I18N-5 | I18N-1 | Ministerios, settings, admin |
| I18N-6 | I18N-0, I18N-4, I18N-3 | Reportes UI + exports |
| I18N-7 | I18N-0, I18N-1 | Locale en BD + sync sesión |

---

## Contexto obligatorio (todas las secciones)

| Archivo | Por qué |
|---------|---------|
| `AGENTS.md` | Multitenant, `sp_get_session_context`, convenciones |
| `uploads/CONTEXT.md` | RPCs, módulos, riesgos |
| `src/app/layout.tsx` | Hoy `lang="es"` fijo |
| `src/app/(app)/layout.tsx` | Layout autenticado — provider i18n |
| `src/lib/navigation.ts` | Labels hardcodeados en español |
| `src/components/shell/app-topbar.tsx` | Topbar — agregar dropdown idioma junto al toggle de tema |
| `src/components/settings/settings-view.tsx` | Selector en pestañas Perfil e Idioma (solo localStorage hoy) |
| `src/lib/roles/display.ts` | Labels de roles y permisos |
| `src/lib/auth/app-session.ts` | Sesión — extender con locale en I18N-7 |
| `src/hooks/use-action-toast.ts` | Toasts desde server actions |

### Estado actual del producto (importante)

- **No hay librería i18n** en `package.json`.
- Casi todo el texto UI está **hardcodeado en español** (~28 páginas App Router, ~94 componentes).
- Existe UI de idioma en Configuración (pestaña Idioma) con códigos obsoletos `es-DO | es | en | ht`, guarda en `localStorage` (`evochurch-locale`) pero **no traduce nada**.
- **No hay selector en topbar** — hoy solo toggle de tema en `app-topbar.tsx` (líneas ~92–99).
- App Flutter (repo separado) ya usa ARB `app_en.arb` / `app_es.arb` — alinear **nomenclatura de claves** cuando sea posible.
- Reportes (`src/lib/reports/`) generan PDF/XLSX con strings en español.

---

## Decisiones de producto (cerradas)

| # | Pregunta | Decisión |
|---|----------|----------|
| 1 | Idiomas | **`es`** (español), **`en`** (inglés), **`fr`** (francés). **Sin Kreol.** |
| 2 | `es-DO` vs `es` | Unificar en **`es`**. Formato regional (RD) vía `Intl` / moneda de iglesia. |
| 3 | Estrategia de rutas | **Sin prefijo de URL**. Locale por **cookie + preferencia BD**. |
| 4 | Locale por defecto | **`es`**. Fallback: BD → cookie → Accept-Language → `es`. |
| 5 | Contenido de BD | Datos del tenant no se traducen; solo UI de sistema. |
| 6 | Server Actions | Devolver **`errorKey`**; traducir en cliente o con `getTranslations()`. |
| 7 | Librería | **`next-intl`** para Next.js 16 App Router. |
| 8 | **Selector de idioma (UX)** | **Tres puntos de acceso**, todos usando el **mismo componente** (`LocaleSwitcher`): (A) **Topbar** — dropdown compacto **inmediatamente a la izquierda** del botón de tema (sol/luna); (B) **Configuración → pestaña Idioma** — lista completa con banderas; (C) **Configuración → pestaña Perfil** — bloque “Idioma de la aplicación” (mismo control). Cambio en cualquiera sincroniza cookie + BD + UI. |
| 9 | Variante topbar | Dropdown con icono `globe`, muestra código actual (`ES` / `EN` / `FR`) o bandera; menú desplegable con las 3 opciones; `aria-label` traducido. |

### Locales soportados (config final)

| Código | Idioma |
|--------|--------|
| `es` | Español |
| `en` | English |
| `fr` | Français |

---

## Arquitectura objetivo

```
Request
  → middleware (next-intl: lee cookie NEXT_LOCALE / Accept-Language)
  → layout (NextIntlClientProvider + lang dinámico en <html>)
  → Server Components: getTranslations('namespace')
  → Client Components: useTranslations('namespace')
  → LocaleSwitcher (topbar + settings perfil + settings idioma)
  → cookie NEXT_LOCALE + (I18N-7) RPC update preferred_locale
```

### Estructura de archivos (crear en I18N-0)

```
src/i18n/
  config.ts              # locales, defaultLocale, localeLabels
  request.ts             # getRequestConfig para next-intl
  routing.ts             # defineRouting (sin path prefix)
  messages/
    es.json
    en.json
    fr.json
src/components/i18n/
  locale-switcher.tsx      # componente compartido (variant: compact | list)
src/lib/i18n/
  format.ts                # formatDate, formatCurrency, formatNumber
  set-locale.ts            # server action: cookie + BD + refresh
```

### Convención de claves

- Formato: **`namespace.section.key`** en JSON anidado.
- Namespaces: `common`, `nav`, `auth`, `dashboard`, `members`, `finances`, `ministerios`, `settings`, `reports`, `errors`, `validation`.
- Ejemplo:

```json
{
  "nav": {
    "dashboard": "Dashboard",
    "members": "Miembros"
  },
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar"
  }
}
```

- Claves en **inglés snake_case** (`members.addMember`), valores traducidos por locale.
- Reutilizar la misma clave en web y documentar equivalencia Flutter en comentario al final de cada namespace si aplica.

---

# I18N-0 — Infraestructura

## Prompt para agente

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa I18N-0 (Infraestructura i18n) según @mejoras/AGENT-PROMPT-I18N-MODULE.md § I18N-0.

Reglas:
- Lee AGENTS.md antes de codear.
- Instalar next-intl (versión compatible con Next 16).
- Locales MVP: es (default), en, fr. Sin prefijo en URL.
- Crear src/i18n/ con config, request, routing y messages/es.json (base mínima: common.save, common.cancel).
- Integrar middleware next-intl (combinar con middleware Supabase existente en src/lib/supabase/middleware.ts si hay entry en raíz; crear src/middleware.ts si no existe).
- Cookie de locale: NEXT_LOCALE (next-intl default o explícita).
- Actualizar src/app/layout.tsx: lang dinámico, NextIntlClientProvider o patrón recomendado para App Router.
- NO migrar módulos de UI aún — solo infra + un string de prueba visible (ej. título metadata o login).
- Eliminar referencias obsoletas es-DO y ht en todo el repo.
- Diff mínimo; no commits salvo que el usuario lo pida.
- Al terminar: npm run build

Marca DoD de I18N-0 antes de pasar a I18N-1.
```

## Tareas

### I18N-0.1 — Dependencia y config

- [ ] `npm install next-intl`
- [ ] Crear `src/i18n/config.ts`:
  - `locales = ['es', 'en', 'fr'] as const`
  - `defaultLocale = 'es'`
  - `localeLabels` para UI del selector
- [ ] Crear `src/i18n/routing.ts` con `defineRouting({ locales, defaultLocale, localePrefix: 'never' })`
- [ ] Crear `src/i18n/request.ts` con `getRequestConfig` cargando JSON del locale activo

### I18N-0.2 — Mensajes base

- [ ] Crear `src/i18n/messages/es.json` — español como **fuente de verdad** inicial
- [ ] Crear `src/i18n/messages/en.json` — traducción inglesa (mismas claves)
- [ ] Crear `src/i18n/messages/fr.json` — traducción francesa (mismas claves)
- [ ] Namespace mínimo `common`: save, cancel, loading, error, success, confirm, delete, edit, search, noResults

### I18N-0.3 — Middleware

- [ ] Crear o actualizar `src/middleware.ts`:
  - Integrar `createMiddleware` de next-intl
  - Preservar flujo auth Supabase (matcher excluye estáticos)
  - Resolver locale: cookie → Accept-Language → default

### I18N-0.4 — Layout raíz

- [ ] `src/app/layout.tsx`: `lang={locale}` dinámico
- [ ] Envolver children con provider i18n según docs next-intl App Router
- [ ] Metadata `title`/`description` traducibles (namespace `meta`)

### I18N-0.5 — Utilidades de formateo

- [ ] Crear `src/lib/i18n/format.ts`:
  - `formatDate(value, locale, options?)`
  - `formatCurrency(value, locale, currency?)`
  - `formatNumber(value, locale, options?)`
- [ ] Documentar: moneda por defecto desde datos de iglesia cuando exista; fallback `DOP` o `USD` según convención actual del producto

## Definition of Done (I18N-0)

- [ ] `npm run build` exit 0
- [ ] Cambiar cookie `NEXT_LOCALE=en` muestra al menos un texto UI distinto al español
- [ ] `<html lang="...">` refleja locale activo
- [ ] Sin regresión en login / middleware auth

---

# I18N-1 — Shell, navegación y auth

## Prompt para agente

```
Implementa I18N-1 según @mejoras/AGENT-PROMPT-I18N-MODULE.md § I18N-1.

Migrar a claves i18n:
- src/lib/navigation.ts (labels nav)
- src/components/shell/* (sidebar, topbar, bottom-nav, app-shell)
- src/app/(auth)/* (login, forgot, update-password)
- src/components/auth/*
- src/app/(app)/layout.tsx (banner sin perfil iglesia)
- src/components/ui/confirm-dialog.tsx, placeholder-page.tsx
- src/components/settings/settings-view.tsx — pestañas Perfil e Idioma

**LocaleSwitcher (obligatorio):**
- Crear src/components/i18n/locale-switcher.tsx — componente compartido DRY.
- Props: variant="compact" | "list" (compact para topbar, list para settings).
- Integrar en src/components/shell/app-topbar.tsx: dropdown **a la izquierda del botón tema** (antes del icon-btn sol/luna, ~línea 92).
- Integrar en settings-view.tsx:
  - Pestaña **Idioma**: lista completa (variant="list") — reemplazar LANGUAGE_OPTIONS obsoleto.
  - Pestaña **Perfil**: bloque “Idioma de la aplicación” con el mismo control (variant="list" o inline compact).
- Al cambiar locale: server action setLocale → cookie NEXT_LOCALE + (si autenticado) BD + router.refresh().
- Sincronización: cambiar en topbar actualiza settings y viceversa.

Actualizar LANGUAGE_OPTIONS a es, en, fr únicamente.

Reglas:
- navigation.ts: exportar ids estables; labels vía función getNavEntries(t) o componente que reciba t.
- Client components: useTranslations. Server: getTranslations.
- Toasts comunes en namespace common o errors.
- npm run build al terminar.
```

## Tareas

### I18N-1.1 — Navegación

- [ ] Namespace `nav` en los 3 JSON
- [ ] Refactor `MAIN_NAV` / settings nav para no hardcodear labels
- [ ] `AppShell`, `Sidebar`, `BottomNav`, `AppTopbar` usan `t('nav.*')`

### I18N-1.2 — Auth

- [ ] Namespace `auth` — login, forgot password, update password, errores
- [ ] Migrar `login-form.tsx`, `update-password-form.tsx`, páginas `(auth)/`

### I18N-1.3 — LocaleSwitcher (topbar + settings)

- [ ] Crear `src/components/i18n/locale-switcher.tsx`
- [ ] Crear `src/lib/i18n/set-locale.ts` (server action unificada)
- [ ] **Topbar** (`app-topbar.tsx`): dropdown compacto con icono globe, **antes** del botón tema
- [ ] **Settings → Idioma**: variant list (3 opciones con bandera + nombre)
- [ ] **Settings → Perfil**: sección idioma reutilizando `LocaleSwitcher`
- [ ] `selectLocale`: cookie + BD (post I18N-7) + `router.refresh()`
- [ ] Toast traducido: `settings.localeUpdated`
- [ ] Eliminar `es-DO`, `ht` y `LOCALE_STORAGE_KEY` como fuente primaria

### I18N-1.4 — Layout app

- [ ] Banner “cuenta sin perfil iglesia” traducido
- [ ] Role label en topbar: usar `src/lib/roles/display.ts` (preparar para I18N-5)

## Definition of Done (I18N-1)

- [ ] Dropdown idioma visible en topbar junto al toggle de tema
- [ ] Cambio de idioma funciona desde topbar, Configuración → Idioma y Configuración → Perfil
- [ ] Los tres selectores muestran el mismo locale activo (sincronizados)
- [ ] es / en / fr probados en sidebar y login
- [ ] `npm run build` exit 0

---

# I18N-2 — Dashboard y placeholders

## Prompt para agente

```
Implementa I18N-2: dashboard + páginas stub (eventos, comunicación, finances redirect).

Archivos principales:
- src/components/dashboard/*
- src/app/(app)/dashboard/page.tsx
- src/app/(app)/eventos/page.tsx
- src/app/(app)/comunicacion/page.tsx
- src/components/ui/placeholder-page.tsx

Namespace: dashboard, eventos, comunicacion.
Incluir labels de gráficos, KPIs, period toolbar, empty states.
npm run build.
```

## Tareas

- [ ] Namespace `dashboard` completo
- [ ] Migrar `dashboard-view.tsx`, `dashboard-hero.tsx`, charts, KPI cards, activity feed
- [ ] Placeholders eventos y comunicación
- [ ] Fechas en dashboard usan `formatDate` con locale activo

## Definition of Done (I18N-2)

- [ ] Dashboard completo en es/en/fr
- [ ] Gráficos: títulos y leyendas traducidos (datos numéricos sin cambio)

---

# I18N-3 — Miembros

## Prompt para agente

```
Implementa I18N-3: módulo miembros completo.

Archivos:
- src/app/(app)/members/**
- src/components/members/**
- src/app/(app)/members/actions.ts (si existe) — errorKey pattern

Namespace: members, validation (campos compartidos).

Incluir: listado, filtros, perfil, historial membresía, add member modal, tabs finanzas miembro.
Sort locale-aware: .localeCompare(..., locale).
npm run build.
```

## Tareas

- [ ] Namespace `members` + ampliar `validation`
- [ ] Migrar todos los componentes en `src/components/members/`
- [ ] Server actions: mensajes de error como claves
- [ ] `member-ui.tsx` enums/labels (estado civil, género, etc.) → claves i18n

## Definition of Done (I18N-3)

- [ ] Flujo listado → perfil → editar traducido en 3 idiomas
- [ ] Sin strings españoles visibles en módulo miembros

---

# I18N-4 — Finanzas

## Prompt para agente

```
Implementa I18N-4: fondos, transacciones, contribuciones.

Archivos:
- src/app/(app)/finances/**
- src/components/funds/**
- src/components/transactions/**
- src/components/contributions/**
- src/components/finances/**
- src/components/finance/* (filtros fecha)

Namespaces: finances, funds, transactions, contributions.

Montos y fechas: formatCurrency / formatDate con locale.
npm run build.
```

## Tareas

- [ ] Namespaces financieros en JSON
- [ ] Migrar list views, drawers, dialogs, KPIs, charts
- [ ] Estados de transacción (pending, authorized, etc.)
- [ ] Diálogo autorizar transacción

## Definition of Done (I18N-4)

- [ ] Tres submódulos traducidos
- [ ] Formato moneda coherente por locale (separadores correctos)

---

# I18N-5 — Ministerios, settings y admin

## Prompt para agente

```
Implementa I18N-5: ministerios, configuración, roles, usuarios admin, catálogos.

Archivos:
- src/components/ministries/**
- src/components/settings/**
- src/components/admin-users/**
- src/components/catalog/**
- src/app/(app)/settings/**
- src/app/(app)/ministerios/**
- src/lib/roles/display.ts

Namespaces: ministerios, settings, adminUsers, catalogs, roles.

roles/display.ts: map role keys → t('roles.xxx') — no strings españoles fijos.
npm run build.
```

## Tareas

- [ ] Ministerios: list, card, form drawer, member combobox
- [ ] Settings: perfil (incl. bloque idioma), apariencia, idioma, notificaciones, acceso
- [ ] Roles y permisos UI
- [ ] Admin users + catálogos income/expense types
- [ ] NOTIFICATION_ITEMS → claves i18n

## Definition of Done (I18N-5)

- [ ] Configuración completa traducida incl. matriz permisos
- [ ] Labels de roles traducidos (Admin, Tesorero, Pastor, etc.)

---

# I18N-6 — Reportes

## Prompt para agente

```
Implementa I18N-6: hub reportes + exports PDF/XLSX.

Archivos:
- src/app/(app)/reports/**
- src/components/reports/**
- src/lib/reports/** (catalog, export pdf/xlsx, filenames, templates)

Namespaces: reports.

Los exports deben recibir locale y traducir:
- títulos de reporte
- encabezados de columnas
- labels CEAD
- nombre de archivo (filenames.ts) — sufijo locale opcional

npm run build.
```

## Tareas

- [ ] UI hub y report cards
- [ ] Pasar `locale` desde server action / page a generadores PDF y XLSX
- [ ] Namespace `reports` con sub-secciones por tipo de reporte
- [ ] Fechas en exports según locale

## Definition of Done (I18N-6)

- [ ] Descargar un reporte en `en` produce encabezados en inglés
- [ ] UI /reports traducida

---

# I18N-7 — Persistencia en base de datos

## Prompt para agente

```
Implementa I18N-7: preferred_locale en perfil de usuario.

Reglas:
- Migración: supabase migration new i18n_preferred_locale
- Columna en tabla apropiada (profiles o auth_users metadata — elegir la alineada con sp_get_session_context)
- CHECK (preferred_locale IN ('es','en','fr'))
- Extender sp_get_session_context para incluir preferred_locale
- src/lib/auth/app-session.ts: tipo Session con preferredLocale
- Al seleccionar idioma (topbar o settings): RPC/server action persiste en BD + cookie
- Al login: middleware prefiere BD sobre cookie si existe

No commits salvo que el usuario lo pida.
npm run build.
```

## Tareas

### I18N-7.1 — Migración SQL

- [ ] Columna `preferred_locale text NOT NULL DEFAULT 'es'`
- [ ] Constraint valores permitidos
- [ ] RPC `sp_update_preferred_locale(p_locale text)` o update vía profile existente

### I18N-7.2 — App session

- [ ] `getAppSession()` expone `preferredLocale`
- [ ] Server action `updatePreferredLocaleAction(locale)`

### I18N-7.3 — Prioridad de resolución

- [ ] Actualizar middleware/request config:
  1. Sesión autenticada → `preferred_locale` BD
  2. Cookie `NEXT_LOCALE`
  3. Accept-Language
  4. `es`

## Definition of Done (I18N-7)

- [ ] Usuario cambia idioma → persiste tras logout/login en otro browser
- [ ] Migración aplicable sin romper sesiones existentes (default `es`)

---

# I18N-QA — Checklist de cierre

## Prompt para agente

```
Ejecuta QA de cierre i18n según @mejoras/AGENT-PROMPT-I18N-MODULE.md § I18N-QA.
No marcar módulo cerrado hasta cumplir todos los ítems.
```

## Build y lint

- [ ] `npm run build` exit 0
- [ ] `npm run lint` sin errores nuevos

## Funcional — por locale (es, en, fr)

- [ ] Login + navegación principal
- [ ] Cambio de idioma desde **topbar** → refresh inmediato
- [ ] Cambio de idioma desde **Configuración → Idioma** → sincronizado con topbar
- [ ] Cambio de idioma desde **Configuración → Perfil** → sincronizado con topbar
- [ ] Dashboard carga sin strings mezclados
- [ ] Crear/editar miembro (labels formulario)
- [ ] Lista transacciones + autorizar (si permiso)
- [ ] Export reporte — encabezados en idioma activo
- [ ] Logout/login — idioma persistido (post I18N-7)

## Regresión auth / multitenant

- [ ] Usuario sin iglesia: banner traducido, sin crash i18n
- [ ] RBAC: nav filtrada igual en todos los locales
- [ ] Server actions denegadas muestran error traducido

## Auditoría strings (script manual)

Ejecutar búsqueda de strings españoles huérfanos en UI:

```bash
# Heurística: palabras comunes UI en español fuera de messages/
rg -l '"[^"]*(Guardar|Cancelar|Miembros|Configuración|Error al|No autorizado)[^"]*"' src \
  --glob '!src/i18n/**' --glob '!**/*.test.*'
```

- [ ] Revisar hits y migrar o excluir (datos de demo/mockup)

## Accesibilidad

- [ ] `<html lang>` correcto por locale
- [ ] `aria-label` traducidos en icon buttons del shell

## Documentación

- [ ] Comentario breve en `src/i18n/config.ts` listando locales
- [ ] Actualizar `mejoras/README.md` índice con enlace a este doc (si el usuario lo pide)

---

## Guía rápida para el agente implementador

### Server Component

```tsx
import { getTranslations } from "next-intl/server";

export default async function Page() {
  const t = await getTranslations("members");
  return <h1>{t("title")}</h1>;
}
```

### Client Component

```tsx
"use client";
import { useTranslations } from "next-intl";

export function SaveButton() {
  const t = useTranslations("common");
  return <button type="submit">{t("save")}</button>;
}
```

### Server Action — patrón errorKey

```ts
// ❌ return { error: "No autorizado" };
// ✅
return { errorKey: "errors.unauthorized" };
```

```tsx
// cliente
const t = useTranslations();
toast.error(t(result.errorKey));
```

### Pluralización

Usar ICU de next-intl:

```json
"members": {
  "count": "{count, plural, =0 {Sin miembros} one {# miembro} other {# miembros}}"
}
```

### Orden de trabajo recomendado por sesión

| Sesión | Sección | Tiempo estimado |
|--------|---------|-----------------|
| 1 | I18N-0 | 2–4 h |
| 2 | I18N-1 | 3–5 h |
| 3 | I18N-2 | 2–3 h |
| 4 | I18N-3 | 4–6 h |
| 5 | I18N-4 | 5–8 h |
| 6 | I18N-5 | 5–8 h |
| 7 | I18N-6 | 3–5 h |
| 8 | I18N-7 | 2–4 h |
| 9 | I18N-QA | 2–3 h |

**Total estimado:** 28–46 h de agente (según profundidad de traducciones FR).

---

## Riesgos y mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Middleware conflict Supabase + next-intl | Componer en un solo `src/middleware.ts`; test login/logout |
| Hydration mismatch locale | Preferir cookie leída en server; `router.refresh()` al cambiar |
| JSON desincronizados (clave falta en en/fr) | Script CI: comparar keys es.json vs en.json vs fr.json |
| Traducciones FR incorrectas | v1 machine + revisión humana antes de producción |
| PDF/XLSX olvidados | I18N-6 explícito; pasar locale a todas las funciones export |
| Flutter desalineado | Documentar mapa claves en comentario; sync manual posterior |

---

## Prompt único (sprint completo)

```
Eres ingeniero senior Next.js 16 + Supabase multitenant en evochurch-web.

Implementa el módulo i18n COMPLETO según @mejoras/AGENT-PROMPT-I18N-MODULE.md.

Rama sugerida: feat/i18n-module

Reglas:
- Lee AGENTS.md y uploads/CONTEXT.md antes de codear.
- Idiomas: es (default), en, fr. SIN Kreol — no crear locale ht ni referencias.
- next-intl, locale por cookie + BD, sin prefijo en URL.
- Ejecutar I18N-0 → I18N-7 en orden, luego I18N-QA.
- DRY: namespaces compartidos, format.ts para fechas/montos, LocaleSwitcher único.
- Server actions: errorKey, no strings literales en respuestas.
- Diff incremental; no commits salvo que el usuario lo pida.
- Al terminar: npm run build + checklist I18N-QA completo.

UX obligatoria — selector de idioma en 3 lugares (mismo componente LocaleSwitcher):
1. Topbar: dropdown compacto con icono globe, INMEDIATAMENTE A LA IZQUIERDA del botón de tema (sol/luna) en app-topbar.tsx.
2. Configuración → pestaña Idioma: lista completa es/en/fr.
3. Configuración → pestaña Perfil: bloque "Idioma de la aplicación" con el mismo control.
Cambiar en cualquier punto sincroniza cookie, BD (I18N-7) y toda la UI vía router.refresh().

Alcance por sección:
- I18N-0: infra next-intl, middleware, messages es/en/fr, format.ts
- I18N-1: shell, nav, auth, LocaleSwitcher (topbar + settings perfil + settings idioma)
- I18N-2: dashboard + placeholders
- I18N-3: miembros
- I18N-4: finanzas
- I18N-5: ministerios, settings, admin, catálogos, roles
- I18N-6: reportes UI + exports PDF/XLSX con locale
- I18N-7: preferred_locale en BD + sp_get_session_context + server action
- I18N-QA: build, lint, pruebas es/en/fr, auditoría strings

Marca DoD de cada sección antes de continuar.
No marques el módulo cerrado hasta I18N-QA 100%.
```
