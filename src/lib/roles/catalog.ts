import type { PermissionKey } from "@/lib/auth/permission-keys";
import type { Icons } from "@/components/icons";
import {
  MATRIX_MODULES,
  MATRIX_PERMISSION_ORDER,
  MODULE_ACTION_COLUMN_LABELS,
  financeResourceLabel,
  isMatrixModule,
  permissionUiLabel,
  reportResourceLabel,
} from "@/lib/roles/display";
import { REPORT_RESOURCE_DEFS, reportPermissionKey } from "@/lib/reports/permissions";
import type { AppPermissionRow } from "@/lib/roles/types";

export const PERMISSION_ACTION_COLUMNS = [
  { action: "read", label: "Ver" },
  { action: "write", label: "Registrar" },
  { action: "write_own", label: "Editar propios" },
  { action: "authorize", label: "Autorizar" },
  { action: "delete", label: "Eliminar" },
  { action: "export", label: "Exportar" },
] as const;

export const FINANCE_RESOURCE_DEFS = [
  {
    key: "funds",
    label: "Fondos",
    actions: ["read", "write", "delete", "export"],
  },
  {
    key: "transactions",
    label: "Transacciones",
    actions: ["read", "write", "authorize", "delete", "export"],
  },
  {
    key: "contributions",
    label: "Contribuciones",
    actions: ["read", "write", "delete", "export"],
  },
  {
    key: "tithe_close",
    label: "Cierre de diezmos",
    actions: ["read", "write"],
  },
] as const;

/** Una fila en la matriz — permisos ABAC de ministerios (líder). */
export const MINISTERIOS_RESOURCE_DEFS = [
  {
    key: "ministerios",
    label: "Ministerios",
    actions: ["read", "write", "write_own"],
  },
] as const;

export const REPORT_MATRIX_RESOURCE_DEFS = REPORT_RESOURCE_DEFS.map((def) => ({
  key: def.key,
  label: def.label,
  actions: ["read", "export"] as const,
}));

/** Red sede — consulta read-only de sucursales. */
export const NETWORK_RESOURCE_DEFS = [
  {
    key: "churches",
    label: "Red de iglesias",
    actions: ["read"],
  },
] as const;

/** Catálogos de configuración — una fila por recurso (como finanzas). */
export const SETTINGS_RESOURCE_DEFS = [
  {
    key: "expense_types",
    label: "Tipos de gasto",
    actions: ["read", "write", "delete"],
  },
  {
    key: "income_types",
    label: "Tipos de ingreso",
    actions: ["read", "write", "delete"],
  },
  {
    key: "profile",
    label: "Configuración y perfil",
    actions: ["read"],
  },
  {
    key: "church",
    label: "Perfil de iglesia",
    actions: ["read", "write"],
  },
  {
    key: "discount_templates",
    label: "Plantillas de descuento",
    actions: ["write"],
  },
] as const;

/** Módulos con una fila y acciones en columnas (como finanzas). */
export const MODULE_MATRIX_RESOURCE_DEFS: Record<
  string,
  readonly { key: string; label: string; actions: readonly string[] }[]
> = {
  dashboard: [{ key: "dashboard", label: "Dashboard", actions: ["read"] }],
  members: [{ key: "members", label: "Miembros", actions: ["read", "write", "delete"] }],
  eventos: [{ key: "eventos", label: "Eventos", actions: ["read", "write", "write_own", "delete"] }],
  comunicacion: [
    { key: "comunicacion", label: "Comunicación", actions: ["read", "write", "delete"] },
  ],
  admin_users: [
    { key: "admin_users", label: "Usuarios admin", actions: ["write"] },
  ],
  roles: [{ key: "roles", label: "Roles y permisos", actions: ["write"] }],
};

export type MatrixResourceGroup = {
  resourceKey: string;
  label: string;
  applicableActions: readonly string[];
  permissionsByAction: Partial<Record<string, AppPermissionRow>>;
};

export type MatrixModuleGroup = {
  module: string;
  permissions: AppPermissionRow[];
  resources?: MatrixResourceGroup[];
};

export const MODULE_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  network: "Red de iglesias",
  finances: "Finanzas",
  members: "Miembros",
  ministerios: "Ministerios",
  eventos: "Eventos",
  comunicacion: "Comunicación",
  settings: "Configuración",
  admin_users: "Usuarios admin",
  roles: "Roles y permisos",
  reports: "Reportes",
};

export const MODULE_ICONS: Record<string, keyof typeof Icons> = {
  dashboard: "home",
  network: "grid",
  finances: "wallet",
  members: "users",
  ministerios: "pin",
  eventos: "cal",
  comunicacion: "chat",
  settings: "settings",
  admin_users: "shield",
  roles: "star",
  reports: "download",
};

export const MODULE_COLORS: Record<string, string> = {
  dashboard: "#7C3AED",
  network: "#0D9488",
  finances: "#059669",
  members: "#2563EB",
  ministerios: "#9333EA",
  eventos: "#0891B2",
  comunicacion: "#DB2777",
  settings: "#64748B",
  admin_users: "#0891B2",
  roles: "#CA8A04",
  reports: "#5B21B6",
};

export function moduleLabel(module: string): string {
  return MODULE_LABELS[module] ?? module;
}

export function actionColumnIndex(action: string): number {
  return PERMISSION_ACTION_COLUMNS.findIndex((c) => c.action === action);
}

export function actionColumnLabel(module: string, action: string): string {
  const override = MODULE_ACTION_COLUMN_LABELS[module]?.[action];
  if (override) return override;
  return (
    PERMISSION_ACTION_COLUMNS.find((col) => col.action === action)?.label ??
    action
  );
}

/** Al guardar la matriz: write / delete implican read; sin read no hay escritura. */
export function applyStandardPermissionRules(
  draft: Set<PermissionKey>,
  key: PermissionKey,
  checked: boolean,
): void {
  const moduleKey = key.split(":")[0];
  const crudModules = ["members", "eventos", "comunicacion"];
  const settingsCatalogResources = ["expense_types", "income_types", "church"] as const;

  if (key.startsWith("reports:")) {
    const resource = key.split(":")[1];
    const readKey = `reports:${resource}:read` as PermissionKey;
    if (checked) {
      if (key.endsWith(":export")) {
        draft.add(readKey);
      }
      return;
    }
    if (key.endsWith(":read")) {
      draft.delete(`reports:${resource}:export` as PermissionKey);
    }
    return;
  }

  if (settingsCatalogResources.some((r) => key.startsWith(`settings:${r}:`))) {
    const resource = key.split(":")[1];
    const readKey = `settings:${resource}:read` as PermissionKey;
    if (checked) {
      if (key.endsWith(":write") || key.endsWith(":delete")) {
        draft.add(readKey);
      }
      return;
    }
    if (key.endsWith(":read")) {
      draft.delete(`settings:${resource}:write` as PermissionKey);
      draft.delete(`settings:${resource}:delete` as PermissionKey);
    }
    return;
  }

  if (crudModules.some((m) => key.startsWith(`${m}:`))) {
    if (checked) {
      if (
        key.endsWith(":write") ||
        key.endsWith(":delete") ||
        (moduleKey === "eventos" && key.endsWith(":write_own"))
      ) {
        draft.add(`${moduleKey}:read` as PermissionKey);
      }
      return;
    }
    if (key.endsWith(":read")) {
      draft.delete(`${moduleKey}:write` as PermissionKey);
      draft.delete(`${moduleKey}:delete` as PermissionKey);
      if (moduleKey === "eventos") {
        draft.delete("eventos:write_own" as PermissionKey);
      }
    }
    return;
  }
}

const CRUD_MODULES = ["members", "eventos", "comunicacion"] as const;

const SETTINGS_CATALOG_RESOURCES = ["expense_types", "income_types", "church"] as const;

const FINANCE_RESOURCES = [
  "funds",
  "transactions",
  "contributions",
  "tithe_close",
] as const;

const REPORT_RESOURCES = REPORT_RESOURCE_DEFS.map((def) => def.key);

const FINANCE_ACTIONS = [
  "write",
  "delete",
  "export",
  "authorize",
] as const;

/**
 * Normaliza el draft antes de persistir: cada acción es independiente en BD.
 * Quita write/delete/export/authorize huérfanos si falta read del mismo recurso.
 */
export function sanitizePermissionDraftForSave(
  keys: Iterable<PermissionKey>,
): PermissionKey[] {
  const set = new Set(keys);

  for (const moduleKey of CRUD_MODULES) {
    const readKey = `${moduleKey}:read` as PermissionKey;
    if (!set.has(readKey)) {
      set.delete(`${moduleKey}:write` as PermissionKey);
      set.delete(`${moduleKey}:delete` as PermissionKey);
      if (moduleKey === "eventos") {
        set.delete("eventos:write_own");
      }
    }
  }

  if (set.has("eventos:write") || set.has("eventos:write_own")) {
    set.add("eventos:read");
  }

  if (set.has("ministerios:write") || set.has("ministerios:write_own")) {
    set.add("ministerios:read");
  }
  if (!set.has("ministerios:read")) {
    set.delete("ministerios:write");
    set.delete("ministerios:write_own");
  }

  for (const resource of SETTINGS_CATALOG_RESOURCES) {
    const readKey = `settings:${resource}:read` as PermissionKey;
    if (!set.has(readKey)) {
      set.delete(`settings:${resource}:write` as PermissionKey);
      set.delete(`settings:${resource}:delete` as PermissionKey);
    }
  }

  for (const resource of FINANCE_RESOURCES) {
    const readKey = `finances:${resource}:read` as PermissionKey;
    if (set.has(readKey)) continue;
    for (const action of FINANCE_ACTIONS) {
      if (resource !== "transactions" && action === "authorize") continue;
      set.delete(`finances:${resource}:${action}` as PermissionKey);
    }
  }

  for (const resource of REPORT_RESOURCES) {
    const readKey = `reports:${resource}:read` as PermissionKey;
    if (set.has(readKey)) continue;
    set.delete(`reports:${resource}:export` as PermissionKey);
  }

  return [...set].sort();
}

/** Al guardar la matriz: write / write_own implican read; sin read no hay escritura. */
export function applyMinistryPermissionRules(
  draft: Set<PermissionKey>,
  key: PermissionKey,
  checked: boolean,
): void {
  if (!key.startsWith("ministerios:")) return;

  if (checked) {
    if (key === "ministerios:write" || key === "ministerios:write_own") {
      draft.add("ministerios:read");
    }
    return;
  }

  if (key === "ministerios:read") {
    draft.delete("ministerios:write");
    draft.delete("ministerios:write_own");
  }
}

export function financePermissionKey(
  resource: string,
  action: string,
): PermissionKey {
  return `finances:${resource}:${action}` as PermissionKey;
}

export function ministeriosPermissionKey(action: string): PermissionKey {
  return `ministerios:${action}` as PermissionKey;
}

export function networkPermissionKey(
  resource: string,
  action: string,
): PermissionKey {
  return `network:${resource}:${action}` as PermissionKey;
}

export function settingsPermissionKey(
  resource: string,
  action: string,
): PermissionKey {
  if (resource === "profile" && action === "read") return "settings:read";
  return `settings:${resource}:${action}` as PermissionKey;
}

export function moduleMatrixPermissionKey(
  module: string,
  action: string,
): PermissionKey {
  if (module === "admin_users" && action === "write") return "admin_users:manage";
  if (module === "roles" && action === "write") return "roles:manage";
  return `${module}:${action}` as PermissionKey;
}

export function matrixResourcePermissionPattern(
  module: string,
  resourceKey: string,
): string {
  if (resourceKey === module) return `${module}:*`;
  return `${module}:${resourceKey}:*`;
}

function buildResourceGroup(
  module: string,
  def: {
    key: string;
    label: string;
    actions: readonly string[];
  },
  byKey: Map<string, AppPermissionRow>,
  permissionKeyForAction: (action: string) => PermissionKey,
): MatrixResourceGroup {
  const permissionsByAction: Partial<Record<string, AppPermissionRow>> = {};

  for (const action of def.actions) {
    const key = permissionKeyForAction(action);
    const row = byKey.get(key) ?? {
      permissionKey: key,
      module,
      action,
      description: permissionUiLabel(key, key),
    };
    permissionsByAction[action] = row;
  }

  return {
    resourceKey: def.key,
    label: def.label,
    applicableActions: def.actions,
    permissionsByAction,
  };
}

export function groupMatrixCatalog(catalog: AppPermissionRow[]): MatrixModuleGroup[] {
  const byKey = new Map(catalog.map((row) => [row.permissionKey, row]));

  return MATRIX_MODULES.map((module) => {
    if (module === "finances") {
      const resources: MatrixResourceGroup[] = FINANCE_RESOURCE_DEFS.map((def) =>
        buildResourceGroup(
          "finances",
          {
            ...def,
            label: financeResourceLabel(def.key) || def.label,
          },
          byKey,
          (action) => financePermissionKey(def.key, action),
        ),
      );
      const permissions = resources.flatMap((r) =>
        Object.values(r.permissionsByAction).filter(
          (row): row is AppPermissionRow => row != null,
        ),
      );
      return { module, permissions, resources };
    }

    if (module === "ministerios") {
      const resources: MatrixResourceGroup[] = MINISTERIOS_RESOURCE_DEFS.map(
        (def) =>
          buildResourceGroup(
            "ministerios",
            def,
            byKey,
            (action) => ministeriosPermissionKey(action),
          ),
      );
      const permissions = resources.flatMap((r) =>
        Object.values(r.permissionsByAction).filter(
          (row): row is AppPermissionRow => row != null,
        ),
      );
      return { module, permissions, resources };
    }

    if (module === "settings") {
      const resources: MatrixResourceGroup[] = SETTINGS_RESOURCE_DEFS.map(
        (def) =>
          buildResourceGroup(
            "settings",
            def,
            byKey,
            (action) => settingsPermissionKey(def.key, action),
          ),
      );
      const permissions = resources.flatMap((r) =>
        Object.values(r.permissionsByAction).filter(
          (row): row is AppPermissionRow => row != null,
        ),
      );
      return { module, permissions, resources };
    }

    if (module === "network") {
      const resources: MatrixResourceGroup[] = NETWORK_RESOURCE_DEFS.map(
        (def) =>
          buildResourceGroup(
            "network",
            def,
            byKey,
            (action) => networkPermissionKey(def.key, action),
          ),
      );
      const permissions = resources.flatMap((r) =>
        Object.values(r.permissionsByAction).filter(
          (row): row is AppPermissionRow => row != null,
        ),
      );
      return { module, permissions, resources };
    }

    if (module === "reports") {
      const resources: MatrixResourceGroup[] = REPORT_MATRIX_RESOURCE_DEFS.map(
        (def) =>
          buildResourceGroup(
            "reports",
            {
              ...def,
              label: reportResourceLabel(def.key) || def.label,
            },
            byKey,
            (action) => reportPermissionKey(def.key, action as "read" | "export"),
          ),
      );
      const permissions = resources.flatMap((r) =>
        Object.values(r.permissionsByAction).filter(
          (row): row is AppPermissionRow => row != null,
        ),
      );
      return { module, permissions, resources };
    }

    const moduleDefs = MODULE_MATRIX_RESOURCE_DEFS[module];
    if (moduleDefs) {
      const resources: MatrixResourceGroup[] = moduleDefs.map((def) =>
        buildResourceGroup(
          module,
          def,
          byKey,
          (action) => moduleMatrixPermissionKey(module, action),
        ),
      );
      const permissions = resources.flatMap((r) =>
        Object.values(r.permissionsByAction).filter(
          (row): row is AppPermissionRow => row != null,
        ),
      );
      return { module, permissions, resources };
    }

    const order = MATRIX_PERMISSION_ORDER[module] ?? [];
    const permissions = order
      .map((key) => byKey.get(key as PermissionKey))
      .filter((row): row is AppPermissionRow => row != null);

    return { module, permissions };
  }).filter((g) => g.permissions.length > 0);
}

export function filterMatrixCatalog(catalog: AppPermissionRow[]): AppPermissionRow[] {
  return catalog.filter((row) => isMatrixModule(row.module));
}

export function isActionApplicable(
  applicableActions: readonly string[] | undefined,
  action: string,
): boolean {
  if (!applicableActions) return true;
  return applicableActions.includes(action);
}
