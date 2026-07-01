/* global React, Ic, fmtRD, fmtRDshort, KPI, Avatar, BarChart, LineChart */
const { useState: useStateC, useMemo: useMemoC } = React;

// ============ FINANZAS ============
// ============ FINANZAS · Encabezado de página reutilizable ============
function FinPageHeader({ eyebrow, title, subtitle, exportName, toast }) {
  return (
    <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
          {title} <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>· Mayo 2026</span>
        </h1>
        <p className="muted" style={{ margin: 0 }}>{subtitle}</p>
      </div>
      <div className="row">
        <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", `${exportName}_May2026.pdf descargado`)}>
          <Ic.download width={16}/> PDF
        </button>
        <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", `${exportName}_May2026.xlsx descargado`)}>
          <Ic.download width={16}/> Excel
        </button>
      </div>
    </div>
  );
}

// ============ FINANZAS · FONDOS ============
function FondosScreen({ kpiStyle, toast, onNav }) {
  const D = window.EVO_DATA;
  const [funds, setFunds] = useStateC(() => D.funds.map((f) => ({ ...f })));

  const totalRecaudado = funds.reduce((s, f) => s + f.balance, 0);
  const totalMeta = funds.reduce((s, f) => s + (f.goal || 0), 0);
  const activos = funds.filter((f) => f.active).length;
  const avance = totalMeta ? totalRecaudado / totalMeta * 100 : 0;

  return (
    <div>
      <FinPageHeader eyebrow="Mayordomía · Finanzas" title="Fondos"
        subtitle="Cuentas y metas de recaudación de la congregación." exportName="Fondos" toast={toast}/>

      <div className="grid-12" style={{ marginTop: 22 }}>
        <div className="span-3"><KPI kind={kpiStyle} label="Total de fondos" value={String(funds.length)}
          icon={<Ic.wallet width={16}/>} accent="var(--d-funds)"/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Fondos activos" value={`${activos} de ${funds.length}`}
          icon={<Ic.check width={16}/>} accent="var(--success)" delta={`${activos}/${funds.length}`} deltaDir="up"/></div>
        <div className="span-3"><KPI kind={kpiStyle} feature={kpiStyle === "gradient"} label="Total recaudado" value={fmtRDshort(totalRecaudado)}
          icon={<Ic.trendUp width={16}/>} accent="var(--accent)" delta="+12.4%" deltaDir="up"
          spark={[1.8,1.9,2.1,2.0,2.2,2.3,2.38].map((v) => v * 1000000)}/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Avance global" value={avance.toFixed(1) + "%"}
          icon={<Ic.target width={16}/>} accent="var(--accent)" delta="+5.2%" deltaDir="up"/></div>
      </div>

      <div style={{ marginTop: 28 }}>
        <FundsSummary funds={funds}/>
        <FundsList funds={funds} setFunds={setFunds} toast={toast} onNav={onNav}/>
      </div>
    </div>
  );
}

// ============ FINANZAS · TRANSACCIONES ============
function TransaccionesScreen({ kpiStyle, toast }) {
  const D = window.EVO_DATA;
  const tx = D.transactions;
  const totalIngresos = tx.filter((t) => t.type === "Ingreso").reduce((s, t) => s + t.amount, 0);
  const totalEgresos = tx.filter((t) => t.type === "Egreso").reduce((s, t) => s + Math.abs(t.amount), 0);
  const pendientes = tx.filter((t) => t.status === "Pendiente").length;

  return (
    <div>
      <FinPageHeader eyebrow="Mayordomía · Finanzas" title="Transacciones"
        subtitle="Todos los movimientos de ingreso y egreso de cada fondo." exportName="Transacciones" toast={toast}/>

      <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
        <div className="span-3"><KPI kind={kpiStyle} label="Movimientos" value={String(tx.length)}/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Ingresos (mes)" value={fmtRDshort(totalIngresos)} delta="+12.4%" deltaDir="up"
          spark={[8,12,10,15,18,16,20]} accent="var(--success)"/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Egresos (mes)" value={fmtRDshort(totalEgresos)} delta="+3.1%" deltaDir="dn"
          spark={[3,5,4,6,8,5,7]} accent="var(--danger)"/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Pendientes de autorizar" value={String(pendientes)} accent="var(--warm)"/></div>
      </div>

      <TransaccionesTab toast={toast}/>
    </div>
  );
}

// ============ FINANZAS · CONTRIBUCIONES ============
function ContribucionesScreen({ kpiStyle, toast }) {
  const D = window.EVO_DATA;
  const c = D.contributions;
  const sum = (cat) => c.filter((x) => cat ? x.category === cat : true).reduce((s, x) => s + x.amount, 0);

  return (
    <div>
      <FinPageHeader eyebrow="Mayordomía · Finanzas" title="Contribuciones"
        subtitle="Diezmos, ofrendas y donaciones registradas en la congregación." exportName="Contribuciones" toast={toast}/>

      <div className="grid-12" style={{ marginTop: 22, marginBottom: 28 }}>
        <div className="span-3"><KPI kind={kpiStyle} feature={kpiStyle === "gradient"} label="Total ingresos" value={fmtRDshort(sum())} accent="var(--accent)"/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Diezmos" value={fmtRDshort(sum("Diezmo"))}/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Ofrendas" value={fmtRDshort(sum("Ofrenda"))}/></div>
        <div className="span-3"><KPI kind={kpiStyle} label="Donaciones" value={fmtRDshort(sum("Donación"))}/></div>
      </div>

      <ContribucionesTab toast={toast}/>
    </div>
  );
}

// (Fondos: FundsSummary + FundsList movidos a fondos.jsx)

// ============ EVENTOS ============
function EventosScreen({ toast }) {
  const D = window.EVO_DATA;
  const [view, setView] = useStateC("calendario");

  // Build a calendar grid for May 2026
  const month = 4; const year = 2026;
  const first = new Date(year, month, 1);
  const dow = first.getDay(); // 0 sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < dow; i++) {
    const d = new Date(year, month, -dow + i + 1);
    cells.push({ date: d.getDate(), muted: true });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const evs = D.events.filter(e => new Date(e.date).getDate() === i && new Date(e.date).getMonth() === month);
    cells.push({ date: i, muted: false, events: evs, today: i === 8 });
  }
  while (cells.length % 7 !== 0) cells.push({ date: cells.length - daysInMonth - dow + 1, muted: true });

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Agenda</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Eventos <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>de la iglesia</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>Cultos, estudios, vigilias y actividades especiales.</p>
        </div>
        <div className="row">
          <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
            <button onClick={()=>setView("calendario")} className="btn sm" style={{
              background: view === "calendario" ? "var(--surface)" : "transparent",
              boxShadow: view === "calendario" ? "var(--shadow-1)" : "none", fontWeight: 500
            }}>Calendario</button>
            <button onClick={()=>setView("lista")} className="btn sm" style={{
              background: view === "lista" ? "var(--surface)" : "transparent",
              boxShadow: view === "lista" ? "var(--shadow-1)" : "none", fontWeight: 500
            }}>Lista</button>
          </div>
          <button className="btn primary"><Ic.plus width={16}/> Nuevo evento</button>
        </div>
      </div>

      {view === "calendario" && (
        <div className="grid-12" style={{ marginTop: 24 }}>
          <div className="card span-8" style={{ padding: 0, overflow: "hidden" }}>
            <div className="row between" style={{ padding: "18px 22px", borderBottom: "1px solid var(--hairline)" }}>
              <div className="display" style={{ fontSize: 28, letterSpacing: "-0.02em" }}>Mayo 2026</div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn ghost icon-only sm">←</button>
                <button className="btn outline sm">Hoy</button>
                <button className="btn ghost icon-only sm">→</button>
              </div>
            </div>
            <div className="cal" style={{ borderRadius: 0, border: 0 }}>
              {["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"].map(d => <div key={d} className="dow">{d}</div>)}
              {cells.map((c, i) => (
                <div key={i} className={`day ${c.muted ? "muted" : ""} ${c.today ? "today" : ""}`}>
                  <div className="num">{c.date}</div>
                  {(c.events || []).slice(0,2).map(e => (
                    <div key={e.id} className={`pill ${e.type}`} title={e.title}>{e.title}</div>
                  ))}
                  {(c.events || []).length > 2 && <div className="tiny muted">+{c.events.length - 2} más</div>}
                </div>
              ))}
            </div>
          </div>

          <div className="span-4 col" style={{ gap: 14 }}>
            <div className="card">
              <div className="eyebrow">Próximamente</div>
              <div className="col" style={{ gap: 12, marginTop: 12 }}>
                {D.events.slice(0, 4).map(e => (
                  <div key={e.id} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                    <div style={{
                      width: 4, alignSelf: "stretch", borderRadius: 4,
                      background: e.type === "culto" ? "var(--primary)" : e.type === "estudio" ? "var(--accent)" : "var(--success)"
                    }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.title}</div>
                      <div className="tiny muted" style={{ marginTop: 2 }}>
                        {new Date(e.date).toLocaleDateString("es-DO", { weekday: "long", day: "numeric", month: "long" })} · {e.time}
                      </div>
                      <div className="tiny muted">{e.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card" style={{
              background: "linear-gradient(135deg, var(--primary), var(--primary-500))",
              color: "#fff", border: "1px solid transparent",
              position: "relative", overflow: "hidden"
            }}>
              <svg style={{ position: "absolute", top: 0, right: 0, width: 140, height: 140, opacity: 0.18 }} viewBox="0 0 100 100"><circle cx="80" cy="20" r="60" fill="var(--glow)"/></svg>
              <div style={{ position: "relative" }}>
                <div className="eyebrow" style={{ color: "rgba(255,255,255,0.7)" }}>Evento destacado</div>
                <div className="display" style={{ fontSize: 26, marginTop: 6, lineHeight: 1.1 }}>Bautismos en el Río Yaque</div>
                <p style={{ fontSize: 13, opacity: 0.85, marginTop: 8, lineHeight: 1.5 }}>
                  7 hermanos darán testimonio público de su fe. Sábado 24 de Mayo, 8:00 AM.
                </p>
                <button className="btn accent sm" style={{ marginTop: 14 }}>Ver detalles</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "lista" && (
        <div className="col" style={{ marginTop: 22, gap: 10 }}>
          {D.events.map(e => (
            <div key={e.id} className="card" style={{ padding: 18, display: "grid", gridTemplateColumns: "70px 1fr auto", gap: 18, alignItems: "center" }}>
              <div style={{
                background: e.type === "culto" ? "var(--primary-50)" : e.type === "estudio" ? "var(--accent-100)" : "#DCFCE7",
                color: e.type === "culto" ? "var(--primary-600)" : e.type === "estudio" ? "var(--accent-600)" : "var(--success)",
                borderRadius: 14, padding: 12, textAlign: "center"
              }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {["Ene","Feb","Mar","Abr","May","Jun"][new Date(e.date).getMonth()]}
                </div>
                <div className="display" style={{ fontSize: 28, lineHeight: 1, marginTop: 2 }}>{new Date(e.date).getDate()}</div>
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 16 }}>{e.title}</div>
                <div className="tiny muted" style={{ marginTop: 4 }}>{e.time} · {e.location} · {e.attendees} confirmados</div>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn outline sm">Ver detalle</button>
                <button className="btn ghost icon-only sm"><Ic.more width={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

window.FondosScreen = FondosScreen;
window.TransaccionesScreen = TransaccionesScreen;
window.ContribucionesScreen = ContribucionesScreen;
window.EventosScreen = EventosScreen;
