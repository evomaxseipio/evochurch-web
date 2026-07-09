# AI Business Rules — EvoChurch

Reglas de negocio del dominio iglesia. **Fuente de verdad técnica:** RPC en Postgres + validaciones en servicios. Este documento describe el *qué* y el *por qué*.

---

## Tenant e iglesia

| Regla | Detalle |
|-------|---------|
| BR-T01 | Cada registro operativo pertenece a una `church_id`. |
| BR-T02 | Un usuario (`auth_users`) está vinculado a un `profile` en una sola iglesia activa por sesión. |
| BR-T03 | Red multi-sede: `standalone`, `headquarters`, `campus` — campus tiene `parent_church_id`. |
| BR-T04 | Operaciones cross-tenant están prohibidas — validado en RPC. |

---

## Personas y miembros

### Tipos de persona

| Concepto | Campo | Regla |
|--------|-------|-------|
| **Miembro** | `is_member = true` | Persona formalmente parte de la congregación. |
| **Visita** | `is_member = false` | Visitante o contacto no membresía. |
| **Activo** | `is_active = true` | Visible en listados operativos por defecto. |
| **Inactivo** | `is_active = false` | Conserva historial; excluido de operaciones activas. |

Filtros en UI: `all | members | visits | active | inactive` — ver `src/lib/members/filters.ts`.

### Roles de membresía

- Rol eclesiástico (Diácono, Miembro, Visita, Catecúmeno…) vive en `membership.membership_role`.
- Rol **operativo** de app (Admin, Tesorero…) vive en `auth_users.app_role_id` + permisos RBAC.
- Son independientes: un diácono puede no tener acceso al sistema.

### Perfil

- `profile_id` (UUID) es la identidad de negocio — distinto de `auth.users.id` cuando aplica.
- Datos personales: nombre, contacto, dirección, documento, género, estado civil.
- Catálogos normalizados (género, estado civil, tipo ID) — valores en inglés en BD, labels en español en UI.

### Membresía (historial espiritual)

- Bautismo: fecha, iglesia, pastor, ciudad, país.
- Flags: `is_baptized_in_spirit`, `has_credential`.
- Historial de cambios de membresía — no sobrescribir silenciosamente.

---

## Usuarios y permisos

| Regla | Detalle |
|-------|---------|
| BR-A01 | Solo usuarios con `auth_users` vinculado acceden al sistema. |
| BR-A02 | `is_active = false` bloquea login. |
| BR-A03 | Contraseña temporal (`is_temp_password`) — debe cambiarse antes de operar. |
| BR-A04 | Permisos atómicos (`members:read`, `finances:transactions:authorize`, …). |
| BR-A05 | Roles custom por iglesia — permisos de sistema bloqueados para edición. |
| BR-A06 | `admin_users:manage` requerido para CRUD de usuarios admin. |

### Autorización financiera

- Transacciones pueden estar `PENDING` o `APPROVED`.
- Solo perfiles con `finances:transactions:authorize` (o `fn_can_authorize_finances`) pueden aprobar.
- Típicamente: Administrador General o Pastor.

### ABAC (ministerios y eventos)

- `ministerios:write` — edición global.
- `ministerios:write_own` — solo ministerios donde el usuario es líder (`leaderProfileIds`).
- Misma lógica para `eventos:write` / `eventos:write_own`.

---

## Finanzas

### Fondos

| Regla | Detalle |
|-------|---------|
| BR-F01 | Cada iglesia tiene uno o más fondos (General, Misiones, …). |
| BR-F02 | Un fondo puede marcarse como **primario** — uno por iglesia. |
| BR-F03 | Fondo activo/inactivo — inactivo no recibe nuevas transacciones. |
| BR-F04 | Ministerio puede tener fondo operativo vinculado (uno por ministerio). |
| BR-F05 | Meta de recaudación opcional — barra de progreso en UI. |

### Transacciones

| Regla | Detalle |
|-------|---------|
| BR-F10 | Toda transacción pertenece a un fondo y una iglesia. |
| BR-F11 | Estado inicial: `PENDING` — requiere autorización para `APPROVED`. |
| BR-F12 | Eliminar transacción `APPROVED` requiere confirmación extra en UI. |
| BR-F13 | Auditoría en cambios financieros (triggers). |

### Contribuciones (ingresos)

| Tipo | Regla |
|------|-------|
| **Diezmo** | Asociado a miembro individual; fondo típico diezmos. |
| **Ofrenda** | Puede ser individual o **colectiva** (sin miembro). |
| **Donación** | Puede ser anónima, de empresa o visitante. |

- `income_entries.recorded_by` → FK `auth.users.id` (UUID auth), no `profile_id` salvo que coincidan.
- Modos: Individual / Colectivo.
- Métodos de pago: Efectivo, Transferencia, Cheque, Tarjeta.

### Distribución de diezmo (backlog)

- Regla futura: al registrar diezmo, distribución automática según configuración de iglesia.
- Feedback Fuente Inagotable documentado en PRODUCT_STRATEGY.

### Multimoneda (futuro)

- Hoy: asumir moneda principal de la iglesia.
- Roadmap: fondos multimoneda + tasa cambiaria — no implementar hacks DOP/USD hardcoded.

---

## Ministerios

| Regla | Detalle |
|-------|---------|
| BR-M01 | Ministerio pertenece a una iglesia. |
| BR-M02 | Líderes identificados por `leaderProfileIds` (UUIDs). |
| BR-M03 | Fondo operativo opcional — máximo uno activo por ministerio. |
| BR-M04 | Permisos `write_own` limitan edición a líderes del ministerio. |

---

## Eventos

| Regla | Detalle |
|-------|---------|
| BR-E01 | Evento pertenece a iglesia; puede vincularse a ministerio. |
| BR-E02 | Visibilidad web pública configurable. |
| BR-E03 | Eventos destacados (`featured`) requieren permiso `eventos:write` global. |
| BR-E04 | Límites de eventos en sitio web por plan/configuración de iglesia. |

---

## Reportes

| Regla | Detalle |
|-------|---------|
| BR-R01 | Cada reporte tiene permiso `read` y `export` separados. |
| BR-R02 | Reportes CEAD y Concilio F001 — formatos regulatorios específicos. |
| BR-R03 | Datos de reporte filtrados por `church_id` de sesión. |
| BR-R04 | Red org: reglas adicionales en `org-report-rules.ts`. |

---

## Auditoría

| Regla | Detalle |
|-------|---------|
| BR-AU01 | Operaciones admin y financieras críticas generan entrada en audit log. |
| BR-AU02 | `audit:read` / `audit:export` — rol sistema (id=1) siempre puede leer. |

---

## Marca e iglesia

| Regla | Detalle |
|-------|---------|
| BR-C01 | Colores de marca: primary, secondary, accent — hex válido o default producto. |
| BR-C02 | Logo en Supabase Storage — URL en perfil de iglesia. |
| BR-C03 | `preferred_locale` por usuario — `es` default. |

---

## Reglas de validación en UI

- Email y teléfono — formato básico antes de enviar.
- Montos — positivos; formato moneda según locale.
- Fechas — no futuras donde no aplique (ej. bautismo).
- Eliminar miembro — permiso `members:delete` + confirmación.

---

## Motor de asistencia (futuro — EPIC 03)

**Principio de producto:** Un solo motor para cultos, casas fuente, escuela bíblica, niños.  
No crear módulos de asistencia separados por actividad.

---

## Cuando implementes una regla nueva

1. Documentar aquí (BR-XX).
2. Implementar en RPC (fuente de verdad).
3. Reflejar en servicio web y repositorio Flutter.
4. Agregar permiso RBAC si requiere autorización nueva.
5. Actualizar PRODUCT_STRATEGY si es feature nueva.

---

## Documentos relacionados

- [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md)
- [AI_PRODUCT_GUIDE.md](AI_PRODUCT_GUIDE.md)
- [../architecture/MULTI_TENANT.md](../architecture/MULTI_TENANT.md)
- `src/lib/members/filters.ts`
- `src/lib/auth/permission-keys.ts`
