import type { AuditLogEntry } from "@/lib/audit/types";

type AuditTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

function interpolate(
  template: string,
  params: Record<string, unknown>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = params[key];
    return value != null ? String(value) : "";
  });
}

export function resolveAuditSummary(
  entry: AuditLogEntry,
  t: AuditTranslator,
): string {
  if (entry.summaryKey) {
    try {
      return t(entry.summaryKey, entry.summaryParams as Record<string, string>);
    } catch {
      // fall through to summary or generic
    }
  }
  if (entry.summary.trim()) return entry.summary;
  const moduleLabel = t(`modules.${entry.module}`);
  const actionLabel = t(`actions.${entry.action}`);
  return `${actionLabel} · ${moduleLabel}`;
}

export function auditModuleLabel(module: string, t: AuditTranslator): string {
  try {
    return t(`modules.${module}`);
  } catch {
    return module;
  }
}

export function auditActionLabel(action: string, t: AuditTranslator): string {
  try {
    return t(`actions.${action}`);
  } catch {
    return action;
  }
}

export function formatAuditRelativeTime(
  isoDate: string,
  locale: string,
): string {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "";

  const now = Date.now();
  const diffSec = Math.round((date.getTime() - now) / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (absSec < 60) return rtf.format(diffSec, "second");
  const diffMin = Math.round(diffSec / 60);
  if (Math.abs(diffMin) < 60) return rtf.format(diffMin, "minute");
  const diffHour = Math.round(diffSec / 3600);
  if (Math.abs(diffHour) < 24) return rtf.format(diffHour, "hour");
  const diffDay = Math.round(diffSec / 86400);
  if (Math.abs(diffDay) < 7) return rtf.format(diffDay, "day");
  const diffWeek = Math.round(diffSec / 604800);
  return rtf.format(diffWeek, "week");
}

export function auditExportFilename(): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `bitacora-acciones-${stamp}`;
}

export { interpolate };
