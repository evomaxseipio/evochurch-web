/** Datos ficticios del mockup (`project/data.js`) — reemplazar con Supabase después. */

import type { IconName } from "@/components/icons";

export type WeekPoint = { w: string; v: number };
export type MonthPoint = { m: string; v: number };
export type Activity = {
  who: string;
  what: string;
  amount: string;
  time: string;
  kind: string;
};
export type ChurchEvent = {
  id: number;
  title: string;
  date: string;
  time: string;
  type: "culto" | "evento" | "estudio";
  location: string;
};

export type DashboardKpi = {
  label: string;
  value: string;
  delta?: string;
  deltaDir?: "up" | "down";
  feature?: boolean;
  spark?: number[];
  icon?: IconName;
  accent?: string;
};

export type QuickAction = {
  label: string;
  icon: IconName;
  color: string;
};

export const dashboardMock = {
  church: {
    name: "Comunidad Cristiana Renacer",
    pastor: "Roberto",
  },
  hero: {
    dateLabel: "Domingo · 10 de Mayo, 2026",
    attendance: "312 hermanos",
    offering: "RD$ 89,420",
    baptisms: "7 candidatos",
    verse:
      "Donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos.",
    verseRef: "Mateo 18:20",
  },
  kpis: [
    {
      label: "Total de Miembros",
      value: "1,247",
      delta: "+24 este mes",
      deltaDir: "up",
      feature: true,
      icon: "users",
      accent: "var(--d-people)",
      spark: [1180, 1192, 1201, 1215, 1218, 1230, 1240, 1247],
    },
    {
      label: "Asistencia Dom.",
      value: "312",
      delta: "+8.4%",
      deltaDir: "up",
      icon: "trendUp",
      accent: "var(--d-income)",
      spark: [268, 282, 295, 304, 288, 318, 312],
    },
    {
      label: "Ofrendas (mes)",
      value: "458K",
      delta: "+12.4%",
      deltaDir: "up",
      icon: "wallet",
      accent: "var(--d-funds)",
      spark: [380, 520, 410, 395, 425, 458],
    },
    {
      label: "Eventos próximos",
      value: "7",
      delta: "3 esta semana",
      deltaDir: "up",
      icon: "cal",
      accent: "var(--info)",
    },
    {
      label: "Nuevos visitantes",
      value: "18",
      delta: "+6 vs sem pasada",
      deltaDir: "up",
      icon: "pin",
      accent: "var(--lila)",
      spark: [8, 11, 12, 10, 14, 16, 18],
    },
    {
      label: "Diezmos cumplidos",
      value: "74%",
      delta: "-3%",
      deltaDir: "down",
      icon: "wallet",
      accent: "var(--d-system)",
      spark: [78, 80, 79, 77, 76, 75, 74],
    },
    {
      label: "Bautismos del año",
      value: "42",
      delta: "+15 vs 2025",
      deltaDir: "up",
      icon: "cross",
      accent: "var(--warm)",
      spark: [2, 4, 8, 15, 22, 30, 38, 42],
    },
  ] satisfies DashboardKpi[],
  attendanceWeeks: [
    { w: "Mar 22", v: 268 },
    { w: "Mar 29", v: 282 },
    { w: "Abr 5", v: 295 },
    { w: "Abr 12", v: 304 },
    { w: "Abr 19", v: 288 },
    { w: "Abr 26", v: 318 },
    { w: "May 3", v: 312 },
  ] satisfies WeekPoint[],
  givingMonths: [
    { m: "Nov", v: 380_000 },
    { m: "Dic", v: 520_000 },
    { m: "Ene", v: 410_000 },
    { m: "Feb", v: 395_000 },
    { m: "Mar", v: 425_000 },
    { m: "Abr", v: 458_000 },
    { m: "May", v: 285_000 },
  ] satisfies MonthPoint[],
  givingTotal: 458_000,
  activities: [
    {
      who: "María Altagracia Peña",
      what: "registró diezmo",
      amount: "RD$ 6,800",
      time: "hace 12 min",
      kind: "give",
    },
    {
      who: "Pastor Roberto",
      what: "creó evento",
      amount: "Vigilia de Oración",
      time: "hace 1 h",
      kind: "event",
    },
    {
      who: "Yokasta Mejía",
      what: "actualizó perfil",
      amount: "—",
      time: "hace 2 h",
      kind: "edit",
    },
    {
      who: "Sistema",
      what: "exportó reporte",
      amount: "Finanzas Abril.pdf",
      time: "hace 3 h",
      kind: "report",
    },
    {
      who: "Wilkin Almonte",
      what: "registró ingreso",
      amount: "RD$ 25,000",
      time: "hace 5 h",
      kind: "give",
    },
    {
      who: "Cristian Ureña",
      what: "se unió a",
      amount: "Servicio Jóvenes",
      time: "ayer",
      kind: "event",
    },
  ] satisfies Activity[],
  events: [
    {
      id: 1,
      title: "Culto Dominical",
      date: "2026-05-10",
      time: "9:00 AM",
      type: "culto",
      location: "Templo Principal",
    },
    {
      id: 2,
      title: "Servicio de Jóvenes 'Encendidos'",
      date: "2026-05-15",
      time: "7:30 PM",
      type: "evento",
      location: "Salón de Jóvenes",
    },
    {
      id: 3,
      title: "Estudio Bíblico — Romanos 8",
      date: "2026-05-13",
      time: "7:00 PM",
      type: "estudio",
      location: "Templo Principal",
    },
    {
      id: 4,
      title: "Vigilia de Oración",
      date: "2026-05-22",
      time: "10:00 PM",
      type: "evento",
      location: "Templo Principal",
    },
  ] satisfies ChurchEvent[],
  quickActions: [
    { label: "Nuevo miembro", icon: "plus", color: "var(--primary)" },
    { label: "Registrar ofrenda", icon: "wallet", color: "var(--accent-600)" },
    { label: "Crear evento", icon: "cal", color: "var(--success)" },
    { label: "Enviar anuncio", icon: "chat", color: "var(--info)" },
    { label: "Exportar reporte", icon: "download", color: "var(--ink-2)" },
  ] satisfies QuickAction[],
};
