# CONTEXTO DEL PROYECTO — EvoChurch Flutter
> Pasa este archivo a Claude Code antes de hacer cualquier cambio.

---

## 🏗️ ARQUITECTURA ACTUAL

El proyecto está en migración de **MVVM + Provider** a **Feature-based + Riverpod**.
La migración está **parcialmente completa**. No revertir lo que ya funciona.

### Stack
- Flutter (Web + Móvil)
- Estado: Riverpod (StateNotifier manual, SIN code generation, SIN Freezed)
- Widgets: HookConsumerWidget (hooks_riverpod + flutter_hooks)
- Routing: GoRouter con ShellRoute
- Base de datos: Supabase (directo, sin FastAPI)
- Auth: Supabase Auth (email/contraseña)

---

## ✅ MÓDULOS YA MIGRADOS — NO TOCAR

### Auth → `lib/src/features/auth/`
```
features/auth/
├── data/auth_repository.dart         ✅ completo
├── domain/auth_state.dart            ✅ completo
├── presentation/login_view.dart      ✅ completo
└── providers/auth_provider.dart      ✅ completo
```

**`auth_provider.dart`** expone:
```dart
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(AuthRepository());
});
```

**`AuthState`** tiene:
```dart
AuthStatus status     // initial | authenticated | unauthenticated | loading | error
User? user
int? churchId         // ← MUY IMPORTANTE: JWT/metadata + resolución en AuthRepository
Map<String, dynamic>? userMetadata
String? get churchDisplayName   // nombres alternativos en metadata (reportes/UI)
String? get recorderProfileId   // profile_id en JWT o fallback User.id (RPCs distintos a recorded_by)
bool get isAuthenticated
bool get isLoading
bool get hasError
```

**Router** (`lib/src/routes/`):
- `router_notifier.dart` → `RouterNotifier` escucha `authProvider` y notifica al GoRouter
- `app_route_config.dart` → usa `ProviderScope.containerOf(context)` para leer `authProvider`

---

### Members → `lib/src/features/members/`
```
features/members/
├── domain/                           ✅ modelos (Member, membresía, contacto, etc.)
├── presentation/
│   ├── members/
│   │   ├── member_list.dart          ✅ HookConsumerWidget + goNamed(perfil, extra)
│   │   ├── profile_view.dart         ✅ tabs (perfil / membresía / finanzas)
│   │   ├── member_maintance.dart     ✅ HookConsumerWidget → updateMember vía provider
│   │   ├── membership_view.dart      ✅ HookConsumerWidget → getMembershipByMemberId + setMembershipMaintance
│   │   ├── member_finances.dart      ✅ HookConsumerWidget → ContributionsRepository + authProvider
│   │   └── add_member.dart           ✅ HookConsumerWidget → churchId desde authProvider
│   └── widgets/
└── providers/members_provider.dart   ✅ completo
```

**Estado auditado (2026-05):** Las pantallas anteriores **ya no** usan `MembersViewModel` ni `AuthServices()` para `churchId`. La sección histórica “problemas miembros” se sustituyó más abajo por **riesgos / deuda** puntuales.

**Flujo perfil:** Al editar desde la lista, `MemberList` llama `selectMember(member)` y navega con `extra: member`. `MembershipPage` lee `selectedMember` del notifier; mantener ese orden al añadir otras entradas al perfil.

**`members_provider.dart`** expone:
```dart
final membersNotifierProvider = StateNotifierProvider<MembersNotifier, MembersState>(
  (ref) => MembersNotifier(ref),  // ← recibe Ref para acceder a authProvider
);
```

**`MembersState`** tiene:
```dart
List<Member> members
bool isLoading
String? error
Member? selectedMember
MembershipModel? membershipProfile
Map<String, dynamic> memberFinances
List<String> memberRoles
```

**`MembersNotifier`** métodos disponibles:
```dart
fetchMembers()
selectMember(Member? member)
addMember(Member, AddressModel, ContactModel)
updateMember(Member, AddressModel, ContactModel)
getMemberRoles()
getMembershipByMemberId(String profileId)
getFinancialByMemberId(String profileId)
getFinancialByChurch()
setMembershipMaintance(Map<String, dynamic> membership)
```

**churchId** se obtiene así dentro del notifier:
```dart
int? get _churchId => _ref.read(authProvider).churchId;
```

---

## ⚠️ Members — riesgos y deuda (post-migración)

### 1. `selectedMember` vs `ProfileView.member`
- **MembershipPage** usa `ref.read(membersNotifierProvider).selectedMember` como fuente del `profileId`.
- **Flujo correcto hoy:** desde lista, `selectMember` + navegación con `extra` (ver `member_list.dart`).
- **Riesgo:** cualquier nueva ruta que pase solo `extra: Member` sin `selectMember` puede dejar membresía sin datos o con miembro equivocado. Refactor opcional: pasar `Member` explícito a `MembershipPage` o sincronizar en `ProfileView` con un `Consumer` + `selectMember` al montar.

### 2. `MemberFinances` — doble vía de datos
- La pantalla consume **`ContributionsRepository.fetchMemberFinancePayload`** (ingresos / payload de finanzas del feature finanzas), no el mapa `memberFinances` del notifier ni solo `getFinancialByMemberId`.
- El notifier **sigue** exponiendo `getFinancialByMemberId` / `getFinancialByChurch` (RPC `sp_get_collection_by_member`) para otros callers. Documentar en código si ambos contratos deben converger o son intencionalmente distintos.

### 3. `MemberMaintance` — robustez UI
- Es `HookConsumerWidget` y persiste con `updateMember` del provider. Posibles mejoras: dependencias de `useEffect` si el `member` inicial puede cambiar sin remount; flags `isMember`/`isActive` hoy fijos en el `Member` armado al guardar — revisar si deben reflejar el formulario.

### 4. `ProfileView` — tipo de widget
- Sigue siendo `HookWidget` (sin `ref`); las pestañas hijas son `HookConsumerWidget`. Coherente mientras el `member` llegue por constructor; si se centraliza estado en notifier, valorar `HookConsumerWidget` en el padre.

---

## 🚫 REGLAS — NO HACER

- ❌ No usar `Provider.of<X>(context)` para **auth o members** — usar Riverpod (`ref.watch` / `ref.read`)
- ❌ No instanciar `AuthServices()` en **código nuevo** de features auth/members — usar `authProvider` y repositorios; `AuthServices` sigue en `main.dart` por sesión almacenada y ViewModels **legacy** no migrados
- ❌ No instanciar `MembersNotifier()` directamente — usar `ref.read(membersNotifierProvider.notifier)`
- ❌ No usar `MembersViewModel` en features — está deprecado frente a `MembersNotifier`
- ❌ No agregar `ChangeNotifierProvider` dedicado solo para duplicar auth/members ya cubiertos por Riverpod
- ❌ No usar Freezed ni code generation — Riverpod manual únicamente

## ✅ PATRONES CORRECTOS

```dart
// Leer estado
final membersState = ref.watch(membersNotifierProvider);

// Llamar métodos
ref.read(membersNotifierProvider.notifier).fetchMembers();

// Obtener churchId
final churchId = ref.read(authProvider).churchId;

// Widget base
class MiWidget extends HookConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) { ... }
}
```

---

## 🔄 Legacy → Riverpod (consolidación en curso)

| Área | Estado |
|------|--------|
| **Modal usuarios admin** (`view/auth/widget/users_form_view.dart`) | Listado de miembros para el dropdown vía `membersNotifierProvider` + `churchId` desde `authProvider`. Ya no usa `MembersViewModel`. |
| **`MembersViewModel`** | Deprecado en código; no está en `MultiProvider`. |
| **`FinanceViewModel` / `CollectionViewModel`** | Comentados en `main`; la UI financiera vive en `features/finances/`. |
| **`AuthServices`** | En árbol para `loadStoredAuth`, modal admin usuarios (`signUp`/`updateUserMetadata` vía RPC) y VM que lo instancian. **Sign up (`/signup`)**, diálogo “olvidé contraseña”, **logout del shell** y **`churchId` en agregar tipo de gasto** usan `AuthRepository` / `authProvider`. |

---

## 📁 ESTRUCTURA COMPLETA DEL PROYECTO

```
lib/
├── main.dart                          ← ProviderScope + MultiProvider (AuthServices + legacy VM)
└── src/
    ├── app.dart                       ← MyAppEntry (ConsumerWidget) + GoRouter
    ├── constants/
    ├── core/theme/                    ← Material 3 centralizado (AppTheme)
    ├── features/
    │   ├── auth/
    │   ├── members/                   ← ver árbol detallado arriba
    │   └── finances/                ✅ fondos / transacciones / contribuciones (Riverpod + repos)
    ├── model/                         ← barrel + modelos aún globales (ver model_index.dart)
    │   └── model_index.dart           exporta p.ej. Address/Contact desde features/members/domain
    ├── routes/
    │   ├── app_route_config.dart      ← guard con authProvider (RouterNotifier)
    │   ├── app_route_constants.dart
    │   └── router_notifier.dart
    ├── view/                          ← LEGACY — dashboard, configuración, layout, fragments
    │   ├── home/
    │   └── layout/
    ├── view_model/                    ← LEGACY — migrar por módulo
    │   ├── finance_view_model.dart    ← aún referenciado en legacy; finanzas UI principal en features/
    │   ├── collection_view_model.dart ← aún en uso donde no haya migrado contribuciones legacy
    │   └── …
    └── widgets/
```

---

## 🗄️ STORED PROCEDURES EN SUPABASE

```dart
// Profiles
_supabase.rpc('spgetprofiles')
_supabase.rpc('spinsertprofiles', params: { p_church_id, p_first_name, ... })
_supabase.rpc('spupdateprofiles', params: { p_id, p_first_name, ... })
_supabase.rpc('sp_get_user_profile', params: { p_profile_id })

// Membresía
_supabase.rpc('spmaintancemembership', params: {
  p_profile_id, p_baptism_date, p_baptism_church,
  p_baptism_pastor, p_membership_role, p_baptism_church_city,
  p_baptism_church_country, p_has_credential, p_is_baptized_in_spirit
})
_supabase.rpc('sp_get_membership_history_by_profile', params: {
  p_church_id, p_profile_id
})

// Finanzas
_supabase.rpc('sp_get_collection_by_member', params: {
  p_church_id,
  p_profile_id  // opcional — si no se pasa, trae toda la iglesia
})
```

---

## 🎨 DISEÑO

- Material Design 3
- Paleta: `#1E0A4C`, `#4C1D95`, `#5B21B6` (deep purple)
- `HookWidget` para widgets sin providers
- `HookConsumerWidget` para widgets con Riverpod
- Breakpoint móvil: `< 800px`
- DataGrid en web/desktop, ListView en móvil