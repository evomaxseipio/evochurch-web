/** Textos de UI — no modifican app_users_role ni app_permissions en BD. */

export const ROLE_UI_SUMMARY: Record<number, string> = {
  1: "Acceso total a todas las funciones",
  2: "Gestión administrativa y de miembros",
  3: "Gestión financiera",
  4: "Liderazgo pastoral",
  10: "Liderazgo de ministerio",
};

export const ROLE_UI_COLORS: Record<number, string> = {
  1: "#7C3AED",
  2: "#0891B2",
  3: "#059669",
  4: "#CA8A04",
  10: "#EA580C",
};

export function roleUiSummary(appRoleId: number): string {
  return ROLE_UI_SUMMARY[appRoleId] ?? "";
}

export function roleUiColor(appRoleId: number): string {
  return ROLE_UI_COLORS[appRoleId] ?? "var(--primary)";
}

/** Módulos visibles en la matriz (como el mock). */
export const MATRIX_MODULES = ["finances", "members", "ministerios"] as const;

export const MODULE_UI_DESCRIPTIONS: Record<string, string> = {
  finances: "Ingresos, egresos, transferencias y reportes",
  members: "Gestión de miembros y asistentes",
  ministerios: "Gestión de ministerios y líderes",
};

export const FINANCE_RESOURCE_LABELS: Record<string, string> = {
  funds: "Fondos",
  transactions: "Transacciones",
  contributions: "Contribuciones",
};

export const PERMISSION_UI_LABELS: Record<string, string> = {
  "finances:funds:read": "Ver fondos",
  "finances:funds:write": "Registrar fondos",
  "finances:funds:delete": "Eliminar fondos",
  "finances:funds:export": "Exportar fondos",
  "finances:transactions:read": "Ver transacciones",
  "finances:transactions:write": "Registrar transacciones",
  "finances:transactions:authorize": "Autorizar egresos",
  "finances:transactions:delete": "Eliminar transacciones",
  "finances:transactions:export": "Exportar transacciones",
  "finances:contributions:read": "Ver contribuciones",
  "finances:contributions:write": "Registrar contribuciones",
  "finances:contributions:delete": "Eliminar contribuciones",
  "finances:contributions:export": "Exportar contribuciones",
  "members:read": "Ver miembros",
  "members:write": "Editar miembros",
  "members:delete": "Eliminar miembros",
  "ministerios:read": "Ver ministerios",
  "ministerios:write": "Editar ministerios",
  "ministerios:write_own": "Editar ministerios propios",
};

export const MATRIX_PERMISSION_ORDER: Record<string, string[]> = {
  finances: [],
  members: ["members:read", "members:write", "members:delete"],
  ministerios: [
    "ministerios:read",
    "ministerios:write",
    "ministerios:write_own",
  ],
};

export function permissionUiLabel(permissionKey: string, fallback: string): string {
  return PERMISSION_UI_LABELS[permissionKey] ?? fallback;
}

export function isMatrixModule(module: string): boolean {
  return (MATRIX_MODULES as readonly string[]).includes(module);
}

export function financeResourceLabel(resourceKey: string): string {
  return FINANCE_RESOURCE_LABELS[resourceKey] ?? resourceKey;
}
