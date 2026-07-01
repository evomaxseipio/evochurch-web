# PROMPT DE ESPECIFICACIÓN UI — EvoChurch

---

## CONTEXTO DEL PRODUCTO

**EvoChurch** es una aplicación de administración para iglesias. Permite gestionar miembros, finanzas (fondos, transacciones, contribuciones), usuarios administradores y configuraciones. Es una app **web-first pero también móvil**, construida en Flutter.

**Audiencia:** Pastores, tesoreros y administradores de iglesias.
**Objetivo:** Plataforma limpia, profesional y confiable para gestionar todos los aspectos operacionales de una congregación.

---

## SISTEMA DE DISEÑO

**Design system:** Material Design 3

**Paleta de colores:**
- Primario: `#5B21B6` (violeta oscuro) — botones, items activos del menú, chips seleccionados
- Primario oscuro: `#4C1D95`
- Primario más oscuro: `#1E0A4C` — gradientes, logo
- Acento éxito: `#15803D` / `#DCFCE7`
- Acento peligro: `#EF4444` / rojo
- Acento advertencia: `#D97706` / ámbar
- Neutros surface: `#F1F5F9` (light), surface cards `#FFFFFF`
- Texto secundario: `#64748B` / `#94A3B8`
- Border / divider: `#CBD5E1`

**Tipografía:** System font (Roboto/Inter), escala Material 3
- `headlineSmall`: bold, 20–22px — títulos de sección
- `titleLarge`: bold — AppBar titles
- `bodyMedium`: regular — texto secundario, subtítulos
- `labelSmall`: bold, 11px, letra-spacing 0.5–1.2 — section headers del menú, pills/badges

**Radios y espacios:**
- Cards: `BorderRadius 12–16px`
- Botones: `BorderRadius 12px`
- Chips/pills: `BorderRadius 20px`
- Padding general: 16–24px
- Gaps entre secciones: 20–32px

**Modo oscuro:** La app soporta light y dark mode. En modo oscuro, las superficies usan tonos violeta muy oscuro / slate oscuro. Hay un toggle de tema en el top bar.

---

## LAYOUT GENERAL — SHELL ADMINISTRADOR

**Breakpoints:**
- `>= 1024px` = Desktop
- `768px–1023px` = Tablet
- `< 768px` = Móvil

**Layout desktop (>= 1024px):**

```
┌─────────────────────────────────────────────────┐
│  [SideMenu 260px]  │  [TopBar]                  │
│                    │─────────────────────────────│
│  Logo + Nombre     │  [Contenido de la pantalla] │
│  ─────────────     │                             │
│  PRINCIPAL         │                             │
│    Dashboard       │                             │
│    Miembros        │                             │
│  FINANZAS          │                             │
│    Fondos          │                             │
│    Contribuciones  │                             │
│    Transacciones   │                             │
│  CONFIGURACIÓN     │                             │
│    Usuarios        │                             │
│    Gastos          │                             │
└─────────────────────────────────────────────────┘
```

**SideMenu colapsable:** Al colapsar (70px), solo muestra íconos. El toggle está en el TopBar. El ítem activo se resalta con fondo `#5B21B6` + texto blanco + sombra violeta. Items inactivos: texto gris, hover con fondo subtil. El logo es un ícono de iglesia en gradiente violeta con `BorderRadius 12px`.

**TopBar desktop:**
- Izquierda: botón hamburguesa colapsar → título "EvoChurch" (bold) + subtítulo dinámico de la sección actual
- Derecha: ThemeSelector toggle (light/dark) → ícono de notificaciones con dot rojo → avatar circular con popup de logout

**TopBar móvil:**
- Izquierda: hamburguesa → título de la sección
- Derecha: ThemeSelector → notificaciones → avatar

**Tablet:** Sidebar se convierte en Drawer (deslizable desde la izquierda, 320px). Resto igual al desktop.

**Móvil:** El sidebar es un Drawer (280px). En modales/detalles, se usan BottomSheet draggables en vez de drawers laterales.

---

## PANTALLAS A GENERAR

---

## PANTALLA 1 — LOGIN

**Ruta:** `/login`

**Descripción:** Pantalla de inicio de sesión. Diseño split: fondo decorativo a la izquierda y formulario a la derecha en desktop. En móvil, solo el formulario centrado.

**Elementos:**
- Fondo izquierdo (desktop): gradiente profundo violeta (`#1E0A4C` → `#5B21B6`), con curvas decorativas tipo canvas, y texto "Bienvenido a EvoChurch" / "Church Management System"
- Panel derecho blanco (o card en móvil):
  - Logo + nombre "EvoChurch" en la parte superior
  - Título "Iniciar sesión"
  - Campo email con ícono de sobre
  - Campo contraseña con ícono de candado + botón ojo toggle
  - Link "¿Olvidaste tu contraseña?" (abre un dialog)
  - Botón primario "Iniciar sesión" (full width, `#5B21B6`)
  - Link "¿No tienes cuenta? Regístrate"
- Estado de error: banner rojo encima del botón
- Estado de carga: botón con spinner

**Paleta del fondo:** Violeta profundo con formas curvas tipo blob/wave en violeta más claro.

---

## PANTALLA 2 — DASHBOARD (HOME)

**Ruta:** `/`

**Descripción:** Vista de resumen general de la iglesia. Muestra la estructura completa con datos de ejemplo.

**Layout desktop (3 zonas verticales):**

**Zona 1 — Stats Grid (4 columnas en desktop, 2 en tablet, 1 en móvil):**

Cada tarjeta tiene:
- Fondo blanco con sombra suave
- Ícono en círculo de color (uno por tarjeta)
- Título en gris secundario
- Valor grande y bold
- Badge de tendencia (ej. `+12.5%` en verde)
- Texto footer pequeño

Las 4 stat cards son:
1. **Total Miembros** — ícono `people`, color azul/violeta, valor `1,248`, trend `+12.5%`, footer `+150 este mes`
2. **Asistencia Semanal** — ícono `person_add_alt`, color verde, valor `892`, trend `+8.2%`, footer `71% de miembros`
3. **Ingresos Mensuales** — ícono `attach_money`, color amarillo/dorado, valor `$27,450`, trend `+23.1%`, footer `Meta: $25,000`
4. **Eventos Esta Semana** — ícono `event`, color cyan, valor `8`, trend `Esta Semana`, footer `3 eventos hoy`

**Zona 2 — Gráficos (2/3 + 1/3 en desktop, apilados en móvil/tablet):**
- `FinancialChartCard` (2/3): card blanca con título, subtítulo, gráfico de barras o línea de ingresos mensuales
- `DonationBreakdownCard` (1/3): card blanca con donut chart o pie chart de distribución de donaciones por categoría

**Zona 3 — Bottom grid (3 columnas en desktop, apilados en móvil/tablet):**
- `QuickActionsCard`: lista de acciones rápidas (Agregar Miembro, Nueva Transacción, Registrar Ofrenda, etc.) con íconos y botones
- `RecentActivityCard`: lista de actividad reciente (últimas transacciones/contribuciones) con timestamp
- `UpcomingEventsCard`: eventos próximos con fecha, hora, nombre

---

## PANTALLA 3 — LISTA DE MIEMBROS

**Ruta:** `/members`

**Descripción:** Directorio completo de miembros de la iglesia con filtros, búsqueda y acciones.

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  [Stats Cards — filtros interactivos]           │
│  Todos (N) | Miembros (N) | Visitas (N)         │
│  Activos (N) | Inactivos (N)                    │
├─────────────────────────────────────────────────┤
│  [Barra de herramientas]                        │
│  Buscar... | [Agregar Miembro] [Exportar]        │
├─────────────────────────────────────────────────┤
│  [DataTable desktop / ListView móvil]           │
└─────────────────────────────────────────────────┘
```

**Stats Cards (clickeables para filtrar):**
Son cards horizontales pequeñas con número y etiqueta. La card activa tiene borde violeta y fondo violeta muy sutil. Funcionan como filtros: All, Members, Visits, Active, Inactive.

**DataTable desktop — columnas:**
`Nombre Completo | Rol de Membresía | Nacionalidad | Email | Teléfono | Fecha de Nacimiento | Acciones`

**Columna "Rol de membresía":** Chip de status con colores (Miembro = verde, Visita = amarillo, Diácono = azul, etc.)

**Menú de acciones por fila (3 puntos):**
- Editar perfil
- Registrar Diezmos
- Registrar Ofrenda
- Mensajes _(próximamente)_
- Configurar usuario
- Eliminar _(rojo)_

**Vista móvil:** `ListView` con cards. Cada card: avatar/iniciales, nombre, rol (chip), email, teléfono, menú de acciones.

**Botón "Agregar Miembro":** Abre un modal/dialog con el formulario de creación.

**Estado vacío:** Ícono grande centrado + texto + botón CTA.
**Estado de carga:** Spinner centrado.

---

## PANTALLA 4 — PERFIL DE MIEMBRO

**Ruta:** `/members/profile`

**Descripción:** Vista detallada de un miembro con tabs. Layout de 2 paneles en desktop.

**Layout desktop:**

```
┌──────────────────┬──────────────────────────────┐
│ SIDEBAR (230px)  │  CONTENIDO DEL TAB           │
│                  │                              │
│ "Account         │                              │
│  Settings"       │                              │
│                  │                              │
│ ► Profile        │                              │
│   Membership     │                              │
│   Finances       │                              │
│   ─────────      │                              │
│   Delete Acct    │                              │
│   (rojo)         │                              │
└──────────────────┴──────────────────────────────┘
```

**Layout móvil:** AppBar con título del tab activo + ícono hamburguesa → abre Drawer con el sidebar.

**Tab 1 — Profile (MemberMaintance):**
- Formulario editable con los datos personales del miembro:
  - Nombre, Apellido, Fecha de nacimiento, Género, Nacionalidad, Estado civil
  - Dirección (calle, ciudad, estado, país, código postal)
  - Contacto (email, teléfono, teléfono alternativo)
  - Dropdown de Rol de Membresía (lista de roles)
  - Toggle Activo/Inactivo
  - Botón "Guardar cambios" al final

**Tab 2 — Membership:**
- Formulario/display de historial de membresía:
  - Fecha de bautismo, Iglesia de bautismo, Pastor que bautizó
  - Ciudad y país del bautismo
  - Toggle: ¿Bautizado en el espíritu?
  - Toggle: ¿Tiene credencial?
  - Rol de membresía
  - Historial (lista de cambios de membresía con fechas)

**Tab 3 — Finances:**
- Resumen financiero del miembro:
  - Estadísticas de contribuciones (total diezmos, total ofrendas, total donaciones)
  - Lista de registros de colectas asociados al miembro (fecha, tipo, monto, fondo)

**Tab 4 — Delete Account:**
- Zona de peligro: texto de advertencia + botón rojo "Eliminar cuenta"

---

## PANTALLA 5 — FONDOS

**Ruta:** `/finances/funds`

**Descripción:** Gestión de los fondos financieros de la iglesia (ej. Fondo General, Fondo Misiones, etc.)

**Header de página:**
- Título "Fondos" (bold) + subtítulo "Gestiona los fondos de la congregación"
- Botón "Agregar Fondo" alineado a la derecha (violeta, con ícono `+`)

**Stats Header (FundStatsHeader):**
- Row de métricas: total de fondos, fondos activos, total recaudado, progreso vs meta
- Estilo: cards pequeñas horizontales con valor numérico grande y etiqueta

**FilterBar:**
- Campo de búsqueda (400px en desktop, full width en móvil) con ícono lupa + botón clear
- Segmented buttons: Todos | Activos | Inactivos
- Toggle de vista: Grid cards / Tabla (solo desktop/web)

**Vista Grid (default desktop):** Grid de 3 columnas con FundCard.

**FundCard:**
- Card con sombra suave, `BorderRadius 12px`
- Header: nombre del fondo (bold) + pill "PRIMARIO" (violeta con estrella) si aplica
- Pill de estado: Activo (verde, `#DCFCE7` bg / `#15803D` texto / `#86EFAC` border) / Inactivo (gris)
- Descripción en gris secundario
- Barra de progreso (recaudado / meta) con porcentaje
- Montos: "Recaudado: $X,XXX" y "Meta: $X,XXX"
- Footer con fecha de inicio
- Menú de acciones (3 puntos):
  - Ver transacciones
  - Agregar transacción
  - Ver contribuciones
  - Marcar como primario _(si no es primario)_
  - Editar
  - Eliminar _(rojo)_

**Vista Lista (DataTable):** Columnas: `Nombre | Estado | Recaudado | Meta | Progreso | Fecha inicio | Acciones`

**Vista móvil:** ListView de FundCard en 1 columna.

**Estado vacío:** Ícono de wallet grande (88x88, bg violeta sutil) + "No hay fondos registrados" + subtítulo + CTA "Crear primer fondo".

---

## PANTALLA 6 — DETALLE DE FONDO

**Ruta:** `/finances/funds/details`

**Descripción:** Vista detallada de un fondo específico con sus transacciones asociadas.

**Layout:**
- Header con nombre del fondo, descripción, stats (balance, recaudado, meta, progreso)
- Barra de progreso visual grande
- DataTable o ListView de transacciones del fondo:
  - Columnas: `Descripción | Monto | Estado | Creado por | Fecha | Autorizado por | Fecha autorización`
  - Badge de estado: PENDING = pill amarillo/ámbar, APPROVED = pill verde
  - Botón "Autorizar" visible solo para transacciones pending si el usuario tiene permisos

---

## PANTALLA 7 — TRANSACCIONES

**Ruta:** `/finances/transactions`

**Descripción:** Vista global de todas las transacciones financieras de todos los fondos.

**AppBar:** Título "Transacciones"

**Stats Header (TransactionStatsHeader):**
- Total transacciones, monto total, pendientes, aprobadas

**FilterBar:**
- Chips de filtro: Todos | Pendientes | Aprobados
- Dropdown "Fondo" (filtra por fondo específico, 220px)
- Campo de búsqueda (220px)
- Botón selector de fecha (DatePicker) + botón "Quitar fecha" (visible solo si hay fecha activa)

**DataTable desktop — columnas:**
`Fondo | Descripción | Monto | Estado | Creado por | Fecha | Autorizado por | Fecha autorización | Acciones`

**Columna Estado:**
- PENDING: pill amarillo/ámbar + botón "Autorizar" inline (si el usuario tiene permisos)
- APPROVED: pill verde

**Menú de acciones (3 puntos) por fila:**
- Editar
- Agregar aportes
- Eliminar _(rojo, con warning extra si está APPROVED)_

**Botones de la tabla:** "Nueva transacción" (ícono de mano sosteniendo billete) | "Imprimir" | "Exportar"

**Vista móvil:** ListView de TransactionCard. Cada card muestra fondo, descripción, monto, estado y botón "Autorizar" si aplica.

**Estado vacío:** Ícono de recibo largo grande + "No hay transacciones registradas" + CTA.

---

## PANTALLA 8 — CONTRIBUCIONES

**Ruta:** `/finances/contributions`

**Descripción:** Registro de ingresos (diezmos, ofrendas, donaciones) individuales y colectivos.

**AppBar:** Título dinámico: "Contribuciones de la iglesia" o "Contribuciones — [Nombre Fondo]" si viene de un fondo específico.

**Stats Header (ContributionStatsHeader):**
- Total ingresos, total diezmos, total ofrendas, total donaciones
- Cards pequeñas horizontales con valor numérico grande

**FilterBar:**
- Chips: Todos | Diezmos | Ofrendas | Donaciones
- Campo búsqueda (260px)

**DataTable desktop — columnas:**
`Tipo | Fondo | Contribuyente | Monto | Fecha | Método de pago | Modo (Individual/Colectivo) | Acciones`

**Columna "Tipo" — IncomeTypeBadge (pill de color por categoría):**
- Diezmo/tithe: violeta
- Ofrenda/offering: azul
- Donación/donation: verde

**Columna "Contribuyente":** Muestra nombre del miembro, "Anónimo", nombre de empresa, o "Ofrenda colectiva" según el tipo de colecta.

**Acción por fila:** Solo "Eliminar" (rojo).

**Botón "Agregar ingreso":** En la tabla desktop y como FAB en móvil. Abre un flujo multi-step (wizard):
1. Seleccionar tipo de ingreso (Diezmo, Ofrenda, Donación)
2. Seleccionar fondo destino
3. Modo: Individual o Colectivo
4. Datos del contribuyente (si es individual): buscar miembro, o "Anónimo", o visitante
5. Monto, fecha, método de pago (Efectivo, Transferencia, Cheque, Tarjeta)

**Vista móvil:** ContributionCard en ListView. Cada card: tipo (badge de color), contribuyente, fondo, monto grande, fecha, método de pago.

**Estado vacío:** Ícono de savings grande semitransparente + "No hay ingresos registrados" + CTA.

---

## PANTALLA 9 — USUARIOS ADMINISTRADORES

**Ruta:** `/configurations/users`

**Descripción:** Gestión de usuarios con acceso al sistema.

**DataTable desktop:** Título "Admin Users Directory"
- Columnas: `Email | Nombre | Apellido | Rol | Último acceso | Acciones`
- Menú de acciones: Editar usuario | Cambiar contraseña | Eliminar _(rojo)_
- Botones de tabla: "Add User" | "Print" | "Export"

**Vista móvil:**
- Header: título "Users Directory" + botones de acción como IconButton
- Barra de búsqueda full-width
- ListView de cards. Cada card: nombre + apellido (bold), email, role chip, menú de 3 puntos

**Chip de rol:** Coloreado según nivel de acceso.

**Modal "Agregar/Editar Usuario":** Dialog con formulario:
- Email, contraseña (solo en creación), nombre, apellido, rol (dropdown), estado activo/inactivo

---

## PANTALLA 10 — GASTOS (TIPOS DE GASTO)

**Ruta:** `/expenses`

**Descripción:** Catálogo de tipos de gastos de la iglesia (para categorizar salidas de dinero).

**Layout:** DataTable con búsqueda + botones (Agregar, Imprimir, Exportar)
- Columnas: `Nombre del tipo | Descripción | Estado | Acciones`
- Acciones: Editar, Eliminar

---

## COMPONENTES / MODALES TRANSVERSALES

### Modal "Agregar/Editar Fondo"
- Formulario en dialog: Nombre del fondo, Descripción, Fecha inicio, Monto meta (opcional), Estado (Activo/Inactivo)
- Botones: Cancelar / Guardar

### Modal "Nueva / Editar Transacción"
- Formulario: Fondo (dropdown), Descripción, Monto, Tipo de gasto (dropdown), Fecha, Notas
- En edición: formulario pre-poblado con datos existentes
- Botones: Cancelar / Guardar

### Modal "Autorizar Transacción"
- Card con resumen de la transacción (descripción, monto, fondo, fecha)
- Botón "Confirmar autorización" (violeta, full width)

### Modal "Agregar Miembro"
- Formulario multi-sección:
  1. Datos personales (nombre, apellido, fecha nac., género, nacionalidad, estado civil)
  2. Dirección (calle, ciudad, estado, país, código postal)
  3. Contacto (email, teléfono)
  4. Rol de membresía

### Modal "Agregar Ingreso" (wizard multi-step)
- Steps visuales en la parte superior (indicador de paso actual)
- Flujo de 3–5 pasos según tipo seleccionado

### Dialog de confirmación de eliminación
- Título: "Eliminar [entidad]"
- Mensaje de advertencia
- Warning extra en ámbar si el ítem está aprobado o activo
- Botones: Cancelar | Eliminar (rojo `FilledButton`)

### Feedback Modal (CupertinoModal)
- Aparece tras acciones del servidor (éxito/error/advertencia)
- Ícono + título + mensaje + botón "OK"
- Verde = success, Rojo = error, Amarillo = warning

### Toast / Snackbar
- Aparece en esquina inferior para mensajes informativos cortos y transitorios

---

## ESTADOS GLOBALES A REPRESENTAR EN CADA PANTALLA

| Estado | Representación visual |
|---|---|
| Carga | `CircularProgressIndicator` centrado + texto descriptivo |
| Vacío | Ícono grande semitransparente + título bold + subtítulo gris + botón CTA |
| Error | Ícono rojo + mensaje + botón "Reintentar" |
| Con datos | Lista / grid / tabla normal |

---

## NOTAS ADICIONALES DE UX

- **Responsive siempre:** Todo debe verse bien desde 375px (iPhone SE) hasta 1920px
- **Dark mode:** Los fondos oscuros usan slate oscuro (`#0F172A`, `#1E293B`). Cards: `#1E293B` / `#334155`. El violeta sigue siendo el acento en dark mode
- **Accesibilidad:** Contraste mínimo WCAG AA. Todos los íconos tienen tooltip
- **Feedback inmediato:** Botones muestran loading state mientras esperan respuesta del servidor
- **Paginación:** Las tablas grandes están paginadas (10/25/50 filas por página) con controles en el footer
- **Menú colapsable:** En desktop, el sidebar tiene transición animada (300ms ease-in-out) entre 260px expandido y 70px colapsado
- **Formularios:** Validación inline en tiempo real. Bordes rojos + mensaje de error bajo el campo en caso de error

---

## PRODUCTO FINAL ESPERADO

Una app de administración eclesiástica con:
- Sidebar de navegación violeta profundo (`#1E0A4C` → `#5B21B6`)
- Contenido limpio en cards blancas con sombras suaves
- Tablas paginadas con acciones contextuales por fila
- Formularios bien estructurados en modales/dialogs
- Gráficos financieros en el dashboard
- Experiencia completamente adaptativa de desktop a móvil
- Soporte nativo de light/dark mode
