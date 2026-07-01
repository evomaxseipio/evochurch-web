/* global React, Ic, Avatar */
const { useState: useStateD } = React;

// ============ COMUNICACIÓN ============
function ComunicacionScreen({ toast }) {
  const D = window.EVO_DATA;
  const [tab, setTab] = useStateD("chat");
  const [activeChat, setActiveChat] = useStateD(2);
  const [draft, setDraft] = useStateD("");

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Conexión</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Comunicación <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>· entre hermanos</span>
          </h1>
        </div>
        <div className="row">
          <button className="btn outline"><Ic.bell width={16}/> Enviar a todos</button>
          <button className="btn primary"><Ic.plus width={16}/> Nuevo anuncio</button>
        </div>
      </div>

      <div className="tabs" style={{ marginTop: 22 }}>
        {[["chat","Chat interno"],["anuncios","Anuncios"],["notificaciones","Notificaciones"]].map(([v, l]) => (
          <div key={v} className={`tab ${tab === v ? "active" : ""}`} onClick={() => setTab(v)}>{l}</div>
        ))}
      </div>

      {tab === "chat" && (
        <div className="chat">
          <div className="chat-list">
            <div className="head">
              <div className="search" style={{ width: "100%" }}>
                <Ic.search width={14} stroke="var(--ink-3)"/>
                <input placeholder="Buscar conversaciones…"/>
              </div>
            </div>
            <div className="items">
              {D.conversations.map(c => (
                <div key={c.id} className={`item ${activeChat === c.id ? "active" : ""}`} onClick={() => setActiveChat(c.id)}>
                  <Avatar initials={c.group ? "##" : c.name.split(" ").map(s=>s[0]).slice(0,2).join("")} size="md"
                    color={c.group ? "linear-gradient(135deg, var(--green), var(--green-strong))" : undefined}/>
                  <div className="meta">
                    <div className="row between">
                      <span className="nm">{c.name}</span>
                      <span className="time">{c.time}</span>
                    </div>
                    <div className="row between">
                      <span className="pre">{c.lastMsg}</span>
                      {c.unread > 0 && <span className="unread">{c.unread}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="chat-pane">
            <div className="head">
              <Avatar initials="WA" size="md"/>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>Wilkin Almonte</div>
                <div className="tiny muted">Tesorero · en línea</div>
              </div>
              <button className="btn ghost icon-only"><Ic.more width={18}/></button>
            </div>
            <div className="body">
              <div style={{ textAlign: "center", margin: "8px 0 16px" }}>
                <span className="chip">Hoy · 8 de Mayo</span>
              </div>
              {D.messages.map((m, i) => (
                <div key={i} className={`bubble ${m.me ? "me" : "them"}`}>
                  {m.text}
                  <span className="time">{m.time} {m.me && <Ic.check width={12} style={{ verticalAlign: "middle" }}/>}</span>
                </div>
              ))}
              <div className="bubble them" style={{ background: "transparent", border: "0", padding: "4px 14px", color: "var(--ink-4)", fontSize: 12, fontStyle: "italic" }}>
                Wilkin está escribiendo…
              </div>
            </div>
            <div className="composer">
              <button className="btn ghost icon-only"><Ic.attach width={18}/></button>
              <input
                placeholder="Escribe un mensaje, pastor…"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && draft.trim()) { setDraft(""); toast?.("success","Enviado","Mensaje entregado a Wilkin"); } }}
              />
              <button className="btn primary icon-only" onClick={() => { if (draft.trim()) { setDraft(""); toast?.("success","Enviado","Mensaje entregado a Wilkin"); } }}>
                <Ic.send width={16}/>
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === "anuncios" && (
        <div className="grid-12">
          {D.announcements.map((a, i) => (
            <div key={i} className={`news-card span-${i === 0 ? 12 : 6}`} style={{
              padding: i === 0 ? 28 : 20,
              background: i === 0
                ? "linear-gradient(135deg, var(--primary-50), var(--surface))"
                : "var(--surface)"
            }}>
              <div className="row between">
                <span className="tag">{a.tag}</span>
                <span className="tiny muted">{a.date}</span>
              </div>
              <div className="ttl" style={{ fontSize: i === 0 ? 32 : 22 }}>{a.title}</div>
              <div className="body">{a.body}</div>
              <div className="foot">
                <div className="row" style={{ gap: 8 }}>
                  <Avatar initials={a.author.split(" ").map(s=>s[0]).slice(0,2).join("")} size="sm"/>
                  <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)" }}>{a.author}</span>
                </div>
                <div className="row" style={{ gap: 4 }}>
                  <button className="btn ghost icon-only sm"><Ic.edit width={14}/></button>
                  <button className="btn ghost sm">Compartir</button>
                </div>
              </div>
            </div>
          ))}

          <div className="card span-12" style={{
            border: "2px dashed var(--hairline-strong)",
            background: "transparent", padding: 32, textAlign: "center"
          }}>
            <div className="display" style={{ fontSize: 22, color: "var(--ink-3)" }}>¿Tienes algo que anunciar a la congregación?</div>
            <button className="btn primary" style={{ marginTop: 12 }}><Ic.plus width={14}/> Crear anuncio</button>
          </div>
        </div>
      )}

      {tab === "notificaciones" && (
        <div className="card" style={{ padding: 0 }}>
          {[
            { ic: <Ic.users width={16}/>, color: "var(--primary)", t: "Nuevo miembro registrado", body: "Carmen Rosario fue agregada por Wilkin Almonte", time: "hace 12 min" },
            { ic: <Ic.wallet width={16}/>, color: "var(--success)", t: "Diezmo recibido", body: "RD$ 25,000 — Ofrenda construcción", time: "hace 1 h" },
            { ic: <Ic.cal width={16}/>, color: "var(--accent-600)", t: "Recordatorio", body: "Estudio Bíblico mañana a las 7:00 PM", time: "hace 2 h" },
            { ic: <Ic.bell width={16}/>, color: "var(--warning)", t: "Atención requerida", body: "5 miembros con asistencia menor al 50%", time: "ayer" },
            { ic: <Ic.chat width={16}/>, color: "var(--info)", t: "Nuevos mensajes", body: "3 mensajes sin leer en Liderazgo Pastoral", time: "ayer" },
          ].map((n, i) => (
            <div key={i} className="row" style={{
              padding: "16px 22px", gap: 14,
              borderBottom: i < 4 ? "1px solid var(--hairline)" : "none",
              cursor: "pointer"
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
                background: "var(--surface-2)", color: n.color, flexShrink: 0
              }}>{n.ic}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{n.t}</div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{n.body}</div>
              </div>
              <div className="tiny muted">{n.time}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ CONFIGURACIÓN / PERFIL ============
function SettingsScreen({ theme, setTheme, toast }) {
  const [tab, setTab] = useStateD("perfil");
  const D = window.EVO_DATA;

  return (
    <div>
      <div>
        <div className="eyebrow">Cuenta</div>
        <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
          Configuración <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>y perfil</span>
        </h1>
      </div>

      <div className="grid-12" style={{ marginTop: 24 }}>
        {/* Side nav */}
        <div className="span-3">
          <div className="card" style={{ padding: 8 }}>
            {[
              ["perfil","Perfil",<Ic.users width={16}/>],
              ["apariencia","Apariencia",<Ic.moon width={16}/>],
              ["idioma","Idioma",<Ic.globe width={16}/>],
              ["roles","Roles y permisos",<Ic.settings width={16}/>],
              ["notif","Notificaciones",<Ic.bell width={16}/>],
            ].map(([v, l, ic]) => (
              <div key={v} onClick={() => setTab(v)} style={{
                padding: "10px 14px", borderRadius: 10, cursor: "pointer",
                background: tab === v ? "var(--primary-50)" : "transparent",
                color: tab === v ? "var(--primary-600)" : "var(--ink-2)",
                fontWeight: tab === v ? 600 : 500, fontSize: 14,
                display: "flex", alignItems: "center", gap: 10
              }}>{ic}{l}</div>
            ))}
          </div>
        </div>

        {/* Main panel */}
        <div className="span-9">
          {tab === "perfil" && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{
                padding: 32,
                background: "linear-gradient(135deg, var(--primary), var(--primary-500))",
                color: "#fff", borderRadius: "var(--radius-lg) var(--radius-lg) 0 0",
                position: "relative", overflow: "hidden"
              }}>
                <svg style={{ position: "absolute", top: 0, right: 0, width: 240, height: 200, opacity: 0.18 }} viewBox="0 0 200 200">
                  <circle cx="160" cy="40" r="80" fill="var(--glow)"/>
                </svg>
                <div className="row" style={{ gap: 20, position: "relative", alignItems: "center" }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: 24,
                    background: "linear-gradient(135deg, var(--lila), var(--accent))",
                    color: "#fff", display: "grid", placeItems: "center",
                    fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600,
                    boxShadow: "0 8px 24px -8px rgba(0,0,0,0.4)"
                  }}>RA</div>
                  <div>
                    <div className="display" style={{ fontSize: 32, lineHeight: 1.1 }}>Roberto <em style={{ fontStyle: "italic" }}>Almonte</em></div>
                    <div style={{ opacity: 0.85, marginTop: 4 }}>Pastor Principal · Renacer</div>
                    <div className="row" style={{ gap: 8, marginTop: 12 }}>
                      <span className="chip" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "0" }}>Admin</span>
                      <span className="chip" style={{ background: "rgba(255,255,255,0.2)", color: "#fff", border: "0" }}>Verificado</span>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ padding: 28 }}>
                <div className="grid-12" style={{ gap: 14 }}>
                  <div className="field span-6"><label>Nombre completo</label><div className="input-wrap"><input defaultValue="Roberto Almonte Tavárez"/></div></div>
                  <div className="field span-6"><label>Email</label><div className="input-wrap"><input defaultValue="pastor@renacer.do"/></div></div>
                  <div className="field span-6"><label>Teléfono</label><div className="input-wrap"><input defaultValue="(809) 555-0001"/></div></div>
                  <div className="field span-6"><label>Cargo</label><div className="input-wrap"><input defaultValue="Pastor Principal"/></div></div>
                  <div className="field span-12"><label>Biografía</label>
                    <div className="input-wrap" style={{ alignItems: "flex-start", padding: "10px 12px" }}>
                      <textarea rows={3} defaultValue="Sirviendo al Señor en Santiago de los Caballeros desde 2014. Esposo de Patricia, padre de tres."/>
                    </div>
                  </div>
                </div>
                <div className="row" style={{ marginTop: 20, justifyContent: "flex-end", gap: 10 }}>
                  <button className="btn outline">Cancelar</button>
                  <button className="btn primary" onClick={() => toast?.("success","Perfil actualizado","Tus cambios fueron guardados")}><Ic.check width={14}/> Guardar cambios</button>
                </div>
              </div>
            </div>
          )}

          {tab === "apariencia" && (
            <div className="col gap-md">
              <div className="card">
                <div className="eyebrow">Tema</div>
                <div className="display" style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}>Modo de visualización</div>
                <div className="grid-12" style={{ gap: 12 }}>
                  {[
                    { v: "light", l: "Claro", icon: <Ic.sun width={20}/>, bg: "linear-gradient(135deg, #FAFAF7, #FFFFFF)", border: "var(--hairline)" },
                    { v: "dark", l: "Oscuro", icon: <Ic.moon width={20}/>, bg: "linear-gradient(135deg, #07101F, #0E1B33)", border: "rgba(255,255,255,0.1)" },
                  ].map(t => (
                    <div key={t.v} onClick={() => setTheme(t.v)} className="span-6" style={{
                      padding: 18, borderRadius: 16, cursor: "pointer",
                      border: "2px solid " + (theme === t.v ? "var(--primary)" : "transparent"),
                      background: t.bg, color: t.v === "dark" ? "#fff" : "var(--ink)",
                      position: "relative"
                    }}>
                      <div className="row between">
                        <div className="row" style={{ gap: 10 }}>{t.icon}<span style={{ fontWeight: 600 }}>{t.l}</span></div>
                        {theme === t.v && <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--primary)", color: "#fff", display: "grid", placeItems: "center" }}><Ic.check width={14}/></span>}
                      </div>
                      <div style={{ marginTop: 12, height: 60, borderRadius: 8, border: "1px solid " + t.border, padding: 8, display: "flex", gap: 6 }}>
                        <div style={{ width: 24, background: "rgba(127,127,127,0.2)", borderRadius: 4 }}/>
                        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ height: 6, background: "rgba(127,127,127,0.3)", borderRadius: 3, width: "70%" }}/>
                          <div style={{ height: 6, background: "rgba(127,127,127,0.2)", borderRadius: 3, width: "50%" }}/>
                          <div style={{ marginTop: "auto", height: 8, background: "var(--primary)", borderRadius: 3, width: 40 }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === "idioma" && (
            <div className="card">
              <div className="eyebrow">Idioma</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}>Idioma de la aplicación</div>
              <div className="col" style={{ gap: 8 }}>
                {[
                  { c: "es-DO", n: "Español (República Dominicana)", flag: "🇩🇴", active: true },
                  { c: "es", n: "Español (Internacional)", flag: "🌎" },
                  { c: "en", n: "English", flag: "🇺🇸" },
                  { c: "ht", n: "Kreyòl Ayisyen", flag: "🇭🇹" },
                ].map(l => (
                  <div key={l.c} className="row between" style={{
                    padding: "14px 18px", borderRadius: 12,
                    border: "1px solid " + (l.active ? "var(--primary)" : "var(--hairline)"),
                    background: l.active ? "var(--primary-50)" : "transparent", cursor: "pointer"
                  }}>
                    <div className="row" style={{ gap: 12 }}>
                      <span style={{ fontSize: 22 }}>{l.flag}</span>
                      <span style={{ fontWeight: 500 }}>{l.n}</span>
                    </div>
                    {l.active && <Ic.check width={18} stroke="var(--primary)"/>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "roles" && (
            <div className="card">
              <div className="eyebrow">Permisos</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}>Roles del sistema</div>
              <table className="table" style={{ marginTop: 8 }}>
                <thead><tr><th>Rol</th><th>Miembros</th><th>Permisos clave</th><th></th></tr></thead>
                <tbody>
                  {[
                    { r: "Administrador", n: 2, p: "Acceso total", c: "var(--primary)" },
                    { r: "Pastor", n: 3, p: "Miembros, Eventos, Comunicación", c: "var(--accent-600)" },
                    { r: "Tesorero", n: 1, p: "Finanzas, Reportes", c: "var(--success)" },
                    { r: "Secretario", n: 4, p: "Miembros, Eventos", c: "var(--info)" },
                    { r: "Líder", n: 8, p: "Miembros (lectura), Eventos", c: "#A855F7" },
                    { r: "Miembro", n: 1230, p: "Solo lectura", c: "var(--ink-3)" },
                  ].map((r, i) => (
                    <tr key={i}>
                      <td>
                        <div className="row" style={{ gap: 10 }}>
                          <span style={{ width: 8, height: 24, background: r.c, borderRadius: 4 }}/>
                          <span style={{ fontWeight: 600 }}>{r.r}</span>
                        </div>
                      </td>
                      <td className="muted tnum">{r.n.toLocaleString()}</td>
                      <td className="muted tiny">{r.p}</td>
                      <td className="col-actions"><button className="btn ghost sm">Editar</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "notif" && (
            <div className="card">
              <div className="eyebrow">Preferencias</div>
              <div className="display" style={{ fontSize: 22, marginTop: 4, marginBottom: 18 }}>Notificaciones</div>
              <div className="col" style={{ gap: 4 }}>
                {[
                  ["Nuevos miembros", true],
                  ["Diezmos y ofrendas", true],
                  ["Recordatorios de eventos", true],
                  ["Mensajes directos", true],
                  ["Reportes semanales", false],
                  ["Notificaciones por email", true],
                  ["Notificaciones push (PWA)", true],
                ].map(([l, on], i) => (
                  <div key={i} className="row between" style={{ padding: "12px 4px", borderBottom: i < 6 ? "1px solid var(--hairline)" : "0" }}>
                    <span style={{ fontSize: 14 }}>{l}</span>
                    <Switch defaultOn={on}/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Switch({ defaultOn = false }) {
  const [on, setOn] = useStateD(defaultOn);
  return (
    <div onClick={() => setOn(!on)} style={{
      width: 40, height: 22, borderRadius: 999, padding: 2, cursor: "pointer",
      background: on ? "var(--primary)" : "var(--hairline-strong)",
      transition: "background 0.2s"
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 999, background: "#fff",
        transform: on ? "translateX(18px)" : "translateX(0)",
        transition: "transform 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)"
      }}/>
    </div>
  );
}

window.ComunicacionScreen = ComunicacionScreen;
window.SettingsScreen = SettingsScreen;
