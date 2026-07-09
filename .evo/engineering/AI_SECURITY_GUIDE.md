# AI Security Guide — EvoChurch

Guía de seguridad para agentes y desarrolladores. **La autorización real vive en PostgreSQL** — esta guía describe capas y checklist.

---

## Modelo de amenazas

| Amenaza | Mitigación |
|---------|------------|
| Cross-tenant data leak | RPC guards + RLS + sesión desde BD |
| Privilege escalation | RBAC en BD, no en UI solamente |
| JWT tampering | No autorizar desde metadata cliente |
| IDOR (perfil ajeno) | `fn_assert_profile_in_session_church` |
| Finanzas no autorizadas | `finances:transactions:authorize` + `fn_can_authorize_finances` |
| Session hijacking | Supabase Auth + cookies httpOnly (SSR) |
| Service role exposure | Solo server-side, nunca al cliente |
| Temp password abuse | Gate en `getActionSession` + middleware |

---

## Capas de defensa

```
1. Supabase Auth          → identidad (auth.uid())
2. sp_get_session_context → tenant + permisos desde BD
3. Server Action gate     → getActionSessionWith(permission)
4. RPC guards             → fn_assert_session_church / profile
5. RLS                    → filtro PostgREST
6. UI Can / route gate    → ocultar — NO sustituye capas 2–5
```

**Regla de oro:** Si solo está protegido en UI, no está protegido.

---

## Autenticación

### Web (Next.js)

- `@supabase/ssr` — cookies en middleware (`src/lib/supabase/middleware.ts`).
- `getVerifiedUser()` antes de sesión de negocio.
- Login/anónimo: skip round-trip innecesario si no hay cookie.

### Flutter

- Supabase Auth email/password.
- Sesión persistida SharedPreferences (legacy `AuthServices.loadStoredAuth`) — migrar hacia RPC sesión.

### Contraseña temporal

- `is_temp_password` en BD y sesión.
- `getActionSession()` bloquea mutaciones hasta cambio.
- Redirect a `UPDATE_PASSWORD_PATH` en layout.

---

## Autorización multitenant

```typescript
// ✅ Correcto
const { supabase, session } = await getActionSessionWith("members:write");
await updateMember(supabase, session.churchId, input);

// ❌ Incorrecto
const churchId = getChurchId(user); // JWT — deprecated
await updateMember(supabase, churchIdFromForm, input); // sin validar
```

### RPC

```sql
PERFORM public.fn_assert_session_church(p_church_id);
PERFORM public.fn_assert_profile_in_session_church(p_profile_id);
```

---

## RBAC

- Permisos en `app_permissions` — keys en `permission-keys.ts`.
- Roles sistema: no editar permisos base.
- Roles custom: `church_role_permissions` por iglesia.
- ABAC: `write_own` + verificación `leaderProfileIds` en código.

### Admin especial

- `appRoleId === 1` — bypass audit read (sistema).
- `admin_users:manage` — gestión usuarios.

---

## Service role

`src/lib/supabase/admin.ts` — `SUPABASE_SERVICE_ROLE_KEY`

**Solo para:**
- Sync `app_metadata` fallback
- Operaciones admin server-side
- Scripts de mantenimiento

**Nunca:**
- Importar en Client Components
- Exponer en variables `NEXT_PUBLIC_*`
- Usar para bypass rutinario de RLS

---

## Datos sensibles

| Dato | Tratamiento |
|------|-------------|
| PII miembros | Tenant-scoped, permiso `members:read` |
| Finanzas individuales | Permisos financieros granulares |
| Notas pastorales (futuro) | Permisos dedicados, privadas |
| Contraseñas temp | Mostrar una vez, copy dialog, no loguear |
| API keys org | Hash en BD, revocables |

---

## RLS y PostgREST

- Revocar `anon` en tablas financieras (`20260701120300_revoke_anon_income_entries`).
- Políticas con `fn_get_session_church_id()`.
- `SECURITY DEFINER` siempre con `SET search_path TO public`.

---

## Org Portal

- Host separado (`isOrgPortalHost`) — rutas `/org/*`.
- API keys: `src/lib/org/external-api-auth.ts`.
- No mezclar sesión iglesia con sesión org en mismas rutas.

---

## Auditoría

- `church_audit_log` — operaciones admin/financieras.
- Triggers en cambios sensibles.
- Permisos `audit:read|export`.

---

## Headers y middleware

- Refresh sesión en cada request autenticado.
- Redirect login si no hay user.
- Org host routing — evitar acceso cruzado org/church app.

---

## Checklist seguridad (pre-merge)

- [ ] Mutación usa `getActionSession` / `getActionSessionWith`
- [ ] RPC nuevo tiene `fn_assert_session_church`
- [ ] Perfiles ajenos bloqueados en RPC
- [ ] Permiso RBAC correcto y en seed BD
- [ ] Sin service role en cliente
- [ ] Sin secrets en código o logs
- [ ] RLS si hay acceso PostgREST directo
- [ ] Probado con usuario de otra iglesia (debe fallar)
- [ ] Acción destructiva con confirmación UI

---

## Respuesta a incidentes

1. Identificar si es leak cross-tenant o escalación permisos.
2. Revisar RPC/RLS — parche en migración urgente.
3. Registrar ADR en [DECISION_LOG.md](../architecture/DECISION_LOG.md).
4. Rotar keys si service role o API key comprometida.

---

## Anti-patrones críticos

- Autorizar con `user.user_metadata.church_id`
- Confiar en `p_church_id` del body sin guard RPC
- `SELECT *` sin filtro tenant en scripts
- Loguear PII o tokens
- Deshabilitar RLS "temporalmente"
- Permisos solo en frontend

---

## Documentos relacionados

- [../architecture/MULTI_TENANT.md](../architecture/MULTI_TENANT.md)
- [AI_BACKEND_GUIDE.md](AI_BACKEND_GUIDE.md)
- [AI_DATABASE_GUIDE.md](AI_DATABASE_GUIDE.md)
- [../architecture/DECISION_LOG.md](../architecture/DECISION_LOG.md)
- `src/lib/auth/app-session.ts`
- `src/lib/supabase/middleware.ts`
