# BackOffice — Arquitectura de proyecto

Documento canónico (v1.0):

**[../../.evo/architecture/PROJECT_ARCHITECTURE_v1.md](../../.evo/architecture/PROJECT_ARCHITECTURE_v1.md)**

Resumen del flujo oficial:

```text
UI → Hook → Service → Repository → Supabase
```

Features nuevas viven en `src/features/{name}/`. Rutas delgadas en `src/app/apps/backoffice/`.

Referencia implementada: `src/features/organizations/` (repository ✅).
