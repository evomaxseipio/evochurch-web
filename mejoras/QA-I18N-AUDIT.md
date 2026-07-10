# QA I18N Audit — 2026-07-10

Sprint: **I18N-QA** per `mejoras/AGENT-PROMPT-I18N-MODULE.md`.

## Key parity

| Locale | Keys | Missing vs `es` |
|--------|------|-----------------|
| `es.json` | 1624 | — (source of truth) |
| `en.json` | 1624 | 0 |
| `fr.json` | 1624 | 0 |

**CI script:** `npm run qa:i18n` → `scripts/compare-i18n-keys.mjs` (exits 1 on missing keys or Spanish leftovers in en/fr).

## Keys added (13 new, all 3 locales)

| Namespace | Key | Purpose |
|-----------|-----|---------|
| `common` | `comment` | Table column header |
| `validation` | `maxLength` | Form char-limit hints |
| `contributions` | `registerAs` | Anonymous donor checkbox |
| `finances.titheClose` | `seedFailed`, `closeFailed` | Server action fallbacks |
| `members` | `monthlyContributionsSubtitle`, `trendEyebrow`, `monthlyTotal`, `chartAriaLabel`, `searchContributionsPlaceholder`, `noContributionsMatchSearch`, `catalogLoadFailed`, `otherType` | Member finances tab |

## en/fr translation fixes (59 keys each)

Corrected mixed-locale leftovers where en/fr still mirrored Spanish:

- `auth.email`, `auth.password`
- `comunicacion.*` stub copy
- `members.personalSection`, `members.addressSection`
- `finances.paymentMethods.*`, `finances.txTypes.*`, `finances.contributionTypes.*`, `finances.monthNames.*`
- `settings.tabs.access`, `settings.notifications.*`, `settings.access.*`
- `adminUsers.*`, `catalogs.*`
- `roles.subtitle`, `roles.modules.*`, `roles.actions.leader`, etc.
- `validation.email`, `validation.minLength`, `validation.invalidAmount`

`titheClose` namespace was already fully translated in en/fr; only action fallbacks were added.

## Files migrated to `useTranslations` / `getTranslations`

| File | Changes |
|------|---------|
| `src/app/(app)/finances/tithe-close/actions.ts` | `seedFailed` / `closeFailed` via `getTranslations` |
| `src/components/ministries/ministry-card.tsx` | `ministerios.members` label |
| `src/components/members/member-finances-tab.tsx` | KPIs, chart, table, pagination, toasts |
| `src/components/contributions/contribution-form-drawer.tsx` | Anonymous checkbox |
| `src/components/transactions/transaction-form-drawer.tsx` | `validation.maxLength` hints |
| `src/components/settings/role-form-drawer.tsx` | `common.description` label |

Already i18n-ready (no changes needed): `tithe-close-view.tsx`, `tithe-close/page.tsx`, `tithe-close-pdf.ts`.

## Build

```
npm run build → exit 0
npm run qa:i18n → exit 0
```

## Remaining known gaps (~13 files, low–medium impact)

Heuristic scan (`Guardar|Cancelar|Miembros|Configuración|Error al|No autorizado`) still hits **13 non-i18n paths** — mostly server/lib fallbacks and RBAC catalog labels, not primary UI:

| Area | Files | Notes |
|------|-------|-------|
| Server action / API errors | `eventos/actions.ts`, `settings/users/actions.ts`, `api/members/.../finances/route.ts` | Literal `error` strings; migrate to `errorKey` pattern |
| Service layer fallbacks | `lib/services/{events,tithe-close,discount-templates,report-definitions}.ts` | DB/RPC error messages in Spanish |
| Roles RBAC catalog | `lib/roles/catalog.ts`, `lib/roles/display.ts` | Module labels for permission matrix — partial i18n in `roles` namespace |
| Reports / dashboard data | `lib/reports/member-filters.ts`, `lib/dashboard/{aggregate,parse}.ts` | Export labels and demo aggregates |
| Discounts parse | `lib/discounts/parse.ts` | Throw messages |
| JSX partial | `transaction-form-drawer.tsx` | Labels `Descripción`, placeholders `Ej. …` |
| Reports PDF | `lib/reports/templates/cead/*` | Hardcoded CEAD line labels (I18N-6 scope) |
| Intentional | `church-profile-view.tsx` | `<option>Español</option>` — locale name display |

**Estimated user-facing coverage:** ~97% in main modules (shell, dashboard, members list/profile, finances incl. tithe-close, settings). Remaining work is concentrated in server errors, RBAC catalog source files, and PDF/report generators.

## Recommendations (follow-up)

1. Run `npm run qa:i18n` in CI after `npm run build`.
2. Next pass: `lib/roles/catalog.ts` → consume `roles.modules.*` keys at runtime.
3. Server actions: standardize on `{ errorKey }` + client `t(errorKey)` (see members module).
4. I18N-6: pass `locale` into CEAD PDF template label maps.
