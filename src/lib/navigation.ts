import type { PermissionKey } from "@/lib/auth/permission-keys";
import type { ChurchKind } from "@/lib/auth/app-session";
import { REPORT_READ_PERMISSIONS } from "@/lib/reports/permissions";

export type NavItem = {
  id: string;
  href: string;
  labelKey: string;
  icon: string;
  badge?: string;
  permission?: PermissionKey;
  /** Visible si el usuario tiene al menos uno de estos permisos. */
  permissionAny?: readonly PermissionKey[];
  /** Solo visible para iglesias con este church_kind (Fase 2 red). */
  requiresChurchKind?: ChurchKind;
};

export type NavGroup = {
  id: string;
  labelKey: string;
  icon: string;
  badge?: string;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export function isNavGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const MAIN_NAV: NavEntry[] = [
  {
    id: "dashboard",
    href: "/dashboard",
    labelKey: "dashboard",
    icon: "home",
    permission: "dashboard:read",
  },
  {
    id: "miembros",
    href: "/members",
    labelKey: "members",
    icon: "users",
    permission: "members:read",
  },
  {
    id: "ministerios",
    href: "/ministerios",
    labelKey: "ministerios",
    icon: "pin",
    permission: "ministerios:read",
  },
  {
    id: "finanzas",
    labelKey: "finances",
    icon: "wallet",
    children: [
      {
        id: "fondos",
        href: "/finances/funds",
        labelKey: "funds",
        icon: "wallet",
        permission: "finances:funds:read",
      },
      {
        id: "transacciones",
        href: "/finances/transactions",
        labelKey: "transactions",
        icon: "wallet",
        permission: "finances:transactions:read",
      },
      {
        id: "contribuciones",
        href: "/finances/contributions",
        labelKey: "contributions",
        icon: "wallet",
        permission: "finances:contributions:read",
      },
      {
        id: "tithe-close",
        href: "/finances/tithe-close",
        labelKey: "titheClose",
        icon: "wallet",
        permission: "finances:tithe_close:read",
      },
    ],
  },
  {
    id: "eventos",
    href: "/eventos",
    labelKey: "eventos",
    icon: "cal",
    badge: "3",
    permission: "eventos:read",
  },
  {
    id: "comunicacion",
    href: "/comunicacion",
    labelKey: "comunicacion",
    icon: "chat",
    badge: "4",
    permission: "comunicacion:read",
  },
  {
    id: "reportes",
    href: "/reports",
    labelKey: "reports",
    icon: "download",
    permissionAny: REPORT_READ_PERMISSIONS,
  },
  {
    id: "red",
    href: "/network",
    labelKey: "network",
    icon: "grid",
    permission: "network:churches:read",
    requiresChurchKind: "headquarters",
  },
];

export const CONFIG_NAV: NavEntry[] = [
  {
    id: "config-sistema",
    labelKey: "configSystem",
    icon: "settings",
    children: [
      {
        id: "gastos",
        href: "/settings/expenses",
        labelKey: "expenseTypes",
        icon: "wallet",
        permission: "settings:expense_types:read",
      },
      {
        id: "ingresos-tipos",
        href: "/settings/income-types",
        labelKey: "incomeTypes",
        icon: "trendUp",
        permission: "settings:income_types:read",
      },
      {
        id: "iglesia",
        href: "/settings/church",
        labelKey: "churchProfile",
        icon: "pin",
        permission: "settings:church:read",
      },
      {
        id: "descuentos",
        href: "/settings/discount-templates",
        labelKey: "discountTemplates",
        icon: "target",
        permission: "settings:church:read",
      },
    ],
  },
  {
    id: "config-usuarios",
    labelKey: "configUsers",
    icon: "users",
    children: [
      {
        id: "usuarios",
        href: "/settings/users",
        labelKey: "adminUsers",
        icon: "users",
        permission: "admin_users:manage",
      },
      {
        id: "roles",
        href: "/settings/roles",
        labelKey: "roles",
        icon: "star",
        permission: "roles:manage",
      },
      {
        id: "settings",
        href: "/settings",
        labelKey: "settings",
        icon: "settings",
        permission: "settings:read",
      },
    ],
  },
];

export type NavTranslate = (key: string) => string;

export function navLabel(labelKey: string, t: NavTranslate): string {
  return t(labelKey);
}

export function resolveNavEntryLabels(
  entries: NavEntry[],
  t: NavTranslate,
): Array<
  | (NavGroup & { label: string; children: Array<NavItem & { label: string }> })
  | (NavItem & { label: string })
> {
  return entries.map((entry) => {
    if (isNavGroup(entry)) {
      return {
        ...entry,
        label: navLabel(entry.labelKey, t),
        children: entry.children.map((child) => ({
          ...child,
          label: navLabel(child.labelKey, t),
        })),
      };
    }
    return { ...entry, label: navLabel(entry.labelKey, t) };
  });
}

function canSeeItem(
  permission: PermissionKey | undefined,
  permissionAny: readonly PermissionKey[] | undefined,
  permissions: PermissionKey[],
  requiresChurchKind: ChurchKind | undefined,
  churchKind: ChurchKind | undefined,
): boolean {
  if (requiresChurchKind && churchKind !== requiresChurchKind) {
    return false;
  }
  if (permissionAny?.length) {
    return permissionAny.some((key) => permissions.includes(key));
  }
  if (!permission) return true;
  return permissions.includes(permission);
}

export function filterNavItemsByPermissions(
  items: NavItem[],
  permissions: PermissionKey[],
  churchKind?: ChurchKind,
): NavItem[] {
  return items.filter((item) =>
    canSeeItem(
      item.permission,
      item.permissionAny,
      permissions,
      item.requiresChurchKind,
      churchKind,
    ),
  );
}

export function filterNavByPermissions(
  entries: NavEntry[],
  permissions: PermissionKey[],
  churchKind?: ChurchKind,
): NavEntry[] {
  return entries
    .map((entry) => {
      if (isNavGroup(entry)) {
        const children = entry.children.filter((c) =>
          canSeeItem(
            c.permission,
            c.permissionAny,
            permissions,
            c.requiresChurchKind,
            churchKind,
          ),
        );
        if (children.length === 0) return null;
        return { ...entry, children };
      }
      return canSeeItem(
        entry.permission,
        entry.permissionAny,
        permissions,
        entry.requiresChurchKind,
        churchKind,
      )
        ? entry
        : null;
    })
    .filter((e): e is NavEntry => e != null);
}

export const BREADCRUMB_KEYS: Record<string, [string, string]> = {
  dashboard: ["crumbHome", "dashboard"],
  miembros: ["crumbCommunity", "members"],
  ministerios: ["crumbCommunity", "ministerios"],
  fondos: ["crumbFinances", "funds"],
  transacciones: ["crumbFinances", "transactions"],
  contribuciones: ["crumbFinances", "contributions"],
  eventos: ["crumbAgenda", "eventos"],
  comunicacion: ["crumbConnection", "comunicacion"],
  gastos: ["crumbConfigSystem", "expenseTypes"],
  "ingresos-tipos": ["crumbConfigSystem", "incomeTypes"],
  iglesia: ["crumbConfigSystem", "churchProfile"],
  usuarios: ["crumbConfigUsers", "adminUsers"],
  roles: ["crumbConfigUsers", "roles"],
  settings: ["crumbConfigUsers", "settings"],
  reportes: ["crumbOperation", "reports"],
  red: ["crumbOperation", "network"],
};

export function navIdFromPath(pathname: string): string {
  if (pathname === "/dashboard") return "dashboard";
  if (pathname.startsWith("/members")) return "miembros";
  if (pathname.startsWith("/ministerios")) return "ministerios";
  if (pathname.startsWith("/finances/funds")) return "fondos";
  if (pathname.startsWith("/finances/transactions")) return "transacciones";
  if (pathname.startsWith("/finances/contributions")) return "contribuciones";
  if (pathname.startsWith("/finances")) return "fondos";
  if (pathname.startsWith("/eventos")) return "eventos";
  if (pathname.startsWith("/comunicacion")) return "comunicacion";
  if (pathname.startsWith("/reports")) return "reportes";
  if (pathname.startsWith("/network")) return "red";
  if (pathname.startsWith("/settings/users")) return "usuarios";
  if (pathname.startsWith("/settings/expenses")) return "gastos";
  if (pathname.startsWith("/settings/income-types")) return "ingresos-tipos";
  if (pathname.startsWith("/settings/church")) return "iglesia";
  if (pathname.startsWith("/settings/discount-templates")) return "descuentos";
  if (pathname.startsWith("/settings/roles")) return "roles";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function breadcrumbsFromPath(
  pathname: string,
  t: NavTranslate,
): [string, string] {
  const id = navIdFromPath(pathname);
  const keys = BREADCRUMB_KEYS[id];
  if (!keys) return ["", pathname.replace(/^\//, "") || "Home"];
  return [t(keys[0]), t(keys[1])];
}

export const BOTTOM_NAV_IDS = [
  "dashboard",
  "miembros",
  "finanzas",
  "comunicacion",
  "settings",
] as const;

export type BottomNavId = (typeof BOTTOM_NAV_IDS)[number];

export const BOTTOM_NAV_LABEL_KEYS: Record<BottomNavId, string> = {
  dashboard: "dashboard",
  miembros: "members",
  finanzas: "finances",
  comunicacion: "comunicacion",
  settings: "settings",
};
