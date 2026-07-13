"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  Loader2,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
} from "lucide-react";
import {
  enrichOrganizationVm,
  getOrganizationActivitiesMock,
} from "../mocks";
import type { OrganizationVm } from "../schemas/organization.responses";
import {
  useArchiveOrganization,
  useOrganizationDetail,
  useReactivateOrganization,
} from "../hooks";
import { isOrganizationVm } from "../hooks/query-keys";
import {
  ORGANIZATION_SOURCE_LABELS,
  ORGANIZATION_STATUS_CHIP,
  ORGANIZATION_STATUS_LABELS,
  ORGANIZATION_TYPE_LABELS,
} from "./organization-labels";
import {
  MockDataHint,
  OrganizationActivityTimeline,
  PipelineStageChip,
  PriorityChip,
  TemperatureChip,
} from "./organization-commercial-ui";
import { OrganizationFormDrawer } from "./organization-form-drawer";
import { OrganizationsErrorState } from "./organizations-state-panels";

const TABS = [
  { id: "general", label: "Información" },
  { id: "contact", label: "Contacto" },
  { id: "activities", label: "Actividades" },
  { id: "commercial", label: "Comercial" },
  { id: "contacts", label: "Contactos", disabled: true },
] as const;

type TabId = (typeof TABS)[number]["id"];

function Field({ label, value }: { label: string; value?: string | null }) {
  const empty = !value?.trim();
  return (
    <div className="bo-info-field">
      <div className="label">{label}</div>
      <div className={`value${empty ? " empty" : ""}`}>
        {empty ? "—" : value}
      </div>
    </div>
  );
}

function LinkField({ label, value }: { label: string; value?: string | null }) {
  const empty = !value?.trim();
  return (
    <div className="bo-info-field">
      <div className="label">{label}</div>
      {empty ? (
        <div className="value empty">—</div>
      ) : (
        <a
          href={value!}
          target="_blank"
          rel="noreferrer"
          className="value"
          style={{ color: "var(--accent)" }}
        >
          {value}
        </a>
      )}
    </div>
  );
}

function MetaItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="card flat bo-meta-item">
      <div className="label">{label}</div>
      <div className="value">{children}</div>
    </div>
  );
}

function TabPlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="bo-tab-placeholder">
      <div className="eyebrow">{title}</div>
      <p>{description}</p>
    </div>
  );
}

function OrganizationDetailContent({
  organization,
}: {
  organization: OrganizationVm;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("general");
  const [drawerOpen, setDrawerOpen] = useState(false);

  const enriched = useMemo(
    () => enrichOrganizationVm(organization),
    [organization],
  );
  const { commercial } = enriched;
  const activities = useMemo(
    () => getOrganizationActivitiesMock(organization),
    [organization],
  );

  const archiveMutation = useArchiveOrganization();
  const reactivateMutation = useReactivateOrganization();
  const isPending = archiveMutation.isPending || reactivateMutation.isPending;

  const toggleArchive = () => {
    if (organization.isArchived) {
      reactivateMutation.mutate(organization.id);
    } else {
      archiveMutation.mutate(organization.id);
    }
  };

  return (
    <>
      <div className="bo-org-header">
        <button
          type="button"
          className="back"
          onClick={() => router.push("/apps/backoffice/organizations")}
        >
          <ArrowLeft size={14} />
          Organizaciones
        </button>

        <div className="bo-org-title-row">
          <div>
            <div className="row gap-sm" style={{ flexWrap: "wrap" }}>
              <h1 className="bo-org-title">{organization.name}</h1>
              <PipelineStageChip stage={commercial.pipelineStage} />
              <span className={`chip ${ORGANIZATION_STATUS_CHIP[organization.status]}`}>
                <span className="pip" />
                {ORGANIZATION_STATUS_LABELS[organization.status]}
              </span>
              <MockDataHint />
            </div>
            <div className="bo-org-meta">
              <span>{organization.city}</span>
              <span>·</span>
              <span>{commercial.ownerName}</span>
            </div>
          </div>

          <div className="row gap-sm">
            <button
              type="button"
              className="btn outline"
              onClick={toggleArchive}
              disabled={isPending}
            >
              {organization.isArchived ? (
                <ArchiveRestore size={16} />
              ) : (
                <Archive size={16} />
              )}
              {organization.isArchived ? "Reactivar" : "Archivar"}
            </button>
            <button
              type="button"
              className="btn primary"
              onClick={() => setDrawerOpen(true)}
            >
              <Pencil size={16} />
              Editar
            </button>
          </div>
        </div>
      </div>

      <div className="bo-meta-grid">
        <MetaItem label="Pipeline">
          <PipelineStageChip stage={commercial.pipelineStage} />
        </MetaItem>
        <MetaItem label="Fuente">
          {ORGANIZATION_SOURCE_LABELS[organization.source]}
        </MetaItem>
        <MetaItem label="Prioridad">
          <PriorityChip priority={commercial.priority} />
        </MetaItem>
        <MetaItem label="Temperatura">
          <TemperatureChip temperature={commercial.temperature} />
        </MetaItem>
        <MetaItem label="Próxima acción">
          {commercial.nextActionLabel ?? "—"}
        </MetaItem>
        <MetaItem label="Próximo seguimiento">
          {commercial.followUpDateLabel ?? "—"}
        </MetaItem>
        <MetaItem label="Última actividad">
          {commercial.lastActivityType
            ? `${commercial.lastActivityType} · ${commercial.lastActivityWhen ?? ""}`
            : (commercial.lastActivityWhen ?? "—")}
        </MetaItem>
        <MetaItem label="Responsable">{commercial.ownerName}</MetaItem>
      </div>

      <div className="bo-layout-detail">
        <div className="card flat" style={{ padding: 0 }}>
          <div className="tabs" style={{ padding: "0 16px" }}>
            {TABS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`tab${tab === item.id ? " active" : ""}${
                  "disabled" in item && item.disabled ? " disabled" : ""
                }`}
                onClick={() => {
                  if ("disabled" in item && item.disabled) return;
                  setTab(item.id);
                }}
                disabled={"disabled" in item && item.disabled}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ padding: 20 }}>
            {tab === "general" ? (
              <div className="bo-info-grid">
                <Field label="Nombre" value={organization.name} />
                <Field
                  label="Tipo"
                  value={ORGANIZATION_TYPE_LABELS[organization.type]}
                />
                <Field label="Denominación" value={organization.denomination} />
                <Field
                  label="Estado"
                  value={ORGANIZATION_STATUS_LABELS[organization.status]}
                />
                <Field label="País" value={organization.country} />
                <Field label="Provincia" value={organization.province} />
                <Field label="Ciudad" value={organization.city} />
                <Field label="Dirección" value={organization.addressLine} />
              </div>
            ) : null}

            {tab === "contact" ? (
              <div className="bo-info-grid">
                <Field label="Teléfono" value={organization.phone} />
                <Field label="Email" value={organization.email} />
                <LinkField label="Sitio web" value={organization.website} />
                <Field label="Facebook" value={organization.facebook} />
                <Field label="Instagram" value={organization.instagram} />
              </div>
            ) : null}

            {tab === "activities" ? (
              <OrganizationActivityTimeline activities={activities} />
            ) : null}

            {tab === "commercial" ? (
              <div className="bo-info-grid">
                <Field
                  label="Origen"
                  value={ORGANIZATION_SOURCE_LABELS[organization.source]}
                />
                <Field
                  label="Creada"
                  value={new Date(organization.createdAt).toLocaleString("es-DO")}
                />
                <Field
                  label="Actualizada"
                  value={new Date(organization.updatedAt).toLocaleString("es-DO")}
                />
                {organization.archivedAt ? (
                  <Field
                    label="Archivada"
                    value={new Date(organization.archivedAt).toLocaleString(
                      "es-DO",
                    )}
                  />
                ) : null}
                <div className="bo-info-field" style={{ gridColumn: "1 / -1" }}>
                  <div className="label">Notas</div>
                  <div
                    className={`value${organization.notes?.trim() ? "" : " empty"}`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {organization.notes?.trim() ? organization.notes : "—"}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "contacts" ? (
              <TabPlaceholder
                title="Próximamente"
                description="El listado de contactos se diseñará en la feature Contacts."
              />
            ) : null}
          </div>
        </div>

        <div className="card flat bo-contact-card">
          <div className="row" style={{ justifyContent: "space-between" }}>
            <div className="eyebrow">Contacto principal</div>
            <MockDataHint />
          </div>
          {commercial.primaryContactName ? (
            <>
              <div className="name">{commercial.primaryContactName}</div>
              {commercial.primaryContactRole ? (
                <div className="role">{commercial.primaryContactRole}</div>
              ) : null}
              <div className="bo-contact-actions">
                {commercial.primaryContactPhone ? (
                  <a
                    href={`tel:${commercial.primaryContactPhone.replace(/\s/g, "")}`}
                    className="bo-contact-action-btn"
                    title="Llamar"
                  >
                    <Phone size={18} />
                    <span>Llamar</span>
                  </a>
                ) : (
                  <span className="bo-contact-action-btn" aria-disabled="true">
                    <Phone size={18} />
                    <span>Llamar</span>
                  </span>
                )}
                {commercial.primaryContactPhone ? (
                  <a
                    href={`https://wa.me/${commercial.primaryContactPhone.replace(/\D/g, "")}`}
                    className="bo-contact-action-btn"
                    title="WhatsApp"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={18} />
                    <span>WhatsApp</span>
                  </a>
                ) : (
                  <span className="bo-contact-action-btn" aria-disabled="true">
                    <MessageCircle size={18} />
                    <span>WhatsApp</span>
                  </span>
                )}
                {commercial.primaryContactEmail ? (
                  <a
                    href={`mailto:${commercial.primaryContactEmail}`}
                    className="bo-contact-action-btn"
                    title="Correo"
                  >
                    <Mail size={18} />
                    <span>Correo</span>
                  </a>
                ) : (
                  <span className="bo-contact-action-btn" aria-disabled="true">
                    <Mail size={18} />
                    <span>Correo</span>
                  </span>
                )}
              </div>
              <div className="bo-contact-detail">
                {commercial.primaryContactPhone ? (
                  <div>{commercial.primaryContactPhone}</div>
                ) : null}
                {commercial.primaryContactEmail ? (
                  <div>{commercial.primaryContactEmail}</div>
                ) : null}
              </div>
            </>
          ) : (
            <TabPlaceholder
              title="Sin contacto"
              description="Asigna un contacto principal cuando esté disponible la feature Contacts."
            />
          )}
        </div>
      </div>

      <OrganizationFormDrawer
        open={drawerOpen}
        organization={organization}
        onClose={() => setDrawerOpen(false)}
        redirectToDetail={false}
      />
    </>
  );
}

export function OrganizationDetailView({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch } = useOrganizationDetail(id);

  if (isPending) {
    return (
      <div
        className="bo-state-panel"
        style={{ minHeight: 320 }}
        aria-busy="true"
      >
        <Loader2 size={32} className="bo-spinner" />
      </div>
    );
  }

  if (isError || !isOrganizationVm(data)) {
    return (
      <OrganizationsErrorState
        title="No se pudo cargar la organización"
        message={
          error instanceof Error
            ? error.message
            : "No se pudo cargar la organización."
        }
        onRetry={() => void refetch()}
      />
    );
  }

  return <OrganizationDetailContent organization={data} />;
}
