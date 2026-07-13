# EvoChurch BackOffice

## Feature: Organizations — SQL (MVP 0.1)

> Implementación de persistencia lista para ejecutar.
>
> Fuentes: [`organizations-domain-model.md`](./organizations-domain-model.md),
> [`organizations-database-design.md`](./organizations-database-design.md).

---

## Decisión de implementación

| Aspecto | Decisión | Motivo |
|---------|----------|--------|
| **Archivos de migración** | **1 bootstrap** | Alineado con convención del repo (`YYYYMMDDHHMMSS_*.sql`), atómico, ~250 líneas. |
| **Catálogos** | **`text` + CHECK** + funciones helper | Database Design aprobado; evita PostgreSQL ENUM. |
| **Seed** | **Archivo separado** en `supabase/seeds/` | No mezclar datos de prueba con schema en producción. |
| **RLS** | Políticas básicas `authenticated` | BackOffice interno; IAM fino en sprint posterior. |

---

## Archivos

| Archivo | Responsabilidad |
|---------|-----------------|
| `supabase/migrations/20260710183000_sales_organizations_mvp.sql` | Schema, tabla, índices, triggers, RLS, vista |
| `supabase/seeds/sales_organizations_seed.sql` | 4 organizaciones de prueba (solo local) |
| `supabase/seed.sql` | Entrada principal de seeds |
| `supabase/config.toml` | `sql_paths` incluye ambos seeds |

---

## Aplicar

```bash
supabase start          # si no está corriendo
supabase db reset       # migraciones + seeds
# o solo migraciones pendientes:
supabase migration up
```

Remoto:

```bash
supabase db push
```

> `db push` **no** ejecuta seeds. Seeds solo en `db reset` local.

---

## Objetos creados

### Schema `sales`

Bounded context comercial del BackOffice.

### Funciones de catálogo

- `sales.fn_is_valid_organization_type(text)`
- `sales.fn_is_valid_organization_status(text)`
- `sales.fn_is_valid_organization_source(text)`

Usadas por CHECK constraints; reutilizables en RPC futuros.

### Tabla `sales.organizations`

24 columnas · 8 constraints · comentarios en tabla y columnas.

### Índices (7)

Todos con `COMMENT ON INDEX` documentando su propósito.

### Triggers

| Trigger | Función | Efecto |
|---------|---------|--------|
| `tr_organizations_set_updated_at` | `fn_touch_updated_at` | `updated_at = now()` en UPDATE |
| `tr_organizations_set_audit` | `fn_set_organization_audit` | `created_by` / `updated_by` desde `auth.uid()` |

### Vista

- `sales.v_organizations_open` — `deleted_at IS NULL AND status = 'ACTIVE'`

### RLS

| Política | Operación | Regla |
|----------|-----------|-------|
| `organizations_select_authenticated` | SELECT | `deleted_at IS NULL` |
| `organizations_insert_authenticated` | INSERT | `deleted_at IS NULL` |
| `organizations_update_authenticated` | UPDATE | filas no eliminadas |

`service_role` bypassa RLS (server actions). `anon` revocado.

---

## Catálogos (constantes TypeScript)

```ts
OrganizationType:   CHURCH | MINISTRY | COUNCIL | FOUNDATION
OrganizationStatus: ACTIVE | ARCHIVED
OrganizationSource: REFERRAL | VISIT | SOCIAL_MEDIA | EVENT | WEB | OTHER
```

Creación MVP: solo `CHURCH` (validación en app/RPC).

---

## Rollback manual

```sql
DROP VIEW IF EXISTS sales.v_organizations_open;
DROP TRIGGER IF EXISTS tr_organizations_set_audit ON sales.organizations;
DROP TRIGGER IF EXISTS tr_organizations_set_updated_at ON sales.organizations;
DROP FUNCTION IF EXISTS sales.fn_set_organization_audit();
DROP FUNCTION IF EXISTS sales.fn_touch_updated_at();
DROP TABLE IF EXISTS sales.organizations;
DROP FUNCTION IF EXISTS sales.fn_is_valid_organization_source(text);
DROP FUNCTION IF EXISTS sales.fn_is_valid_organization_status(text);
DROP FUNCTION IF EXISTS sales.fn_is_valid_organization_type(text);
-- DROP SCHEMA sales CASCADE;  -- solo si no hay más objetos
```

---

## Siguiente paso

- `organizations-api.md` + RPC (`sp_*_organizations`)
- Constantes TS en `src/features/organizations/`
- Pantallas BackOffice conectadas vía server actions
