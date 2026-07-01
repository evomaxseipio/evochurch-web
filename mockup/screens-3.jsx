/* global React, Ic, fmtRD, fmtRDshort, KPI, Avatar, BarChart, LineChart */
const { useState: useStateC, useMemo: useMemoC } = React;

// ============ FINANZAS ============
function FinanzasScreen({ kpiStyle, toast }) {
  const D = window.EVO_DATA;
  const [tab, setTab] = useStateC("transacciones");
  const [typeF, setTypeF] = useStateC("all");

  const totalIngresos = D.transactions.filter(t => t.type === "Ingreso").reduce((s, t) => s + t.amount, 0);
  const totalEgresos = D.transactions.filter(t => t.type === "Egreso").reduce((s, t) => s + Math.abs(t.amount), 0);

  const filteredTx = D.transactions.filter(t => typeF === "all" ? true : t.type.toLowerCase() === typeF);

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Mayordomía</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Finanzas <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>· Mayo 2026</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>Diezmos, ofrendas y mayordomía de los recursos del Señor.</p>
        </div>
        <div className="row">
          <button className="btn outline" onClick={() => toast?.("success","Reporte generado","Finanzas_May2026.pdf descargado")}>
            <Ic.download width={16}/> PDF
          </button>
          <button className="btn outline" onClick={() => toast?.("success","Reporte generado","Finanzas_May2026.xlsx descargado")}>
            <Ic.download width={16}/> Excel
          </button>
          <button className="btn primary"><Ic.plus width={16}/> Registrar movimiento</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid-12" style={{ marginTop: 22 }}>
        <div className="span-6">
          <KPI kind={kpiStyle} feature={kpiStyle === "gradient"}
            label="Balance General"
            value={fmtRDshort(D.funds.reduce((s, f) => s + f.balance, 0))}
            delta="+9.2% este mes" deltaDir="up"
            spark={[1.8,1.9,2.1,2.0,2.2,2.3,2.38].map(v=>v*1000000)}/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Ingresos (mes)" value={fmtRDshort(totalIngresos)} delta="+12.4%" deltaDir="up"
            spark={[8,12,10,15,18,16,20]} accent="var(--success)"/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Egresos (mes)" value={fmtRDshort(totalEgresos)} delta="+3.1%" deltaDir="dn"
            spark={[3,5,4,6,8,5,7]} accent="var(--danger)"/>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginTop: 28 }}>
        {[["fondos","Fondos"],["transacciones","Transacciones"],["contribuciones","Contribuciones"]].map(([v, l]) => (
          <div key={v} className={`tab ${tab === v ? "active" : ""}`} onClick={() => setTab(v)}>{l}</div>
        ))}
      </div>

      {tab === "fondos" && (
        <div className="grid-12">
          {D.funds.map(f => (
            <div key={f.id} className="card span-6" style={{ position: "relative", overflow: "hidden" }}>
              <div className="dot-grid"/>
              <div style={{ position: "relative" }}>
                <div className="row between">
                  <div>
                    <div className="eyebrow">Fondo</div>
                    <div className="display" style={{ fontSize: 24, marginTop: 4, letterSpacing: "-0.02em" }}>{f.name}</div>
                  </div>
                  <span className={`chip ${f.change > 0 ? "success" : "danger"}`}>
                    {f.change > 0 ? <Ic.arrowUp width={12}/> : <Ic.arrowDn width={12}/>}
                    {Math.abs(f.change).toFixed(1)}%
                  </span>
                </div>
                <div className="display tnum" style={{ fontSize: 44, marginTop: 18, letterSpacing: "-0.025em" }}>
                  {fmtRD(f.balance)}
                </div>
                <div className="row between" style={{ marginTop: 14 }}>
                  <div className="tiny muted">Actualizado hoy · 8:42 AM</div>
                  <div className="row" style={{ gap: 6 }}>
                    <button className="btn ghost sm">Ver detalle</button>
                    <button className="btn outline sm"><Ic.plus width={12}/> Movimiento</button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "transacciones" && (
        <>
          <div className="card flat" style={{ padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
            <div className="search" style={{ flex: 1, minWidth: 240 }}>
              <Ic.search width={16} stroke="var(--ink-3)"/>
              <input placeholder="Buscar por descripción, miembro, fondo…"/>
            </div>
            <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
              {[["all","Todos"],["ingreso","Ingresos"],["egreso","Egresos"]].map(([v, l]) => (
                <button key={v} onClick={() => setTypeF(v)} className="btn sm" style={{
                  background: typeF === v ? "var(--surface)" : "transparent",
                  color: typeF === v ? "var(--ink)" : "var(--ink-3)",
                  boxShadow: typeF === v ? "var(--shadow-1)" : "none",
                  fontWeight: 500, padding: "6px 12px"
                }}>{l}</button>
              ))}
            </div>
            <button className="btn outline sm"><Ic.cal width={14}/> Mayo 2026</button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Miembro</th>
                  <th>Fondo</th>
                  <th style={{ textAlign: "right" }}>Monto</th>
                  <th>Estado</th>
                  <th className="col-actions"></th>
                </tr>
              </thead>
              <tbody>
                {filteredTx.map(t => {
                  const date = new Date(t.date);
                  return (
                    <tr key={t.id}>
                      <td>
                        <div className="tnum" style={{ fontSize: 13, fontWeight: 500 }}>
                          {date.getDate().toString().padStart(2,"0")} May
                        </div>
                        <div className="tiny muted">2026</div>
                      </td>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <span style={{
                            width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center",
                            background: t.type === "Ingreso" ? "var(--success-bg)" : "var(--danger-bg)",
                            color: t.type === "Ingreso" ? "var(--success)" : "var(--danger)"
                          }}>
                            {t.type === "Ingreso" ? <Ic.arrowUp width={16}/> : <Ic.arrowDn width={16}/>}
                          </span>
                          <div>
                            <div style={{ fontWeight: 500 }}>{t.desc}</div>
                            <div className="tiny muted">{t.type}</div>
                          </div>
                        </div>
                      </td>
                      <td className="muted">{t.member}</td>
                      <td><span className="chip">{t.fund}</span></td>
                      <td className="tnum mono" style={{ textAlign: "right", fontWeight: 600,
                        color: t.type === "Ingreso" ? "var(--success)" : "var(--danger)" }}>
                        {t.type === "Ingreso" ? "+" : "−"}{fmtRD(t.amount)}
                      </td>
                      <td>
                        <span className={`chip ${t.status === "Confirmado" ? "success" : "warn"}`}>
                          <span className="pip"/> {t.status}
                        </span>
                      </td>
                      <td className="col-actions">
                        <div className="row" style={{ gap: 4 }}>
                          <button className="btn ghost icon-only sm"><Ic.edit width={14}/></button>
                          <button className="btn ghost icon-only sm"><Ic.trash width={14}/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div style={{ padding: "14px 18px", borderTop: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="tiny muted">Mostrando {filteredTx.length} de {D.transactions.length} movimientos</div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn outline sm" disabled>← Anterior</button>
                <button className="btn outline sm">1</button>
                <button className="btn primary sm">2</button>
                <button className="btn outline sm">3</button>
                <button className="btn outline sm">Siguiente →</button>
              </div>
            </div>
          </div>
        </>
      )}

      {tab === "contribuciones" && (
        <div className="grid-12">
          <div className="card span-7">
            <div className="eyebrow">Top contribuyentes — Mayo 2026</div>
            <div className="display" style={{ fontSize: 26, marginTop: 4, marginBottom: 18 }}>Hermanos fieles</div>
            <div className="col" style={{ gap: 10 }}>
              {D.members.filter(m => m.given > 10000).sort((a,b)=>b.given-a.given).slice(0,8).map((m, i) => {
                const max = D.members.reduce((s,x)=>Math.max(s,x.given),0);
                return (
                  <div key={m.id} className="row" style={{ gap: 12, padding: "10px 12px", borderRadius: 10, background: i === 0 ? "linear-gradient(90deg, var(--accent-100), transparent 60%)" : "transparent" }}>
                    <div className="display" style={{ fontSize: 20, color: "var(--ink-4)", width: 24 }}>{(i+1).toString().padStart(2,"0")}</div>
                    <Avatar initials={m.initials} size="md"/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                      <div className="tiny muted">{m.role}</div>
                    </div>
                    <div style={{ flex: 1, maxWidth: 160 }}>
                      <div style={{ height: 6, background: "var(--surface-2)", borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ width: (m.given/max*100) + "%", height: "100%", background: "var(--primary)" }}/>
                      </div>
                    </div>
                    <div className="tnum mono" style={{ fontWeight: 600, minWidth: 110, textAlign: "right" }}>{fmtRD(m.given)}</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="card span-5">
            <div className="eyebrow">Distribución por fondo</div>
            <div className="display" style={{ fontSize: 26, marginTop: 4, marginBottom: 22 }}>Donde se invierte</div>
            <DonutChart/>
            <div className="col" style={{ gap: 10, marginTop: 18 }}>
              {[
                { label: "Fondo General", v: 845, color: "var(--primary)" },
                { label: "Construcción", v: 1284, color: "var(--accent)" },
                { label: "Misiones Haití", v: 158, color: "var(--success)" },
                { label: "Beneficencia", v: 92, color: "#A855F7" },
              ].map((s, i) => (
                <div key={i} className="row between" style={{ fontSize: 13 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: s.color }}/>
                    <span>{s.label}</span>
                  </div>
                  <span className="tnum mono muted">RD$ {s.v}K</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DonutChart() {
  const data = [
    { v: 845, color: "var(--primary)" },
    { v: 1284, color: "var(--accent)" },
    { v: 158, color: "var(--success)" },
    { v: 92, color: "#A855F7" },
  ];
  const total = data.reduce((s,d)=>s+d.v,0);
  const r = 70, R = 90;
  let angle = -Math.PI/2;
  const arcs = data.map((d, i) => {
    const sweep = (d.v/total) * Math.PI * 2;
    const a0 = angle, a1 = angle + sweep;
    angle = a1;
    const large = sweep > Math.PI ? 1 : 0;
    const x0 = 100 + R * Math.cos(a0), y0 = 100 + R * Math.sin(a0);
    const x1 = 100 + R * Math.cos(a1), y1 = 100 + R * Math.sin(a1);
    const x0i = 100 + r * Math.cos(a0), y0i = 100 + r * Math.sin(a0);
    const x1i = 100 + r * Math.cos(a1), y1i = 100 + r * Math.sin(a1);
    return <path key={i} d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x1i} ${y1i} A ${r} ${r} 0 ${large} 0 ${x0i} ${y0i} Z`} fill={d.color}/>;
  });
  return (
    <svg viewBox="0 0 200 200" style={{ width: 200, height: 200, margin: "0 auto", display: "block" }}>
      {arcs}
      <text x="100" y="92" textAnchor="middle" fontSize="11" fill="var(--ink-3)" fontWeight="600" letterSpacing="0.1em" textTransform="uppercase">TOTAL</text>
      <text x="100" y="118" textAnchor="middle" fontSize="22" fontFamily="var(--font-display)" fill="var(--ink)">RD$ 2.38M</text>
    </svg>
  );
}

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

window.FinanzasScreen = FinanzasScreen;
window.EventosScreen = EventosScreen;
