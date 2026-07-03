import type { PermissionKey } from "@/lib/auth/permission-keys";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: string;
  badge?: string;
  permission?: PermissionKey;
};

export type NavGroup = {
  id: string;
  label: string;
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
    label: "Dashboard",
    icon: "home",
    permission: "dashboard:read",
  },
  {
    id: "miembros",
    href: "/members",
    label: "Miembros",
    icon: "users",
    permission: "members:read",
  },
  {
    id: "ministerios",
    href: "/ministerios",
    label: "Ministerios",
    icon: "pin",
    permission: "ministerios:read",
  },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: "wallet",
    children: [
      {
        id: "fondos",
        href: "/finances/funds",
        label: "Fondos",
        icon: "wallet",
        permission: "finances:funds:read",
      },
      {
        id: "transacciones",
        href: "/finances/transactions",
        label: "Transacciones",
        icon: "wallet",
        permission: "finances:transactions:read",
      },
      {
        id: "contribuciones",
        href: "/finances/contributions",
        label: "Contribuciones",
        icon: "wallet",
        permission: "finances:contributions:read",
      },
    ],
  },
  {
    id: "eventos",
    href: "/eventos",
    label: "Eventos",
    icon: "cal",
    badge: "3",
    permission: "eventos:read",
  },
  {
    id: "comunicacion",
    href: "/comunicacion",
    label: "Comunicación",
    icon: "chat",
    badge: "4",
    permission: "comunicacion:read",
  },
];

export const CONFIG_NAV: NavItem[] = [
  {
    id: "roles",
    href: "/settings/roles",
    label: "Roles y permisos",
    icon: "star",
    permission: "roles:manage",
  },
  {
    id: "usuarios",
    href: "/settings/users",
    label: "Usuarios",
    icon: "users",
    permission: "admin_users:manage",
  },
  {
    id: "gastos",
    href: "/settings/expenses",
    label: "Tipos de gasto",
    icon: "wallet",
    permission: "settings:catalogs",
  },
  {
    id: "ingresos-tipos",
    href: "/settings/income-types",
    label: "Tipos de ingreso",
    icon: "trendUp",
    permission: "settings:catalogs",
  },
  {
    id: "settings",
    href: "/settings",
    label: "Configuración",
    icon: "settings",
    permission: "settings:read",
  },
];

function canSeeItem(
  permission: PermissionKey | undefined,
  permissions: PermissionKey[],
): boolean {
  if (!permission) return true;
  return permissions.includes(permission);
}

export function filterNavItemsByPermissions(
  items: NavItem[],
  permissions: PermissionKey[],
): NavItem[] {
  return items.filter((item) => canSeeItem(item.permission, permissions));
}

export function filterNavByPermissions(
  entries: NavEntry[],
  permissions: PermissionKey[],
): NavEntry[] {
  return entries
    .map((entry) => {
      if (isNavGroup(entry)) {
        const children = entry.children.filter((c) =>
          canSeeItem(c.permission, permissions),
        );
        if (children.length === 0) return null;
        return { ...entry, children };
      }
      return canSeeItem(entry.permission, permissions) ? entry : null;
    })
    .filter((e): e is NavEntry => e != null);
}

export const BREADCRUMBS: Record<string, [string, string]> = {
  dashboard: ["Inicio", "Dashboard"],
  miembros: ["Comunidad", "Miembros"],
  ministerios: ["Comunidad", "Ministerios"],
  fondos: ["Finanzas", "Fondos"],
  transacciones: ["Finanzas", "Transacciones"],
  contribuciones: ["Finanzas", "Contribuciones"],
  eventos: ["Agenda", "Eventos"],
  comunicacion: ["Conexión", "Comunicación"],
  usuarios: ["Configuración", "Usuarios admin"],
  gastos: ["Configuración", "Tipos de gasto"],
  "ingresos-tipos": ["Configuración", "Tipos de ingreso"],
  roles: ["Configuración", "Roles y permisos"],
  settings: ["Cuenta", "Configuración"],
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
  if (pathname.startsWith("/settings/users")) return "usuarios";
  if (pathname.startsWith("/settings/expenses")) return "gastos";
  if (pathname.startsWith("/settings/income-types")) return "ingresos-tipos";
  if (pathname.startsWith("/settings/roles")) return "roles";
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function breadcrumbsFromPath(pathname: string): [string, string] {
  const id = navIdFromPath(pathname);
  return BREADCRUMBS[id] ?? ["", pathname.replace(/^\//, "") || "Home"];
}

export const BOTTOM_NAV_IDS = [
  "dashboard",
  "miembros",
  "finanzas",
  "comunicacion",
  "settings",
] as const;

export type BottomNavId = (typeof BOTTOM_NAV_IDS)[number];
