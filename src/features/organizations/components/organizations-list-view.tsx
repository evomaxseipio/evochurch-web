"use client";

import { PaginationBar } from "@/components/ui/pagination-bar";
import { Icons } from "@/components/icons";
import { Loader2, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  useArchiveOrganization,
  useDeleteOrganization,
  useOrganizationsList,
  useReactivateOrganization,
} from "../hooks";
import { isOrganizationListVm } from "../hooks/query-keys";
import type { OrganizationVm } from "../schemas/organization.responses";
import {
  PIPELINE_STAGES,
} from "../types/organization.enums";
import type { OrganizationSortField } from "../types/repository.types";
import {
  buildOrganizationsListHref,
  listQueryToRequest,
  type OrganizationsListQuery,
} from "../utils/organizations-list-query";
import { enrichOrganizationList } from "../mocks";
import { OrganizationActionMenu } from "./organization-action-menu";
import { PipelineStageChip } from "./organization-commercial-ui";
import { OrganizationFormDrawer } from "./organization-form-drawer";
import type { PipelineStage } from "../types/organization.enums";
import {
  PIPELINE_STAGE_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "./organization-labels";
import { OrganizationsListSkeleton } from "./organizations-list-skeleton";
import {
  OrganizationsEmptyState,
  OrganizationsErrorState,
} from "./organizations-state-panels";

export type { OrganizationsListQuery };

const SORTABLE_COLUMNS: {
  id: OrganizationSortField;
  label: string;
}[] = [
  { id: "name", label: "Organización" },
  { id: "city", label: "Ciudad" },
];

const COMMERCIAL_COLUMNS = [
  "Contacto principal",
  "Pipeline",
  "Próxima acción",
  "Responsable",
  "Última actividad",
] as const;

function SortIndicator({
  active,
  direction,
}: {
  active: boolean;
  direction: "asc" | "desc";
}) {
  return (
    <span className="sort-ind">
      <Icons.arrowDn
        size={12}
        style={{
          transform: active && direction === "asc" ? "rotate(180deg)" : "none",
          opacity: active ? 1 : 0.35,
        }}
      />
    </span>
  );
}

export function OrganizationsListView({
  query,
}: {
  query: OrganizationsListQuery;
}) {
  const router = useRouter();
  const [isNavigating, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query.search);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<OrganizationVm | null>(null);
  const [pipelineFilter, setPipelineFilter] = useState<PipelineStage | "ALL">("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("ALL");
  const firstRender = useRef(true);

  const listRequest = useMemo(() => listQueryToRequest(query), [query]);

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    refetch,
  } = useOrganizationsList(listRequest);

  const archiveMutation = useArchiveOrganization();
  const reactivateMutation = useReactivateOrganization();
  const deleteMutation = useDeleteOrganization();

  const navigate = useMemo(
    () => (next: Partial<OrganizationsListQuery>) => {
      const merged = { ...query, ...next };
      startTransition(() => {
        router.push(buildOrganizationsListHref(merged));
      });
    },
    [query, router],
  );

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const handle = setTimeout(() => {
      if (searchValue !== query.search) {
        navigate({ search: searchValue, page: 1 });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [searchValue, query.search, navigate]);

  const toggleSort = (field: OrganizationSortField) => {
    const isActive = query.sortField === field;
    navigate({
      sortField: field,
      sortDirection: isActive && query.sortDirection === "asc" ? "desc" : "asc",
      page: 1,
    });
  };

  const openCreate = () => {
    setEditing(null);
    setDrawerOpen(true);
  };

  const openEdit = (org: OrganizationVm) => {
    setEditing(org);
    setDrawerOpen(true);
  };

  const handleArchiveToggle = (org: OrganizationVm) => {
    if (org.isArchived) {
      reactivateMutation.mutate(org.id);
    } else {
      archiveMutation.mutate(org.id);
    }
  };

  const handleDelete = (org: OrganizationVm) => {
    if (
      !window.confirm(
        `¿Eliminar "${org.name}"? Esta acción la ocultará del listado.`,
      )
    ) {
      return;
    }
    deleteMutation.mutate(org.id);
  };

  const hasFilters =
    query.search.length > 0 ||
    pipelineFilter !== "ALL" ||
    ownerFilter !== "ALL" ||
    cityFilter !== "ALL";

  const isMutating =
    archiveMutation.isPending ||
    reactivateMutation.isPending ||
    deleteMutation.isPending;

  const isBusy = isFetching || isNavigating || isMutating;

  const pageHeader = (
    <div className="bo-page-header">
      <div>
        <h1 className="page-title">Organizaciones</h1>
        {isOrganizationListVm(data) ? (
          <p className="page-subtitle">
            {data.total === 1
              ? "1 prospecto registrado"
              : `${data.total} prospectos registrados`}
          </p>
        ) : (
          <p className="page-subtitle">Gestión comercial de cuentas</p>
        )}
      </div>
      <button type="button" className="btn primary" onClick={openCreate}>
        <Plus size={16} />
        Nueva organización
      </button>
    </div>
  );

  const formDrawer = (
    <OrganizationFormDrawer
      open={drawerOpen}
      organization={editing}
      onClose={() => setDrawerOpen(false)}
      redirectToDetail={!editing}
    />
  );

  if (isPending) {
    return <OrganizationsListSkeleton />;
  }

  if (isError || !isOrganizationListVm(data)) {
    return (
      <>
        {pageHeader}
        <OrganizationsErrorState
          message={
            error instanceof Error
              ? error.message
              : "No se pudieron cargar las organizaciones."
          }
          onRetry={() => void refetch()}
        />
        {formDrawer}
      </>
    );
  }

  const list = data;
  const enrichedItems = useMemo(
    () => enrichOrganizationList(list.items),
    [list.items],
  );

  const ownerOptions = useMemo(() => {
    const owners = new Set(
      enrichedItems.map((org) => org.commercial.ownerName).filter(Boolean),
    );
    return Array.from(owners).sort();
  }, [enrichedItems]);

  const cityOptions = useMemo(() => {
    const cities = new Set(enrichedItems.map((org) => org.city).filter(Boolean));
    return Array.from(cities).sort();
  }, [enrichedItems]);

  const filteredItems = useMemo(() => {
    return enrichedItems.filter((org) => {
      if (pipelineFilter !== "ALL" && org.commercial.pipelineStage !== pipelineFilter) {
        return false;
      }
      if (ownerFilter !== "ALL" && org.commercial.ownerName !== ownerFilter) {
        return false;
      }
      if (cityFilter !== "ALL" && org.city !== cityFilter) {
        return false;
      }
      return true;
    });
  }, [enrichedItems, pipelineFilter, ownerFilter, cityFilter]);
  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const pageStart = list.total === 0 ? 0 : (list.page - 1) * list.pageSize;
  const pageEnd = Math.min(pageStart + list.pageSize, list.total);

  return (
    <>
      {pageHeader}

      <div className="bo-toolbar">
        <div className="bo-search-input">
          <Search size={16} style={{ color: "var(--muted)", flexShrink: 0 }} />
          <input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Buscar organizaciones…"
            aria-label="Buscar organizaciones"
          />
        </div>
        <select
          className="bo-filter-select"
          value={pipelineFilter}
          onChange={(e) =>
            setPipelineFilter(e.target.value as PipelineStage | "ALL")
          }
          aria-label="Filtrar por pipeline"
        >
          <option value="ALL">Pipeline: Todos</option>
          {PIPELINE_STAGES.map((stage) => (
            <option key={stage} value={stage}>
              {PIPELINE_STAGE_LABELS[stage]}
            </option>
          ))}
        </select>
        <select
          className="bo-filter-select"
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          aria-label="Filtrar por responsable"
        >
          <option value="ALL">Responsable: Todos</option>
          {ownerOptions.map((owner) => (
            <option key={owner} value={owner}>
              {owner}
            </option>
          ))}
        </select>
        <select
          className="bo-filter-select"
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          aria-label="Filtrar por ciudad"
        >
          <option value="ALL">Ciudad: Todas</option>
          {cityOptions.map((city) => (
            <option key={city} value={city}>
              {city}
            </option>
          ))}
        </select>
        {hasFilters ? (
          <button
            type="button"
            className="btn outline sm"
            onClick={() => {
              setSearchValue("");
              setPipelineFilter("ALL");
              setOwnerFilter("ALL");
              setCityFilter("ALL");
              navigate({ search: "", page: 1 });
            }}
          >
            Limpiar
          </button>
        ) : null}
      </div>

      {filteredItems.length === 0 ? (
        <OrganizationsEmptyState onCreate={openCreate} hasFilters={hasFilters} />
      ) : (
        <>
          <div className={`table-wrap${isBusy ? " is-busy" : ""}`}>
            {isBusy ? (
              <div className="table-busy-overlay" aria-hidden>
                <Loader2 size={24} className="bo-spinner" />
              </div>
            ) : null}
            <table className="table">
              <thead>
                <tr>
                  {SORTABLE_COLUMNS.map((column) => {
                    const active = query.sortField === column.id;
                    return (
                      <th
                        key={column.id}
                        className={`sortable${active ? " active" : ""}`}
                        onClick={() => toggleSort(column.id)}
                      >
                        {column.label}
                        <SortIndicator
                          active={active}
                          direction={query.sortDirection}
                        />
                      </th>
                    );
                  })}
                  {COMMERCIAL_COLUMNS.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                  <th className="col-actions" aria-label="Acciones" />
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((org) => (
                  <tr
                    key={org.id}
                    onClick={() =>
                      router.push(`/apps/backoffice/organizations/${org.id}`)
                    }
                  >
                    <td>
                      <div className="bo-cell-main">{org.name}</div>
                      <div className="bo-cell-sub">
                        {ORGANIZATION_TYPE_LABELS[org.type]}
                        {org.denomination ? ` · ${org.denomination}` : ""}
                      </div>
                    </td>
                    <td>
                      <div className="bo-cell-main">{org.city}</div>
                      {org.province ? (
                        <div className="bo-cell-sub">{org.province}</div>
                      ) : null}
                    </td>
                    <td>
                      {org.commercial.primaryContactName ? (
                        <>
                          <div className="bo-cell-main">
                            {org.commercial.primaryContactName}
                          </div>
                          {org.commercial.primaryContactRole ? (
                            <div className="bo-cell-sub">
                              {org.commercial.primaryContactRole}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="tiny muted">—</span>
                      )}
                    </td>
                    <td>
                      <PipelineStageChip stage={org.commercial.pipelineStage} />
                    </td>
                    <td>
                      {org.commercial.nextActionLabel ? (
                        <>
                          <div className="bo-cell-main">
                            {org.commercial.nextActionLabel}
                          </div>
                          {org.commercial.nextActionDateLabel ? (
                            <div
                              className={`bo-cell-sub${
                                org.commercial.nextActionOverdue
                                  ? " bo-overdue"
                                  : ""
                              }`}
                            >
                              {org.commercial.nextActionDateLabel}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="tiny muted">—</span>
                      )}
                    </td>
                    <td>{org.commercial.ownerName}</td>
                    <td>
                      {org.commercial.lastActivityType ? (
                        <>
                          <div className="bo-cell-main">
                            {org.commercial.lastActivityType}
                          </div>
                          {org.commercial.lastActivityWhen ? (
                            <div className="bo-cell-sub">
                              {org.commercial.lastActivityWhen}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="tiny muted">
                          {org.commercial.lastActivityWhen ?? "—"}
                        </span>
                      )}
                    </td>
                    <td className="col-actions">
                      <OrganizationActionMenu
                        isArchived={org.isArchived}
                        onEdit={() => openEdit(org)}
                        onArchiveToggle={() => handleArchiveToggle(org)}
                        onDelete={() => handleDelete(org)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <PaginationBar
            page={list.page}
            totalPages={totalPages}
            total={list.total}
            pageStart={pageStart}
            pageEnd={pageEnd}
            pageSize={list.pageSize}
            onPage={(p) => navigate({ page: p })}
            onPageSize={(s) => navigate({ pageSize: s, page: 1 })}
            noun="organizaciones"
            sizeOptions={[10, 25, 50, 100]}
          />
        </>
      )}

      {formDrawer}
    </>
  );
}
