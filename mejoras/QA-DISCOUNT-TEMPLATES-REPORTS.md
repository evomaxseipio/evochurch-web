# QA — Plantillas de descuento en reportes vinculables

**Fecha:** 2026-07-10  
**Rama:** `main` (post `0ba6926`)  
**Alcance:** integración de plantillas de descuento en los 3 reportes vinculables:
- `financial-monthly-cead`
- `financial-monthly-concilio-f001`
- `executive-monthly-summary`

---

## Verificación estática (code trace)

| Reporte | Fetch link | Compute allocation | Aplicación en payload | Export PDF | Export XLSX | Preview |
|---------|------------|-------------------|----------------------|------------|-------------|---------|
| CEAD mensual | `fetchLinkedTemplateIdForReport` → `financial-monthly-cead` | `computeDiscountAllocation` | `buildCeadFinancialMonthlyData` → `buildCeadCouncilSends` reemplaza `councilLines` | `cead-monthly-form-pdf` | `financial-monthly-cead.ts` | `cead-financial-monthly-preview` |
| F.001 Concilio | `fetchLinkedTemplateIdForReport` → `financial-monthly-concilio-f001` | `computeDiscountAllocation` | `applyDiscountAllocationToConcilioF001` → `sectionC.churchToCouncil` | `financial-monthly-concilio-f001.ts` | idem | `concilio-f001-preview` |
| Resumen ejecutivo | `fetchLinkedTemplateIdForReport` → `executive-monthly-summary` | `computeDiscountAllocation` | `fetchExecutiveMonthlyPayload` → `councilLines` | `executive-monthly-summary.ts` | N/A (solo PDF) | vía export |

### Condiciones para que aplique la plantilla

1. **Plataforma:** `report_definition.supports_discount_templates = true` (los 3 reportes).
2. **Toggle iglesia:** `church_report_setting.template_enabled = true` (vía Ajustes → Reportes).
3. **Vínculo activo:** fila en `report_discount_link` con `is_active = true`.
4. **Plantilla activa:** `discount_template.is_active = true`.

`sp_get_report_discount_link` valida vínculo + plantilla activa. Al desactivar `template_enabled`, `sp_maintain_church_report_template_setting` **elimina** los vínculos del reporte.

### Gaps conocidos (no bloqueantes para MVP)

| ID | Descripción | Severidad |
|----|-------------|-----------|
| GAP-01 | `sp_get_report_discount_link` no consulta `fn_report_template_enabled`; si quedara un vínculo huérfano en BD, podría aplicarse. El toggle off borra vínculos en flujo normal. | Baja |
| GAP-02 | F.001 secciones **B** (ingresos/egresos) y **D** (cooperativa) siguen en **mock estático** (`buildConcilioF001MockPayload`); solo sección **C** iglesia→concilio usa plantilla. | Documentada |
| GAP-03 | Resumen ejecutivo: solo formato **PDF**; no hay XLSX. | Por diseño |
| GAP-04 | Etiquetas custom de plantilla en F.001 se muestran como texto literal (`concilioLineDisplayLabel`); no se traducen. | Esperado |

### Fix aplicado en esta QA

- **CEAD preview/export:** cuando `councilLines` provienen de plantilla de descuento, la columna % y la fórmula usan `line.formula` (`councilLinePercentDisplay` / `councilFormulaDetail`) en lugar de porcentajes CEAD fijos.

---

## Checklist manual (browser)

Pre-requisitos: usuario con `settings:discount_templates:write`, permisos de export en los 3 reportes, iglesia con aportes del mes de prueba.

### Configuración base

| ID | Paso | Esperado |
|----|------|----------|
| R-DT-01 | Ajustes → Plantillas de descuento → crear plantilla activa (ej. 10% + 3% sobre diezmos) | Plantilla guardada, líneas visibles |
| R-DT-02 | Ajustes → Reportes → activar toggle **Plantillas** en CEAD mensual | `template_enabled` ON |
| R-DT-03 | Vincular plantilla al reporte CEAD (sección envíos al concilio) | Vínculo guardado sin error |
| R-DT-04 | Repetir R-DT-02 y R-DT-03 para **F.001 Concilio** y **Resumen ejecutivo** | Toggles + vínculos en los 3 reportes |

### Preview

| ID | Paso | Esperado |
|----|------|----------|
| R-DT-05 | Reportes → CEAD mensual → Vista previa | Sección concilio muestra líneas de la plantilla (no % CEAD 10/3/1/1 por defecto) |
| R-DT-06 | Reportes → F.001 → Vista previa | Columna iglesia→concilio con montos de plantilla; KPI total envíos actualizado |
| R-DT-07 | Reportes → Resumen ejecutivo → Vista previa / export preview | Bloque "Envíos al concilio" con líneas de plantilla |

### Export

| ID | Paso | Esperado |
|----|------|----------|
| R-DT-08 | Exportar CEAD **PDF** y **XLSX** | Concilio refleja plantilla; fórmula tipo `N% × base (tithe)` |
| R-DT-09 | Exportar F.001 **PDF** y **XLSX** | Sección C columna iglesia→concilio = plantilla |
| R-DT-10 | Exportar Resumen ejecutivo **PDF** | Sección council sends con líneas y total |

### Toggle off / plantilla inactiva

| ID | Paso | Esperado |
|----|------|----------|
| R-DT-11 | Desactivar toggle plantillas en un reporte | Vínculo eliminado; preview vuelve a reglas CEAD/org o mock F.001 |
| R-DT-12 | Desactivar plantilla (`is_active = false`) manteniendo vínculo | `sp_get_report_discount_link` retorna `linked: false`; reglas por defecto |

---

## Resultados automatizados

| Check | Resultado | Detalle |
|-------|-----------|---------|
| `npm run build` | **PASS** | Next.js 16.2.6, TypeScript OK |
| `npm run qa:reports` | **PASS** (5) / BLOCKED (7) | R-01 hub incluye CEAD + F.001 + ejecutivo; R-PERM-CONCILIO añadido |
| R-02 Secretario | BLOCKED | Sin usuario QA Secretario |
| R-04–R-08 Export manual | BLOCKED | Requiere browser (checklist R-DT-08..10) |
| R-10 build en script | BLOCKED | Ejecutado aparte → PASS |

---

## Qué validar manualmente (resumen)

1. Crear plantilla y vincular a los **3** reportes con toggle ON.
2. Confirmar preview y export en cada reporte (CEAD PDF+XLSX, F.001 PDF+XLSX, ejecutivo PDF).
3. Desactivar toggle y confirmar que vuelven reglas por defecto.
4. Recordar: F.001 B/D son mock; solo C usa plantilla.
