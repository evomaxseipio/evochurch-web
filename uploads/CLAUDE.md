# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

EvoChurch is a Flutter church administration app (web + mobile) for managing members, finances, and church configurations. Backend is Supabase (PostgreSQL + Auth + RPC).

**Stack:** Flutter/Dart · Supabase · Riverpod (`StateNotifier`, manual — no code generation, no Freezed) · `HookConsumerWidget` (hooks_riverpod + flutter_hooks) · GoRouter · flutter_bloc (theme/locale only)

## Commands

```bash
# Install dependencies
flutter pub get

# Run the app
flutter run

# Static analysis
flutter analyze

# Run tests / single test
flutter test
flutter test test/path/to/test_file.dart

# Build for web
flutter build web

# Admin password reset utility
env $(grep -v '^#' tool/.env.local | xargs) dart run tool/set_password.dart
```

> **No code generation needed.** The project does not use `freezed` or `riverpod_generator`. Do not run `build_runner`.

## Architecture — Ongoing Migration

The project is **mid-migration** from MVVM + Provider/ChangeNotifier to a **feature-based Riverpod** architecture. Both systems coexist. Never revert migrated modules back to the old pattern.

### New structure (feature-based) — use this for all new code

```
lib/src/features/
├── auth/
│   ├── data/auth_repository.dart
│   ├── domain/auth_state.dart
│   ├── presentation/login_view.dart
│   └── providers/auth_provider.dart        ← authProvider (StateNotifierProvider)
├── members/
│   ├── data/members_repository.dart
│   ├── domain/members_state.dart
│   ├── presentation/members/
│   └── providers/members_provider.dart     ← membersNotifierProvider
└── finances/
    ├── data/
    │   ├── contributions_repository.dart   ← income_entries / income_contributors tables
    │   ├── funds_repository.dart
    │   └── transactions_repository.dart
    ├── domain/
    │   ├── contributions_state.dart
    │   ├── funds_state.dart
    │   └── transactions_state.dart
    ├── presentation/
    └── providers/
        ├── contributions_provider.dart     ← contributionsProvider
        ├── funds_provider.dart             ← fundsProvider
        └── transactions_provider.dart      ← transactionsProvider
```

Each feature follows: `data/` (Supabase calls) → `domain/` (state class with `copyWith`) → `providers/` (`StateNotifier` + `StateNotifierProvider`) → `presentation/` (`HookConsumerWidget`).

### Legacy structure — do not add new code here

- `lib/src/view/` — old UI screens (pending migration per feature)
- `lib/src/view_model/` — old ChangeNotifier ViewModels; `finance_view_model.dart` and `collection_view_model.dart` still in use (do not touch); `theme_view_model.dart` and `menu_state_view_model.dart` stay permanently
- `lib/src/repository/` — partially implemented; `MembersRepo` is a stub
- `lib/src/providers/` — old Riverpod providers (legacy, not feature-based)

### State Management Rules

```dart
// ✅ Read state
final membersState = ref.watch(membersNotifierProvider);
final authState = ref.watch(authProvider);

// ✅ Call methods
ref.read(membersNotifierProvider.notifier).fetchMembers();

// ✅ Get churchId (always from authProvider)
final churchId = ref.read(authProvider).churchId;

// ✅ Widget base class
class MyWidget extends HookConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) { ... }
}
```

**Never do:**
- `Provider.of<X>(context)` — no ChangeNotifierProviders exist for auth/members
- `AuthServices()` instantiated directly — removed from tree
- `MembersNotifier()` instantiated directly — always use `ref.read(membersNotifierProvider.notifier)`
- `MembersViewModel` — deprecated, replaced by `MembersNotifier`
- Freezed, `@riverpod` annotation, or `build_runner`

## Key Providers

### `authProvider` (`lib/src/features/auth/providers/auth_provider.dart`)

Exposes `AuthState` with:
- `status`: `initial | authenticated | unauthenticated | loading | error`
- `churchId`: from `userMetadata['church_id']` — required for all Supabase calls
- `user`: Supabase `User`
- `userMetadata`: raw JWT metadata
- `recorderProfileId`: UUID for `p_created_by_profile_id` RPCs (prefers `userMetadata['profile_id']`, falls back to `user.id`)

### `membersNotifierProvider` (`lib/src/features/members/providers/members_provider.dart`)

`MembersState` holds: `members`, `isLoading`, `error`, `selectedMember`, `membershipProfile`, `memberFinances`, `memberRoles`.

### Finance providers (`lib/src/features/finances/providers/`)

- `fundsProvider` — CRUD for funds + primary fund
- `transactionsProvider` — transaction list per fund
- `contributionsProvider` — income entries (individual/collective), income types, filters

`ContributionsState` has a `filteredEntries` getter that applies `filterCategory` and `filterFundId` client-side without re-fetching.

## Routing

GoRouter in `lib/src/routes/app_route_config.dart`. Auth guard via `RouterNotifier` (`lib/src/routes/router_notifier.dart`), which listens to `authProvider` and calls `notifyListeners()` to trigger GoRouter refresh.

| Route | View |
|---|---|
| `/` | `DashboardView` |
| `/login` | `LoginView` (features/auth) |
| `/members` | `MemberList` (features/members) |
| `/members/profile` | `ProfileView` |
| `/finances/transactions` | `TransactionListView` (features/finances) |
| `/finances/funds` | `FundsListView` (features/finances) |
| `/finances/funds/details` | `FundsDetailsView` |
| `/finances/contributions` | `ContributionListView` (features/finances) |
| `/finances/funds_contributions` | `FundsContributions` |
| `/expenses` | `ExpensesListView` |
| `/configurations/users` | `UsersListView` |

## Supabase Integration

Client: `Supabase.instance.client` (initialized in `lib/main.dart`).

Most operations use RPCs (stored procedures), not raw table queries. See `AGENTS.md` for the full RPC → ViewModel/Notifier mapping.

**`income_entries.recorded_by`** has a FK to `auth.users(id)` (Supabase Auth user UUID). Use `authProvider` / session `User.id` when inserting — not `profile_id` from business metadata unless it is identical to the Auth user id.

Auth state (`userId`, `churchId`, `accessToken`, `userMetadata`) is persisted in SharedPreferences and restored on startup via `AuthServices.loadStoredAuth()` (legacy, still in use for session restoration).

## UI Conventions

- Material Design 3, palette: `#1E0A4C`, `#4C1D95`, `#5B21B6` (deep purple)
- Responsive breakpoint: `< 800px` = mobile (ListView), `>= 800px` = desktop (DataGrid)
- `HookWidget` for stateful widgets without providers; `HookConsumerWidget` when Riverpod is needed
- `HookConsumerWidget` for all new feature presentation widgets

## Localization

Two languages: English / Spanish. ARB files in `lib/src/localization/` (`app_en.arb`, `app_es.arb`). Also `assets/languages/en.json` and `es.json` for the `easy_localization` package. Generated `app_localizations.dart` updates automatically on `flutter pub get`.

## Key Files

| File | Purpose |
|---|---|
| `lib/main.dart` | App bootstrap, Supabase init, ProviderScope + MultiProvider |
| `lib/src/app.dart` | `MaterialApp.router`, theme, locale |
| `lib/src/routes/app_route_config.dart` | GoRouter + auth guard |
| `lib/src/routes/router_notifier.dart` | Bridges `authProvider` → GoRouter refresh |
| `lib/src/features/auth/providers/auth_provider.dart` | Auth state (source of truth for `churchId`) |
| `lib/src/features/finances/data/contributions_repository.dart` | Income entries, income types, contributor resolution |
| `lib/src/view_model/finance_view_model.dart` | Legacy funds/transactions (still active) |
| `lib/src/constants/app_theme.dart` | Material 3 theme definitions |
| `AGENTS.md` | Full RPC → ViewModel/Notifier reference table |
| `CONTEXT.md` | Migration status per module and known pending fixes |
| `context agent MD/` | Per-feature context for contributions, funds, transactions |
