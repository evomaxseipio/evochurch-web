"use client";

import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { AttendanceBarChart } from "@/components/dashboard/attendance-bar-chart";
import { DashboardHero } from "@/components/dashboard/dashboard-hero";
import { GivingLineChart } from "@/components/dashboard/giving-line-chart";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { UpcomingEvents } from "@/components/dashboard/upcoming-events";
import { Icons } from "@/components/icons";
import { fmtRD } from "@/lib/format-currency";
import { dashboardMock } from "@/lib/mock/dashboard-data";
import { toast } from "@/lib/toast";

export function DashboardView({
  pastorName,
  churchName,
}: {
  pastorName?: string;
  churchName?: string | null;
}) {
  const d = dashboardMock;
  const pastor = pastorName ?? d.church.pastor;
  const church = churchName ?? d.church.name;

  return (
    <div>
      <DashboardHero pastor={pastor} churchName={church} hero={d.hero} />

      <div className="grid-12" style={{ marginTop: 24 }}>
        <div className="span-6">
          <KpiCard {...d.kpis[0]} feature kind="elevated" />
        </div>
        {d.kpis.slice(1).map((kpi) => (
          <div key={kpi.label} className="span-3">
            <KpiCard {...kpi} />
          </div>
        ))}
      </div>

      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="card span-7">
          <div className="row between" style={{ marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Asistencia semanal</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>
                Últimas 7 semanas
              </div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button type="button" className="btn ghost sm">
                Mes
              </button>
              <button type="button" className="btn outline sm">
                Trimestre
              </button>
              <button type="button" className="btn ghost sm">
                Año
              </button>
            </div>
          </div>
          <AttendanceBarChart data={d.attendanceWeeks} />
        </div>

        <div className="card span-5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div className="eyebrow">Ofrendas mensuales</div>
            <div className="display" style={{ fontSize: 26, marginTop: 4 }}>
              {fmtRD(d.givingTotal)}
            </div>
            <span className="chip success" style={{ marginTop: 4 }}>
              <span className="pip" /> +12.4% vs Abril
            </span>
          </div>
          <GivingLineChart data={d.givingMonths} height={180} />
        </div>
      </div>

      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="card span-5">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Actividad reciente</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
                Lo que está pasando
              </div>
            </div>
            <button
              type="button"
              className="tiny"
              style={{ color: "var(--primary)", fontWeight: 600, background: "none", border: 0, cursor: "pointer" }}
            >
              Ver todo →
            </button>
          </div>
          <ActivityFeed items={d.activities} />
        </div>

        <div className="card span-4">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Próximos eventos</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>
                Esta semana
              </div>
            </div>
            <button
              type="button"
              className="btn ghost icon-only sm"
              aria-label="Crear evento"
              onClick={() => toast.info("Evento", "Crear evento — próximamente")}
            >
              <Icons.plus size={16} />
            </button>
          </div>
          <UpcomingEvents events={d.events} />
        </div>

        <div className="card span-3">
          <div className="eyebrow">Accesos rápidos</div>
          <QuickActions actions={d.quickActions} />
        </div>
      </div>
    </div>
  );
}
