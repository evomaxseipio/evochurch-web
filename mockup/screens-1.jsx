/* global React, Ic, fmtRD, fmtRDshort, KPI, Avatar, BarChart, LineChart */
const { useState, useEffect, useRef, useMemo } = React;

// ============ LOGIN ============
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
        <div className="inner">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 56 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 60%, var(--green) 200%)",
              display: "grid", placeItems: "center",
              boxShadow: "0 8px 24px -8px color-mix(in oklab, var(--accent) 50%, transparent), inset 0 1px 0 rgba(255,255,255,0.2)"
            }}>
              <Ic.cross width={22} stroke="#fff"/>
            </div>
            <div>
              <div className="display" style={{ fontSize: 24, lineHeight: 1 }}>
                Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Church</em>
              </div>
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ink-3)", marginTop: 4 }}>
                Renacer · Santiago, RD
              </div>
            </div>
          </div>

          <h1 className="display" style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-0.025em", margin: 0, color: "var(--ink)" }}>
            Bendiciones,<br/><em style={{ fontStyle: "italic", color: "var(--primary)" }}>Pastor</em>.
          </h1>
          <p className="muted" style={{ marginTop: 12, marginBottom: 32, fontSize: 15 }}>
            Entra a tu cuenta para administrar la comunidad.
          </p>

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
              {loading ? <><div className="ring" style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff" }}/> Entrando…</> : "Entrar a EvoChurch"}
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
        {/* Decorative wave SVG */}
        <svg className="wave" style={{ top: 0, left: 0, right: 0, width: "100%", height: 280 }} viewBox="0 0 1000 280" preserveAspectRatio="none">
          <path d="M0,200 C200,100 400,260 600,150 C800,60 900,180 1000,120 L1000,0 L0,0 Z" fill="rgba(255,255,255,0.04)"/>
          <path d="M0,180 C150,250 350,80 550,170 C750,260 900,140 1000,200 L1000,0 L0,0 Z" fill="rgba(255,255,255,0.06)"/>
        </svg>
        <svg className="wave" style={{ bottom: 0, left: 0, right: 0, width: "100%", height: 320 }} viewBox="0 0 1000 320" preserveAspectRatio="none">
          <path d="M0,160 C200,80 400,220 600,140 C800,60 900,180 1000,100 L1000,320 L0,320 Z" fill="rgba(255,255,255,0.04)"/>
          <path d="M0,200 C150,260 350,120 550,190 C750,260 900,160 1000,220 L1000,320 L0,320 Z" fill="rgba(255,255,255,0.06)"/>
        </svg>

        <div style={{ position: "relative" }}>
          <div className="topline">EvoChurch · v2.4</div>
          <h1>Una sola plataforma para tu <em>ministerio</em>.</h1>
          <p className="sub">Miembros, finanzas, eventos y comunicación — diseñada para iglesias dominicanas que crecen.</p>
        </div>

        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 24 }}>
          <div className="verse">
            "Dios ama al dador alegre. Y poderoso es Dios para hacer que abunde en vosotros toda gracia."
          </div>
          <div className="verse-cite">— 2 Corintios 9:7-8</div>

          <div style={{ display: "flex", gap: 24, marginTop: 32, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.12)" }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1, color: "var(--glow)" }}>1,240+</div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginTop: 6 }}>Iglesias activas</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1, color: "var(--glow)" }}>RD$ 84M</div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginTop: 6 }}>Procesados/mes</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 26, lineHeight: 1, color: "var(--glow)" }}>4.9★</div>
              <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginTop: 6 }}>Calificación</div>
            </div>
          </div>
        </div>
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
    </div>
  );
}

window.LoginScreen = LoginScreen;
window.Dashboard = Dashboard;
