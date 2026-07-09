# AI Product Guide — EvoChurch

Guía para evaluar, priorizar y diseñar funcionalidades alineadas con la visión del producto.

---

## Filosofía del producto

EvoChurch **no es un software administrativo genérico**. Es el **Sistema Operativo de una Iglesia**.

Toda feature debe fortalecer al menos uno de estos pilares:

| Pilar | Pregunta guía |
|-------|---------------|
| **Organización** | ¿Reduce caos administrativo? |
| **Transparencia** | ¿Hace visible lo que antes era opaco (finanzas, datos)? |
| **Seguimiento** | ¿Permite dar seguimiento a personas y actividades? |
| **Automatización** | ¿Elimina trabajo manual repetitivo? |
| **Crecimiento** | ¿Ayuda a la iglesia a crecer de forma saludable? |

Si una propuesta no responde **sí** a al menos uno, cuestionarla antes de desarrollar.

---

## Visión y propuesta de valor

**Visión:** Ser el Sistema Operativo para la administración de iglesias en Latinoamérica, permitiendo que el liderazgo dedique menos tiempo a la administración y más tiempo al ministerio.

**Propuesta de valor:**
- Plataforma unificada (miembros + finanzas + ministerios + eventos)
- Multitenant seguro — cada iglesia aislada
- Transparencia financiera con autorización de transacciones
- Diseño profesional, accesible web y móvil
- Pensado para pastores, tesoreros y administradores — no para ingenieros

**Público objetivo:** Iglesias medianas en Latinoamérica que hoy usan Excel, WhatsApp y cuadernos.

**Diferenciadores:**
- Motor de asistencia reutilizable (no módulos duplicados por actividad)
- CRM pastoral (historia del miembro, no solo registro)
- RBAC granular por rol operativo
- White-label por iglesia (colores, logo)
- Red multi-sede (headquarters + campus)

---

## Cómo evaluar una nueva funcionalidad

Antes de pasar a Backlog, responder:

### 1. Problema real
- ¿Qué dolor concreto resuelve?
- ¿Quién lo sufre? (pastor, tesorero, líder de ministerio, admin)
- ¿Cómo lo resuelven hoy sin EvoChurch?

### 2. Valor
- ¿Muy Alto | Alto | Medio | Bajo?
- ¿Afecta a toda la iglesia o a un subgrupo?
- ¿Es bloqueante para otra feature de mayor valor?

### 3. Complejidad
- ¿Baja | Media | Alta?
- ¿Requiere cambios en BD, web, Flutter o los tres?
- ¿Hay dependencias técnicas no resueltas?

### 4. Alineación estratégica
- ¿Encaja en un EPIC existente de [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md)?
- ¿O es una idea suelta que debería ir a "Ideas en evaluación"?

### 5. MVP
- ¿Cuál es la versión mínima entregable?
- ¿Qué queda explícitamente fuera del MVP?

---

## Priorización

Usar la escala de [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md):

| Prioridad | Cuándo usar |
|-----------|-------------|
| 🔴 Crítica | Bloquea operación diaria o seguridad |
| 🟠 Alta | Alto valor, usuarios lo piden activamente |
| 🟡 Media | Mejora útil, no urgente |
| 🟢 Baja | Nice-to-have, evaluar en trimestres futuros |

**Regla:** No hay más de 2–3 features 🔴 en desarrollo simultáneo.

---

## Flujo de estados (obligatorio)

Ninguna feature pasa directo a desarrollo:

```
💡 Idea → 📋 Backlog → 📝 Diseño → 🚧 En Desarrollo → 🧪 Validación → ✅ Terminado
```

Estados especiales:
- ❄️ Pospuesto — valor claro pero no es el momento
- 🚫 Descartado — no alinea o costo > beneficio

Actualizar estado en `PRODUCT_STRATEGY.md` al cerrar cada fase.

---

## Criterios de aceptación — plantilla

Toda feature en Diseño debe tener:

1. **Funcional:** qué puede hacer el usuario (verbos concretos)
2. **Permisos:** qué roles pueden acceder
3. **Multitenant:** confirmado que no cruza iglesias
4. **UX:** pantallas afectadas, estados vacío/error/carga
5. **i18n:** strings en es/en si hay UI nueva
6. **Validación:** cómo probar con datos reales de iglesia piloto

---

## Validación con iglesias

Antes de marcar ✅ Terminado:

- [ ] Demo con al menos un usuario no técnico (pastor o tesorero)
- [ ] Flujo principal completado sin asistencia
- [ ] Feedback documentado (aunque sea "sin observaciones")
- [ ] Sin regresiones en módulos adyacentes

Iglesia piloto de referencia: **Fuente Inagotable** (feedback financiero documentado en strategy).

---

## EPICs activos (resumen)

| EPIC | Objetivo | Prioridad actual |
|------|---------|------------------|
| 01 — Personas | Ciclo de vida del miembro | 🔴 Activo/Inactivo en sprint |
| 02 — Finanzas | Transparencia financiera | 🔴 Diezmo automático en backlog |
| 03 — Attendance Engine | Motor único de asistencia | 🔴 Motor genérico en backlog |
| 04 — Ministerios | Autonomía con control | 🟠 |
| 05 — CRM Pastoral | Historia del miembro | 💡 Ideas |
| 06 — Dashboard | Estado en < 5 min | 🚧 Montos completos sprint 01 |
| 07 — Automatización | Eliminar tareas repetitivas | 💡 Ideas |
| 08 — IA | Asistente inteligente | 💡 Ideas |

Detalle completo: [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md)  
Roadmap por fases: [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md)

---

## Anti-patrones de producto

- Construir módulos duplicados (ej. asistencia separada por culto/niños/escuela)
- Features sin dueño de validación pastoral
- Scope creep en sprint (agregar "de paso" otra cosa)
- Priorizar tecnología sobre problema del usuario
- Lanzar sin actualizar PRODUCT_STRATEGY

---

## Documentos relacionados

- [PRODUCT_STRATEGY.md](PRODUCT_STRATEGY.md) — backlog detallado
- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) — fases y dependencias
- [AI_BUSINESS_RULES.md](AI_BUSINESS_RULES.md) — reglas de dominio
- [AI_UX_GUIDE.md](AI_UX_GUIDE.md) — principios de experiencia
- [../templates/FEATURE_TEMPLATE.md](../templates/FEATURE_TEMPLATE.md)
