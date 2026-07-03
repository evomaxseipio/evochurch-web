"use client";

import {
  setChurchRolePermissionsAction,
  type RolePermissionsActionResult,
} from "@/app/(app)/settings/roles/actions";
import { Icons } from "@/components/icons";
import { useActionToast } from "@/hooks/use-action-toast";
import type { PermissionKey } from "@/lib/auth/permission-keys";
import {
  MODULE_COLORS,
  MODULE_ICONS,
  PERMISSION_ACTION_COLUMNS,
  actionColumnIndex,
  groupMatrixCatalog,
  isActionApplicable,
  moduleLabel,
} from "@/lib/roles/catalog";
import {
  MODULE_UI_DESCRIPTIONS,
  permissionUiLabel,
  roleUiColor,
  roleUiSummary,
} from "@/lib/roles/display";
import type { AppPermissionRow, ChurchRolePermissions } from "@/lib/roles/types";
import { ADMIN_APP_ROLE_ID } from "@/lib/roles/types";
import { toast } from "@/lib/toast";
import { useRouter } from "next/navigation";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useState,
  startTransition,
} from "react";

const saveInitial: RolePermissionsActionResult | null = null;

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
  const editable = roles.find((r) => r.appRoleId !== ADMIN_APP_ROLE_ID);
  return editable?.appRoleId ?? roles[0]?.appRoleId ?? null;
}

export function RolesPermissionsView({
  roles,
  catalog,
  canManage,
  churchName,
}: {
  roles: ChurchRolePermissions[];
  catalog: AppPermissionRow[];
  canManage: boolean;
  churchName: string | null;
}) {
  const router = useRouter();
  const churchLabel = churchName?.trim() || "esta iglesia";

  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(() =>
    defaultSelectedRoleId(roles),
  );
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    () => new Set(),
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
  useActionToast(saveState, {
    successMessage: "Permisos guardados correctamente.",
  });

  const selectedRole = useMemo(
    () => roles.find((r) => r.appRoleId === selectedRoleId) ?? null,
    [roles, selectedRoleId],
  );

  const isAdminRole = selectedRole?.appRoleId === ADMIN_APP_ROLE_ID;
  const readOnly = !canManage || isAdminRole;
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
        const proceed = window.confirm(
          "Hay cambios sin guardar. ¿Descartarlos y cambiar de rol?",
        );
        if (!proceed) return;
      }
      setSelectedRoleId(roleId);
      setDraft(permissionSet([...(savedByRole[roleId] ?? [])]));
      setExpandedModules(new Set());
    },
    [canManage, isDirty, savedByRole],
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
      return next;
    });
  };

  const cancelChanges = () => {
    setDraft(new Set(savedForSelected));
  };

  const handleSave = () => {
    if (!selectedRoleId || readOnly || !isDirty) return;
    const formData = new FormData();
    formData.set("appRoleId", String(selectedRoleId));
    formData.set("permissionKeys", JSON.stringify([...draft]));
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

  return (
    <div className="roles-page-root">
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Configuración · Acceso</div>
          <h1
            className="display"
            style={{
              fontSize: 40,
              margin: "4px 0 6px",
              letterSpacing: "-0.025em",
            }}
          >
            Roles y permisos{" "}
            <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
              por iglesia
            </span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {roles.length} roles del sistema · {totalAssignedUsers} usuarios con
            rol asignado
          </p>
        </div>
      </div>

      <div className="roles-layout">
        <aside className="card roles-list-panel">
          <div className="roles-panel-head">
            <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
              <div>
                <div className="eyebrow">Acceso</div>
                <h2
                  className="display"
                  style={{
                    fontSize: 22,
                    margin: "4px 0 0",
                    letterSpacing: "-0.02em",
                  }}
                >
                  Roles del sistema
                </h2>
                <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                  Selecciona un rol para editar sus permisos.
                </p>
              </div>
              <button
                type="button"
                className="btn outline sm"
                onClick={() => router.refresh()}
              >
                <Icons.refresh width={14} stroke="currentColor" />
                Actualizar lista
              </button>
            </div>
          </div>

          <div className="roles-card-list">
            {roles.map((role) => {
              const selected = role.appRoleId === selectedRoleId;
              const isSystem = role.appRoleId === ADMIN_APP_ROLE_ID;
              const color = roleUiColor(role.appRoleId);
              const summary = roleUiSummary(role.appRoleId);

              return (
                <button
                  key={role.appRoleId}
                  type="button"
                  className={`roles-card${selected ? " is-selected" : ""}`}
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
                      {isSystem ? (
                        <span className="roles-chip-system">Sistema</span>
                      ) : null}
                    </span>
                    {summary ? (
                      <span className="roles-card-desc">{summary}</span>
                    ) : null}
                  </span>
                  <span className="roles-card-aside">
                    <span className="roles-card-count">
                      {role.userCount}{" "}
                      {role.userCount === 1 ? "usuario" : "usuarios"}
                    </span>
                    {!isSystem ? (
                      <Icons.arrowRight
                        width={16}
                        stroke={selected ? "var(--primary)" : "var(--muted)"}
                        className="roles-card-chevron"
                      />
                    ) : null}
                  </span>
                </button>
              );
            })}

            <div className="roles-card roles-card-create">
              <span className="roles-card-icon roles-card-icon-create">
                <Icons.plus width={18} stroke="var(--primary)" />
              </span>
              <span className="roles-card-main">
                <span className="roles-card-name roles-card-name-create">
                  Crear rol
                </span>
                <span className="roles-card-desc">
                  Próximamente: crear nuevos roles del sistema
                </span>
              </span>
            </div>
          </div>
        </aside>

        <section className="card roles-matrix-panel">
          {selectedRole ? (
            <>
              <div className="roles-panel-head">
                <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div className="eyebrow">Matriz de permisos</div>
                    <h2
                      className="display"
                      style={{
                        fontSize: 22,
                        margin: "4px 0 0",
                        letterSpacing: "-0.02em",
                      }}
                    >
                      Permisos del rol:{" "}
                      <span
                        style={{ color: "var(--primary)", fontStyle: "normal" }}
                      >
                        {selectedRole.appRoleName}
                      </span>
                    </h2>
                    <p className="muted tiny" style={{ margin: "6px 0 0" }}>
                      Edita los permisos que tendrá este rol en {churchLabel}.
                    </p>
                  </div>
                  <div className="roles-matrix-actions">
                    {isDirty && canManage && !isAdminRole ? (
                      <span className="roles-chip-dirty">Cambios sin guardar</span>
                    ) : null}
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() =>
                        toast.info(
                          "Próximamente",
                          "Crear roles estará disponible pronto.",
                        )
                      }
                    >
                      <Icons.plus width={16} stroke="currentColor" />
                      Crear rol
                    </button>
                  </div>
                </div>
              </div>

              <div className="roles-matrix-scroll">
                {moduleGroups.map(({ module, permissions, resources }) => {
                  const ModuleIcon = Icons[MODULE_ICONS[module] ?? "grid"];
                  const color = MODULE_COLORS[module] ?? "var(--muted)";
                  const moduleDesc = MODULE_UI_DESCRIPTIONS[module];
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
                                    {col.label}
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
                                      finances:{resource.resourceKey}:*
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
                                      isAdminRole ||
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
                                            isAdminRole ||
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
                                                  aria-label={`${permissionUiLabel(perm.permissionKey, perm.description)} — ${col.label}`}
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
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {canManage && !isAdminRole ? (
                <footer className="roles-matrix-footer">
                  <button
                    type="button"
                    className="btn outline"
                    disabled={!isDirty || savePending}
                    onClick={cancelChanges}
                  >
                    Cancelar cambios
                  </button>
                  <button
                    type="button"
                    className="btn primary"
                    disabled={!isDirty || savePending}
                    onClick={handleSave}
                  >
                    <Icons.download width={16} stroke="currentColor" />
                    {savePending ? "Guardando…" : "Guardar cambios"}
                  </button>
                </footer>
              ) : null}
            </>
          ) : (
            <p className="muted">Selecciona un rol para ver sus permisos.</p>
          )}
        </section>
      </div>
    </div>
  );
}
