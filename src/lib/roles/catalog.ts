import type { PermissionKey } from "@/lib/auth/permission-keys";
import type { Icons } from "@/components/icons";
import {
  MATRIX_MODULES,
  MATRIX_PERMISSION_ORDER,
  financeResourceLabel,
  isMatrixModule,
} from "@/lib/roles/display";
import type { AppPermissionRow } from "@/lib/roles/types";

export const PERMISSION_ACTION_COLUMNS = [
  { action: "read", label: "Ver" },
  { action: "write", label: "Registrar" },
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
] as const;

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
  finances: "Finanzas",
  members: "Miembros",
  ministerios: "Ministerios",
};

export const MODULE_ICONS: Record<string, keyof typeof Icons> = {
  finances: "wallet",
  members: "users",
  ministerios: "pin",
};

export const MODULE_COLORS: Record<string, string> = {
  finances: "#059669",
  members: "#2563EB",
  ministerios: "#9333EA",
};

export function moduleLabel(module: string): string {
  return MODULE_LABELS[module] ?? module;
}

export function actionColumnIndex(action: string): number {
  const mapped = action === "write_own" ? "write" : action;
  return PERMISSION_ACTION_COLUMNS.findIndex((c) => c.action === mapped);
}

export function financePermissionKey(
  resource: string,
  action: string,
): PermissionKey {
  return `finances:${resource}:${action}` as PermissionKey;
}

export function groupMatrixCatalog(catalog: AppPermissionRow[]): MatrixModuleGroup[] {
  const byKey = new Map(catalog.map((row) => [row.permissionKey, row]));

  return MATRIX_MODULES.map((module) => {
    if (module === "finances") {
      const resources: MatrixResourceGroup[] = FINANCE_RESOURCE_DEFS.map((def) => {
        const permissionsByAction: Partial<Record<string, AppPermissionRow>> = {};
        for (const action of def.actions) {
          const key = financePermissionKey(def.key, action);
          const row = byKey.get(key);
          if (row) permissionsByAction[action] = row;
        }
        return {
          resourceKey: def.key,
          label: financeResourceLabel(def.key) || def.label,
          applicableActions: def.actions,
          permissionsByAction,
        };
      });
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
