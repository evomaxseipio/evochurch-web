"use client";

import {
  createOrgApiKeyAction,
  revokeOrgApiKeyAction,
} from "@/app/org/(console)/settings/actions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { OrgApiKeyRow } from "@/lib/services/org-portal";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

export function OrgSettingsView({
  organizationName,
  apiKeys,
}: {
  organizationName: string;
  apiKeys: OrgApiKeyRow[];
}) {
  const t = useTranslations("org");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [newKey, setNewKey] = useState<string | null>(null);
  const [label, setLabel] = useState("Integración externa");

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    startTransition(async () => {
      const result = await createOrgApiKeyAction(label);
      if (!result.ok) {
        toast.error(t("settings.api.createError"), result.error);
        return;
      }
      setNewKey(result.rawKey);
      toast.success(t("settings.api.createSuccess"));
      router.refresh();
    });
  }

  function handleRevoke(keyId: string) {
    startTransition(async () => {
      const result = await revokeOrgApiKeyAction(keyId);
      if (!result.ok) {
        toast.error(t("settings.api.revokeError"), result.error);
        return;
      }
      toast.success(t("settings.api.revokeSuccess"));
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("settings.title")}
        titleAccent={organizationName}
        subtitle={t("settings.subtitle")}
      />

      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 md:p-6">
        <h2 className="mb-2 text-lg font-semibold">{t("settings.api.title")}</h2>
        <p className="mb-4 text-sm text-[var(--muted)]">
          {t("settings.api.description")}
        </p>

        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[220px] flex-1 space-y-1.5">
            <span className="text-sm text-[var(--muted)]">
              {t("settings.api.label")}
            </span>
            <input
              className="input w-full"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </label>
          <button type="submit" className="btn" disabled={isPending}>
            {isPending ? t("settings.api.creating") : t("settings.api.create")}
          </button>
        </form>

        {newKey ? (
          <div
            className="mb-4 rounded-xl border border-[var(--hairline)] bg-[var(--bg)] p-4 text-sm"
            role="status"
          >
            <p className="mb-2 font-medium">{t("settings.api.copyOnce")}</p>
            <code className="block break-all rounded-lg bg-black/5 px-3 py-2 font-mono text-xs dark:bg-white/5">
              {newKey}
            </code>
          </div>
        ) : null}

        <div className="mb-4 rounded-xl border border-[var(--hairline)] bg-[var(--bg)] p-4 text-sm text-[var(--muted)]">
          <p className="mb-2 font-medium text-[var(--text)]">
            {t("settings.api.endpoints")}
          </p>
          <ul className="list-disc space-y-1 pl-5 font-mono text-xs">
            <li>GET /api/org/v1/churches</li>
            <li>GET /api/org/v1/reports?periodYear=2026&periodMonth=6</li>
          </ul>
          <p className="mt-2">{t("settings.api.authHint")}</p>
        </div>

        <DataTable
          columns={[
            {
              key: "label",
              label: t("settings.api.table.label"),
              render: (row) => row.label,
            },
            {
              key: "prefix",
              label: t("settings.api.table.prefix"),
              render: (row) => (
                <span className="font-mono text-xs">{row.keyPrefix}…</span>
              ),
            },
            {
              key: "created",
              label: t("settings.api.table.created"),
              render: (row) =>
                row.createdAt
                  ? new Date(row.createdAt).toLocaleString()
                  : "—",
            },
            {
              key: "lastUsed",
              label: t("settings.api.table.lastUsed"),
              render: (row) =>
                row.lastUsedAt
                  ? new Date(row.lastUsedAt).toLocaleString()
                  : "—",
            },
            {
              key: "status",
              label: t("settings.api.table.status"),
              render: (row) =>
                row.revokedAt ? (
                  <span className="text-[var(--danger)]">
                    {t("settings.api.revoked")}
                  </span>
                ) : (
                  <span className="text-[var(--success)]">
                    {t("settings.api.active")}
                  </span>
                ),
            },
            {
              key: "actions",
              label: t("settings.api.table.actions"),
              render: (row) =>
                row.revokedAt ? (
                  "—"
                ) : (
                  <button
                    type="button"
                    className="btn outline text-xs"
                    disabled={isPending}
                    onClick={() => handleRevoke(row.id)}
                  >
                    {t("settings.api.revoke")}
                  </button>
                ),
            },
          ]}
          rows={apiKeys}
          rowKey={(row) => row.id}
          empty={
            <div className="py-8 text-center text-sm text-[var(--muted)]">
              {t("settings.api.empty")}
            </div>
          }
        />
      </section>
    </div>
  );
}
