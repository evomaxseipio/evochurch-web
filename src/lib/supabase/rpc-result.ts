function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

/** Stored procedures return `{ status: 'Success' }` or `{ success: true }` on OK. */
export function assertRpcSuccess(
  data: unknown,
  fallbackMessage = "La operación no se completó.",
): void {
  const row = asRecord(data);
  if (!row) return;

  const status = String(row.status ?? "").toLowerCase();
  if (status === "success") return;
  if (row.success === true) return;

  if (status && status !== "success") {
    throw new Error(String(row.message ?? fallbackMessage));
  }
  if (row.success === false) {
    throw new Error(String(row.message ?? fallbackMessage));
  }
}
