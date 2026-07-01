import type { ReactNode } from "react";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: string;
  badge?: string;
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
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: "home" },
  { id: "miembros", href: "/members", label: "Miembros", icon: "users" },
  { id: "ministerios", href: "/ministerios", label: "Ministerios", icon: "pin" },
  {
    id: "finanzas",
    label: "Finanzas",
    icon: "wallet",
    children: [
      { id: "fondos", href: "/finances/funds", label: "Fondos", icon: "wallet" },
      {
        id: "transacciones",
        href: "/finances/transactions",
        label: "Transacciones",
        icon: "wallet",
      },
      {
        id: "contribuciones",
        href: "/finances/contributions",
        label: "Contribuciones",
        icon: "wallet",
      },
    ],
  },
  { id: "eventos", href: "/eventos", label: "Eventos", icon: "cal", badge: "3" },
  {
    id: "comunicacion",
    href: "/comunicacion",
    label: "Comunicación",
    icon: "chat",
    badge: "4",
  },
];

export const CONFIG_NAV: NavItem[] = [
  { id: "usuarios", href: "/settings/users", label: "Usuarios", icon: "users" },
  {
    id: "gastos",
    href: "/settings/expenses",
    label: "Tipos de gasto",
    icon: "wallet",
  },
  {
    id: "ingresos-tipos",
    href: "/settings/income-types",
    label: "Tipos de ingreso",
    icon: "trendUp",
  },
  { id: "settings", href: "/settings", label: "Configuración", icon: "settings" },
];

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
  if (pathname.startsWith("/settings")) return "settings";
  return "dashboard";
}

export function breadcrumbsFromPath(pathname: string): [string, string] {
  const id = navIdFromPath(pathname);
  return BREADCRUMBS[id] ?? ["", pathname.replace(/^\//, "") || "Home"];
}

/** Bottom nav: Dashboard, Miembros, Finanzas (popup), Comunicación, Configuración */
export const BOTTOM_NAV_IDS = [
  "dashboard",
  "miembros",
  "finanzas",
  "comunicacion",
  "settings",
] as const;

export type BottomNavId = (typeof BOTTOM_NAV_IDS)[number];
