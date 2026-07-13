"use client";

import { churchPath } from "@/lib/apps/church-routes";
import { ChildFormDrawer } from "@/components/children/child-form-drawer";
import { Icons } from "@/components/icons";
import { DataTable } from "@/components/ui/data-table";
import { FilterToolbar } from "@/components/ui/filter-toolbar";
import { PaginationBar } from "@/components/ui/pagination-bar";
import {
  childFullName,
  computeAgeYears,
  guardianFullName,
  summarizeAllergies,
} from "@/lib/children/parse";
import type { ChildListItem, ChildrenPagination } from "@/lib/children/types";
import type { Member } from "@/lib/members/types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function buildChildrenListUrl(opts: {
  query?: string;
  page?: number;
  pageSize?: number;
}) {
  const params = new URLSearchParams();
  if (opts.query) params.set("q", opts.query);
  if (opts.page && opts.page > 1) params.set("page", String(opts.page));
  if (opts.pageSize && opts.pageSize !== 25) {
    params.set("size", String(opts.pageSize));
  }
  const qs = params.toString();
  return `${churchPath("/members/children")}${qs ? `?${qs}` : ""}`;
}

export function ChildrenListView({
  children,
  pagination,
  query: queryFromServer,
  pageSize,
  adultMembers,
  canWrite,
}: {
  children: ChildListItem[];
  pagination: ChildrenPagination;
  query: string;
  pageSize: number;
  adultMembers: Member[];
  canWrite: boolean;
}) {
  const t = useTranslations("children");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [searchInput, setSearchInput] = useState(queryFromServer);
  const [formState, setFormState] = useState<{
    mode: "new" | "edit";
    child: ChildListItem | null;
  } | null>(null);

  const page = pagination.page;
  const totalPages = Math.max(1, pagination.totalPages);
  const total = pagination.total;
  const pageStart = total === 0 ? 0 : (page - 1) * pageSize;
  const pageEnd = Math.min(pageStart + children.length, total);

  useEffect(() => {
    if (searchInput === queryFromServer) return;
    const timer = window.setTimeout(() => {
      router.push(
        buildChildrenListUrl({
          query: searchInput,
          page: 1,
          pageSize,
        }),
      );
    }, 400);
    return () => window.clearTimeout(timer);
  }, [searchInput, queryFromServer, pageSize, router]);

  return (
    <>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{t("eyebrow")}</div>
          <h1
            className="display"
            style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}
          >
            {t("title")}
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {t("registeredCount", { total })}
          </p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Link href={churchPath("/members")} className="btn outline">
            <Icons.users size={16} /> {t("backToMembers")}
          </Link>
          {canWrite ? (
            <button
              type="button"
              className="btn primary"
              onClick={() => setFormState({ mode: "new", child: null })}
            >
              <Icons.plus size={16} /> {t("addChild")}
            </button>
          ) : null}
        </div>
      </div>

      <FilterToolbar
        query={searchInput}
        onQueryChange={setSearchInput}
        queryPlaceholder={t("searchPlaceholder")}
        style={{ marginTop: 22 }}
      />

      <DataTable
        style={{ marginTop: 16 }}
        columns={[
          {
            key: "name",
            label: t("columnName"),
            render: (child) => (
              <Link
                href={churchPath(`/members/children/${child.childId}`)}
                style={{ fontWeight: 600, textDecoration: "none", color: "inherit" }}
              >
                {childFullName(child)}
              </Link>
            ),
          },
          {
            key: "age",
            label: t("columnAge"),
            className: "muted",
            render: (child) => {
              const age = computeAgeYears(child.dateOfBirth);
              return age != null ? t("ageYears", { age }) : "—";
            },
          },
          {
            key: "guardians",
            label: t("columnGuardians"),
            className: "muted",
            render: (child) =>
              child.guardians.map((g) => guardianFullName(g)).join(", ") || "—",
          },
          {
            key: "allergies",
            label: t("columnAllergies"),
            className: "muted",
            render: (child) => summarizeAllergies(child.allergies) || "—",
          },
        ]}
        rows={children}
        rowKey={(child) => child.childId}
        actions={(child) => (
          <div className="row" style={{ gap: 6 }}>
            <Link
              href={churchPath(`/members/children/${child.childId}`)}
              className="btn ghost sm"
            >
              {t("viewChild")}
            </Link>
            {canWrite ? (
              <button
                type="button"
                className="btn outline sm"
                onClick={() => setFormState({ mode: "edit", child })}
              >
                {tCommon("edit")}
              </button>
            ) : null}
          </div>
        )}
        actionsPosition="end"
        actionsLabel={tCommon("actions")}
        empty={<div className="muted">{t("empty")}</div>}
      />

      <PaginationBar
        page={page}
        totalPages={totalPages}
        pageStart={pageStart}
        pageEnd={pageEnd}
        total={total}
        pageSize={pageSize}
        onPage={(next) =>
          router.push(buildChildrenListUrl({ query: searchInput, page: next, pageSize }))
        }
        onPageSize={(next) =>
          router.push(
            buildChildrenListUrl({ query: searchInput, page: 1, pageSize: next }),
          )
        }
        sizeOptions={[...PAGE_SIZE_OPTIONS]}
        noun={t("recordsNoun")}
      />

      {formState ? (
        <ChildFormDrawer
          open
          mode={formState.mode}
          child={formState.child}
          adultMembers={adultMembers}
          onClose={() => setFormState(null)}
        />
      ) : null}
    </>
  );
}
