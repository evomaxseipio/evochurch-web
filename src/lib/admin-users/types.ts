export type AppUserRole = {
  appRoleId: number;
  appRoleName: string;
  description: string | null;
  isPrimary: boolean;
};

export type ChurchAuthUser = {
  authUserId: string;
  email: string;
  profileId: string;
  firstName: string | null;
  lastName: string | null;
  appRoleId: number | null;
  appRoleName: string | null;
  membershipRole: string | null;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ChurchAuthUsersStats = {
  total: number;
  active: number;
  inactive: number;
  connectedToday: number;
};

export type AdminUserInput = {
  authUserId?: string | null;
  profileId: string;
  firstName: string;
  lastName: string;
  email: string;
  password?: string;
  roleLabel: string;
  appRoleId: number | null;
  isActive: boolean;
};

/** Fila normalizada para la tabla (como `project/data.js` adminUsers). */
export type AdminUserRow = {
  id: string;
  authUserId: string;
  profileId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLogin: string;
  active: boolean;
};
