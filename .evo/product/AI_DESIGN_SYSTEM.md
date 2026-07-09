# AI Design System — EvoChurch

Sistema de diseño compartido entre **Next.js web** y **Flutter**.  
**Fuente de verdad web:** `src/styles/design.css`  
**Referencia Flutter:** `uploads/UI_SPEC.md` + `lib/src/core/theme/`

---

## Filosofía visual

- **Material Design 3** como base estructural.
- **Marca morado** — identidad EvoChurch; personalizable por iglesia (white-label).
- **Verde** — ingresos, ofrendas, mayordomía (vida, crecimiento).
- **Superficies cálidas** en modo claro — sensación acogedora, no corporativa fría.
- **Modo oscuro por defecto** en web — violeta profundo y slate.

---

## Paleta de marca (defaults)

| Token | Hex | Uso |
|-------|-----|-----|
| `--accent` / primary | `#5B21B6` | Botones, items activos, fondos/diezmos |
| `--accent-strong` | `#4C1D95` | Hover, gradientes |
| `--brand-accent` | `#1E0A4C` | Logo, gradientes profundos |
| `--lila` | `#c4b5fd` | Chips suaves, dominio personas |
| `--green` | `#34d399` | Ofrendas, ingresos, ok-feel |

Definidos en `src/lib/brand/church-defaults.ts` — override por iglesia vía `churchBranding`.

---

## Colores semánticos (estados)

| Token | Hex (dark) | Uso |
|-------|------------|-----|
| `--ok` | `#4ade80` | Éxito, aprobado, activo |
| `--warn` | `#fbbf24` | Advertencia |
| `--danger` | `#f87171` | Error, eliminar, peligro |
| `--info` | `#60a5fa` | Informativo |
| `--pending` | `#c084fc` | Transacción pendiente |

Fondos suaves: `color-mix(in oklab, var(--token) 16%, transparent)`.

---

## Colores por dominio

| Token | Color | Área |
|-------|-------|------|
| `--d-people` | lila `#c4b5fd` | Miembros, personas |
| `--d-income` / `--d-offering` | verde `#34d399` | Ingresos, ofrendas |
| `--d-funds` / `--d-tithe` | morado `#5B21B6` | Fondos, diezmos |
| `--d-donation` | naranja `#fb923c` | Donaciones |
| `--d-system` | gris `#94a3b8` | Configuración |

Usar en badges, íconos de stats y charts — no mezclar dominios en la misma card sin razón.

---

## Superficies y texto

### Modo oscuro (default web)

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#0b0d12` | Fondo app |
| `--bg-1` | `#10131a` | Cards, elevación 1 |
| `--bg-2` | `#161b24` | Elevación 2 |
| `--fg` | `#e8ecf3` | Texto principal |
| `--muted` | `#828ca0` | Texto secundario |
| `--line` | `#262d3b` | Bordes, divisores |

### Modo claro

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg` | `#faf7fb` | Fondo crema |
| `--bg-1` | `#ffffff` | Cards |
| `--fg` | `#1a1228` | Texto principal |

---

## Tipografía

| Token | Familia | Uso |
|-------|---------|-----|
| `--font-ui` | Geist, system-ui | UI general |
| `--font-mono` | Geist Mono | Montos, códigos, tablas densas |
| `--font-display` | Instrument Serif | Títulos hero, marketing |

### Escala (Material 3 / UI_SPEC)

| Rol | Tamaño | Peso | Uso |
|-----|--------|------|-----|
| headlineSmall | 20–22px | bold | Títulos de sección |
| titleLarge | — | bold | AppBar / page title |
| bodyMedium | — | regular | Texto secundario |
| labelSmall | 11px | bold, tracking 0.5–1.2 | Section headers, pills |

---

## Geometría

| Token | Valor | Uso |
|-------|-------|-----|
| `--radius-sm` | 6px | Chips pequeños |
| `--radius` | 10px | Botones, inputs |
| `--radius-lg` | 14px | Cards |

UI_SPEC (Flutter): cards 12–16px, botones 12px, chips 20px — alineado conceptualmente.

### Espaciado

- Padding de página: **16–24px**
- Gap entre secciones: **20–32px**
- Sidebar expandido: **260px** · colapsado: **70px**

### Sombras

| Token | Uso |
|-------|-----|
| `--shadow-1` | Cards estándar |
| `--shadow-2` | Modales, dropdowns |
| `--shadow-3` | Overlays prominentes |

---

## Componentes clave

### Cards de stats (dashboard, listados)

- Fondo `--bg-1`, `--shadow-1`, `--radius-lg`
- Ícono en círculo con color de dominio
- Valor grande + label muted + badge de tendencia (verde/rojo)

### Chips / pills

| Tipo | Estilo |
|------|--------|
| Rol membresía | Color por rol (miembro=verde, visita=ámbar) |
| Estado transacción | pending=ámbar, approved=verde |
| Tipo ingreso | diezmo=morado, ofrenda=verde, donación=naranja |
| Filtro activo | borde `--accent` + fondo `--accent-soft` |

### Botones

| Variante | Uso |
|----------|-----|
| Primario | `--accent` fondo, `--accent-ink` texto |
| Destructivo | `--danger` — eliminar, zona de peligro |
| Ghost / secondary | borde `--line`, fondo transparente |

### Tablas

- Header: `--muted`, uppercase opcional en labelSmall
- Fila hover: `--bg-2`
- Paginación: 10/25/50 filas
- Acciones: menú ⋮ al final de fila

### Formularios

- Input: borde `--line`, focus `--accent`
- Error: borde `--danger` + texto `--danger` bajo campo
- Label: `--fg-dim`

---

## White-label por iglesia

Sesión expone `churchBranding`:

```typescript
{
  shortName, logoUrl,
  primaryColor,    // default #5B21B6
  secondaryColor,  // default #4C1D95
  accentColor      // default #1E0A4C
}
```

`resolveChurchBrandCssVars()` inyecta `--accent`, `--primary`, etc. en el layout.

**Regla:** Nunca hardcodear `#5B21B6` en componentes nuevos — usar `var(--accent)` o clases del design system.

---

## Flutter — alineación

| Web token | Flutter equivalente |
|-----------|---------------------|
| `--accent` | `colorScheme.primary` |
| `--green` | Custom success / offering color |
| `--radius-lg` | `BorderRadius.circular(12)` |
| Breakpoint móvil | `< 800px` (Flutter) / `< 768px` (web) |

Paleta base en `AGENTS.md`: `#1E0A4C`, `#4C1D95`, `#5B21B6`.

---

## Iconografía

- Material Symbols / Icons — consistente entre plataformas.
- Dominio: `people` (miembros), `attach_money` (finanzas), `event`, `church`.
- Tamaño estándar en nav: 20–24px; en stats: 24–32px en círculo.

---

## Reglas para agentes IA

1. Leer `src/styles/design.css` antes de crear CSS nuevo — reutilizar tokens.
2. No introducir colores hex sueltos — usar variables CSS existentes.
3. Nuevos dominios de producto → agregar `--d-*` en design.css, no inline.
4. Mantener paridad visual web/Flutter en módulos compartidos.
5. Dark/light deben funcionar — probar ambos modos.

---

## Documentos relacionados

- `src/styles/design.css` — implementación web
- [AI_UX_GUIDE.md](AI_UX_GUIDE.md) — patrones de pantalla
- [uploads/UI_SPEC.md](../../uploads/UI_SPEC.md) — spec Flutter detallada
- `src/lib/brand/church-defaults.ts`
