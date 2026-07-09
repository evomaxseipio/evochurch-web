# Prompt — Bugfix

Usar para corregir un bug sin expandir alcance.

---

## Instrucciones para el agente

Corrige el bug descrito abajo con el **cambio mínimo** necesario.

1. Lee contexto relevante:
   - `@.evo/architecture/MULTI_TENANT.md` (si toca datos/auth)
   - `@.evo/engineering/AI_BACKEND_GUIDE.md` o `@.evo/engineering/AI_DATABASE_GUIDE.md` según capa

2. **No refactorices** código adyacente.
3. **No agregues features** nuevas.
4. Reproduce el bug mentalmente o con logs antes de fixear.
5. Si el bug es de seguridad multitenant, prioriza fix en RPC/BD sobre parche en UI.

---

## Bug

**Título:**

**Módulo / ruta:**

**Comportamiento actual:**

**Comportamiento esperado:**

**Pasos para reproducir:**

1.
2.
3.

**Stack afectado:** Next.js | Flutter | BD

**Archivos sospechosos (opcional):**

-

**Logs / error (opcional):**

```

```

---

## Entregables

1. Causa raíz (1-3 oraciones)
2. Fix mínimo con archivos tocados
3. Cómo validar que quedó resuelto
4. Riesgo de regresión (si aplica)

---

## Restricciones

- Sin cambios fuera del bug.
- Si requiere migración SQL, documentar rollback.
- Verificar que no abre fuga cross-tenant.
