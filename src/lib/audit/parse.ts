import type { AuditLogEntry, AuditLogPage } from "@/lib/audit/types";

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function asString(v: unknown): string {
  return typeof v === "string" ? v : v != null ? String(v) : "";
}

function asNumber(v: unknown, fallback = 0): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function asParams(v: unknown): Record<string, unknown> {
  const row = asRecord(v);
  return row ?? {};
}

function unwrapJsonValue(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return value;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return value;
  }
}

function coerceJsonArray(value: unknown): unknown[] {
  const unwrapped = unwrapJsonValue(value);
  return Array.isArray(unwrapped) ? unwrapped : [];
}

export function parseAuditLogEntry(raw: unknown): AuditLogEntry | null {
  const row = asRecord(raw);
  if (!row) return null;
  const id = asString(row.id);
  if (!id) return null;

  return {
    id,
    churchId: asNumber(row.church_id ?? row.churchId),
    actorAuthUserId: asString(row.actor_auth_user_id ?? row.actorAuthUserId) || null,
    actorProfileId: asString(row.actor_profile_id ?? row.actorProfileId) || null,
    actorDisplayName: asString(row.actor_display_name ?? row.actorDisplayName),
    module: asString(row.module),
    action: asString(row.action),
    entityType: asString(row.entity_type ?? row.entityType) || null,
    entityId: asString(row.entity_id ?? row.entityId) || null,
    summary: asString(row.summary),
    summaryKey: asString(row.summary_key ?? row.summaryKey) || null,
    summaryParams: asParams(row.summary_params ?? row.summaryParams),
    metadata: asParams(row.metadata),
    createdAt: asString(row.created_at ?? row.createdAt),
  };
}

export function parseAuditLogPageResponse(data: unknown): AuditLogPage {
  const root = asRecord(unwrapJsonValue(data));
  if (!root || root.success === false) {
    throw new Error(asString(root?.message) || "No se pudo cargar la bitácora.");
  }

  const items = coerceJsonArray(root.items)
    .map(parseAuditLogEntry)
    .filter((item): item is AuditLogEntry => item !== null);

  return {
    items,
    total: asNumber(root.total),
  };
}

export function parseRecentAuditLogResponse(data: unknown): AuditLogEntry[] {
  const source = coerceJsonArray(unwrapJsonValue(data));
  return source
    .map(parseAuditLogEntry)
    .filter((item): item is AuditLogEntry => item !== null);
}
