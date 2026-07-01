/* global React, ReactDOM, Ic, Avatar, ToastHost, LoginScreen, Dashboard, MembersScreen, MemberProfile, FinanzasScreen, EventosScreen, ComunicacionScreen, SettingsScreen, MinisteriosScreen, UsuariosScreen, GastosScreen, TweaksPanel, useTweaks, TweakSection, TweakToggle, TweakRadio */
const { useState: useS, useEffect: useE, useRef: useR } = React;

const NAV = [
{ id: "dashboard", label: "Dashboard", icon: <Ic.home width={20} /> },
{ id: "miembros", label: "Miembros", icon: <Ic.users width={20} />, badge: "12" },
{ id: "ministerios", label: "Ministerios", icon: <Ic.pin width={20} /> },
{ id: "finanzas", label: "Finanzas", icon: <Ic.wallet width={20} /> },
{ id: "eventos", label: "Eventos", icon: <Ic.cal width={20} />, badge: "3" },
{ id: "comunicacion", label: "Comunicación", icon: <Ic.chat width={20} />, badge: "4" }];

const NAV_CONFIG = [
{ id: "usuarios", label: "Usuarios", icon: <Ic.users width={20} /> },
{ id: "gastos", label: "Tipos de gasto", icon: <Ic.wallet width={20} /> },
{ id: "settings", label: "Configuración", icon: <Ic.settings width={20} /> }];


function Sidebar({ current, onNav, collapsed }) {
  return (
    <aside className="sidebar" style={{ backgroundColor: "rgb(16, 19, 26)" }}>
      <div className="sidebar-logo">
        <div className="mark"><Ic.cross width={20} stroke="#fff" /></div>
        <div>
          <div className="name">Evo<em>Church</em></div>
          <div className="sub">Renacer · ICCR</div>
        </div>
      </div>

      <nav className="nav-section">
        <div className="nav-eyebrow">Principal</div>
        {NAV.map((n) =>
        <div key={n.id} className={`nav-item ${current === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}>
            <span className="icon">{n.icon}</span>
            <span className="label">{n.label}</span>
            {n.badge && <span className="badge">{n.badge}</span>}
          </div>
        )}
      </nav>

      <nav className="nav-section">
        <div className="nav-eyebrow">Configuración</div>
        {NAV_CONFIG.map((n) =>
        <div key={n.id} className={`nav-item ${current === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}>
            <span className="icon">{n.icon}</span>
            <span className="label">{n.label}</span>
          </div>
        )}
      </nav>

      <div className="sidebar-foot">
        <div className="user-chip">
          <div className="avatar">RA</div>
          <div className="meta">
            <div className="nm">Pastor Roberto</div>
            <div className="rl">Admin · Renacer</div>
          </div>
          <Ic.more width={16} stroke="rgba(255,255,255,0.5)" />
        </div>
      </div>
    </aside>);

}

function BottomNav({ current, onNav }) {
  const items = [
  NAV[0], NAV[1], NAV[3], NAV[5], NAV_CONFIG[2]];

  return (
    <nav className="bottom-nav">
      {items.map((n) =>
      <div key={n.id} className={`bn ${current === n.id ? "active" : ""}`} onClick={() => onNav(n.id)}>
          <span className="icon">{n.icon}</span>
          <span>{n.label}</span>
        </div>
      )}
    </nav>);

}

function Clock() {
  const [now, setNow] = useS(new Date());
  useE(() => {const t = setInterval(() => setNow(new Date()), 1000);return () => clearInterval(t);}, []);
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return <div className="clock"><span className="pip"></span>{hh}:{mm}:{ss}</div>;
}

function Topbar({ current, onMenu, theme, setTheme }) {
  const titles = {
    dashboard: ["Inicio", "Dashboard"],
    miembros: ["Comunidad", "Miembros"],
    ministerios: ["Comunidad", "Ministerios"],
    finanzas: ["Mayordomía", "Finanzas"],
    eventos: ["Agenda", "Eventos"],
    comunicacion: ["Conexión", "Comunicación"],
    usuarios: ["Configuración", "Usuarios admin"],
    gastos: ["Configuración", "Tipos de gasto"],
    settings: ["Cuenta", "Configuración"]
  };
  const [crumb, page] = titles[current] || ["", ""];

  return (
    <header className="topbar">
      <div className="topbar-mobile-logo">
        <div className="mark" />
        <div className="name">Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Church</em></div>
      </div>
      <div className="crumb" style={{ flex: 1 }}>
        <span>{crumb}</span> <span style={{ margin: "0 6px" }}>/</span> <b>{page}</b>
      </div>
      <div className="search">
        <Ic.search width={14} stroke="var(--muted)" />
        <input placeholder="Buscar miembros, transacciones, eventos…" />
        <kbd>⌘K</kbd>
      </div>
      <Clock />
      <button className="icon-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Cambiar tema">
        {theme === "dark" ? <Ic.sun width={18} /> : <Ic.moon width={18} />}
      </button>
      <button className="icon-btn" title="Notificaciones">
        <Ic.bell width={18} />
        <span className="dot" />
      </button>
    </header>);

}

// ============ Main App ============
function App() {
  const [authed, setAuthed] = useS(true); // start logged in for showcase
  const [route, setRoute] = useS("dashboard");
  const [theme, setThemeState] = useS("dark");
  const [openMember, setOpenMember] = useS(null);
  const [toasts, setToasts] = useS([]);

  // Tweaks
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "darkMode": true,
    "kpiStyle": "elevated"
  } /*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  // Apply theme: tweak panel takes over once user toggles, but topbar button also works
  useE(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // Sync tweak darkMode -> theme
  useE(() => {
    setThemeState(t.darkMode ? "dark" : "light");
  }, [t.darkMode]);

  const setTheme = (v) => {
    setThemeState(v);
    setTweak("darkMode", v === "dark");
  };

  const toast = (kind, title, msg) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, kind, title, msg }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  };

  if (!authed) return (
    <>
      <LoginScreen onLogin={() => {setAuthed(true);toast("success", "¡Bendiciones, Pastor Roberto!", "Sesión iniciada en Renacer.");}} theme={theme} />
      <ToastHost toasts={toasts} />
    </>);


  return (
    <>
      <div className="app-shell">
        <Sidebar current={route} onNav={(r) => {setRoute(r);setOpenMember(null);window.scrollTo(0, 0);}} />
        <main style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <Topbar current={route} theme={theme} setTheme={setTheme} />
          <div className="content">
            <div className="page" data-screen-label={openMember ? "profile" : route}>
              {openMember && (
                <MemberProfile member={openMember} onClose={() => setOpenMember(null)} toast={toast} />
              )}
              {!openMember && route === "dashboard" && <Dashboard kpiStyle={t.kpiStyle} toast={toast} />}
              {!openMember && route === "miembros" && <MembersScreen onOpen={setOpenMember} toast={toast} />}
              {!openMember && route === "ministerios" && <MinisteriosScreen toast={toast} />}
              {!openMember && route === "finanzas" && <FinanzasScreen kpiStyle={t.kpiStyle} toast={toast} />}
              {!openMember && route === "eventos" && <EventosScreen toast={toast} />}
              {!openMember && route === "comunicacion" && <ComunicacionScreen toast={toast} />}
              {!openMember && route === "usuarios" && <UsuariosScreen toast={toast} />}
              {!openMember && route === "gastos" && <GastosScreen toast={toast} />}
              {!openMember && route === "settings" && <SettingsScreen theme={theme} setTheme={setTheme} toast={toast} />}
            </div>
          </div>
        </main>
        <BottomNav current={route} onNav={setRoute} />
      </div>

      {openMember && null}
      <ToastHost toasts={toasts} />

      <TweaksPanel title="Tweaks" defaultPos={{ right: 16, bottom: 16 }}>
        <TweakSection title="Tema">
          <TweakToggle label="Modo oscuro" value={t.darkMode} onChange={(v) => setTweak("darkMode", v)} />
        </TweakSection>
        <TweakSection title="Tarjetas KPI">
          <TweakRadio
            label="Estilo"
            value={t.kpiStyle}
            options={[
            { value: "flat", label: "Plana" },
            { value: "elevated", label: "Elevada" },
            { value: "gradient", label: "Gradiente" }]
            }
            onChange={(v) => setTweak("kpiStyle", v)} />
          
        </TweakSection>
        <TweakSection title="Atajos">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {[
            ["dashboard", "Dashboard"],
            ["miembros", "Miembros"],
            ["ministerios", "Ministerios"],
            ["finanzas", "Finanzas"],
            ["eventos", "Eventos"],
            ["comunicacion", "Comunicación"],
            ["usuarios", "Usuarios admin"],
            ["gastos", "Tipos de gasto"],
            ["settings", "Configuración"]].
            map(([id, l]) =>
            <button key={id} onClick={() => setRoute(id)} style={{
              padding: "8px 10px", borderRadius: 8,
              background: route === id ? "var(--primary, #1E3A8A)" : "rgba(127,127,127,0.1)",
              color: route === id ? "#fff" : "inherit",
              border: 0, cursor: "pointer", textAlign: "left", fontSize: 13
            }}>{l}</button>
            )}
            <button onClick={() => setAuthed(false)} style={{
              padding: "8px 10px", borderRadius: 8, marginTop: 6,
              background: "rgba(127,127,127,0.1)", border: 0, cursor: "pointer", fontSize: 13
            }}>Ver pantalla de Login</button>
          </div>
        </TweakSection>
      </TweaksPanel>
    </>);

}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);