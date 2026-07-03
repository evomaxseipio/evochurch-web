/** UI de matriz de permisos. Metadatos de roles → role_config en BD (ver role-config.ts). */

export {
  roleDisplayColor as roleUiColor,
  roleDisplaySummary as roleUiSummary,
} from "@/lib/roles/role-config";

/** Módulos visibles en la matriz (como el mock). */
export const MATRIX_MODULES = [
  "dashboard",
  "members",
  "ministerios",
  "eventos",
  "comunicacion",
  "finances",
  "settings",
  "admin_users",
  "roles",
] as const;

export const MODULE_UI_DESCRIPTIONS: Record<string, string> = {
  dashboard: "Panel principal e indicadores de la iglesia",
  finances: "Ingresos, egresos, transferencias y reportes",
  members: "Gestión de miembros y asistentes",
  ministerios: "Ver y gestionar equipos de servicio (ABAC para líderes)",
  eventos: "Calendario, agenda y actividades de la congregación",
  comunicacion: "Anuncios, chat interno y notificaciones",
  settings: "Configuración personal y catálogos del sistema",
  admin_users: "Usuarios con acceso a la consola web",
  roles: "Matriz de roles y permisos por iglesia",
};

export const FINANCE_RESOURCE_LABELS: Record<string, string> = {
  funds: "Fondos",
  transactions: "Transacciones",
  contributions: "Contribuciones",
};

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
  "members:read": "Ver miembros",
  "members:write": "Editar miembros",
  "members:delete": "Eliminar miembros",
  "ministerios:read": "Ver ministerios",
  "ministerios:write": "Crear y editar cualquier ministerio",
  "ministerios:write_own": "Editar solo ministerios donde es líder",
  "eventos:read": "Ver eventos",
  "eventos:write": "Crear y editar eventos",
  "eventos:delete": "Eliminar eventos",
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
  "admin_users:manage": "Gestionar usuarios del sistema",
  "roles:manage": "Editar roles y permisos por iglesia",
};

export const MATRIX_PERMISSION_ORDER: Record<string, string[]> = {
  dashboard: [],
  finances: [],
  members: [],
  ministerios: [],
  eventos: [],
  comunicacion: [],
  settings: [],
  admin_users: [],
  roles: [],
};

export function permissionUiLabel(permissionKey: string, fallback: string): string {
  return PERMISSION_UI_LABELS[permissionKey] ?? fallback;
}

export function isMatrixModule(module: string): boolean {
  return (MATRIX_MODULES as readonly string[]).includes(module);
}

export function financeResourceLabel(resourceKey: string): string {
  return FINANCE_RESOURCE_LABELS[resourceKey] ?? resourceKey;
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
  eventos: {
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
};

export function moduleMatrixNote(module: string): string | null {
  return MODULE_MATRIX_NOTES[module] ?? null;
}
