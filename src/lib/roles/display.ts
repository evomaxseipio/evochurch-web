/** UI de matriz de permisos. Metadatos de roles → role_config en BD (ver role-config.ts). */

import { REPORT_RESOURCE_DEFS } from "@/lib/reports/permissions";
type RoleTranslator = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

export {
  roleDisplayColor as roleUiColor,
  roleDisplaySummary as roleUiSummary,
} from "@/lib/roles/role-config";

/** Módulos visibles en la matriz (como el mock). */
export const MATRIX_MODULES = [
  "dashboard",
  "network",
  "members",
  "ministerios",
  "eventos",
  "attendance",
  "comunicacion",
  "finances",
  "settings",
  "admin_users",
  "roles",
  "audit",
  "reports",
] as const;

export const MODULE_UI_DESCRIPTIONS: Record<string, string> = {
  dashboard: "Panel principal e indicadores de la iglesia",
  network: "Red de iglesias sede y sucursales (solo lectura)",
  finances: "Ingresos, egresos, transferencias y reportes",
  members: "Gestión de miembros y asistentes",
  ministerios: "Ver y gestionar equipos de servicio (ABAC para líderes)",
  eventos: "Calendario, agenda y actividades de la congregación",
  attendance: "Sesiones y lista de asistencia por ministerio",
  comunicacion: "Anuncios, chat interno y notificaciones",
  settings: "Configuración personal y catálogos del sistema",
  admin_users: "Usuarios con acceso a la consola web",
  roles: "Matriz de roles y permisos por iglesia",
  audit: "Bitácora de acciones administrativas",
  reports: "Informes financieros, membresía y ejecutivos",
};

const MODULE_UI_DESCRIPTION_KEYS: Record<string, string> = {
  dashboard: "modules.dashboard",
  network: "modules.network",
  finances: "modules.finances",
  members: "modules.members",
  ministerios: "modules.ministerios",
  eventos: "modules.eventos",
  attendance: "modules.attendance",
  comunicacion: "modules.comunicacion",
  settings: "modules.settings",
  admin_users: "modules.admin_users",
  roles: "modules.roles",
  audit: "modules.audit",
  reports: "modules.reports",
};

export const FINANCE_RESOURCE_LABELS: Record<string, string> = {
  funds: "Fondos",
  transactions: "Transacciones",
  contributions: "Contribuciones",
  tithe_close: "Cierre de diezmos",
};

const FINANCE_RESOURCE_LABEL_KEYS: Record<string, string> = {
  funds: "financeResources.funds",
  transactions: "financeResources.transactions",
  contributions: "financeResources.contributions",
  tithe_close: "financeResources.tithe_close",
};

export const REPORT_RESOURCE_LABELS: Record<string, string> = Object.fromEntries(
  REPORT_RESOURCE_DEFS.map((def) => [def.key, def.label]),
);

const REPORT_RESOURCE_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  REPORT_RESOURCE_DEFS.map((def) => [def.key, `reportResources.${def.key}`]),
);

const REPORT_PERMISSION_UI_LABELS = Object.fromEntries(
  REPORT_RESOURCE_DEFS.flatMap((def) => [
    [`reports:${def.key}:read`, `Ver ${def.label.toLowerCase()}`],
    [`reports:${def.key}:export`, `Exportar ${def.label.toLowerCase()}`],
  ]),
);

export const PERMISSION_UI_LABELS: Record<string, string> = {
  "finances:funds:read": "Ver fondos",
  "finances:funds:write": "Registrar fondos",
  "finances:funds:delete": "Eliminar fondos",
  "finances:funds:export": "Exportar fondos",
  "finances:transactions:read": "Ver transacciones",
  "finances:transactions:write": "Registrar transacciones",
  "finances:transactions:authorize": "Autorizar egresos",
  "finances:transactions:delete": "Eliminar transacciones",
  "finances:transactions:export": "Exportar transacciones",
  "finances:contributions:read": "Ver contribuciones",
  "finances:contributions:write": "Registrar contribuciones",
  "finances:contributions:delete": "Eliminar contribuciones",
  "finances:contributions:export": "Exportar contribuciones",
  "finances:tithe_close:read": "Ver cierre semanal de diezmos",
  "finances:tithe_close:write": "Cerrar semana de diezmos",
  "members:read": "Ver miembros",
  "members:write": "Editar miembros",
  "members:delete": "Eliminar miembros",
  "ministerios:read": "Ver ministerios",
  "ministerios:write": "Crear y editar cualquier ministerio",
  "ministerios:write_own": "Editar solo ministerios donde es líder",
  "eventos:read": "Ver eventos",
  "eventos:write": "Crear y editar eventos",
  "eventos:write_own": "Crear y editar eventos de sus ministerios",
  "eventos:delete": "Eliminar eventos",
  "attendance:read": "Ver asistencia",
  "attendance:write": "Crear sesiones y marcar asistencia",
  "comunicacion:read": "Ver comunicación",
  "comunicacion:write": "Publicar anuncios y mensajes",
  "comunicacion:delete": "Eliminar anuncios y mensajes",
  "dashboard:read": "Ver dashboard",
  "settings:read": "Ver configuración propia",
  "settings:expense_types:read": "Ver tipos de gasto",
  "settings:expense_types:write": "Editar tipos de gasto",
  "settings:expense_types:delete": "Eliminar tipos de gasto",
  "settings:income_types:read": "Ver tipos de ingreso",
  "settings:income_types:write": "Editar tipos de ingreso",
  "settings:income_types:delete": "Eliminar tipos de ingreso",
  "settings:ministry_categories:read": "Ver categorías de ministerios",
  "settings:ministry_categories:write": "Editar categorías de ministerios",
  "settings:ministry_categories:delete": "Eliminar categorías de ministerios",
  "settings:church:read": "Ver perfil de iglesia",
  "settings:church:write": "Editar perfil de iglesia",
  "settings:discount_templates:write":
    "Configurar plantillas de descuento y reportes vinculados",
  "network:churches:read": "Ver red de sucursales",
  "admin_users:manage": "Gestionar usuarios del sistema",
  "roles:manage": "Editar roles y permisos por iglesia",
  "audit:read": "Ver bitácora de acciones",
  "audit:export": "Exportar bitácora",
  ...REPORT_PERMISSION_UI_LABELS,
};

const PERMISSION_UI_LABEL_KEYS: Record<string, string> = {
  "finances:funds:read": "permissions.finances.funds.read",
  "finances:funds:write": "permissions.finances.funds.write",
  "finances:funds:delete": "permissions.finances.funds.delete",
  "finances:funds:export": "permissions.finances.funds.export",
  "finances:transactions:read": "permissions.finances.transactions.read",
  "finances:transactions:write": "permissions.finances.transactions.write",
  "finances:transactions:authorize": "permissions.finances.transactions.authorize",
  "finances:transactions:delete": "permissions.finances.transactions.delete",
  "finances:transactions:export": "permissions.finances.transactions.export",
  "finances:contributions:read": "permissions.finances.contributions.read",
  "finances:contributions:write": "permissions.finances.contributions.write",
  "finances:contributions:delete": "permissions.finances.contributions.delete",
  "finances:contributions:export": "permissions.finances.contributions.export",
  "finances:tithe_close:read": "permissions.finances.tithe_close.read",
  "finances:tithe_close:write": "permissions.finances.tithe_close.write",
  "members:read": "permissions.members.read",
  "members:write": "permissions.members.write",
  "members:delete": "permissions.members.delete",
  "ministerios:read": "permissions.ministerios.read",
  "ministerios:write": "permissions.ministerios.write",
  "ministerios:write_own": "permissions.ministerios.write_own",
  "eventos:read": "permissions.eventos.read",
  "eventos:write": "permissions.eventos.write",
  "eventos:write_own": "permissions.eventos.write_own",
  "eventos:delete": "permissions.eventos.delete",
  "attendance:read": "permissions.attendance.read",
  "attendance:write": "permissions.attendance.write",
  "comunicacion:read": "permissions.comunicacion.read",
  "comunicacion:write": "permissions.comunicacion.write",
  "comunicacion:delete": "permissions.comunicacion.delete",
  "dashboard:read": "permissions.dashboard.read",
  "settings:read": "permissions.settings.read",
  "settings:expense_types:read": "permissions.settings.expense_types.read",
  "settings:expense_types:write": "permissions.settings.expense_types.write",
  "settings:expense_types:delete": "permissions.settings.expense_types.delete",
  "settings:income_types:read": "permissions.settings.income_types.read",
  "settings:income_types:write": "permissions.settings.income_types.write",
  "settings:income_types:delete": "permissions.settings.income_types.delete",
  "settings:ministry_categories:read":
    "permissions.settings.ministry_categories.read",
  "settings:ministry_categories:write":
    "permissions.settings.ministry_categories.write",
  "settings:ministry_categories:delete":
    "permissions.settings.ministry_categories.delete",
  "settings:church:read": "permissions.settings.church.read",
  "settings:church:write": "permissions.settings.church.write",
  "settings:discount_templates:write":
    "permissions.settings.discount_templates.write",
  "network:churches:read": "permissions.network.churches.read",
  "admin_users:manage": "permissions.admin_users.manage",
  "roles:manage": "permissions.roles.manage",
  "audit:read": "permissions.audit.read",
  "audit:export": "permissions.audit.export",
};

export const MATRIX_PERMISSION_ORDER: Record<string, string[]> = {
  dashboard: [],
  network: [],
  finances: [],
  members: [],
  ministerios: [],
  eventos: [],
  attendance: [],
  comunicacion: [],
  settings: [],
  admin_users: [],
  roles: [],
  audit: [],
  reports: [],
};

export function permissionUiLabel(
  permissionKey: string,
  fallback: string,
  t?: RoleTranslator,
): string {
  if (t) {
    const key = PERMISSION_UI_LABEL_KEYS[permissionKey];
    if (key) return t(key);
  }
  return PERMISSION_UI_LABELS[permissionKey] ?? fallback;
}

export function isMatrixModule(module: string): boolean {
  return (MATRIX_MODULES as readonly string[]).includes(module);
}

export function financeResourceLabel(resourceKey: string, t?: RoleTranslator): string {
  if (t) {
    const key = FINANCE_RESOURCE_LABEL_KEYS[resourceKey];
    if (key) return t(key);
  }
  return FINANCE_RESOURCE_LABELS[resourceKey] ?? resourceKey;
}

export function reportResourceLabel(resourceKey: string, t?: RoleTranslator): string {
  if (t) {
    const key = REPORT_RESOURCE_LABEL_KEYS[resourceKey];
    if (key) return t(key);
  }
  return REPORT_RESOURCE_LABELS[resourceKey] ?? resourceKey;
}

/** Etiquetas de columna por módulo (p. ej. ministerios: write → Gestionar, no Registrar). */
export const MODULE_ACTION_COLUMN_LABELS: Record<
  string,
  Partial<Record<string, string>>
> = {
  ministerios: {
    read: "Ver",
    write: "Gestionar",
    write_own: "Como líder",
  },
  eventos: {
    read: "Ver",
    write: "Gestionar",
    write_own: "Como líder",
    delete: "Eliminar",
  },
  attendance: {
    read: "Ver",
    write: "Registrar",
  },
  settings: {
    read: "Ver",
    write: "Editar",
    delete: "Eliminar",
  },
  admin_users: {
    write: "Gestionar",
  },
  roles: {
    write: "Gestionar",
  },
  dashboard: {
    read: "Ver",
  },
  members: {
    read: "Ver",
    write: "Editar",
    delete: "Eliminar",
  },
  comunicacion: {
    read: "Ver",
    write: "Publicar",
    delete: "Eliminar",
  },
  finances: {
    read: "Ver",
    write: "Registrar",
    authorize: "Autorizar",
    delete: "Eliminar",
    export: "Exportar",
  },
  reports: {
    read: "Ver",
    export: "Exportar",
  },
};

export const MODULE_MATRIX_NOTES: Record<string, string> = {
  members:
    "Ver solo permite listar y abrir perfiles en lectura. Editar y Eliminar son permisos aparte. Registrar contribuciones desde Miembros usa Finanzas → Contribuciones.",
  ministerios:
    "Gestionar permite crear, editar y eliminar cualquier ministerio. Como líder aplica ABAC: el usuario solo modifica ministerios donde su perfil figura en leader_profile_ids. Ver es obligatorio para acceder al módulo.",
  finances:
    "Cada fila (Fondos, Transacciones, Contribuciones) tiene permisos independientes por columna.",
  settings:
    "Tipos de gasto e ingreso son permisos separados. Configuración y perfil solo requiere Ver.",
  reports:
    "Cada fila es un informe distinto. Ver permite verlo en el hub; Exportar permite descargar PDF o Excel.",
};

/** Solo módulos con nota en roles.notes.* — evita MISSING_MESSAGE en next-intl. */
const MODULE_MATRIX_NOTE_KEYS: Partial<Record<string, string>> = {
  members: "notes.members",
  ministerios: "notes.ministerios",
  finances: "notes.finances",
  settings: "notes.settings",
  reports: "notes.reports",
};

export function moduleUiDescription(module: string, t?: RoleTranslator): string | null {
  if (t) {
    const key = MODULE_UI_DESCRIPTION_KEYS[module];
    if (key) return t(key);
  }
  return MODULE_UI_DESCRIPTIONS[module] ?? null;
}

export function moduleMatrixNote(module: string, t?: RoleTranslator): string | null {
  const noteKey = MODULE_MATRIX_NOTE_KEYS[module];
  if (t && noteKey) {
    return t(noteKey);
  }
  return MODULE_MATRIX_NOTES[module] ?? null;
}
