export type RoleKind = "system_locked" | "system_editable" | "custom";

export type RoleConfig = {
  color?: string;
  summary?: string;
  sortOrder?: number;
  icon?: string;
  showInUserPicker?: boolean;
  badge?: string;
};

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

export function parseRoleConfig(raw: unknown): RoleConfig {
  const row = asRecord(raw);
  if (!row) return {};

  const config: RoleConfig = {};

  if (typeof row.color === "string" && row.color.trim()) {
    config.color = row.color.trim();
  }
  if (typeof row.summary === "string" && row.summary.trim()) {
    config.summary = row.summary.trim();
  }
  if (typeof row.icon === "string" && row.icon.trim()) {
    config.icon = row.icon.trim();
  }
  if (typeof row.badge === "string" && row.badge.trim()) {
    config.badge = row.badge.trim();
  }
  if (typeof row.sortOrder === "number" && Number.isFinite(row.sortOrder)) {
    config.sortOrder = row.sortOrder;
  } else if (typeof row.sortOrder === "string") {
    const n = Number.parseInt(row.sortOrder, 10);
    if (Number.isFinite(n)) config.sortOrder = n;
  }
  if (typeof row.showInUserPicker === "boolean") {
    config.showInUserPicker = row.showInUserPicker;
  }

  return config;
}

export function roleDisplayColor(input: {
  roleConfig?: RoleConfig;
  description?: string | null;
}): string {
  return input.roleConfig?.color?.trim() || "var(--primary)";
}

export function roleDisplaySummary(input: {
  roleConfig?: RoleConfig;
  description?: string | null;
  isCustom?: boolean;
}): string {
  if (input.roleConfig?.summary?.trim()) {
    return input.roleConfig.summary.trim();
  }
  if (input.description?.trim()) return input.description.trim();
  if (input.isCustom) return "Rol personalizado de la iglesia";
  return "";
}

export function parseRoleKind(raw: unknown): RoleKind | null {
  if (raw === "system_locked" || raw === "system_editable" || raw === "custom") {
    return raw;
  }
  return null;
}
