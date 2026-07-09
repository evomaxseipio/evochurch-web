# AI Flutter Guide — EvoChurch

Guía para la app Flutter (`github.com/evomaxseipio/evochurch`). Repo puede vivir en clon separado.

**Complemento legacy vigente:** `uploads/CONTEXT.md`, `uploads/CLAUDE.md`

---

## Stack

| Tecnología | Nota |
|------------|------|
| Flutter | Web + Móvil |
| Estado | Riverpod — `StateNotifier` manual |
| Widgets | `HookConsumerWidget` (hooks_riverpod + flutter_hooks) |
| Routing | GoRouter + `RouterNotifier` |
| Backend | Supabase directo — RPC, sin FastAPI |
| UI | Material Design 3 |
| i18n | `app_en.arb` / `app_es.arb` |

**No usar:** Freezed, `riverpod_generator`, `build_runner`, `Provider.of` para auth/members.

---

## Comandos

```bash
flutter pub get
flutter run
flutter analyze
flutter test
flutter build web
```

---

## Estructura feature-based (usar para código nuevo)

```
lib/src/features/<feature>/
├── data/<feature>_repository.dart    ← llamadas Supabase RPC
├── domain/<feature>_state.dart       ← state + copyWith manual
├── providers/<feature>_provider.dart ← StateNotifierProvider
└── presentation/                     ← HookConsumerWidget
```

### Features migrados ✅

| Feature | Provider | Notas |
|---------|----------|-------|
| auth | `authProvider` | Fuente de `churchId` |
| members | `membersNotifierProvider` | Lista, perfil, membresía |
| finances | `fundsProvider`, `transactionsProvider`, `contributionsProvider` | Repositorios separados |

### Legacy 🚫 — no agregar código

- `lib/src/view/` — UI antigua
- `lib/src/view_model/` — ChangeNotifier (salvo theme/menu)
- `lib/src/repository/` — stubs parciales
- `MembersViewModel`, `AuthServices()` en features nuevos

---

## Estado — patrones correctos

```dart
// Leer estado
final authState = ref.watch(authProvider);
final membersState = ref.watch(membersNotifierProvider);

// Llamar métodos
ref.read(membersNotifierProvider.notifier).fetchMembers();

// churchId — SIEMPRE desde authProvider
final churchId = ref.read(authProvider).churchId;

// Widget base
class MyScreen extends HookConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // ...
  }
}
```

---

## AuthProvider — campos críticos

```dart
AuthState {
  AuthStatus status;      // initial | authenticated | unauthenticated | loading | error
  User? user;
  int? churchId;          // ← obligatorio para RPC
  String? recorderProfileId;  // para p_created_by_profile_id (prefiere metadata profile_id)
  bool isAuthenticated;
}
```

Tras login, resolver sesión alineada con `sp_get_session_context` cuando sea posible.

---

## Members — riesgos documentados

1. **`selectedMember` vs navegación `extra`:** desde lista, llamar `selectMember(member)` antes de `goNamed`. Ver `member_list.dart`.
2. **`MemberFinances`:** usa `ContributionsRepository` — no solo `memberFinances` del notifier.
3. **`ProfileView`:** es `HookWidget`; hijos son `HookConsumerWidget`.

---

## Supabase en Flutter

```dart
final supabase = Supabase.instance.client;

// Listado miembros
await supabase.rpc('spgetprofiles', params: {
  'p_church_id': churchId,
  'p_page': 1,
  'p_page_size': 25,
  'p_filter': 'all',
  'p_search': null,
});
```

**Reglas:**
- Pasar `p_church_id` desde `authProvider.churchId`.
- `income_entries.recorded_by` → `User.id` (auth UUID), no `profile_id` salvo coincidencia.
- Mismos RPC que web — ver [AI_DATABASE_GUIDE.md](AI_DATABASE_GUIDE.md).

---

## Routing

`lib/src/routes/app_route_config.dart` + `router_notifier.dart`

| Ruta | Vista |
|------|-------|
| `/login` | `LoginView` |
| `/members` | `MemberList` |
| `/members/profile` | `ProfileView` |
| `/finances/funds` | `FundsListView` |
| `/finances/transactions` | `TransactionListView` |
| `/finances/contributions` | `ContributionListView` |

Auth guard: `RouterNotifier` escucha `authProvider` → `notifyListeners()`.

---

## UI / Material 3

- Paleta: `#1E0A4C`, `#4C1D95`, `#5B21B6`
- Breakpoint móvil: `< 800px` → ListView; desktop → DataGrid
- `HookWidget` sin providers; `HookConsumerWidget` con Riverpod
- Light + dark mode — toggle en top bar

Ver [AI_DESIGN_SYSTEM.md](../product/AI_DESIGN_SYSTEM.md) y `uploads/UI_SPEC.md`.

---

## Paridad con web

| Área | Web | Flutter |
|------|-----|---------|
| Sesión | `getAppSession()` | `authProvider` + RPC sesión |
| Miembros | `src/lib/services/members.ts` | `members_repository.dart` |
| Permisos | RBAC en sesión | Mismo modelo cuando se implemente en app |
| Filtros activo/inactivo | Sprint 01 TASK-001/003 | Paridad pendiente |

Al cambiar RPC en BD, actualizar **ambos** clientes.

---

## Checklist feature Flutter nueva

- [ ] Estructura `data/domain/providers/presentation`
- [ ] `HookConsumerWidget` en presentation
- [ ] `churchId` desde `authProvider`
- [ ] RPC documentado en DATABASE_GUIDE
- [ ] Sin `Provider.of`, sin ViewModels legacy
- [ ] ARB actualizado (es/en)
- [ ] Responsive < 800px probado

---

## Anti-patrones

- `AuthServices()` en features migrados
- `MembersNotifier()` directo — usar provider
- `MembersViewModel` en código nuevo
- `churchId` desde `user_metadata` sin validar
- Freezed / code generation
- Módulo de asistencia separado por actividad (ver EPIC 03 strategy)

---

## Documentos relacionados

- [../../uploads/CONTEXT.md](../../uploads/CONTEXT.md)
- [../../uploads/CLAUDE.md](../../uploads/CLAUDE.md)
- [AI_DATABASE_GUIDE.md](AI_DATABASE_GUIDE.md)
- [../architecture/MULTI_TENANT.md](../architecture/MULTI_TENANT.md)
- [../sprints/sprint-01/TASK-003.md](../sprints/sprint-01/TASK-003.md)
