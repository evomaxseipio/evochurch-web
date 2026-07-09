# AI UX Guide — EvoChurch

Principios de experiencia de usuario para web (Next.js) y móvil (Flutter).

**Audiencia de diseño:** Pastores, tesoreros y administradores de iglesias — usuarios con poca paciencia para software complejo.

---

## Principios UX

### 1. Claridad sobre densidad
Mostrar lo esencial primero. Detalles en segundos niveles (tabs, modales, drawers).

### 2. Confianza
Finanzas y datos de personas exigen UI sobria, consistente y sin sorpresas. Errores claros, confirmaciones en acciones destructivas.

### 3. Eficiencia para operadores frecuentes
Atajos, filtros clickeables, búsqueda rápida, acciones por fila en tablas. El tesorero registra contribuciones muchas veces al día.

### 4. Responsive real
Funcional desde 375px (móvil) hasta 1920px (desktop). No es un adaptador — es la misma tarea con layout distinto.

### 5. Feedback inmediato
Loading en botones, toasts/snackbars, estados vacío con CTA. Nunca dejar al usuario sin saber si algo pasó.

---

## Diseño para iglesias

- **Tono:** Profesional, cálido, no corporativo frío ni infantil.
- **Jerarquía:** Lo pastoral y lo financiero coexisten — no mezclar acciones de ambos sin contexto.
- **Privacidad:** Datos sensibles (notas pastorales, finanzas individuales) requieren permisos explícitos — la UI debe reflejarlo (ocultar, no solo deshabilitar).
- **White-label:** Colores de iglesia desde `churchBranding` — defaults morado si no hay personalización.

---

## Layout — Shell administrador

### Breakpoints

| Rango | Modo | Navegación |
|-------|------|------------|
| ≥ 1024px | Desktop | Sidebar 260px (colapsable a 70px) |
| 768–1023px | Tablet | Drawer 320px |
| < 768px | Móvil | Drawer 280px + bottom sheets |

### Estructura

```
┌ Sidebar ──┬── TopBar ─────────────────────┐
│ Logo      │ Título sección · tema · user  │
│ Nav       ├───────────────────────────────┤
│ secciones │ Contenido (cards, tablas)     │
└───────────┴───────────────────────────────┘
```

- **Item activo:** fondo `--accent`, texto blanco, sombra sutil.
- **TopBar:** título dinámico de sección, toggle tema, notificaciones, avatar/logout.

Referencia web: `src/styles/design.css` · Flutter: `uploads/UI_SPEC.md`

---

## Patrones por tipo de pantalla

### Listados (miembros, transacciones, contribuciones)

1. **Stats cards** clickeables como filtros (Todos | Miembros | Visitas | Activos | Inactivos).
2. **Barra de herramientas:** búsqueda + acción primaria (Agregar) + exportar.
3. **Desktop:** DataTable paginada con menú de acciones por fila (⋮).
4. **Móvil:** ListView de cards con la misma información condensada.
5. **Estados:** carga (spinner), vacío (ícono + CTA), error (reintentar).

### Detalle con tabs (perfil miembro)

- **Desktop:** sidebar de tabs (230px) + contenido.
- **Móvil:** AppBar + drawer de tabs.
- Tabs típicos: Perfil · Membresía · Finanzas · Zona de peligro.

### Formularios

- Validación inline — borde rojo + mensaje bajo el campo.
- Secciones agrupadas (datos personales, dirección, contacto).
- Botón guardar al final — loading state mientras persiste.
- Normalizar valores (género, estado civil) — ver `src/lib/members/catalogs.ts`.

### Modales y wizards

| Patrón | Uso |
|--------|-----|
| Dialog | Crear/editar entidad simple (fondo, tipo de gasto) |
| Wizard multi-step | Agregar ingreso (tipo → fondo → modo → contribuyente → monto) |
| Confirmación destructiva | Eliminar — warning extra si está aprobado/activo |
| Bottom sheet (móvil) | Alternativa a drawer lateral en detalles |

### Finanzas — estados visuales

| Estado | Color | UI |
|--------|-------|-----|
| PENDING | `--pending` / ámbar | Pill + botón "Autorizar" si tiene permiso |
| APPROVED | `--ok` / verde | Pill verde |
| Diezmo | `--d-funds` / morado | IncomeTypeBadge |
| Ofrenda | `--d-income` / verde | IncomeTypeBadge |
| Donación | `--d-donation` / naranja | IncomeTypeBadge |

---

## Navegación

### Web (`src/app/(app)/`)

| Sección | Rutas |
|---------|-------|
| Principal | `/dashboard`, `/members` |
| Finanzas | `/finances/funds`, `/transactions`, `/contributions` |
| Operaciones | `/ministerios`, `/eventos`, `/comunicacion` |
| Reportes | `/reports` |
| Red | `/network` |
| Configuración | `/settings/*` |

### Flutter

GoRouter con auth guard — ver `uploads/CLAUDE.md` tabla de rutas.

**Regla:** Misma nomenclatura de módulos entre web y Flutter cuando el módulo existe en ambos.

---

## Mensajes y copy

- **Idioma principal:** Español (Latinoamérica).
- **i18n:** Inglés como secundario — keys en catálogos, no strings hardcodeados en lógica.
- **Errores:** Mensaje humano vía `errorKey` — no exponer SQL ni stack traces.
- **Éxito:** Toast breve o modal de confirmación según impacto de la acción.
- **Vacío:** Título + subtítulo + CTA ("Crear primer fondo", "Agregar miembro").

---

## Accesibilidad

- Contraste mínimo **WCAG AA**.
- Íconos con tooltip o label visible.
- Focus visible en controles interactivos.
- Tablas: headers semánticos; en móvil, información no solo por color.

---

## Modo oscuro y claro

- **Web default:** oscuro (`:root` en `design.css`).
- **Claro:** `[data-theme="light"]` — fondos crema cálidos (`#faf7fb`), no gris frío.
- **Toggle** en TopBar — persistir preferencia.
- **Flutter:** Material 3 theme — misma paleta base.

---

## Checklist UX para nuevas pantallas

- [ ] Funciona en móvil, tablet y desktop
- [ ] Estados: carga, vacío, error, con datos
- [ ] Acción primaria visible sin scroll
- [ ] Confirmación en eliminar y acciones irreversibles
- [ ] Permisos reflejados (ocultar acciones no autorizadas)
- [ ] Loading en botones de guardado
- [ ] i18n para strings nuevos
- [ ] Consistente con [AI_DESIGN_SYSTEM.md](AI_DESIGN_SYSTEM.md)

---

## Documentos relacionados

- [AI_DESIGN_SYSTEM.md](AI_DESIGN_SYSTEM.md) — tokens, colores, tipografía
- [uploads/UI_SPEC.md](../../uploads/UI_SPEC.md) — especificación detallada por pantalla (Flutter)
- `src/styles/design.css` — tokens web
- [AI_PRODUCT_GUIDE.md](AI_PRODUCT_GUIDE.md)
