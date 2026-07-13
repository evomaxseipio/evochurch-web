import type { PipelineStage } from "@/features/organizations/types/organization.enums";
import { PIPELINE_STAGE_LABELS } from "@/features/organizations/components/organization-labels";

export type SalesHubStat = {
  label: string;
  value: string;
  hint: string;
  tone: "sales" | "warn" | "info" | "ok";
};

export type PipelineSummaryBar = {
  stage: PipelineStage;
  label: string;
  count: number;
  widthPct: number;
  color: string;
};

export type DashboardActivity = {
  id: string;
  time: string;
  emoji: string;
  title: string;
  owner: string;
  tone: "info" | "warn" | "ok";
};

export type RecentOrganizationRow = {
  id: string;
  name: string;
  subtitle: string;
  pipelineLabel: string;
  pipelineChip: string;
  nextAction: string;
  nextActionSub: string;
  nextActionOverdue?: boolean;
  owner: string;
};

export type KanbanCard = {
  id: string;
  org: string;
  contact: string;
  action: string;
  priorityChip: string;
  priorityLabel: string;
};

export type KanbanColumn = {
  stage: PipelineStage;
  label: string;
  count: number;
  lost?: boolean;
  cards: KanbanCard[];
};

export type AgendaItem = {
  id: string;
  time: string;
  emoji: string;
  org: string;
  type: string;
  owner: string;
  ownerInitials: string;
  overdue?: boolean;
  tone: "info" | "warn" | "ok";
};

export type AgendaGroup = {
  id: string;
  label: string;
  items: AgendaItem[];
};

export const SALES_HUB_DASHBOARD_STATS: SalesHubStat[] = [
  { label: "Prospectos activos", value: "47", hint: "+5 esta semana", tone: "sales" },
  { label: "Seguimientos pendientes", value: "12", hint: "3 vencidos", tone: "warn" },
  { label: "Demos agendadas", value: "6", hint: "2 esta semana", tone: "info" },
  { label: "Clientes", value: "8", hint: "Etapa Ganada", tone: "ok" },
];

export const SALES_HUB_PIPELINE_SUMMARY: PipelineSummaryBar[] = [
  { stage: "NEW", label: PIPELINE_STAGE_LABELS.NEW, count: 12, widthPct: 72, color: "var(--info)" },
  { stage: "RESEARCH", label: PIPELINE_STAGE_LABELS.RESEARCH, count: 8, widthPct: 48, color: "var(--pending)" },
  { stage: "CONTACT", label: PIPELINE_STAGE_LABELS.CONTACT, count: 5, widthPct: 30, color: "#6366f1" },
  { stage: "FOLLOW_UP", label: PIPELINE_STAGE_LABELS.FOLLOW_UP, count: 11, widthPct: 66, color: "var(--accent)" },
  { stage: "DEMO", label: PIPELINE_STAGE_LABELS.DEMO, count: 6, widthPct: 36, color: "var(--warn)" },
];

export const SALES_HUB_UPCOMING_ACTIVITIES: DashboardActivity[] = [
  {
    id: "da1",
    time: "14:30",
    emoji: "📞",
    title: "Llamada · Iglesia El Redentor",
    owner: "María López",
    tone: "info",
  },
  {
    id: "da2",
    time: "16:00",
    emoji: "🎥",
    title: "Demo · Concilio Evangélico RD",
    owner: "Carlos R.",
    tone: "warn",
  },
  {
    id: "da3",
    time: "Mañ.",
    emoji: "💬",
    title: "WhatsApp · Ministerio Vida Nueva",
    owner: "María López",
    tone: "ok",
  },
];

export const SALES_HUB_RECENT_ORGS: RecentOrganizationRow[] = [
  {
    id: "recent-1",
    name: "Iglesia Central Bautista",
    subtitle: "Iglesia · Santo Domingo",
    pipelineLabel: "Seguimiento",
    pipelineChip: "violet",
    nextAction: "Agendar demo",
    nextActionSub: "15 jul",
    owner: "María López",
  },
  {
    id: "recent-2",
    name: "Concilio Evangélico RD",
    subtitle: "Concilio · Santiago",
    pipelineLabel: "Demo",
    pipelineChip: "warn",
    nextAction: "Demo virtual",
    nextActionSub: "Hoy 16:00",
    nextActionOverdue: true,
    owner: "Carlos R.",
  },
  {
    id: "recent-3",
    name: "Ministerio Vida Nueva",
    subtitle: "Ministerio · La Vega",
    pipelineLabel: "Contacto",
    pipelineChip: "info",
    nextAction: "Enviar WhatsApp",
    nextActionSub: "11 jul",
    owner: "María López",
  },
];

export const SALES_HUB_KANBAN: KanbanColumn[] = [
  {
    stage: "NEW",
    label: PIPELINE_STAGE_LABELS.NEW,
    count: 4,
    cards: [
      { id: "k1", org: "Ministerio Vida Nueva", contact: "Evang. Pedro López", action: "Enviar correo · 12 jul", priorityChip: "muted", priorityLabel: "Baja" },
      { id: "k2", org: "Iglesia Bethel", contact: "Pastora Elena Ruiz", action: "Investigar web", priorityChip: "warn", priorityLabel: "Media" },
    ],
  },
  {
    stage: "RESEARCH",
    label: PIPELINE_STAGE_LABELS.RESEARCH,
    count: 3,
    cards: [
      { id: "k3", org: "Fundación Manos Unidas", contact: "Sra. Rosa Díaz", action: "Visitar · 18 jul", priorityChip: "warn", priorityLabel: "Media" },
    ],
  },
  {
    stage: "CONTACT",
    label: PIPELINE_STAGE_LABELS.CONTACT,
    count: 2,
    cards: [
      { id: "k4", org: "Iglesia El Redentor", contact: "Pastor Miguel Santos", action: "Llamar · Vencido", priorityChip: "danger", priorityLabel: "Alta" },
    ],
  },
  {
    stage: "FOLLOW_UP",
    label: PIPELINE_STAGE_LABELS.FOLLOW_UP,
    count: 3,
    cards: [
      { id: "k5", org: "Iglesia Central Bautista", contact: "Pastor Juan Pérez", action: "Agendar demo · 15 jul", priorityChip: "danger", priorityLabel: "Alta" },
    ],
  },
  {
    stage: "DEMO",
    label: PIPELINE_STAGE_LABELS.DEMO,
    count: 2,
    cards: [
      { id: "k6", org: "Concilio Evangélico RD", contact: "Lic. Ana Martínez", action: "Demo virtual · Hoy", priorityChip: "danger", priorityLabel: "Alta" },
    ],
  },
  {
    stage: "WON",
    label: PIPELINE_STAGE_LABELS.WON,
    count: 8,
    cards: [
      { id: "k7", org: "Iglesia Monte Sión", contact: "Pastor David G.", action: "Onboarding", priorityChip: "success", priorityLabel: "Alta" },
    ],
  },
  {
    stage: "LOST",
    label: PIPELINE_STAGE_LABELS.LOST,
    count: 2,
    lost: true,
    cards: [
      { id: "k8", org: "Templo Restauración", contact: "—", action: "Sin presupuesto", priorityChip: "muted", priorityLabel: "—" },
    ],
  },
];

export const SALES_HUB_AGENDA: AgendaGroup[] = [
  {
    id: "today",
    label: "Hoy (3)",
    items: [
      { id: "ag1", time: "09:00", emoji: "📞", org: "Iglesia El Redentor", type: "Llamada", owner: "María López", ownerInitials: "ML", overdue: true, tone: "info" },
      { id: "ag2", time: "14:30", emoji: "📞", org: "Iglesia Central Bautista", type: "Llamada de seguimiento", owner: "María López", ownerInitials: "ML", tone: "info" },
      { id: "ag3", time: "16:00", emoji: "🎥", org: "Concilio Evangélico RD", type: "Demo virtual", owner: "Carlos R.", ownerInitials: "CR", tone: "warn" },
    ],
  },
  {
    id: "tomorrow",
    label: "Mañana (2)",
    items: [
      { id: "ag4", time: "10:00", emoji: "💬", org: "Ministerio Vida Nueva", type: "WhatsApp", owner: "María López", ownerInitials: "ML", tone: "ok" },
      { id: "ag5", time: "11:30", emoji: "✉", org: "Fundación Manos Unidas", type: "Correo", owner: "Carlos R.", ownerInitials: "CR", tone: "info" },
    ],
  },
  {
    id: "upcoming",
    label: "Próximos días (5)",
    items: [
      { id: "ag6", time: "15 jul", emoji: "🎥", org: "Iglesia Central Bautista", type: "Demo presencial", owner: "María López", ownerInitials: "ML", tone: "warn" },
    ],
  },
];
