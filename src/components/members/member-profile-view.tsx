"use client";

import {
  saveMembershipAction,
  updateMemberAction,
} from "@/app/(app)/members/actions";
import { Icons } from "@/components/icons";
import { MemberFinancesTab } from "@/components/members/member-finances-tab";
import {
  MembershipStatusField,
  ProfileField,
  ProfileSectionCard,
  YesNoField,
} from "@/components/members/member-profile-form-ui";
import { MembershipHistorySection } from "@/components/members/member-membership-history";
import {
  MEMBERSHIP_FORM_ID,
  PROFILE_FORM_ID,
} from "@/components/members/member-profile-toolbar";
import { MemberProfileToolbar } from "@/components/members/member-profile-toolbar";
import type { ProfileTabId } from "@/components/members/member-profile-toolbar";
import {
  MemberAvatar,
  RoleChip,
  StatusChip,
} from "@/components/members/member-ui";
import {
  GENDER_OPTIONS,
  ID_TYPE_OPTIONS,
  MARITAL_OPTIONS,
} from "@/lib/members/catalogs";
import { memberFullName } from "@/lib/members/parse";
import type { MemberRoleCatalog } from "@/lib/members/roles";
import type { Member, MembershipRecord, MemberFinanceData } from "@/lib/members/types";
import { useActionToast } from "@/hooks/use-action-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";

const PROFILE_TABS: {
  id: ProfileTabId;
  label: string;
  icon: keyof typeof Icons;
  isDanger?: boolean;
}[] = [
  { id: "profile", label: "Perfil", icon: "users" },
  { id: "membership", label: "Membresía", icon: "cross" },
  { id: "finances", label: "Finanzas", icon: "wallet" },
  { id: "delete", label: "Eliminar cuenta", icon: "trash", isDanger: true },
];

const COUNTRY_OPTIONS = [
  "República Dominicana",
  "Estados Unidos",
  "España",
  "Puerto Rico",
  "Otro",
] as const;

export function MemberProfileView({
  member,
  roles,
  membership,
  tab,
  onTabChange,
  onMemberUpdated,
  onMembershipUpdated,
  finances = null,
  canWriteMembers,
  canDeleteMembers,
  canReadMemberFinances,
}: {
  member: Member;
  roles: MemberRoleCatalog[];
  membership: MembershipRecord | null;
  tab: ProfileTabId;
  onTabChange: (tab: ProfileTabId) => void;
  onMemberUpdated: (member: Member) => void;
  onMembershipUpdated: (membership: MembershipRecord | null) => void;
  finances?: MemberFinanceData | null;
  canWriteMembers: boolean;
  canDeleteMembers: boolean;
  canReadMemberFinances: boolean;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [profilePending, setProfilePending] = useState(false);
  const [membershipPending, setMembershipPending] = useState(false);

  const active =
    PROFILE_TABS.find((t) => t.id === tab) ?? PROFILE_TABS[0];
  const ActiveIcon = Icons[active.icon];
  const sector =
    member.address.stateProvince || member.address.cityState || "—";
  const visibleTabs = PROFILE_TABS.filter((t) => {
    if (t.id === "delete") return canDeleteMembers;
    if (t.id === "finances") return canReadMemberFinances;
    return true;
  });

  return (
    <div>
      <div
        className="card"
        style={{
          padding: "16px 18px",
          marginBottom: 18,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div className="row" style={{ gap: 14, alignItems: "center" }}>
          <MemberAvatar member={member} size="lg" square />
          <div>
            <div className="eyebrow">Perfil del miembro</div>
            <div
              className="display"
              style={{
                fontSize: 26,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginTop: 2,
              }}
            >
              {memberFullName(member)}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <StatusChip member={member} />
              <RoleChip role={member.membershipRole} />
              {member.address.cityState ? (
                <span className="chip lila">{member.address.cityState}</span>
              ) : null}
            </div>
          </div>
        </div>
        <MemberProfileToolbar
          tab={tab}
          profilePending={profilePending}
          membershipPending={membershipPending}
          canWriteMembers={canWriteMembers}
        />
      </div>

      <div className="profile-mobile-only" style={{ marginBottom: 12 }}>
        <button
          type="button"
          className="btn outline"
          onClick={() => setMobileNavOpen(true)}
          style={{ width: "100%" }}
        >
          <ActiveIcon size={15} /> {active.label}
          <span style={{ flex: 1 }} />
          <span className="tiny muted">Cambiar sección</span>
        </button>
      </div>

      <div className="profile-shell">
        <aside className="profile-aside">
          <div className="eyebrow" style={{ padding: "4px 6px 10px" }}>
            Cuenta del miembro
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {visibleTabs.filter((t) => !t.isDanger).map((t) => (
              <ProfileTabBtn
                key={t.id}
                tab={t}
                active={tab === t.id}
                onClick={() => onTabChange(t.id)}
              />
            ))}
            <div
              style={{
                height: 1,
                background: "var(--line)",
                margin: "10px 6px",
              }}
            />
            {visibleTabs.filter((t) => t.isDanger).map((t) => (
              <ProfileTabBtn
                key={t.id}
                tab={t}
                active={tab === t.id}
                onClick={() => onTabChange(t.id)}
              />
            ))}
          </nav>

          <div
            style={{
              marginTop: 18,
              padding: 12,
              background: "var(--bg-2)",
              border: "1px solid var(--line)",
              borderRadius: 10,
            }}
          >
            <div className="eyebrow" style={{ fontSize: 10 }}>
              ID de miembro
            </div>
            <div
              className="mono"
              style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}
            >
              #{member.memberId.slice(-5).padStart(5, "0")}
            </div>
            <div className="tiny muted" style={{ marginTop: 8 }}>
              <span className="mono">{sector}</span>
            </div>
          </div>
        </aside>

        {mobileNavOpen ? (
          <>
            <div
              className="drawer-backdrop"
              onClick={() => setMobileNavOpen(false)}
            />
            <div className="drawer" style={{ width: 280 }}>
              <div className="drawer-head">
                <div className="display" style={{ fontSize: 18, flex: 1 }}>
                  Cuenta del miembro
                </div>
                <button
                  type="button"
                  className="btn ghost icon-only"
                  onClick={() => setMobileNavOpen(false)}
                  aria-label="Cerrar"
                >
                  <Icons.x size={18} />
                </button>
              </div>
              <div className="drawer-body">
                <nav
                  style={{ display: "flex", flexDirection: "column", gap: 4 }}
                >
                  {visibleTabs.map((t) => (
                    <ProfileTabBtn
                      key={t.id}
                      tab={t}
                      active={tab === t.id}
                      onClick={() => {
                        onTabChange(t.id);
                        setMobileNavOpen(false);
                      }}
                    />
                  ))}
                </nav>
              </div>
            </div>
          </>
        ) : null}

        <div className="profile-main">
          {tab === "profile" ? (
            <ProfileTab
              member={member}
              onPending={setProfilePending}
              onMemberUpdated={onMemberUpdated}
              readOnly={!canWriteMembers}
            />
          ) : null}
          {tab === "membership" ? (
            <MembershipTab
              member={member}
              membership={membership}
              roles={roles}
              onPending={setMembershipPending}
              onMemberUpdated={onMemberUpdated}
              onMembershipUpdated={onMembershipUpdated}
              readOnly={!canWriteMembers}
            />
          ) : null}
          {tab === "finances" ? (
            <MemberFinancesTab
              memberId={member.memberId}
              initialFinances={finances}
            />
          ) : null}
          {tab === "delete" ? <DeleteTab member={member} /> : null}
        </div>
      </div>
    </div>
  );
}

function ProfileTabBtn({
  tab,
  active,
  onClick,
}: {
  tab: (typeof PROFILE_TABS)[number];
  active: boolean;
  onClick: () => void;
}) {
  const Icon = Icons[tab.icon];
  const cls =
    "ptab" +
    (active ? " active" : "") +
    (tab.isDanger ? " danger" : "");

  return (
    <button type="button" className={cls} onClick={onClick}>
      <span className="pico">
        <Icon size={15} />
      </span>
      <span style={{ flex: 1 }}>{tab.label}</span>
    </button>
  );
}

function profileFormKey(member: Member): string {
  return JSON.stringify(member);
}

function ProfileTab({
  member,
  onPending,
  onMemberUpdated,
  readOnly = false,
}: {
  member: Member;
  onPending: (pending: boolean) => void;
  onMemberUpdated: (member: Member) => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(updateMemberAction, null);
  const formKey = useMemo(() => profileFormKey(member), [member]);

  useActionToast(state, {
    successMessage: "Perfil guardado correctamente.",
    onSuccess: (result) => {
      if (result.member) onMemberUpdated(result.member);
      router.refresh();
    },
  });

  return (
    <form
      id={PROFILE_FORM_ID}
      key={formKey}
      action={formAction}
      className="col gap-md"
    >
      <FormPendingReporter onPending={onPending} />
      <input type="hidden" name="memberId" value={member.memberId} />
      <input type="hidden" name="isActive" value={member.isActive ? "true" : "false"} />
      <input type="hidden" name="isMember" value={member.isMember ? "true" : "false"} />
      <input type="hidden" name="bio" value={member.bio} />

      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
      <ProfileSectionCard
        eyebrow="Datos personales"
        title="Información personal"
        sub="Nombre legal, identificación y datos básicos del miembro."
      >
        <div className="form-grid">
          <ProfileField
            label="Nombre"
            name="firstName"
            defaultValue={member.firstName}
            required
          />
          <ProfileField
            label="Apellido"
            name="lastName"
            defaultValue={member.lastName}
            required
          />
          <ProfileField
            label="Apodo"
            name="nickName"
            defaultValue={member.nickName}
          />
          <ProfileField
            label="Fecha de nacimiento"
            name="dateOfBirth"
            type="date"
            defaultValue={member.dateOfBirth}
          />
          <ProfileField
            label="Género"
            name="gender"
            type="select"
            options={GENDER_OPTIONS}
            defaultValue={member.gender || "Male"}
          />
          <ProfileField
            label="Estado civil"
            name="maritalStatus"
            type="select"
            options={MARITAL_OPTIONS}
            defaultValue={member.maritalStatus || "Single"}
          />
          <ProfileField
            label="Nacionalidad"
            name="nationality"
            defaultValue={member.nationality}
          />
          <ProfileField
            label="Tipo de identificación"
            name="idType"
            type="select"
            options={ID_TYPE_OPTIONS}
            defaultValue={member.idType || "ID Card"}
          />
          <ProfileField
            label="Número de identificación"
            name="idNumber"
            defaultValue={member.idNumber}
          />
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard eyebrow="Dirección" title="Información de dirección">
        <div className="form-grid">
          <ProfileField
            label="Dirección"
            name="streetAddress"
            defaultValue={member.address.streetAddress}
            placeholder="Calle Principal #12"
            span={2}
          />
          <ProfileField
            label="Provincia"
            name="stateProvince"
            defaultValue={member.address.stateProvince}
            placeholder="San Pedro de Macorís"
          />
          <ProfileField
            label="Ciudad / Estado"
            name="cityState"
            defaultValue={member.address.cityState}
            placeholder="San Pedro de Macorís"
          />
          <ProfileField
            label="País"
            name="country"
            type="select"
            options={COUNTRY_OPTIONS.map((o) => ({ value: o, label: o }))}
            defaultValue={member.address.country || "República Dominicana"}
            span={2}
          />
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        eyebrow="Contacto"
        title="Información de contacto"
      >
        <div className="form-grid">
          <ProfileField
            label="Correo electrónico"
            name="email"
            type="email"
            defaultValue={member.contact.email}
          />
          <ProfileField
            label="Teléfono"
            name="phone"
            defaultValue={member.contact.phone}
          />
          <ProfileField
            label="Teléfono alterno"
            name="mobilePhone"
            defaultValue={member.contact.mobilePhone}
          />
        </div>
      </ProfileSectionCard>
      </fieldset>
    </form>
  );
}

function membershipFormKey(
  member: Member,
  membership: MembershipRecord | null,
): string {
  return JSON.stringify({ member, membership });
}

function MembershipTab({
  member,
  membership,
  roles,
  onPending,
  onMemberUpdated,
  onMembershipUpdated,
  readOnly = false,
}: {
  member: Member;
  membership: MembershipRecord | null;
  roles: MemberRoleCatalog[];
  onPending: (pending: boolean) => void;
  onMemberUpdated: (member: Member) => void;
  onMembershipUpdated: (membership: MembershipRecord | null) => void;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [state, formAction] = useActionState(saveMembershipAction, null);
  const m = membership;
  const formKey = useMemo(
    () => membershipFormKey(member, membership),
    [member, membership],
  );
  const roleOptions =
    roles.length > 0
      ? roles.map((r) => ({ value: r.id, label: r.roleName }))
      : member.membershipRoleId
        ? [{ value: member.membershipRoleId, label: member.membershipRole || "Miembro Regular" }]
        : [];

  const defaultRoleId =
    m?.membershipRoleId || member.membershipRoleId || roleOptions[0]?.value || "";

  useActionToast(state, {
    successMessage: "Membresía guardada correctamente.",
    onSuccess: (result) => {
      if (result.member) onMemberUpdated(result.member);
      if (result.membership !== undefined) onMembershipUpdated(result.membership);
      router.refresh();
    },
  });

  return (
    <form
      id={MEMBERSHIP_FORM_ID}
      key={formKey}
      action={formAction}
      className="col gap-md"
    >
      <FormPendingReporter onPending={onPending} />
      <input type="hidden" name="profileId" value={member.memberId} />

      <fieldset
        disabled={readOnly}
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
      >
      <ProfileSectionCard
        eyebrow="Pertenencia"
        title="Rol y estado en la iglesia"
        sub="Datos del bautismo, credenciales pastorales, rol de servicio y estado de actividad del miembro."
      >
        <div className="form-grid">
          <ProfileField
            label="Fecha de bautismo"
            name="baptismDate"
            type="date"
            defaultValue={m?.baptismDate}
          />
          <ProfileField
            label="Iglesia de bautismo"
            name="baptismChurch"
            defaultValue={m?.baptismChurch}
          />
          <ProfileField
            label="Pastor que bautizó"
            name="baptismPastor"
            defaultValue={m?.baptismPastor}
          />
          <ProfileField
            label="Rol de membresía"
            name="membershipRoleId"
            type="select"
            options={roleOptions}
            defaultValue={defaultRoleId}
          />
          <ProfileField
            label="Ciudad del bautismo"
            name="baptismChurchCity"
            defaultValue={m?.baptismChurchCity}
          />
          <ProfileField
            label="País del bautismo"
            name="baptismChurchCountry"
            defaultValue={m?.baptismChurchCountry}
          />
          <YesNoField
            label="¿Bautizado(a) en el Espíritu?"
            name="isBaptizedInSpirit"
            defaultValue={m?.isBaptizedInSpirit ?? false}
          />
          <YesNoField
            label="¿Tiene credencial?"
            name="hasCredential"
            defaultValue={m?.hasCredential ?? false}
          />
          <MembershipStatusField
            key={`${member.isActive}-${member.isMember}`}
            member={member}
          />
          <ProfileField
            label="Notas pastorales"
            name="bio"
            type="textarea"
            defaultValue={member.bio}
            span={3}
            placeholder="Anotaciones, cumpleaños, oración…"
          />
        </div>
      </ProfileSectionCard>

      <MembershipHistorySection membership={m} />
      </fieldset>
    </form>
  );
}

function DeleteTab({ member }: { member: Member }) {
  const [confirm, setConfirm] = useState("");
  const target = "ELIMINAR";
  const canDelete = confirm.trim().toUpperCase() === target;
  const name = memberFullName(member);

  return (
    <>
      <ProfileSectionCard
        eyebrow="Zona de peligro"
        title="Eliminar cuenta del miembro"
        sub="Esta acción es irreversible. El miembro será removido de la lista junto con sus relaciones a ministerios."
      >
        <div
          style={{
            border: "1px solid color-mix(in oklab, var(--danger) 36%, transparent)",
            background: "color-mix(in oklab, var(--danger) 8%, transparent)",
            borderRadius: 12,
            padding: 16,
          }}
        >
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                flexShrink: 0,
                background: "color-mix(in oklab, var(--danger) 18%, transparent)",
                color: "var(--danger)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icons.trash size={18} />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--danger)" }}>
                Eliminar a {name}
              </div>
              <div className="tiny muted" style={{ marginTop: 4, maxWidth: 540 }}>
                Se conservarán los registros financieros históricos, pero la
                cuenta del miembro quedará archivada.
              </div>
            </div>
          </div>

          <ul
            style={{
              margin: "16px 0 0 56px",
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {[
              "Se removerá del listado activo de miembros",
              "Se quitará de los ministerios donde participa",
              "Se cancelarán mensajes pendientes y recordatorios",
              "El historial financiero permanecerá en los reportes",
            ].map((text) => (
              <li
                key={text}
                className="row"
                style={{ gap: 8, fontSize: 12.5, color: "var(--fg-dim)" }}
              >
                <span
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 999,
                    background: "var(--danger)",
                  }}
                />
                {text}
              </li>
            ))}
          </ul>

          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop:
                "1px dashed color-mix(in oklab, var(--danger) 24%, transparent)",
            }}
          >
            <div className="field">
              <label style={{ color: "var(--fg-dim)" }}>
                Para confirmar, escribe{" "}
                <span
                  className="mono"
                  style={{
                    background: "var(--bg-2)",
                    padding: "1px 6px",
                    borderRadius: 4,
                    color: "var(--danger)",
                    fontWeight: 600,
                  }}
                >
                  {target}
                </span>{" "}
                en mayúsculas
              </label>
              <div
                className="input-wrap"
                style={{
                  borderColor: canDelete ? "var(--danger)" : "var(--line)",
                }}
              >
                <input
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="ELIMINAR"
                  autoCapitalize="characters"
                />
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <Link href="/members" className="btn outline">
                Cancelar
              </Link>
              <button
                type="button"
                className="btn"
                disabled={!canDelete}
                style={{
                  background: canDelete ? "var(--danger)" : "transparent",
                  borderColor: canDelete
                    ? "transparent"
                    : "color-mix(in oklab, var(--danger) 36%, transparent)",
                  color: canDelete ? "#fff" : "var(--danger)",
                  cursor: canDelete ? "pointer" : "not-allowed",
                }}
              >
                <Icons.trash size={14} /> Eliminar cuenta permanentemente
              </button>
            </div>
          </div>
        </div>
      </ProfileSectionCard>

      <ProfileSectionCard
        eyebrow="Alternativa"
        title="¿Solo quieres archivar?"
        sub="Marcar al miembro como inactivo lo oculta de las vistas activas pero conserva toda la información."
      >
        <div
          className="row between"
          style={{ gap: 12, flexWrap: "wrap" }}
        >
          <div style={{ maxWidth: 520 }}>
            <div className="tiny muted">
              Recomendado cuando un miembro se muda, se traslada a otra iglesia
              o pausa su actividad temporalmente.
            </div>
          </div>
          <button type="button" className="btn outline" disabled>
            Archivar miembro
          </button>
        </div>
      </ProfileSectionCard>
    </>
  );
}

function FormPendingReporter({
  onPending,
}: {
  onPending: (pending: boolean) => void;
}) {
  const { pending } = useFormStatus();
  useEffect(() => {
    onPending(pending);
  }, [pending, onPending]);
  return null;
}
