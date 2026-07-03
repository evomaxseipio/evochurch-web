/** Roles del prototipo `project/data.js` — UI en español. */
export type ProjectUserRole = {
  id: number;
  name: string;
  description: string;
  appRoleId: number | null;
};

export const PROJECT_USER_ROLES: ProjectUserRole[] = [
  {
    id: 1,
    name: "Administrador",
    description: "Acceso total al sistema.",
    appRoleId: 1,
  },
  {
    id: 2,
    name: "Pastor",
    description: "Miembros, ministerios, eventos y comunicación.",
    appRoleId: 4,
  },
  {
    id: 3,
    name: "Tesorero",
    description: "Finanzas, Reportes.",
    appRoleId: 3,
  },
  {
    id: 4,
    name: "Secretario",
    description: "Miembros, ministerios y eventos.",
    appRoleId: 2,
  },
  {
    id: 5,
    name: "Líder",
    description: "Miembros (lectura) y ministerios donde es líder.",
    appRoleId: 10,
  },
];

export const PROJECT_ROLE_COLORS: Record<string, string> = {
  Administrador: "violet",
  Pastor: "violet",
  Tesorero: "green",
  Secretario: "lila",
  Líder: "lila",
};

export function projectRoleToAppRoleId(roleName: string): number | null {
  return (
    PROJECT_USER_ROLES.find((r) => r.name === roleName)?.appRoleId ?? null
  );
}

export function appRoleIdToProjectRoleName(
  appRoleId: number | null,
): string | null {
  if (appRoleId == null) return null;
  return (
    PROJECT_USER_ROLES.find((r) => r.appRoleId === appRoleId)?.name ?? null
  );
}

export function displayUserRoleLabel(input: {
  appRoleId: number | null;
  appRoleName: string | null;
  membershipRole: string | null;
}): string {
  const fromApp = appRoleIdToProjectRoleName(input.appRoleId);
  if (fromApp) return fromApp;

  const membership = input.membershipRole?.trim();
  if (
    membership &&
    PROJECT_USER_ROLES.some((r) => r.name.toLowerCase() === membership.toLowerCase())
  ) {
    return PROJECT_USER_ROLES.find(
      (r) => r.name.toLowerCase() === membership.toLowerCase(),
    )!.name;
  }

  return input.appRoleName ?? "—";
}

export function isPastorRole(roleName: string): boolean {
  return roleName.trim().toLowerCase() === "pastor";
}
