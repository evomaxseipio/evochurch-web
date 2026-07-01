/* global React, Ic, fmtRD, fmtRDshort, KPI, Avatar, BarChart, LineChart, Sparkline */
const { useState: useStateB, useMemo: useMemoB, useRef: useRefB, useEffect: useEffectB } = React;

// Enriquecimiento local de miembros (ministerio + nacionalidad)
const MEMBER_ENRICH = {
  1:  { ministerio: "Ministerio de Mujeres",    nacionalidad: "Dominicana"     },
  2:  { ministerio: "Ministerio de Jóvenes",    nacionalidad: "Venezolano"     },
  3:  { ministerio: "Ministerio de Adoración",  nacionalidad: "Dominicana"     },
  4:  { ministerio: "Ministerio de Finanzas",   nacionalidad: "Dominicano"     },
  5:  { ministerio: "—",                        nacionalidad: "Haitiana"       },
  6:  { ministerio: "Ministerio de Diáconos",   nacionalidad: "Dominicano"     },
  7:  { ministerio: "Escuela Dominical",        nacionalidad: "Colombiana"     },
  8:  { ministerio: "—",                        nacionalidad: "Dominicano"     },
  9:  { ministerio: "Ministerio de Intercesión",nacionalidad: "Venezolana"     },
  10: { ministerio: "Ministerio de Sonido",     nacionalidad: "Dominicano"     },
  11: { ministerio: "Ministerio de Adoración",  nacionalidad: "Estados Unidos" },
  12: { ministerio: "Ministerio de Jóvenes",    nacionalidad: "Haitiano"       },
};

// ============================================================
// MIEMBROS · LISTADO
// ============================================================
function MembersScreen({ onOpen, toast }) {
  const D = window.EVO_DATA;
  const [q, setQ] = useStateB("");
  const [statusF, setStatusF] = useStateB("all");
  const [drawerOpen, setDrawerOpen] = useStateB(false);
  const [page, setPage] = useStateB(1);
  const [pageSize, setPageSize] = useStateB(10);
  const [actionMenuFor, setActionMenuFor] = useStateB(null);

  const filtered = useMemoB(() => {
    return D.members.filter(m => {
      if (statusF !== "all" && m.status.toLowerCase() !== statusF) return false;
      if (q && !m.name.toLowerCase().includes(q.toLowerCase()) && !m.role.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [q, statusF]);

  // Reset to page 1 when filter changes
  useEffectB(() => { setPage(1); }, [q, statusF, pageSize]);

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const stats = {
    total: D.members.length,
    activos: D.members.filter(m => m.status === "Activo").length,
    inactivos: D.members.filter(m => m.status === "Inactivo").length,
    pendientes: D.members.filter(m => m.status === "Pendiente").length,
  };

  return (
    <div onClick={() => setActionMenuFor(null)}>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Comunidad</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Miembros <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>de la familia</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>{D.members.length.toLocaleString("es-DO")} hermanos registrados · {total} en la vista actual</p>
        </div>
        <div className="row">
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "Miembros_May2026.pdf descargado")}>
            <Ic.download width={16}/> PDF
          </button>
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "Miembros_May2026.xlsx descargado")}>
            <Ic.download width={16}/> Excel
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: 14, marginTop: 22 }}>

        {/* Feature card */}
        <div className="card" style={{ padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row between" style={{ alignItems: "center" }}>
            <div className="eyebrow">Total de miembros</div>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--accent-soft)", display: "grid", placeItems: "center", flexShrink: 0 }}>
              <Ic.users width={18} stroke="var(--accent)"/>
            </div>
          </div>
          <div className="row" style={{ alignItems: "center", gap: 14 }}>
            <div className="display" style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.03em", color: "var(--primary)" }}>
              {stats.total}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--success)" }}>▲ +24</span>
              <span className="tiny muted">vs mes anterior</span>
            </div>
          </div>
        </div>

        {/* Mini cards */}
        {[
          { l: "Miembros activos", v: stats.activos,    delta: "+12.4%", dir: "up", c: "var(--success)",    ic: "check" },
          { l: "Total de visitas", v: 47,               delta: "+8.2%",  dir: "up", c: "var(--info)",       ic: "pin"   },
          { l: "Inactivos",        v: stats.inactivos,  delta: "-3.1%",  dir: "dn", c: "var(--muted)",      ic: "x"     },
          { l: "Pendientes",       v: stats.pendientes, delta: "+2",     dir: "up", c: "var(--accent-600)", ic: "bell"  },
        ].map((s, i) => {
          const Icon = Ic[s.ic];
          return (
            <div key={i} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row between" style={{ alignItems: "center" }}>
                <div className="eyebrow">{s.l}</div>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: "color-mix(in oklab, " + s.c + " 16%, transparent)",
                  display: "grid", placeItems: "center", color: s.c
                }}>
                  <Icon width={16}/>
                </div>
              </div>
              <div className="row" style={{ alignItems: "center", gap: 12 }}>
                <div className="display" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", color: s.c }}>{s.v}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: s.dir === "up" ? "var(--success)" : "var(--danger)" }}>
                    {s.dir === "up" ? "▲" : "▼"} {s.delta}
                  </span>
                  <span className="tiny muted">vs anterior</span>
                </div>
              </div>
            </div>
          );
        })}

      </div>

      {/* Filter row */}
      <div className="card flat" style={{ marginTop: 18, padding: 14, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <Ic.search width={16} stroke="var(--ink-3)"/>
          <input placeholder="Buscar por nombre, rol o sector…" value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <div style={{ width: 1, height: 28, background: "var(--line)", flexShrink: 0 }}/>
        <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
          {[["all","Todos"],["activo","Activos"],["inactivo","Inactivos"],["pendiente","Pendientes"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusF(v)} className="btn sm" style={{
              background: statusF === v ? "var(--surface)" : "transparent",
              color: statusF === v ? "var(--ink)" : "var(--ink-3)",
              boxShadow: statusF === v ? "var(--shadow-1)" : "none",
              fontWeight: 500, padding: "6px 12px"
            }}>{l}</button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setDrawerOpen(true)}>
          <Ic.plus width={14}/> Nuevo miembro
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap" style={{ marginTop: 18, position: "relative" }}>
        <table className="table">
          <thead>
            <tr>
              <th style={{ width: 44 }}></th>
              <th>Miembro</th>
              <th>Rol</th>
              <th>Ministerio</th>
              <th>Sector</th>
              <th>Nacionalidad</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(m => (
              <tr key={m.id} onClick={() => onOpen?.(m)}>
                <td onClick={(e) => e.stopPropagation()}>
                  <MemberActionMenu
                    open={actionMenuFor === m.id}
                    onToggle={() => setActionMenuFor(actionMenuFor === m.id ? null : m.id)}
                    onClose={() => setActionMenuFor(null)}
                    member={m}
                    onOpen={onOpen}
                    toast={toast}
                  />
                </td>
                <td>
                  <div className="row" style={{ gap: 12 }}>
                    <Avatar initials={m.initials} size="md" square/>
                    <div>
                      <div style={{ fontWeight: 600 }}>{m.name}</div>
                      <div className="tiny muted">{m.phone}</div>
                    </div>
                  </div>
                </td>
                <td className="muted">{m.role}</td>
                <td className="muted">{m.ministerio || MEMBER_ENRICH[m.id]?.ministerio || "—"}</td>
                <td className="muted">{m.sector}</td>
                <td className="muted">{m.nacionalidad || MEMBER_ENRICH[m.id]?.nacionalidad || "—"}</td>
                <td>
                  <span className={`chip ${m.status === "Activo" ? "success" : m.status === "Inactivo" ? "" : "warn"}`}>
                    <span className="pip"/> {m.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pageRows.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "var(--ink-3)" }}>
            <div className="display" style={{ fontSize: 22 }}>Sin resultados</div>
            <div className="tiny muted">Intenta con otra búsqueda</div>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 0 && (
        <Pagination
          page={safePage}
          totalPages={totalPages}
          total={total}
          pageStart={pageStart}
          pageEnd={pageEnd}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={setPageSize}
          noun="miembros"
        />
      )}

      {drawerOpen && <MemberDrawer onClose={() => setDrawerOpen(false)} toast={toast}/>}
    </div>
  );
}

// ============================================================
// Action menu (popover) — replica del menú de la captura
// ============================================================
function MemberActionMenu({ open, onToggle, onClose, member, onOpen, toast }) {
  const ref = useRefB(null);

  useEffectB(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const menu = [
    { id: "edit",   label: "Editar miembro",   icon: <Ic.edit width={15}/>,     on: () => onOpen?.(member) },
    { id: "tithe",  label: "Agregar diezmo",   icon: <Ic.wallet width={15}/>,   on: () => toast?.("info", "Nuevo diezmo", `Registrando diezmo para ${member.name}`) },
    { id: "offer",  label: "Agregar ofrenda",  icon: <Ic.wallet width={15}/>,   on: () => toast?.("info", "Nueva ofrenda", `Registrando ofrenda para ${member.name}`) },
    { id: "msg",    label: "Enviar mensaje",   icon: <Ic.chat width={15}/>,     on: () => toast?.("info", "Mensaje", `Abriendo chat con ${member.name}`) },
    { id: "userapp",label: "Crear usuario app",icon: <Ic.users width={15}/>,    on: () => toast?.("success", "Invitación enviada", `${member.name} recibirá un correo para activar su cuenta`) },
    { id: "del",    label: "Eliminar",         icon: <Ic.trash width={15}/>,    danger: true, on: () => toast?.("error", "Confirmar eliminación", `Confirma desde el panel del miembro`) },
  ];

  return (
    <div style={{ position: "relative", display: "inline-block" }} ref={ref}>
      <button
        className="btn ghost icon-only sm"
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        title="Acciones"
      >
        <Ic.menu width={16}/>
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 30,
            minWidth: 200,
            background: "var(--bg-1)",
            border: "1px solid var(--line)",
            borderRadius: 10,
            boxShadow: "var(--shadow-3)",
            padding: 6,
            display: "flex", flexDirection: "column", gap: 1,
          }}
        >
          {menu.map((it, i) => (
            <React.Fragment key={it.id}>
              {i === menu.length - 1 && <div style={{ height: 1, background: "var(--line)", margin: "4px 4px" }}/>}
              <button
                onClick={() => { it.on(); onClose(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 7,
                  background: "transparent", border: 0,
                  color: it.danger ? "var(--danger)" : "var(--fg)",
                  fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                  cursor: "pointer", textAlign: "left",
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "var(--bg-2)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
              >
                <span style={{ width: 16, display: "inline-grid", placeItems: "center", color: it.danger ? "var(--danger)" : "var(--muted)" }}>{it.icon}</span>
                {it.label}
              </button>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Pagination
// ============================================================
function Pagination({ page, totalPages, total, pageStart, pageEnd, pageSize, onPage, onPageSize, noun = "registros", sizeOptions = [10, 15, 25, 50] }) {
  const pageButtons = useMemoB(() => {
    // Build a compact list with first, last, current ± 1, and ellipses
    const set = new Set([1, totalPages, page, page - 1, page + 1]);
    const list = [...set].filter(n => n >= 1 && n <= totalPages).sort((a, b) => a - b);
    const out = [];
    for (let i = 0; i < list.length; i++) {
      if (i > 0 && list[i] - list[i - 1] > 1) out.push("…");
      out.push(list[i]);
    }
    return out;
  }, [page, totalPages]);

  return (
    <div
      className="card flat"
      style={{
        marginTop: 14, padding: "10px 14px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, flexWrap: "wrap",
      }}
    >
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <span className="tiny muted">
          Mostrando <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{pageStart + 1}</b>
          {" – "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{pageEnd}</b>
          {" de "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{total.toLocaleString("es-DO")}</b>{" "}{noun}
        </span>
        <span style={{ width: 1, height: 18, background: "var(--line)" }}/>
        <label className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}>
          Filas
          <select
            className="select"
            style={{ padding: "4px 8px", width: "auto", fontSize: 12 }}
            value={pageSize}
            onChange={(e) => onPageSize(parseInt(e.target.value, 10))}
          >
            {sizeOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      <div className="row" style={{ gap: 4 }}>
        <button className="btn outline sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
          <span style={{ display: "inline-block", transform: "rotate(90deg)" }}><Ic.arrowDn width={12}/></span>
          Anterior
        </button>
        {pageButtons.map((b, i) => b === "…" ? (
          <span key={"e" + i} style={{ padding: "0 6px", color: "var(--dim)", fontFamily: "var(--font-mono)" }}>…</span>
        ) : (
          <button
            key={b}
            onClick={() => onPage(b)}
            className={"btn sm " + (b === page ? "primary" : "outline")}
            style={{ minWidth: 32, padding: "5px 0", fontFamily: "var(--font-mono)" }}
          >
            {b}
          </button>
        ))}
        <button className="btn outline sm" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
          Siguiente
          <span style={{ display: "inline-block", transform: "rotate(-90deg)" }}><Ic.arrowDn width={12}/></span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// Drawer · Nuevo miembro
// ============================================================
function MemberDrawer({ onClose, toast }) {
  const [form, setForm] = useStateB({
    nombre: "", apellido: "", apodo: "",
    fechaNac: "", genero: "Masculino", estadoCivil: "Soltero/a",
    nacionalidad: "Dominicano", tipoId: "Cédula", numeroId: "",
    calle: "", ciudad: "Santiago", provincia: "Santiago", pais: "Rep. Dominicana",
    telefono: "", celular: "", email: "",
  });

  const upd = (k, v) => setForm(s => ({ ...s, [k]: v }));
  const fullName = [form.nombre, form.apellido].filter(Boolean).join(" ");

  const sectionLabel = (text) => (
    <div style={{
      fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
      textTransform: "uppercase", color: "var(--primary)",
      marginBottom: 12, marginTop: 4,
    }}>{text}</div>
  );

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">Nuevo registro</div>
            <div className="display" style={{ fontSize: 24, marginTop: 2 }}>Agregar miembro</div>
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>

        <div className="drawer-body col gap-md">
          {/* Avatar preview */}
          <div className="row" style={{ gap: 14, alignItems: "center", padding: 16, background: "var(--primary-50)", borderRadius: 14 }}>
            <Avatar initials={fullName ? fullName.split(" ").map(s=>s[0]).slice(0,2).join("").toUpperCase() : "??"} size="lg" square/>
            <div>
              <div style={{ fontWeight: 600 }}>{fullName || "Nombre del nuevo miembro"}</div>
              <div className="tiny muted">El avatar se generará automáticamente</div>
            </div>
          </div>

          {/* ── INFORMACIÓN PERSONAL ── */}
          <SectionCard eyebrow="Datos personales" title="Información personal">
            <div className="mf-grid">
              <MF label="Nombre" req value={form.nombre} onChange={v=>upd("nombre",v)} placeholder="Juan"/>
              <MF label="Apellido" req value={form.apellido} onChange={v=>upd("apellido",v)} placeholder="Pérez"/>
              <MF label="Apodo" value={form.apodo} onChange={v=>upd("apodo",v)} placeholder="Juanito"/>
              <MF label="Fecha de nac." type="date" value={form.fechaNac} onChange={v=>upd("fechaNac",v)} placeholder="yyyy-MM-dd"/>
              <MF label="Género" type="select" value={form.genero} onChange={v=>upd("genero",v)}
                options={["Masculino","Femenino","Otro"]}/>
              <MF label="Estado civil" type="select" value={form.estadoCivil} onChange={v=>upd("estadoCivil",v)}
                options={["Soltero/a","Casado/a","Viudo/a","Divorciado/a"]}/>
              <MF label="Nacionalidad" type="select" value={form.nacionalidad} onChange={v=>upd("nacionalidad",v)}
                options={["Dominicano/a","Haitiano/a","Venezolano/a","Estados Unidos","Colombiano/a","Otro"]}/>
              <MF label="Tipo ID" type="select" value={form.tipoId} onChange={v=>upd("tipoId",v)}
                options={["Cédula","Pasaporte","Otro"]}/>
              <MF label="Número ID" value={form.numeroId} onChange={v=>upd("numeroId",v)} placeholder="000-0000000-0" span={2}/>
            </div>
          </SectionCard>

          {/* ── DIRECCIÓN ── */}
          <SectionCard eyebrow="Ubicación" title="Dirección">
            <div className="mf-grid">
              <MF label="Calle / Sector" value={form.calle} onChange={v=>upd("calle",v)} placeholder="Calle Principal #12" span={2}/>
              <MF label="Ciudad" value={form.ciudad} onChange={v=>upd("ciudad",v)} placeholder="Santiago"/>
              <MF label="Provincia" value={form.provincia} onChange={v=>upd("provincia",v)} placeholder="Santiago"/>
              <MF label="País" type="select" value={form.pais} onChange={v=>upd("pais",v)}
                options={["Rep. Dominicana","Estados Unidos","España","Puerto Rico","Otro"]} span={2}/>
            </div>
          </SectionCard>

          {/* ── CONTACTO ── */}
          <SectionCard eyebrow="Comunicación" title="Contacto">
            <div className="mf-grid">
              <MF label="Teléfono" req value={form.telefono} onChange={v=>upd("telefono",v)} placeholder="809-000-0000"/>
              <MF label="Celular" value={form.celular} onChange={v=>upd("celular",v)} placeholder="829-000-0000"/>
              <MF label="Email" type="email" value={form.email} onChange={v=>upd("email",v)} placeholder="juan@correo.com" span={2}/>
            </div>
          </SectionCard>
        </div>

        <div className="drawer-foot">
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={() => {
            if (!form.nombre || !form.apellido || !form.telefono) return;
            onClose();
            toast?.("success", "Miembro agregado", fullName + " ya forma parte de Renacer.");
          }}>
            <Ic.check width={16}/> Guardar miembro
          </button>
        </div>
      </div>

      <style>{`
        .mf-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
        }
        .mf-grid .field {
          min-width: 0;
        }
        .mf-grid .field .input-wrap {
          min-width: 0;
          width: 100%;
          box-sizing: border-box;
        }
        .mf-grid .field input,
        .mf-grid .field select {
          min-width: 0;
          width: 100%;
        }
        @media (max-width: 580px) {
          .mf-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </>
  );
}

/* Mini field helper for the member drawer */
function MF({ label, req, value, onChange, type = "text", options, placeholder, span = 1 }) {
  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      <label>
        {label}
        {req && <span style={{ color: "var(--danger)", marginLeft: 2 }}>*</span>}
      </label>
      <div className="input-wrap">
        {type === "select" ? (
          <select value={value} onChange={e => onChange(e.target.value)}>
            {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={value}
            placeholder={placeholder}
            onChange={e => onChange(e.target.value)}
          />
        )}
      </div>
    </div>
  );
}

// ============================================================
// MEMBER PROFILE — full-page con sidebar de tabs
// ============================================================
const PROFILE_TABS = [
  { id: "profile",    label: "Perfil",        icon: (p) => <Ic.users {...p}/>,    color: "var(--accent)" },
  { id: "membership", label: "Membresía",     icon: (p) => <Ic.cross {...p}/>,    color: "var(--lila)" },
  { id: "finances",   label: "Finanzas",      icon: (p) => <Ic.wallet {...p}/>,   color: "var(--green)" },
  { id: "delete",     label: "Eliminar cuenta", icon: (p) => <Ic.trash {...p}/>, color: "var(--danger)", isDanger: true },
];

function MemberProfile({ member, onClose, toast }) {
  const [tab, setTab] = useStateB("profile");
  const [mobileNavOpen, setMobileNavOpen] = useStateB(false);

  if (!member) return null;

  const active = PROFILE_TABS.find(t => t.id === tab) || PROFILE_TABS[0];

  return (
    <div data-screen-label={"profile-" + tab}>
      {/* Header strip */}
      <div className="row between" style={{ flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
        <div className="row" style={{ gap: 14, alignItems: "center" }}>
          <button className="btn outline sm" onClick={onClose}>
            <span style={{ display: "inline-block", transform: "rotate(90deg)" }}><Ic.arrowDn width={12}/></span>
            Volver al listado
          </button>
          <div style={{ width: 1, height: 28, background: "var(--line)" }}/>
          <Avatar initials={member.initials} size="lg" square/>
          <div>
            <div className="eyebrow">Perfil del miembro</div>
            <div className="display" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em", marginTop: 2 }}>
              {member.name}
            </div>
            <div className="row" style={{ gap: 8, marginTop: 6 }}>
              <span className={`chip ${member.status === "Activo" ? "success" : member.status === "Inactivo" ? "" : "warn"}`}>
                <span className="pip"/> {member.status}
              </span>
              <span className="chip">{member.role}</span>
              <span className="chip lila">Desde {member.joined}</span>
            </div>
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <button className="btn outline" onClick={() => window.print()}>
            <Ic.download width={14}/> Imprimir
          </button>
          <button className="btn primary" onClick={() => toast?.("success", "Cambios guardados", `${member.name} actualizado.`)}>
            <Ic.check width={16}/> Guardar cambios
          </button>
        </div>
      </div>

      {/* Mobile tab opener */}
      <div className="mobile-only" style={{ marginBottom: 12 }}>
        <button className="btn outline" onClick={() => setMobileNavOpen(true)} style={{ width: "100%" }}>
          <active.icon width={15}/> {active.label}
          <span style={{ flex: 1 }}/>
          <span className="tiny muted">Cambiar sección</span>
        </button>
      </div>

      {/* Two-panel layout */}
      <div className="profile-shell">
        {/* Sidebar */}
        <aside className="profile-aside">
          <div className="eyebrow" style={{ padding: "4px 6px 10px" }}>Cuenta del miembro</div>
          <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {PROFILE_TABS.filter(t => !t.isDanger).map(t => (
              <ProfileTabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)}/>
            ))}
            <div style={{ height: 1, background: "var(--line)", margin: "10px 6px" }}/>
            {PROFILE_TABS.filter(t => t.isDanger).map(t => (
              <ProfileTabBtn key={t.id} t={t} active={tab === t.id} onClick={() => setTab(t.id)}/>
            ))}
          </nav>

          <div style={{ marginTop: 18, padding: 12, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10 }}>
            <div className="eyebrow" style={{ fontSize: 10 }}>ID de miembro</div>
            <div className="mono" style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>#{String(member.id).padStart(5, "0")}</div>
            <div className="tiny muted" style={{ marginTop: 8 }}>
              <span className="mono">{member.sector}</span>
            </div>
          </div>
        </aside>

        {/* Mobile drawer for sidebar */}
        {mobileNavOpen && (
          <>
            <div className="drawer-backdrop" onClick={() => setMobileNavOpen(false)}/>
            <div className="drawer" style={{ width: 280 }}>
              <div className="drawer-head">
                <div className="display" style={{ fontSize: 18, flex: 1 }}>Cuenta del miembro</div>
                <button className="btn ghost icon-only" onClick={() => setMobileNavOpen(false)}><Ic.x width={18}/></button>
              </div>
              <div className="drawer-body">
                <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {PROFILE_TABS.map(t => (
                    <ProfileTabBtn key={t.id} t={t} active={tab === t.id} onClick={() => { setTab(t.id); setMobileNavOpen(false); }}/>
                  ))}
                </nav>
              </div>
            </div>
          </>
        )}

        {/* Content */}
        <div className="profile-main">
          {tab === "profile"    && <ProfileTab member={member} toast={toast}/>}
          {tab === "membership" && <MembershipTab member={member} toast={toast}/>}
          {tab === "finances"   && <FinancesTab member={member} toast={toast}/>}
          {tab === "delete"     && <DeleteAccountTab member={member} onClose={onClose} toast={toast}/>}
        </div>
      </div>

      <style>{`
        .profile-shell { display: grid; grid-template-columns: 240px 1fr; gap: 18px; align-items: start; }
        .profile-aside {
          position: sticky; top: 8px;
          background: var(--bg-1); border: 1px solid var(--line);
          border-radius: var(--radius-lg); padding: 12px;
        }
        .profile-main { min-width: 0; display: flex; flex-direction: column; gap: 16px; }
        .mobile-only { display: none; }
        @media (max-width: 900px) {
          .profile-shell { grid-template-columns: 1fr; }
          .profile-aside { display: none; }
          .mobile-only { display: block; }
        }
        .ptab {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 10px; border-radius: 8px;
          border: 0; background: transparent; cursor: pointer;
          color: var(--fg-dim); text-align: left;
          font-family: inherit; font-size: 13px; font-weight: 500;
          position: relative;
          transition: background 0.12s, color 0.12s;
        }
        .ptab:hover { background: var(--bg-2); color: var(--fg); }
        .ptab.active { background: var(--accent-soft); color: var(--accent); }
        .ptab.active::before {
          content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px;
          width: 2px; background: var(--accent); border-radius: 0 2px 2px 0;
        }
        .ptab.danger { color: var(--danger); }
        .ptab.danger:hover { background: color-mix(in oklab, var(--danger) 12%, transparent); color: var(--danger); }
        .ptab.danger.active { background: color-mix(in oklab, var(--danger) 14%, transparent); color: var(--danger); }
        .ptab.danger.active::before { background: var(--danger); }
        .ptab .pico { width: 18px; height: 18px; display: inline-grid; place-items: center; opacity: 0.9; }
      `}</style>
    </div>
  );
}

function ProfileTabBtn({ t, active, onClick }) {
  const cls = "ptab " + (active ? "active " : "") + (t.isDanger ? "danger" : "");
  return (
    <button className={cls} onClick={onClick}>
      <span className="pico"><t.icon width={15}/></span>
      <span style={{ flex: 1 }}>{t.label}</span>
    </button>
  );
}

// ----------------------------------------
// TAB · Profile (Personal / Address / Contact)
// ----------------------------------------
function ProfileTab({ member }) {
  const first = member.name.split(" ")[0];
  const last  = member.name.split(" ").slice(1).join(" ");
  return (
    <>
      <SectionCard
        eyebrow="Datos personales"
        title="Información personal"
        sub="Nombre legal, identificación y datos básicos del miembro."
      >
        <div className="form-grid">
          <Field label="Nombre" defaultValue={first}/>
          <Field label="Apellido" defaultValue={last}/>
          <Field label="Apodo" defaultValue={first}/>
          <Field label="Fecha de nacimiento" type="date" defaultValue="1989-09-15"/>
          <Field label="Género" type="select" options={["Masculino","Femenino","Otro"]} defaultValue="Femenino"/>
          <Field label="Estado civil" type="select" options={["Soltero/a","Casado/a","Viudo/a","Divorciado/a"]} defaultValue="Soltero/a"/>
          <Field label="Nacionalidad" defaultValue="Dominicana"/>
          <Field label="Tipo de identificación" type="select" options={["Cédula","Pasaporte","Otro"]} defaultValue="Cédula"/>
          <Field label="Número de identificación" defaultValue="402-1234567-8"/>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Dirección"
        title="Información de dirección"
      >
        <div className="form-grid">
          <Field label="Dirección" defaultValue={"Calle Principal 123, " + member.sector} span={2}/>
          <Field label="Provincia" defaultValue="San Pedro de Macorís"/>
          <Field label="Ciudad / Estado" defaultValue="San Pedro de Macorís"/>
          <Field label="País" type="select" options={["República Dominicana","Estados Unidos","España","Otro"]} defaultValue="República Dominicana"/>
          <Field label="Código postal" defaultValue="21000"/>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Contacto"
        title="Información de contacto"
      >
        <div className="form-grid">
          <Field label="Correo electrónico" type="email" defaultValue={first.toLowerCase() + "@renacer.do"}/>
          <Field label="Teléfono" defaultValue={member.phone}/>
          <Field label="Teléfono alterno" defaultValue=""/>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Pertenencia"
        title="Rol y estado en la iglesia"
        sub="Rol pastoral, área de servicio y estado de actividad del miembro."
      >
        <div className="form-grid">
          <Field label="Rol de membresía" type="select" options={["Miembro Regular","Diácono","Diaconisa","Líder de Jóvenes","Coro","Tesorero","Pastor"]} defaultValue={member.role}/>
          <Field label="Sector" defaultValue={member.sector}/>
          <div className="field" style={{ gridColumn: "span 1" }}>
            <label>Estado de la cuenta</label>
            <div className="row" style={{ gap: 8, padding: 4, background: "var(--bg-2)", border: "1px solid var(--line)", borderRadius: 10, width: "fit-content", marginTop: 4 }}>
              {["Activo","Pendiente","Inactivo"].map((s) => (
                <button key={s} className="btn sm" style={{
                  background: s === member.status ? "var(--bg-1)" : "transparent",
                  fontWeight: 500, padding: "6px 14px",
                  boxShadow: s === member.status ? "var(--shadow-1)" : "none",
                  color: s === member.status ? "var(--fg)" : "var(--muted)",
                  borderColor: s === member.status ? "var(--line-2)" : "transparent",
                }}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      </SectionCard>

      <FormGridStyles/>
    </>
  );
}

// ----------------------------------------
// TAB · Membership
// ----------------------------------------
function MembershipTab({ member }) {
  return (
    <>
      <SectionCard
        eyebrow="Sacramentos"
        title="Información de membresía"
        sub="Datos del bautismo y credenciales pastorales del miembro."
      >
        <div className="form-grid">
          <Field label="Fecha de bautismo" type="date" defaultValue="2020-01-14"/>
          <Field label="Iglesia de bautismo" defaultValue="Iglesia Fuente Inagotable"/>
          <Field label="Pastor que bautizó" defaultValue="Brigido Beras"/>
          <Field label="Rol de membresía" type="select" options={["Miembro Regular","Diácono","Diaconisa","Líder"]} defaultValue="Miembro Regular"/>
          <Field label="Ciudad del bautismo" defaultValue="San Pedro de Macorís"/>
          <Field label="País del bautismo" defaultValue="República Dominicana"/>

          <div className="field">
            <label>¿Bautizado(a) en el Espíritu?</label>
            <YesNoToggle defaultValue="yes"/>
          </div>
          <div className="field">
            <label>¿Tiene credencial?</label>
            <YesNoToggle defaultValue="no"/>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Trayectoria"
        title="Historial de membresía"
        action={<button className="btn primary sm"><Ic.plus width={14}/> Agregar evento</button>}
      >
        <ul style={{ listStyle: "none", padding: 0, margin: 0, position: "relative" }}>
          {[
            { date: "14 Ene 2020", title: "Bautismo en agua", sub: "Iglesia Fuente Inagotable · Pastor Brigido Beras", c: "var(--accent)", icon: <Ic.cross width={13}/> },
            { date: "06 Mar 2021", title: "Asignación como Diaconisa", sub: "Aprobado por liderazgo pastoral", c: "var(--lila)", icon: <Ic.users width={13}/> },
            { date: "12 Ago 2022", title: "Ingreso al Ministerio de Adoración", sub: "Integrada al equipo de coro", c: "var(--green)", icon: <Ic.pin width={13}/> },
            { date: "03 May 2026", title: "Renovación de credencial", sub: "Vigente por 2 años", c: "var(--warm)", icon: <Ic.check width={13}/> },
          ].map((e, i, arr) => (
            <li key={i} style={{ display: "flex", gap: 14, paddingBottom: i === arr.length - 1 ? 0 : 16, position: "relative" }}>
              {i < arr.length - 1 && (
                <span style={{
                  position: "absolute", left: 13, top: 28, bottom: -4,
                  width: 1, background: "var(--line)"
                }}/>
              )}
              <span style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: `color-mix(in oklab, ${e.c} 16%, transparent)`,
                color: e.c, display: "grid", placeItems: "center",
                border: `1px solid color-mix(in oklab, ${e.c} 32%, transparent)`,
              }}>{e.icon || <Ic.check width={13}/>}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{e.title}</span>
                  <span className="mono tiny muted">{e.date}</span>
                </div>
                <div className="tiny muted" style={{ marginTop: 2 }}>{e.sub}</div>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <FormGridStyles/>
    </>
  );
}

// ----------------------------------------
// TAB · Finances
// ----------------------------------------
function FinancesTab({ member, toast }) {
  // Generate some synthetic monthly data based on member.given
  const monthly = useMemoB(() => {
    const base = (member.given || 30000) / 12;
    const months = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return months.map((m, i) => ({
      label: m,
      tithe:   Math.round(base * (0.85 + 0.4 * Math.sin(i * 0.9 + member.id))),
      offer:   Math.round(base * 0.4 * (0.6 + Math.cos(i * 0.7 + member.id))),
      donation: i % 4 === 0 ? Math.round(base * 0.5) : 0,
    }));
  }, [member.id]);

  const sumTithe   = monthly.reduce((s, m) => s + m.tithe, 0);
  const sumOffer   = monthly.reduce((s, m) => s + m.offer, 0);
  const sumDon     = monthly.reduce((s, m) => s + m.donation, 0);
  const sumTotal   = sumTithe + sumOffer + sumDon;

  const txs = useMemoB(() => {
    const safeTypes = [
      { label: "Diezmo", color: "var(--accent)" },
      { label: "Ofrenda", color: "var(--green)" },
      { label: "Donación", color: "var(--lila)" },
    ];
    const list = [];
    for (let i = 0; i < 14; i++) {
      const t = safeTypes[i % 3];
      list.push({
        id: i,
        date: `${String(28 - i).padStart(2,"0")}/05/2026`,
        type: t.label, color: t.color,
        amount: Math.round((member.given || 30000) / 12 * (0.3 + (i % 5) * 0.2)),
        comment: ["Diezmo semanal","Ofrenda dominical","Apoyo misiones","Construcción templo","Diezmo mensual"][i % 5],
        via: ["Efectivo","Transferencia","Tarjeta","Efectivo","Transferencia"][i % 5],
      });
    }
    return list;
  }, [member.id]);

  const [page, setPage] = useStateB(1);
  const pageSize = 5;
  const totalPages = Math.max(1, Math.ceil(txs.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageRows = txs.slice(pageStart, pageStart + pageSize);

  return (
    <>
      {/* KPI hero */}
      <div className="grid-12">
        <FinanceKPI span="span-3" label="Diezmos"    value={sumTithe} domain="d-funds"  icon={<Ic.wallet width={15}/>}/>
        <FinanceKPI span="span-3" label="Ofrendas"   value={sumOffer} domain="d-income" icon={<Ic.check width={15}/>}/>
        <FinanceKPI span="span-3" label="Donaciones" value={sumDon}   domain="d-people" icon={<Ic.bell width={15}/>}/>
        <FinanceKPI span="span-3" label="Total año"  value={sumTotal} feature icon={<Ic.wallet width={15}/>}/>
      </div>

      {/* Chart */}
      <SectionCard
        eyebrow="Tendencia"
        title="Contribuciones mensuales"
        sub="Diezmos, ofrendas y donaciones registradas durante el año en curso."
      >
        <MiniStackChart data={monthly}/>
        <div className="row" style={{ gap: 16, marginTop: 12, flexWrap: "wrap" }}>
          <LegendDot color="var(--accent)" label="Diezmos"/>
          <LegendDot color="var(--green)"  label="Ofrendas"/>
          <LegendDot color="var(--lila)"   label="Donaciones"/>
        </div>
      </SectionCard>

      {/* Transactions */}
      <SectionCard
        eyebrow="Registros"
        title="Contribuciones del miembro"
        action={
          <div className="row" style={{ gap: 6 }}>
            <button className="btn outline sm" onClick={() => toast?.("success", "Reporte exportado", `Contribuciones_${member.name}.xlsx`)}>
              <Ic.download width={14}/> Exportar
            </button>
            <button className="btn outline sm" onClick={() => toast?.("info","Nuevo diezmo",`Registrando diezmo de ${member.name}`)}>
              <Ic.plus width={14}/> Diezmo
            </button>
            <button className="btn primary sm" onClick={() => toast?.("info","Nueva ofrenda",`Registrando ofrenda de ${member.name}`)}>
              <Ic.plus width={14}/> Ofrenda
            </button>
          </div>
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Fecha</th>
                <th>Monto</th>
                <th>Comentario</th>
                <th>Vía</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(t => (
                <tr key={t.id}>
                  <td>
                    <span className="row" style={{ gap: 10 }}>
                      <span style={{
                        width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                        background: `color-mix(in oklab, ${t.color} 16%, transparent)`,
                        color: t.color, display: "grid", placeItems: "center",
                      }}><Ic.wallet width={13}/></span>
                      <span style={{ fontWeight: 500 }}>{t.type}</span>
                    </span>
                  </td>
                  <td className="muted mono">{t.date}</td>
                  <td className="mono tnum" style={{ fontWeight: 600 }}>{fmtRD(t.amount)}</td>
                  <td className="muted">{t.comment}</td>
                  <td className="muted">{t.via}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="row between" style={{ marginTop: 12, flexWrap: "wrap", gap: 12 }}>
          <span className="tiny muted">
            Mostrando <b className="mono" style={{ color: "var(--fg)" }}>{pageStart + 1}</b>
            {" – "}<b className="mono" style={{ color: "var(--fg)" }}>{Math.min(pageStart + pageSize, txs.length)}</b>
            {" de "}<b className="mono" style={{ color: "var(--fg)" }}>{txs.length}</b>{" entradas"}
          </span>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn outline sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                className={"btn sm " + (i + 1 === page ? "primary" : "outline")}
                style={{ minWidth: 32, padding: "5px 0", fontFamily: "var(--font-mono)" }}
                onClick={() => setPage(i + 1)}
              >{i + 1}</button>
            ))}
            <button className="btn outline sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
          </div>
        </div>
      </SectionCard>
    </>
  );
}

function FinanceKPI({ span = "span-3", label, value, domain, feature, icon }) {
  return (
    <div className={`${span} kpi ${feature ? "feature" : domain || ""}`} style={{ minHeight: 110 }}>
      <div className="head">
        <span className="ic">{icon}</span>
      </div>
      <div className="label">{label}</div>
      <div className="val mono">{fmtRD(value)}</div>
    </div>
  );
}

function MiniStackChart({ data }) {
  const max = Math.max(...data.map(d => d.tithe + d.offer + d.donation), 1);
  const W = 640, H = 200, padL = 36, padR = 8, padT = 10, padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const barW = innerW / data.length * 0.55;
  const step = innerW / data.length;
  return (
    <div style={{ width: "100%", overflow: "hidden" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" style={{ display: "block" }}>
        {/* gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padT + innerH * (1 - p);
          return (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--line)" strokeDasharray={p === 0 ? "0" : "2 3"}/>
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize="9" fill="var(--muted)" fontFamily="var(--font-mono)">
                {Math.round(max * p / 1000) + "k"}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = padL + step * i + (step - barW) / 2;
          const h1 = innerH * (d.tithe / max);
          const h2 = innerH * (d.offer / max);
          const h3 = innerH * (d.donation / max);
          const y1 = padT + innerH - h1;
          const y2 = y1 - h2;
          const y3 = y2 - h3;
          return (
            <g key={i}>
              {h1 > 0 && <rect x={x} y={y1} width={barW} height={h1} fill="var(--accent)" rx="2"/>}
              {h2 > 0 && <rect x={x} y={y2} width={barW} height={h2} fill="var(--green)" rx="2"/>}
              {h3 > 0 && <rect x={x} y={y3} width={barW} height={h3} fill="var(--lila)" rx="2"/>}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)" fontFamily="var(--font-mono)">{d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="row" style={{ gap: 6, alignItems: "center" }}>
      <span style={{ width: 10, height: 10, borderRadius: 2, background: color }}/>
      <span className="tiny muted">{label}</span>
    </span>
  );
}

// ----------------------------------------
// TAB · Delete Account
// ----------------------------------------
function DeleteAccountTab({ member, onClose, toast }) {
  const [confirm, setConfirm] = useStateB("");
  const target = "ELIMINAR";
  const canDelete = confirm.trim().toUpperCase() === target;

  return (
    <>
      <SectionCard
        eyebrow="Zona de peligro"
        title="Eliminar cuenta del miembro"
        sub="Esta acción es irreversible. El miembro será removido de la lista junto con sus relaciones a ministerios."
      >
        <div style={{
          border: "1px solid color-mix(in oklab, var(--danger) 36%, transparent)",
          background: "color-mix(in oklab, var(--danger) 8%, transparent)",
          borderRadius: 12, padding: 16,
        }}>
          <div className="row" style={{ gap: 12, alignItems: "flex-start" }}>
            <span style={{
              width: 36, height: 36, borderRadius: 10, flexShrink: 0,
              background: "color-mix(in oklab, var(--danger) 18%, transparent)",
              color: "var(--danger)", display: "grid", placeItems: "center",
            }}><Ic.trash width={18}/></span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: "var(--danger)" }}>Eliminar a {member.name}</div>
              <div className="tiny muted" style={{ marginTop: 4, maxWidth: 540 }}>
                Se conservarán los registros financieros históricos, pero la cuenta del miembro
                quedará archivada. Las contribuciones pasadas seguirán contando en los reportes
                anuales de la iglesia, pero el miembro no podrá recibir nuevos diezmos ni mensajes.
              </div>
            </div>
          </div>

          <ul style={{ margin: "16px 0 0 56px", padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              "Se removerá del listado activo de miembros",
              "Se quitará de los ministerios donde participa",
              "Se cancelarán mensajes pendientes y recordatorios",
              "El historial financiero permanecerá en los reportes",
            ].map((t, i) => (
              <li key={i} className="row" style={{ gap: 8, fontSize: 12.5, color: "var(--fg-dim)" }}>
                <span style={{ width: 4, height: 4, borderRadius: 999, background: "var(--danger)" }}/>
                {t}
              </li>
            ))}
          </ul>

          <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px dashed color-mix(in oklab, var(--danger) 24%, transparent)" }}>
            <div className="field">
              <label style={{ color: "var(--fg-dim)" }}>
                Para confirmar, escribe <span className="mono" style={{ background: "var(--bg-2)", padding: "1px 6px", borderRadius: 4, color: "var(--danger)", fontWeight: 600 }}>{target}</span> en mayúsculas
              </label>
              <div className="input-wrap" style={{ borderColor: canDelete ? "var(--danger)" : "var(--line)" }}>
                <input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="ELIMINAR" autoCapitalize="characters"/>
              </div>
            </div>
            <div className="row" style={{ gap: 8, marginTop: 14 }}>
              <button className="btn outline" onClick={onClose}>Cancelar</button>
              <button
                className="btn"
                disabled={!canDelete}
                onClick={() => {
                  toast?.("error", "Miembro eliminado", `${member.name} fue removido del listado.`);
                  onClose?.();
                }}
                style={{
                  background: canDelete ? "var(--danger)" : "transparent",
                  borderColor: canDelete ? "transparent" : "color-mix(in oklab, var(--danger) 36%, transparent)",
                  color: canDelete ? "#fff" : "var(--danger)",
                }}
              >
                <Ic.trash width={14}/> Eliminar cuenta permanentemente
              </button>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Alternativa"
        title="¿Solo quieres archivar?"
        sub="Marcar al miembro como inactivo lo oculta de las vistas activas pero conserva toda la información."
      >
        <div className="row between" style={{ gap: 12, flexWrap: "wrap" }}>
          <div style={{ maxWidth: 520 }}>
            <div className="tiny muted">
              Recomendado cuando un miembro se muda, se traslada a otra iglesia o pausa su actividad
              temporalmente. Puedes reactivarlo en cualquier momento.
            </div>
          </div>
          <button className="btn outline" onClick={() => toast?.("info", "Miembro archivado", `${member.name} marcado como inactivo`)}>
            Archivar miembro
          </button>
        </div>
      </SectionCard>
    </>
  );
}

// ============================================================
// Helpers (compartidos)
// ============================================================
function SectionCard({ eyebrow, title, sub, action, children }) {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div style={{
        padding: "16px 18px",
        borderBottom: "1px solid var(--line)",
        display: "flex", alignItems: "flex-start", gap: 14, justifyContent: "space-between", flexWrap: "wrap",
      }}>
        <div style={{ minWidth: 0 }}>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <div style={{ fontSize: 15, fontWeight: 600, marginTop: 3, color: "var(--fg)" }}>{title}</div>
          {sub && <div className="tiny muted" style={{ marginTop: 4, maxWidth: 580 }}>{sub}</div>}
        </div>
        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}

function Field({ label, defaultValue = "", type = "text", options, span = 1 }) {
  return (
    <div className="field" style={{ gridColumn: `span ${span}` }}>
      <label>{label}</label>
      <div className="input-wrap">
        {type === "select" ? (
          <select defaultValue={defaultValue}>
            {(options || []).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} defaultValue={defaultValue}/>
        )}
      </div>
    </div>
  );
}

function YesNoToggle({ defaultValue = "no" }) {
  const [v, setV] = useStateB(defaultValue);
  return (
    <div className="row" style={{
      gap: 4, padding: 3, background: "var(--bg-2)",
      border: "1px solid var(--line)", borderRadius: 999,
      width: "fit-content", marginTop: 4,
    }}>
      {[["yes","Sí"],["no","No"]].map(([val, l]) => (
        <button
          key={val}
          onClick={() => setV(val)}
          className="btn xs"
          style={{
            borderRadius: 999, padding: "4px 14px", minWidth: 56,
            background: v === val ? (val === "yes" ? "var(--green)" : "var(--bg-3)") : "transparent",
            color: v === val ? (val === "yes" ? "#052113" : "var(--fg)") : "var(--muted)",
            borderColor: "transparent", fontWeight: 600,
          }}
        >
          {val === "yes" ? <Ic.check width={12}/> : <Ic.x width={12}/>}
          {l}
        </button>
      ))}
    </div>
  );
}

function FormGridStyles() {
  return (
    <style>{`
      .form-grid {
        display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px;
      }
      @media (max-width: 1100px) { .form-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (max-width: 700px)  { .form-grid { grid-template-columns: 1fr; } }
    `}</style>
  );
}

window.MembersScreen = MembersScreen;
window.MemberProfile = MemberProfile;
window.Pagination = Pagination;
