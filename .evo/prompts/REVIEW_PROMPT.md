# Prompt — Code Review

Usar para revisar cambios antes de merge (humano o agente revisor).

---

## Instrucciones para el revisor

Revisa los cambios indicados contra los estándares EvoChurch. **No implementes** — solo reporta hallazgos.

Documentos de referencia:

- `@.evo/engineering/AI_ENGINEERING_GUIDE.md`
- `@.evo/product/PRODUCT_STRATEGY.md`
- `@.evo/architecture/MULTI_TENANT.md`
- `@.evo/engineering/AI_BACKEND_GUIDE.md`
- `@.evo/engineering/AI_DATABASE_GUIDE.md`

---

## Cambios a revisar

**Branch / PR / archivos:**

-

**Descripción del cambio:**

-

**Tipo:** Feature | Bugfix | Refactor | Migración BD

---

## Checklist de revisión

### Producto y alcance

- [ ] Alineado con PRODUCT_STRATEGY (prioridad, EPIC, estado)
- [ ] Sin scope creep (código no relacionado)
- [ ] Criterios de aceptación cubiertos

### Multitenant y seguridad

- [ ] `getActionSession` / `getActionSessionWith` en mutaciones
- [ ] `fn_assert_session_church` en RPC nuevos/modificados
- [ ] Sin autorización desde JWT metadata
- [ ] Permisos RBAC correctos
- [ ] Sin fuga cross-tenant

### Calidad de código

- [ ] KISS — solución más simple
- [ ] Sin duplicación innecesaria
- [ ] Parse/types separados en servicios
- [ ] Errores con `errorKey` (no mensajes crudos)
- [ ] `revalidatePath`/`revalidateTag` tras mutaciones

### Base de datos

- [ ] Migración atómica con grants
- [ ] `search_path` en SECURITY DEFINER
- [ ] `permission-keys.ts` sincronizado si hay permisos nuevos

### Flutter (si aplica)

- [ ] `authProvider` para `churchId`
- [ ] HookConsumerWidget en features
- [ ] Sin Provider.of / ViewModels legacy

---

## Formato de respuesta

### Bloqueantes (deben corregirse)

-

### Sugerencias (mejoras opcionales)

-

### Preguntas al autor

-

### Veredicto

**Aprobar** | **Aprobar con cambios menores** | **Rechazar**
