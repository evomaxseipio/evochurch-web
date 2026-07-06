export type AuditLogModule =
  | "members"
  | "finances"
  | "eventos"
  | "settings"
  | "admin_users"
  | "roles"
  | "auth";

export type AuditLogAction =
  | "create"
  | "update"
  | "delete"
  | "authorize"
  | "reject"
  | "login"
  | "logout";

export type AuditLogEntry = {
  id: string;
  churchId: number;
  actorAuthUserId?: string | null;
  actorProfileId?: string | null;
  actorDisplayName: string;
  module: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  summary: string;
  summaryKey?: string | null;
  summaryParams: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogFilters = {
  from?: string | null;
  to?: string | null;
  module?: string | null;
  action?: string | null;
  actorProfileId?: string | null;
  search?: string | null;
  limit?: number;
  offset?: number;
};

export type AuditLogPage = {
  items: AuditLogEntry[];
  total: number;
};
