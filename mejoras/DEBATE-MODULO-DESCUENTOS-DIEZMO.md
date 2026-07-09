# Debate — Módulo de descuentos y reparto del diezmo

Documento de producto para decidir **antes** de implementar. Fase 2 (miembros) corre en paralelo; este módulo sería **Fase 2b o Fase 3 financiera**.

**Estado:** 🟡 En debate  
**Última actualización:** Jul 2026

---

## Contexto de la reunión

La iglesia reporta el diezmo **semanalmente** con este reparto del total recolectado en diezmos:

| Destino | % | Uso |
|---------|---|-----|
| Pastor | **70%** | Asignación pastoral semanal |
| Concilio | **15%** | Envío / aporte al concilio |
| Iglesia local | **15%** | Fondos de la iglesia |

**Feedback:** quieren **desglose configurable** del diezmo, no solo registrar el monto bruto como categoría `tithe`.

---

## Lo que ya existe en EvoChurch (no confundir)

| Capa | Qué hace hoy |
|------|----------------|
| **Contribuciones** | Registra ingresos por categoría `tithe` / `offering` / `donation` → fondo |
| **Reporte CEAD mensual** | Fórmula distinta: diezmo iglesia = **10% × (ingresos − asignación pastoral)** |
| **Reporte Concilio F.001** | Líneas de envíos al concilio (parcialmente calculadas) |
| **Fondos** | Saldo por fondo; sin reglas automáticas de reparto del diezmo |

⚠️ El reparto **70/15/15 semanal** y las reglas **CEAD/concilio mensuales** pueden coexistir pero **no son la misma fórmula**. Hay que definir si el módulo unifica ambas o solo cubre el reporte dominical.

---

## Propuesta: “Módulo de descuentos” (nombre de trabajo)

Un **descuento** = regla que toma un **monto base** (ej. diezmos de la semana) y lo **reparte** en destinos con porcentajes configurables.

Ventaja frente a hardcodear 70/15/15:
- Otra iglesia puede usar 60/20/20
- Se pueden agregar destinos (misiones, construcción) sin redeploy
- Base para reportes y, opcionalmente, movimientos entre fondos

### Concepto mínimo

```
church_discount_schemes     -- por iglesia, ej. "Reparto diezmo dominical"
church_discount_rules       -- filas: nombre, %, fund_id destino (opcional)
discount_period_runs        -- ej. semana 2026-W23: base, desglose calculado
```

---

## Preguntas para cerrar en reunión

Marcar decisión cuando se debata:

### Alcance del monto base

- [ ] **A)** Solo diezmos (`category = tithe`) de la semana  
- [ ] **B)** Diezmos + ofrendas  
- [ ] **C)** Total ingresos del período  
- [ ] **D)** Otro: _______________

### Periodicidad

- [ ] Semanal (domingo a domingo) — *lo pedido en reunión*  
- [ ] También mensual (alineado CEAD)  
- [ ] Ambos con esquemas distintos

### ¿Qué hace el sistema con el desglose?

- [ ] **Solo reporte** — muestra 70/15/15 en PDF/pantalla; tesorero mueve dinero manual  
- [ ] **Sugerencia + confirmación** — propone asientos; tesorero aprueba  
- [ ] **Automático** — crea movimientos entre fondos al cerrar la semana  

*Recomendación MVP:* **solo reporte** o **sugerencia + confirmación** (menos riesgo contable).

### Relación con CEAD / concilio

- [ ] El 15% “concilio” del reparto semanal **es el mismo** envío que el reporte CEAD  
- [ ] Son flujos **independientes** (semanal interno vs mensual al concilio)  
- [ ] El módulo semanal **alimenta** una línea del CEAD (acumulado del mes)

### Configuración

- [ ] Porcentajes fijos por iglesia (editables por tesorero/admin)  
- [ ] ¿Historial de cambios de %? (sí / no)  
- [ ] ¿Plantilla por defecto 70/15/15 al activar el módulo?

### Destinos del reparto

| Destino reunión | ¿Va a un fondo específico? | Fondo sugerido |
|-----------------|----------------------------|----------------|
| 70% Pastor | ☐ Sí ☐ No | Fondo pastoral / asignación pastor |
| 15% Concilio | ☐ Sí ☐ No | Fondo concilio / envíos |
| 15% Iglesia | ☐ Sí ☐ No | Fondo general |

### Permisos

- [ ] Quién configura reglas: solo admin / tesorero / pastor  
- [ ] Quién cierra el período semanal: tesorero

---

## Ejemplo numérico (validar con tesorería)

**Semana del 6–12 jul 2026** — diezmos registrados:

| Fecha | Miembro | Monto |
|-------|---------|-------|
| Dom 6 | María P. | RD$ 6,800 |
| Dom 6 | Wilkin A. | RD$ 12,500 |
| … | … | … |
| **Total diezmos semana** | | **RD$ 45,000** |

**Reparto 70/15/15:**

| Destino | % | Monto |
|---------|---|-------|
| Pastor | 70% | RD$ 31,500 |
| Concilio | 15% | RD$ 6,750 |
| Iglesia | 15% | RD$ 6,750 |

**Preguntas de validación:**
1. ¿El total debe cuadrar al centavo con la suma de contribuciones `tithe` en ese rango de fechas?  
2. ¿Diezmos en fondos distintos se suman todos o solo fondo “General”?  
3. ¿Ofrendas del mismo domingo entran o no?

---

## Opciones de diseño (elegir una dirección)

### Opción 1 — Config + reporte semanal (MVP recomendado)

- Settings: % pastor / concilio / iglesia  
- Pantalla “Cierre diezmo semanal”: elige semana → muestra tabla + export PDF  
- Sin movimientos automáticos en ledger  

**Esfuerzo:** ~1 sprint | **Riesgo:** bajo

### Opción 2 — Config + asientos sugeridos

- Igual que Opción 1 + botón “Generar transferencias sugeridas” entre fondos  
- Tesorero autoriza como hoy las transacciones pendientes  

**Esfuerzo:** ~1.5 sprints | **Riesgo:** medio

### Opción 3 — Motor genérico de descuentos

- Múltiples esquemas (diezmo semanal, retención misiones, etc.)  
- Aplicable a distintas categorías de ingreso  
- Base para productos futuros (multi-iglesia, marketplace)  

**Esfuerzo:** ~2–3 sprints | **Riesgo:** medio-alto (scope)

---

## Visión futura (Evolution Technologies)

El módulo de descuentos/repartos es **infraestructura** para:

- Reportes concilio/CEAD más automáticos  
- Bolsa de empleos (otro track)  
- **Tier premium:** reglas avanzadas, multi-sede, auditoría de cierres semanales  

No implementar marketplace ni tiers en el MVP del diezmo.

---

## Propuesta de decisión rápida (si quieren avanzar ya)

| Tema | Propuesta |
|------|-----------|
| Base | Solo `tithe` de la semana (domingo a sábado o configurable) |
| % default | 70 / 15 / 15 |
| Acción | Reporte + PDF; sin auto-ledger en v1 |
| CEAD | Acumular 15% concilio del mes como referencia; no reemplazar fórmula CEAD hasta validar con contador |
| Nombre UI | “Reparto del diezmo” o “Cierre semanal de diezmos” |

---

## Siguiente paso tras el debate

1. Completar checkboxes de este documento en reunión con tesorero/pastor  
2. Crear `mejoras/AGENT-PROMPT-FASE-DESCUENTOS-DIEZMO.md` con alcance acordado  
3. Implementar en rama `feat/tithe-weekly-allocation` después de merge Fase 2 miembros  

---

## Notas de la conversación (Jul 2026)

- Fase 2 miembros **excluye** diezmo — corre en paralelo con este debate  
- Usuario prefirió **módulo de descuentos** genérico vs hardcode 70/15/15  
- Profesiones/oficios y empleo van por otro track (bolsa empleos futura)
