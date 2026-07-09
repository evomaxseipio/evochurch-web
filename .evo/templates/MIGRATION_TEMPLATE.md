# Migración SQL — [Título]

**Archivo:** `supabase/migrations/YYYYMMDDHHMMSS_descripcion_snake_case.sql`  
**Autor:** [nombre]  
**Fecha:** YYYY-MM-DD  
**Módulo:** [miembros | finanzas | auth | …]  
**Tipo:** Schema | RPC | RLS | Seed | Fix

---

## Objetivo

¿Qué problema resuelve esta migración?

---

## Cambios

### Tablas

-

### Funciones / RPC

-

### RLS / Grants

-

### Seeds (permisos, catálogos)

-

---

## Multitenant

- [ ] Todo dato nuevo tiene `church_id` o FK equivalente
- [ ] RPC llama `fn_assert_session_church` / `fn_assert_profile_in_session_church`
- [ ] `GRANT EXECUTE` a `authenticated` y `service_role`
- [ ] `SET search_path TO public` en `SECURITY DEFINER`

---

## Impacto en clientes

| Cliente | Archivo a actualizar |
|---------|---------------------|
| Web services | `src/lib/services/` |
| Web types/parse | `src/lib/<módulo>/` |
| permission-keys | `src/lib/auth/permission-keys.ts` |
| Flutter repo | `features/*/data/*_repository.dart` |

---

## Rollback

```sql
-- Pasos para revertir (CREATE OR REPLACE versión anterior o DROP)
```

---

## Validación

- [ ] `supabase db push` / apply local OK
- [ ] RPC probado con usuario iglesia A
- [ ] Usuario iglesia B no accede datos de A
- [ ] Build web OK
- [ ] [DATABASE_SCHEMA.md](../architecture/DATABASE_SCHEMA.md) actualizado si aplica

---

## Notas

-
