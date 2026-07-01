/* global React, Ic, fmtRD, fmtRDshort, KPI, Avatar, BarChart, LineChart */
const { useState, useEffect, useRef, useMemo } = React;

// ============ LOGIN ============
// Mini-preview del dashboard que flota en el panel derecho (estilo "screenshot")
function LoginPreview() {
  const stats = [
    { label: "Balance general", value: "RD$ 2.38M", delta: "+9.2%", up: true, c: "#7c5cf5" },
    { label: "Ingresos del mes", value: "RD$ 184K", delta: "+12.4%", up: true, c: "#10b981" },
    { label: "Miembros activos", value: "312", delta: "+8", up: true, c: "#a78bfa" },
  ];
  const rows = [
    { n: "Diezmo dominical", who: "Wilkin A.", amt: "+RD$ 12,500", ok: true },
    { n: "Ofrenda — construcción", who: "Francisco B.", amt: "+RD$ 25,000", ok: true },
    { n: "Pago electricidad", who: "EDENORTE", amt: "−RD$ 8,420", ok: false },
    { n: "Diezmo", who: "María P.", amt: "+RD$ 6,800", ok: true },
  ];
  const bars = [42, 55, 48, 67, 60, 78, 72, 90];

  return (
    <div className="login-preview">
      <div className="lp-card lp-main">
        <div className="lp-head">
          <div className="lp-dot-row"><span></span><span></span><span></span></div>
          <div className="lp-title">Panel de finanzas</div>
        </div>

        <div className="lp-stats">
          {stats.map((s, i) => (
            <div key={i} className="lp-stat">
              <div className="lp-stat-label">{s.label}</div>
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-delta" style={{ color: s.c }}>▲ {s.delta}</div>
            </div>
          ))}
        </div>

        <div className="lp-chart">
          <div className="lp-chart-head">
            <span className="lp-chart-title">Ingresos por semana</span>
            <span className="lp-chip">Mayo 2026</span>
          </div>
          <div className="lp-bars">
            {bars.map((h, i) => (
              <span key={i} style={{ height: h + "%", background: i === bars.length - 1 ? "#7c5cf5" : "#ddd6fe" }}></span>
            ))}
          </div>
        </div>

        <div className="lp-table">
          {rows.map((r, i) => (
            <div key={i} className="lp-row">
              <span className="lp-avatar">{r.who[0]}</span>
              <div className="lp-row-main">
                <div className="lp-row-name">{r.n}</div>
                <div className="lp-row-sub">{r.who}</div>
              </div>
              <div className="lp-amt" style={{ color: r.ok ? "#10b981" : "#f87171" }}>{r.amt}</div>
              <span className="lp-badge" style={{
                background: r.ok ? "rgba(16,185,129,0.12)" : "rgba(248,113,113,0.14)",
                color: r.ok ? "#10b981" : "#f87171" }}>{r.ok ? "Aprobado" : "Pendiente"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tarjeta flotante — dona de fondos */}
      <div className="lp-card lp-float">
        <div className="lp-float-label">Distribución de fondos</div>
        <svg viewBox="0 0 120 120" className="lp-donut">
          <circle cx="60" cy="60" r="46" fill="none" stroke="#ede9fe" strokeWidth="16"/>
          <circle cx="60" cy="60" r="46" fill="none" stroke="#7c5cf5" strokeWidth="16"
            strokeDasharray="289" strokeDashoffset="96" strokeLinecap="round" transform="rotate(-90 60 60)"/>
          <circle cx="60" cy="60" r="46" fill="none" stroke="#10b981" strokeWidth="16"
            strokeDasharray="289" strokeDashoffset="231" strokeLinecap="round" transform="rotate(150 60 60)"/>
        </svg>
        <div className="lp-float-foot">
          <div className="lp-float-big">RD$ 2.38M</div>
          <div className="lp-float-sub">8 fondos activos</div>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin, theme }) {
  const [email, setEmail] = useState("pastor@renacer.do");
  const [pw, setPw] = useState("••••••••");
  const [err, setErr] = useState({});
  const [loading, setLoading] = useState(false);

  const submit = (e) => {
    e?.preventDefault();
    const errs = {};
    if (!email.includes("@")) errs.email = "Email no válido";
    if (pw.length < 6) errs.pw = "Mínimo 6 caracteres";
    setErr(errs);
    if (Object.keys(errs).length) return;
    setLoading(true);
    setTimeout(() => { setLoading(false); onLogin(); }, 800);
  };

  return (
    <div className="login">
      <div className="formside">
        <div className="login-brand">
          <div className="login-mark">
            <Ic.cross width={20} stroke="#fff"/>
          </div>
          <div className="display" style={{ fontSize: 21, lineHeight: 1 }}>
            Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Church</em>
          </div>
        </div>

        <div className="inner">
          <div style={{ textAlign: "center", marginBottom: 30 }}>
            <h1 className="display" style={{ fontSize: 38, lineHeight: 1.08, letterSpacing: "-0.025em", margin: 0, color: "var(--ink)" }}>
              Bienvenido de nuevo
            </h1>
            <p className="muted" style={{ marginTop: 12, fontSize: 14.5 }}>
              Ingresa tu correo y contraseña para acceder a tu cuenta.
            </p>
          </div>

          <form onSubmit={submit} className="col" style={{ gap: 16 }}>
            <div className="field">
              <label>Correo electrónico</label>
              <div className={`input-wrap ${err.email ? "error" : ""}`}>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@iglesia.do"/>
              </div>
              {err.email && <div className="help error">{err.email}</div>}
            </div>
            <div className="field">
              <label>Contraseña</label>
              <div className={`input-wrap ${err.pw ? "error" : ""}`}>
                <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"/>
                <Ic.eye width={18} style={{ color: "var(--ink-4)", cursor: "pointer" }}/>
              </div>
              {err.pw && <div className="help error">{err.pw}</div>}
            </div>
            <div className="row between" style={{ marginTop: -4 }}>
              <label className="row" style={{ gap: 8, fontSize: 13, cursor: "pointer", color: "var(--ink-2)" }}>
                <input type="checkbox" defaultChecked style={{ accentColor: "var(--primary)"}}/>
                Recordarme
              </label>
              <a style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>¿Olvidaste tu clave?</a>
            </div>

            <button type="submit" className="btn primary lg" style={{ marginTop: 8 }}>
              {loading ? <><div className="ring" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff" }}/> Entrando…</> : "Iniciar sesión"}
            </button>

            <div className="row" style={{ gap: 12, alignItems: "center", margin: "10px 0" }}>
              <div style={{ flex: 1, height: 1, background: "var(--hairline)" }}/>
              <span className="tiny muted">o continúa con</span>
              <div style={{ flex: 1, height: 1, background: "var(--hairline)" }}/>
            </div>

            <div className="row" style={{ gap: 10 }}>
              <button type="button" className="btn outline" style={{ flex: 1 }}>
                <Ic.google width={16}/> Google
              </button>
              <button type="button" className="btn outline" style={{ flex: 1 }}>
                <Ic.apple width={16}/> Apple
              </button>
            </div>
          </form>

          <p className="tiny muted" style={{ marginTop: 32, textAlign: "center" }}>
            ¿Tu iglesia aún no usa EvoChurch? <a style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Solicita acceso</a>
          </p>
        </div>
      </div>

      <div className="visual">
        <span className="orb orb-1"></span>
        <span className="orb orb-2"></span>

        <div className="promo">
          <h1>Administra tu ministerio<br/>desde un solo lugar.</h1>
          <p className="sub">Inicia sesión para ver el panel de tu iglesia y gestionar miembros, finanzas y eventos.</p>
        </div>

        <LoginPreview/>
      </div>
    </div>
  );
}

// ============ DASHBOARD ============
function Dashboard({ kpiStyle, toast }) {
  const D = window.EVO_DATA;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";

  return (
    <div>
      {/* HERO greeting */}
      <div className="hero">
        <svg className="wave" style={{ bottom: -2, left: 0, right: 0, width: "100%", height: 80 }} viewBox="0 0 1000 80" preserveAspectRatio="none">
          <path d="M0,40 C200,80 400,0 600,40 C800,80 900,20 1000,50 L1000,80 L0,80 Z" fill="rgba(255,255,255,0.05)"/>
        </svg>
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)" }}>
            Domingo · 10 de Mayo, 2026
          </div>
          <h2>
            {greeting}, Pastor <em>Roberto</em>.<br/>
            <span style={{ color: "rgba(255,255,255,0.75)", fontSize: 26 }}>Que esta semana sea de cosecha.</span>
          </h2>
          <div className="meta-row">
            <div className="m">Asistencia este domingo<b>312 hermanos</b></div>
            <div className="m">Ofrenda del día<b>RD$ 89,420</b></div>
            <div className="m">Bautismos pendientes<b>7 candidatos</b></div>
          </div>
        </div>
        <div className="versecard">
          "Donde están dos o tres congregados en mi nombre, allí estoy yo en medio de ellos."
          <div className="cite">— Mateo 18:20</div>
        </div>
      </div>

      {/* KPI grid: feature card on left, three smaller right */}
      <div className="grid-12" style={{ marginTop: 24 }}>
        <div className="span-6">
          <KPI
            kind={kpiStyle}
            feature={kpiStyle === "gradient"}
            label="Total de Miembros"
            value="1,247"
            delta="+24 este mes"
            deltaDir="up"
            spark={[1180, 1192, 1201, 1215, 1218, 1230, 1240, 1247]}
          />
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Asistencia Dom." value="312" delta="+8.4%" deltaDir="up" spark={[268,282,295,304,288,318,312]}/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Ofrendas (mes)" value="458K" delta="+12.4%" deltaDir="up" spark={[380,520,410,395,425,458].map(v=>v)} accent="var(--accent)"/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Eventos próximos" value="7" delta="3 esta semana" deltaDir="up"/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Nuevos visitantes" value="18" delta="+6 vs sem pasada" deltaDir="up" spark={[8,11,12,10,14,16,18]}/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Diezmos cumplidos" value="74%" delta="-3%" deltaDir="dn" spark={[78,80,79,77,76,75,74]}/>
        </div>
        <div className="span-3">
          <KPI kind={kpiStyle} label="Bautismos del año" value="42" delta="+15 vs 2025" deltaDir="up" spark={[2,4,8,15,22,30,38,42]}/>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="card span-7">
          <div className="row between" style={{ marginBottom: 18 }}>
            <div>
              <div className="eyebrow">Asistencia semanal</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>Últimas 7 semanas</div>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost sm">Mes</button>
              <button className="btn outline sm">Trimestre</button>
              <button className="btn ghost sm">Año</button>
            </div>
          </div>
          <BarChart data={D.attendanceWeeks} valueKey="v" labelKey="w"/>
        </div>

        <div className="card span-5" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between">
            <div>
              <div className="eyebrow">Ofrendas mensuales</div>
              <div className="display" style={{ fontSize: 26, marginTop: 4 }}>RD$ 458,000</div>
              <span className="chip success" style={{ marginTop: 4 }}><span className="pip"/> +12.4% vs Abril</span>
            </div>
          </div>
          <LineChart data={D.givingMonths} valueKey="v" labelKey="m" height={180}/>
        </div>
      </div>

      {/* Activity + Próximos eventos + Accesos rápidos */}
      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="card span-5">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Actividad reciente</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>Lo que está pasando</div>
            </div>
            <a className="tiny" style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }}>Ver todo →</a>
          </div>
          <div className="col" style={{ gap: 14 }}>
            {D.activities.map((a, i) => (
              <div key={i} className="row" style={{ gap: 12, alignItems: "flex-start" }}>
                <Avatar initials={a.who.split(" ").map(s=>s[0]).slice(0,2).join("")} size="md"/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    <b>{a.who}</b> <span className="muted">{a.what}</span>
                    {a.amount !== "—" && <span style={{ color: "var(--ink)", fontWeight: 600 }}> · {a.amount}</span>}
                  </div>
                  <div className="tiny muted">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card span-4">
          <div className="row between" style={{ marginBottom: 14 }}>
            <div>
              <div className="eyebrow">Próximos eventos</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>Esta semana</div>
            </div>
            <button className="btn ghost icon-only sm"><Ic.plus width={16}/></button>
          </div>
          <div className="col" style={{ gap: 12 }}>
            {D.events.slice(0, 4).map(e => {
              const d = new Date(e.date);
              return (
                <div key={e.id} className="row" style={{ gap: 12, padding: 8, borderRadius: 12, background: "var(--surface-2)" }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 12,
                    background: e.type === "culto" ? "var(--primary-50)" : e.type === "estudio" ? "var(--accent-100)" : "#DCFCE7",
                    color: e.type === "culto" ? "var(--primary-600)" : e.type === "estudio" ? "var(--accent-600)" : "var(--success)",
                    display: "grid", placeItems: "center", flexShrink: 0
                  }}>
                    <div style={{ textAlign: "center", lineHeight: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>{["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"][d.getMonth()]}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 22, marginTop: 2 }}>{d.getDate()}</div>
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.title}</div>
                    <div className="tiny muted">{e.time} · {e.location}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card span-3">
          <div className="eyebrow">Accesos rápidos</div>
          <div className="col" style={{ gap: 8, marginTop: 14 }}>
            {[
              { ic: <Ic.plus width={18}/>, label: "Nuevo miembro", color: "var(--primary)" },
              { ic: <Ic.wallet width={18}/>, label: "Registrar ofrenda", color: "var(--accent-600)" },
              { ic: <Ic.cal width={18}/>, label: "Crear evento", color: "var(--success)" },
              { ic: <Ic.send width={18}/>, label: "Enviar anuncio", color: "var(--info)" },
              { ic: <Ic.download width={18}/>, label: "Exportar reporte", color: "var(--ink-2)" },
            ].map((q, i) => (
              <div key={i} onClick={() => toast?.("info", "Acción", q.label)} className="row" style={{
                gap: 10, padding: 10, borderRadius: 10, cursor: "pointer",
                border: "1px solid var(--hairline)", color: "var(--ink)"
              }}>
                <span style={{
                  width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center",
                  background: "var(--surface-2)", color: q.color
                }}>{q.ic}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{q.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top contribuyentes — reubicado desde Finanzas */}
      <div className="grid-12" style={{ marginTop: 18 }}>
        <div className="card span-12">
          <div className="row between" style={{ marginBottom: 16 }}>
            <div>
              <div className="eyebrow">Mayordomía · Mayo 2026</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4 }}>Top contribuyentes</div>
            </div>
            <a className="tiny" style={{ color: "var(--primary)", fontWeight: 600, cursor: "pointer" }} onClick={() => toast?.("info", "Finanzas", "Abre Contribuciones para el detalle")}>Ver contribuciones →</a>
          </div>
          <div className="grid-12" style={{ gap: 10 }}>
            {D.members.filter(m => m.given > 10000).sort((a,b)=>b.given-a.given).slice(0,8).map((m, i) => {
              const max = D.members.reduce((s,x)=>Math.max(s,x.given),0);
              return (
                <div key={m.id} className="span-6 row" style={{ gap: 12, padding: "10px 12px", borderRadius: 10, background: i === 0 ? "linear-gradient(90deg, var(--accent-100), transparent 60%)" : "var(--surface-2)" }}>
                  <div className="display" style={{ fontSize: 18, color: "var(--ink-4)", width: 24 }}>{(i+1).toString().padStart(2,"0")}</div>
                  <Avatar initials={m.initials} size="md"/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                    <div className="tiny muted">{m.role}</div>
                  </div>
                  <div style={{ width: 90 }}>
                    <div style={{ height: 6, background: "var(--surface)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: (m.given/max*100) + "%", height: "100%", background: "var(--primary)" }}/>
                    </div>
                  </div>
                  <div className="tnum mono" style={{ fontWeight: 600, minWidth: 100, textAlign: "right", fontSize: 13 }}>{fmtRD(m.given)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

window.LoginScreen = LoginScreen;
window.Dashboard = Dashboard;
