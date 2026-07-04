"use client";

import {
  deactivateChurchRoleAction,
  setChurchRolePermissionsAction,
  type DeactivateRoleActionResult,
  type RolePermissionsActionResult,
} from "@/app/(app)/settings/roles/actions";
import { Icons } from "@/components/icons";
import { RoleCardActionMenu } from "@/components/settings/role-card-action-menu";
import { RoleFormDrawer } from "@/components/settings/role-form-drawer";
import { RoleUsersDialog } from "@/components/settings/role-users-dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useActionToast } from "@/hooks/use-action-toast";
import type { ChurchAuthUser } from "@/lib/admin-users/types";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  MODULE_COLORS,
  MODULE_ICONS,
  PERMISSION_ACTION_COLUMNS,
  actionColumnIndex,
  actionColumnLabel,
  applyMinistryPermissionRules,
  applyStandardPermissionRules,
  groupMatrixCatalog,
  sanitizePermissionDraftForSave,
  isActionApplicable,
  matrixResourcePermissionPattern,
  moduleLabel,
} from "@/lib/roles/catalog";
import {
  moduleUiDescription,
  moduleMatrixNote,
  permissionUiLabel,
  roleUiColor,
  roleUiSummary,
} from "@/lib/roles/display";
import type { AppPermissionRow, ChurchRolePermissions } from "@/lib/roles/types";
import {
  isAdminRole,
  isSystemLockedRole,
  canDeactivateRole,
} from "@/lib/roles/keys";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

const saveInitial: RolePermissionsActionResult | null = null;
const deactivateInitial: DeactivateRoleActionResult | null = null;

function permissionSet(keys: PermissionKey[]): Set<PermissionKey> {
  return new Set(keys);
}

function setsEqual(a: Set<PermissionKey>, b: Set<PermissionKey>): boolean {
  if (a.size !== b.size) return false;
  for (const k of a) {
    if (!b.has(k)) return false;
  }
  return true;
}

function defaultSelectedRoleId(roles: ChurchRolePermissions[]): number | null {
  const editable = roles.find((r) => !isSystemLockedRole(r));
  return editable?.appRoleId ?? roles[0]?.appRoleId ?? null;
}

export function RolesPermissionsView({
  roles,
  catalog,
  canManage,
  churchName,
  users = [],
}: {
  roles: ChurchRolePermissions[];
  catalog: AppPermissionRow[];
  canManage: boolean;
  churchName: string | null;
  users?: ChurchAuthUser[];
}) {
  const tRoles = useTranslations("roles");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const churchLabel = churchName?.trim() || tRoles("thisChurch");

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(() =>
    defaultSelectedRoleId(roles),
  );
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(),
  );
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editRole, setEditRole] = useState<ChurchRolePermissions | null>(null);
  const [usersDialogRole, setUsersDialogRole] =
    useState<ChurchRolePermissions | null>(null);
  const [deactivateRole, setDeactivateRole] = useState<ChurchRolePermissions | null>(
    null,
  );
  const [pendingSelectRoleId, setPendingSelectRoleId] = useState<number | null>(
    null,
  );
  const [savedByRole, setSavedByRole] = useState<
    Record<number, Set<PermissionKey>>
  >(() =>
    Object.fromEntries(
      roles.map((r) => [r.appRoleId, permissionSet(r.permissions)]),
    ),
  );
  const [draft, setDraft] = useState<Set<PermissionKey>>(() => {
    const id = defaultSelectedRoleId(roles);
    const role = roles.find((r) => r.appRoleId === id);
    return permissionSet(role?.permissions ?? []);
  });

  const [saveState, saveAction, savePending] = useActionState(
    setChurchRolePermissionsAction,
    saveInitial,
  );
  const [deactivateState, deactivateAction, deactivatePending] = useActionState(
    deactivateChurchRoleAction,
    deactivateInitial,
  );
  useActionToast(saveState, {
    successMessage: tRoles("permissionsSavedToast"),
  });
  useActionToast(deactivateState, {
    successMessage: tRoles("roleDeactivatedToast"),
    onSuccess: () => {
      if (deactivateRole && selectedRoleId === deactivateRole.appRoleId) {
        const next = roles.find(
          (r) => r.appRoleId !== deactivateRole.appRoleId && !isSystemLockedRole(r),
        ) ?? roles.find((r) => r.appRoleId !== deactivateRole.appRoleId);
        if (next) {
          setSelectedRoleId(next.appRoleId);
          setDraft(permissionSet(next.permissions));
        }
      }
      setDeactivateRole(null);
      router.refresh();
    },
  });

  const selectedRole = useMemo(
    () => roles.find((r) => r.appRoleId === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const isAdminRoleSelected = selectedRole ? isAdminRole(selectedRole) : false;
  const isLockedRole = selectedRole ? isSystemLockedRole(selectedRole) : false;
  const readOnly = !canManage || isLockedRole;
  const savedForSelected = selectedRoleId
    ? (savedByRole[selectedRoleId] ?? permissionSet([]))
    : permissionSet([]);
  const isDirty = !setsEqual(draft, savedForSelected);
  const moduleGroups = useMemo(() => groupMatrixCatalog(catalog), [catalog]);
  const totalAssignedUsers = useMemo(
    () => roles.reduce((sum, role) => sum + role.userCount, 0),
    [roles],
  );

  const selectRole = useCallback(
    (roleId: number) => {
      if (isDirty && canManage) {
        const proceed = window.confirm(tRoles("unsavedDiscardConfirm"));
        if (!proceed) return;
      }
      setSelectedRoleId(roleId);
      setDraft(permissionSet([...(savedByRole[roleId] ?? [])]));
      setExpandedModules(new Set());
    },
    [canManage, isDirty, savedByRole, tRoles],
  );

  const toggleModule = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  const togglePermission = (key: PermissionKey, checked: boolean) => {
    if (readOnly) return;
    setDraft((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key);
      else next.delete(key);
      applyStandardPermissionRules(next, key, checked);
      applyMinistryPermissionRules(next, key, checked);
      return next;
    });
  };

  const cancelChanges = () => {
    setDraft(new Set(savedForSelected));
  };

  const handleSave = () => {
    if (!selectedRoleId || readOnly || !isDirty) return;
    const keys = sanitizePermissionDraftForSave(draft);
    const formData = new FormData();
    formData.set("appRoleId", String(selectedRoleId));
    if (selectedRole?.roleKind) {
      formData.set("roleKind", selectedRole.roleKind);
    }
    formData.set("permissionKeys", JSON.stringify(keys));
    startTransition(() => saveAction(formData));
  };

  useEffect(() => {
    if (saveState?.ok !== true || selectedRoleId == null) return;
    setSavedByRole((prev) => ({
      ...prev,
      [selectedRoleId]: new Set(draft),
    }));
    router.refresh();
  }, [saveState, selectedRoleId, draft, router]);

  useEffect(() => {
    setSavedByRole(
      Object.fromEntries(
        roles.map((r) => [r.appRoleId, permissionSet(r.permissions)]),
      ),
    );
  }, [roles]);

  useEffect(() => {
    if (pendingSelectRoleId == null) return;
    const role = roles.find((r) => r.appRoleId === pendingSelectRoleId);
    if (!role) return;
    setSelectedRoleId(role.appRoleId);
    setDraft(permissionSet(role.permissions));
    setExpandedModules(new Set());
    setPendingSelectRoleId(null);
  }, [roles, pendingSelectRoleId]);

  const handleRoleCreated = useCallback((appRoleId: number) => {
    setPendingSelectRoleId(appRoleId);
  }, []);

  const usersByRole = useMemo(() => {
    const map = new Map<number, ChurchAuthUser[]>();
    for (const user of users) {
      if (user.appRoleId == null) continue;
      const list = map.get(user.appRoleId) ?? [];
      list.push(user);
      map.set(user.appRoleId, list);
    }
    return map;
  }, [users]);

  const handleDeactivateRole = () => {
    if (!deactivateRole) return;
    const formData = new FormData();
    formData.set("appRoleId", String(deactivateRole.appRoleId));
    startTransition(() => deactivateAction(formData));
  };

  return (
    <div className="roles-page-root">
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">{tRoles("pageEyebrow")}</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            {tRoles("title")}{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              {tRoles("perChurch")}
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {tRoles("pageStats", {
              roleCount: roles.length,
              userCount: totalAssignedUsers,
            })}
          </p>
        </div>
      </div>

      <div className="roles-layout">
        <aside className="card roles-list-panel">
          <div className="roles-panel-head">
            <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="eyebrow">{tRoles("accessEyebrow")}</div>
                <h2
                  className="display"
                  style={{
                    fontSize: 22,
                    margin: "4px 0 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {tRoles("systemRoles")}
                </h2>
                <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                  {tRoles("selectRoleToEdit")}
                </p>
              </div>
              <button
                type="button"
                className="btn outline sm"
                onClick={() => router.refresh()}
              >
                <Icons.refresh width={14} stroke="currentColor" />
                {tRoles("refreshList")}
              </button>
            </div>
          </div>

          <div className="roles-card-list">
            {roles.map((role) => {
              const selected = role.appRoleId === selectedRoleId;
              const isLockedSystem = isSystemLockedRole(role);
              const color = roleUiColor({
                roleConfig: role.roleConfig,
                description: role.description,
              });
              const summary =
                roleUiSummary({
                  roleConfig: role.roleConfig,
                  description: role.description,
                  isCustom: role.isCustom,
                }) || "";

              return (
                <div
                  key={role.appRoleId}
                  className={`roles-card${selected ? " is-selected" : ""}`}
                >
                  {canManage ? (
                    <RoleCardActionMenu
                      showEdit={role.isCustom}
                      showDeactivate={canDeactivateRole(role)}
                      onEdit={
                        role.isCustom
                          ? () => setEditRole(role)
                          : undefined
                      }
                      onViewUsers={() => setUsersDialogRole(role)}
                      onDeactivate={
                        canDeactivateRole(role)
                          ? () => setDeactivateRole(role)
                          : undefined
                      }
                    />
                  ) : null}
                  <button
                    type="button"
                    className="roles-card-hit"
                    onClick={() => selectRole(role.appRoleId)}
                  >
                    <span
                      className="roles-card-icon"
                      style={{
                        color,
                        background: `color-mix(in srgb, ${color} 12%, transparent)`,
                      }}
                    >
                      <Icons.shield width={20} stroke={color} />
                    </span>
                    <span className="roles-card-main">
                      <span className="roles-card-name-row">
                        <span className="roles-card-name">{role.appRoleName}</span>
                        {isLockedSystem ? (
                          <span className="roles-chip-system">{tCommon("system")}</span>
                        ) : role.isCustom ? (
                          <span className="roles-chip-custom">{tCommon("custom")}</span>
                        ) : null}
                      </span>
                      {summary ? (
                        <span className="roles-card-desc">{summary}</span>
                      ) : null}
                    </span>
                    <span className="roles-card-aside">
                      <span className="roles-card-count">
                        {tRoles("userCount", { count: role.userCount })}
                      </span>
                      {!isLockedSystem ? (
                        <Icons.arrowRight
                          width={16}
                          stroke={selected ? "var(--primary)" : "var(--muted)"}
                          className="roles-card-chevron"
                        />
                      ) : null}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        <section className="card roles-matrix-panel">
          {selectedRole ? (
            <>
              <div className="roles-panel-head">
                <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div className="eyebrow">{tRoles("permissionMatrix")}</div>
                    <h2
                      className="display"
                      style={{
                        fontSize: 22,
                        margin: "4px 0 0",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      {tRoles("rolePermissionsTitle")}{" "}
                      <span
                        style={{ color: "var(--primary)", fontStyle: "normal" }}
                      >
                        {selectedRole.appRoleName}
                      </span>
                    </h2>
                    <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                      {isLockedRole
                        ? tRoles("systemRoleFixed")
                        : tRoles("editPermissionsInChurch", { church: churchLabel })}
                    </p>
                  </div>
                  <div className="roles-matrix-actions">
                    {isDirty && canManage && !isLockedRole ? (
                      <span className="roles-chip-dirty">{tRoles("unsavedChanges")}</span>
                    ) : null}
                    {canManage ? (
                      <button
                        type="button"
                        className="btn primary sm"
                        onClick={() => setCreateDrawerOpen(true)}
                      >
                        <Icons.plus width={16} stroke="currentColor" />
                        {tRoles("createRole")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="roles-matrix-scroll">
                {moduleGroups.map(({ module, permissions, resources }) => {
                  const ModuleIcon = Icons[MODULE_ICONS[module] ?? "grid"];
                  const color = MODULE_COLORS[module] ?? "var(--muted)";
                  const moduleDesc = moduleUiDescription(module, tRoles);
                  const matrixNote = moduleMatrixNote(module, tRoles);
                  const expanded = expandedModules.has(module);
                  const enabledCount = permissions.filter((p) =>
                    draft.has(p.permissionKey),
                  ).length;

                  return (
                    <div key={module} className="roles-module-accordion">
                      <button
                        type="button"
                        className={`roles-module-toggle${expanded ? " is-open" : ""}`}
                        onClick={() => toggleModule(module)}
                        aria-expanded={expanded}
                      >
                        <span
                          className="roles-module-icon"
                          style={{
                            color,
                            background: `color-mix(in srgb, ${color} 14%, transparent)`,
                          }}
                        >
                          <ModuleIcon width={16} stroke={color} />
                        </span>
                        <span className="roles-module-toggle-text">
                          <span className="roles-module-label">
                            {moduleLabel(module)}
                          </span>
                          {moduleDesc ? (
                            <span className="roles-module-desc muted">
                              {moduleDesc}
                            </span>
                          ) : null}
                        </span>
                        <span className="roles-module-meta">
                          <span className="roles-module-count">
                            {enabledCount}/{permissions.length}
                          </span>
                          {expanded ? (
                            <Icons.arrowUp width={16} stroke="var(--muted)" />
                          ) : (
                            <Icons.arrowDn width={16} stroke="var(--muted)" />
                          )}
                        </span>
                      </button>

                      {expanded ? (
                        <div className="roles-module-body">
                          <table className="roles-matrix">
                            <thead>
                              <tr>
                                <th className="roles-matrix-perm-col">
                                  Permiso
                                </th>
                                {PERMISSION_ACTION_COLUMNS.map((col) => (
                                  <th
                                    key={col.action}
                                    className="roles-matrix-action-col"
                                  >
                                    {actionColumnLabel(module, col.action)}
                                    <span className="roles-col-key">
                                      ({col.action})
                                    </span>
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {resources?.map((resource) => (
                                <tr
                                  key={resource.resourceKey}
                                  className="roles-perm-row"
                                >
                                  <td className="roles-perm-cell">
                                    <span className="roles-perm-label">
                                      {resource.label}
                                    </span>
                                    <code className="roles-perm-key mono">
                                      {matrixResourcePermissionPattern(
                                        module,
                                        resource.resourceKey,
                                      )}
                                    </code>
                                  </td>
                                  {PERMISSION_ACTION_COLUMNS.map((col) => {
                                    const applicable = isActionApplicable(
                                      resource.applicableActions,
                                      col.action,
                                    );
                                    const perm =
                                      resource.permissionsByAction[col.action];
                                    const checked =
                                      isAdminRoleSelected ||
                                      (perm != null &&
                                        draft.has(perm.permissionKey));

                                    return (
                                      <td
                                        key={`${resource.resourceKey}-${col.action}`}
                                        className="roles-matrix-check-cell"
                                      >
                                        <label className="roles-check">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            disabled={
                                              readOnly ||
                                              !applicable ||
                                              perm == null
                                            }
                                            onChange={(e) => {
                                              if (perm) {
                                                togglePermission(
                                                  perm.permissionKey,
                                                  e.target.checked,
                                                );
                                              }
                                            }}
                                            aria-label={`${resource.label} — ${col.label}`}
                                          />
                                          <span className="roles-check-box" />
                                        </label>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                              {!resources?.length
                                ? permissions.map((perm) => (
                                    <tr
                                      key={perm.permissionKey}
                                      className="roles-perm-row"
                                    >
                                      <td className="roles-perm-cell">
                                        <span className="roles-perm-label">
                                          {permissionUiLabel(
                                            perm.permissionKey,
                                            perm.description,
                                            tRoles,
                                          )}
                                        </span>
                                        <code className="roles-perm-key mono">
                                          {perm.permissionKey}
                                        </code>
                                      </td>
                                      {PERMISSION_ACTION_COLUMNS.map(
                                        (col, colIdx) => {
                                          const actionIdx = actionColumnIndex(
                                            perm.action,
                                          );
                                          const isActionCell =
                                            actionIdx === colIdx;
                                          const checked =
                                            isAdminRoleSelected ||
                                            draft.has(perm.permissionKey);

                                          return (
                                            <td
                                              key={`${perm.permissionKey}-${col.action}`}
                                              className="roles-matrix-check-cell"
                                            >
                                              <label className="roles-check">
                                                <input
                                                  type="checkbox"
                                                  checked={
                                                    isActionCell && checked
                                                  }
                                                  disabled={
                                                    readOnly || !isActionCell
                                                  }
                                                  onChange={(e) =>
                                                    togglePermission(
                                                      perm.permissionKey,
                                                      e.target.checked,
                                                    )
                                                  }
                                                  aria-label={`${permissionUiLabel(perm.permissionKey, perm.description, tRoles)} — ${col.label}`}
                                                />
                                                <span className="roles-check-box" />
                                              </label>
                                            </td>
                                          );
                                        },
                                      )}
                                    </tr>
                                  ))
                                : null}
                            </tbody>
                          </table>
                          {matrixNote ? (
                            <p
                              className="muted tiny"
                              style={{
                                margin: 0,
                                padding: "12px 20px",
                                borderTop: "1px solid var(--hairline)",
                                lineHeight: 1.5,
                              }}
                            >
                              {matrixNote}
                            </p>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {canManage && !isLockedRole ? (
                <footer className="roles-matrix-footer">
                  <button
                    type="button"
                    className="btn outline"
                    disabled={!isDirty || savePending}
                    onClick={cancelChanges}
                  >
                    {tCommon("cancelChanges")}
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!isDirty || savePending}
                    onClick={handleSave}
                  >
                    <Icons.download width={16} stroke="currentColor" />
                    {savePending ? tCommon("saving") : tCommon("saveChanges")}
                  </button>
                </footer>
              ) : null}
            </>
          ) : (
            <p className="muted">{tRoles("selectRoleToView")}</p>
          )}
        </section>
      </div>

      <RoleFormDrawer
        mode="new"
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        onCreated={handleRoleCreated}
      />

      <RoleFormDrawer
        mode="edit"
        role={editRole}
        open={editRole != null}
        onClose={() => setEditRole(null)}
      />

      <RoleUsersDialog
        roleName={usersDialogRole?.appRoleName ?? ""}
        users={
          usersDialogRole
            ? (usersByRole.get(usersDialogRole.appRoleId) ?? [])
            : []
        }
        open={usersDialogRole != null}
        onClose={() => setUsersDialogRole(null)}
      />

      {deactivateRole ? (
        <ConfirmDialog
          title={tRoles("deactivateRole")}
          message={tRoles("deactivateRoleMessage")}
          itemName={deactivateRole.appRoleName}
          pending={deactivatePending}
          onClose={() => setDeactivateRole(null)}
          onConfirm={handleDeactivateRole}
        />
      ) : null}
    </div>
  );
}
