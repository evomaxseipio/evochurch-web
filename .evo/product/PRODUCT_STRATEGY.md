# EvoChurch Product Strategy

## Visión

Ser el Sistema Operativo para la administración de iglesias en Latinoamérica, permitiendo que el liderazgo dedique menos tiempo a la administración y más tiempo al ministerio.

---

# Estados

💡 Idea

📋 Backlog

📝 Diseño

🚧 En Desarrollo

🧪 Validación

✅ Terminado

❄️ Pospuesto

🚫 Descartado

---

# Prioridades

🔴 Crítica

🟠 Alta

🟡 Media

🟢 Baja

---

# EPIC 01 — Personas

## Objetivo

Administrar completamente el ciclo de vida del miembro.

---

### Feature

Estado Activo/Inactivo

Estado: 🧪 Validación

Prioridad: 🔴

Complejidad: Baja

Valor: Muy Alto

Sprint: 01

---

### Feature

Tipo de sangre

Estado: 🧪 Validación

Prioridad: 🟡

Complejidad: Baja

Valor: Medio

Dependencia:

Ninguna

---

### Feature

Información profesional

Estado: 📋 Backlog

Prioridad: 🟡

Complejidad: Media

Valor: Alto

Comentarios

Permitirá localizar profesionales dentro de la iglesia.

---

### Feature

Timeline del miembro

Estado: 💡 Idea

Prioridad: 🟠

Complejidad: Alta

Valor: Muy Alto

Comentarios

Toda la historia del miembro en una sola línea de tiempo.

---

# EPIC 02 — Finanzas

## Objetivo

Convertir EvoChurch en la plataforma financiera más transparente para iglesias.

---

### Feature

Distribución automática del diezmo

Estado: 📋 Backlog

Prioridad: 🔴

Complejidad: Media

Valor: Muy Alto

Feedback

Reunión Iglesia Fuente Inagotable

---

### Feature

Fondos Multimoneda

Estado: 📋 Backlog

Prioridad: 🟠

Complejidad: Alta

Valor: Muy Alto

Comentarios

No limitar a DOP/USD.

Diseñar arquitectura multicurrency.

---

### Feature

Tasa cambiaria

Estado: 💡 Idea

Prioridad: 🟠

Complejidad: Media

Dependencia

Fondos Multimoneda

---

### Feature

Configuración financiera por iglesia

Estado: 💡 Idea

Prioridad: 🟠

Comentarios

Cada iglesia define reglas propias de distribución.

---

# EPIC 03 — Attendance Engine

## Objetivo

Registrar asistencia para cualquier actividad de la iglesia mediante un único motor reutilizable.

---

### Feature

Motor genérico de asistencia

Estado: 📋 Backlog

Prioridad: 🔴

Complejidad: Alta

Comentarios

No crear módulos separados para:

- Cultos
- Casas Fuente
- Niños
- Escuela Bíblica

Implementación web entregada: sesiones reutilizables, roster por ministerio,
asistencia de niños y modo agregado. Pendiente de piloto en staging y validación
de las migraciones remotas antes de marcarla terminada.

---

### Feature

Casas Fuente

Estado: 🧪 Validación

Depende:

Motor de asistencia

Cobertura incluida en el motor web; requiere validación del flujo real de una
iglesia piloto.

---

### Feature

Escuela Bíblica

Estado: 🧪 Validación

Depende:

Motor de asistencia

Cobertura incluida en el motor web; requiere validación del flujo real de una
iglesia piloto.

---

### Feature

Ministerio de Niños

Estado: 🧪 Validación

Depende:

Motor de asistencia

Cobertura web incluida; la paridad Flutter queda como siguiente entrega móvil.

---

# EPIC 04 — Ministerios

## Objetivo

Dar autonomía a cada ministerio sin perder el control administrativo.

---

### Feature

Ministerio de Niños

Estado: 📋 Backlog

Prioridad: 🟠

Complejidad: Alta

Comentarios

Debe integrarse al motor de asistencia.

---

### Feature

Fondos por Ministerio

Estado: 💡 Idea

Comentarios

Un ministerio puede administrar uno o varios fondos.

---

# EPIC 05 — CRM Pastoral

## Objetivo

Cada miembro tiene una historia.

No solamente un registro.

---

### Feature

Timeline

Estado: 💡 Idea

---

### Feature

Eventos relevantes

Estado: 💡 Idea

Ejemplos

- Enfermedades
- Accidentes
- Ayudas económicas
- Pérdidas familiares
- Reconocimientos
- Restauración
- Discipulado

---

### Feature

Notas pastorales

Estado: 💡 Idea

Comentarios

Privadas según permisos.

---

# EPIC 06 — Dashboard

## Objetivo

Que un pastor pueda conocer el estado de la iglesia en menos de cinco minutos.

---

### Feature

Montos completos

Estado: 🧪 Validación

---

### Feature

KPIs inteligentes

Estado: 💡 Idea

Ejemplos

- Tendencia de asistencia

- Tendencia financiera

- Riesgos

- Miembros inactivos

---

# EPIC 07 — Automatización

## Objetivo

Eliminar tareas repetitivas.

---

### Feature

Recordatorios automáticos

Estado: 💡 Idea

---

### Feature

Alertas financieras

Estado: 💡 Idea

---

### Feature

Alertas pastorales

Estado: 💡 Idea

---

### Feature

Seguimiento de nuevos convertidos

Estado: 💡 Idea

---

# EPIC 08 — Inteligencia Artificial

## Objetivo

Convertir EvoChurch en un asistente inteligente para el liderazgo.

---

### Feature

Preguntas en lenguaje natural

Ejemplo

¿Cuánto ofrendó Caballeros este año?

---

### Feature

Detección de tendencias

---

### Feature

Predicción financiera

---

### Feature

Asistente Pastoral

---

# Ideas en evaluación

(No priorizadas todavía)

- Firma digital

- Portal del miembro

- Portal del líder

- Aplicación móvil del miembro

- Integraciones bancarias

- WhatsApp

- OCR de recibos

- Concilios

- Multi-sede

- Workflow Approval

- Inventario

- Biblioteca

- Reservación de recursos

- Agenda pastoral

- Seguimiento de visitas

---

# Regla del Roadmap

Una funcionalidad nunca pasa directamente a Desarrollo.

Siempre sigue este flujo:

💡 Idea

↓

📋 Backlog

↓

📝 Diseño

↓

🚧 Sprint

↓

🧪 Validación

↓

✅ Producción
