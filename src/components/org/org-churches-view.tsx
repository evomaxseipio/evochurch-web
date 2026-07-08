"use client";

import { provisionChurchAction } from "@/app/org/(console)/churches/actions";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { OrgChurchRow } from "@/lib/services/org-portal";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

export function OrgChurchesView({
  organizationName,
  churches,
  canProvision = false,
}: {
  organizationName: string;
  churches: OrgChurchRow[];
  canProvision?: boolean;
}) {
  const t = useTranslations("org");
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleProvision(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await provisionChurchAction(formData);
      if (!result.ok) {
        toast.error(t("churches.provision.error"), result.error);
        return;
      }
      toast.success(t("churches.provision.success"));
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("churches.title")}
        titleAccent={organizationName}
        subtitle={t("churches.subtitle")}
        actions={
          canProvision ? (
            <button
              type="button"
              className="btn"
              onClick={() => setShowForm((value) => !value)}
            >
              {showForm
                ? t("churches.provision.cancel")
                : t("churches.provision.add")}
            </button>
          ) : null
        }
      />

      {canProvision && showForm ? (
        <form
          onSubmit={handleProvision}
          className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface)] p-5 md:p-6"
        >
          <h2 className="mb-4 text-lg font-semibold">
            {t("churches.provision.title")}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("churches.provision.name")}
              </span>
              <input className="input w-full" name="name" required />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("churches.provision.slug")}
              </span>
              <input
                className="input w-full font-mono text-sm"
                name="slug"
                pattern="[a-z0-9-]+"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("churches.provision.shortName")}
              </span>
              <input className="input w-full" name="shortName" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("churches.provision.city")}
              </span>
              <input className="input w-full" name="city" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("churches.table.code")}
              </span>
              <input className="input w-full" name="externalCode" />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm text-[var(--muted)]">
                {t("churches.provision.presbytery")}
              </span>
              <input className="input w-full" name="presbyteryName" />
            </label>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              className="btn outline"
              onClick={() => setShowForm(false)}
            >
              {t("churches.provision.cancel")}
            </button>
            <button type="submit" className="btn" disabled={isPending}>
              {isPending
                ? t("churches.provision.saving")
                : t("churches.provision.save")}
            </button>
          </div>
        </form>
      ) : null}

      <DataTable
        columns={[
          {
            key: "name",
            label: t("churches.table.name"),
            render: (row) => (
              <div>
                <div className="font-medium">{row.name}</div>
                {row.shortName ? (
                  <div className="text-xs text-[var(--muted)]">{row.shortName}</div>
                ) : null}
              </div>
            ),
          },
          {
            key: "city",
            label: t("churches.table.city"),
            render: (row) => row.city ?? "—",
          },
          {
            key: "unit",
            label: t("churches.table.unit"),
            render: (row) => row.orgUnitName ?? "—",
          },
          {
            key: "code",
            label: t("churches.table.code"),
            render: (row) => row.externalCode ?? "—",
          },
          {
            key: "kind",
            label: t("churches.table.kind"),
            render: (row) => row.churchKind,
          },
        ]}
        rows={churches}
        rowKey={(row) => String(row.id)}
        empty={
          <div className="py-8 text-center text-sm text-[var(--muted)]">
            {t("churches.empty")}
          </div>
        }
      />
    </div>
  );
}
