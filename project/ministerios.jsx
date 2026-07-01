/* global React, Ic, Avatar, fmtRD, ConfirmDialog, CrudSwitch, Pagination */
/**
 * ministerios.jsx — Módulo de Ministerios.
 *
 * - MinisteriosList: toolbar (búsqueda, filtros, toggle cuadrícula/lista),
 *   vista grid con cards y vista tabla, menú popup por ministerio
 *   (Editar · Ver miembros · Asignar líder · Ver eventos · Eliminar).
 * - MinisteriosScreen: wrapper con encabezado de sección.
 *
 * Sin KPIs. Los miembros se muestran como stacks de avatares con iniciales.
 */

const { useState: useStateMin, useEffect: useEffectMin } = React;

// ============ Helpers ============
const MIN_MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function fmtMinDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return `${String(d).padStart(2,"0")} ${MIN_MES[m-1]} ${y}`;
}

const MIN_COLOR_MAP = {
  lila:   "var(--lila)",
  violet: "var(--accent)",
  green:  "var(--success)",
};
const colorVar = (c) => MIN_COLOR_MAP[c] || "var(--accent)";

// ============ MenuItem (igual que en fondos) ============
function MinMenuItem({ icon, label, onClick, accent, danger }) {
  const [hov, setHov] = useStateMin(false);
  const col  = danger ? "var(--danger)" : accent ? "var(--accent)" : "var(--fg)";
  const bg   = danger
    ? "color-mix(in oklab, var(--danger) 12%, transparent)"
    : accent ? "var(--accent-soft)" : "var(--bg-2)";
  return (
    <button role="menuitem"
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={onClick}
      style={{ display:"flex", alignItems:"center", gap:10, width:"100%",
        padding:"8px 10px", borderRadius:8, border:0, cursor:"pointer",
        font:"inherit", fontSize:13, fontWeight:500, color:col,
        background: hov ? bg : "transparent", transition:"background 0.1s" }}>
      <span style={{ display:"grid", placeItems:"center", color:col }}>{icon}</span>
      {label}
    </button>
  );
}

// ============ Menú popup por ministerio ============
function MinActionMenu({ item, onEdit, onViewMembers, onAssignLeader, onViewEvents, onDelete }) {
  const [open, setOpen] = useStateMin(false);
  const [pos,  setPos]  = useStateMin({ top:0, bottom:"auto", left:0, right:"auto" });
  const btnRef          = React.useRef(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r      = btnRef.current.getBoundingClientRect();
      const menuW  = 210;
      const menuH  = 44 * 5;
      const below  = window.innerHeight - r.bottom;
      const toLeft = window.innerWidth  - r.left;
      setPos({
        top:    below  < menuH + 16 ? "auto"                          : r.bottom + 6,
        bottom: below  < menuH + 16 ? window.innerHeight - r.top + 6  : "auto",
        left:   toLeft < menuW + 8  ? "auto"                          : r.left,
        right:  toLeft < menuW + 8  ? window.innerWidth - r.right      : "auto",
      });
    }
    setOpen(o => !o);
  };

  const close = () => setOpen(false);

  return (
    <div style={{ display:"inline-block" }}>
      <button ref={btnRef} className="btn ghost icon-only sm"
        title="Acciones" style={{ opacity:1 }} onClick={handleToggle}>
        <Ic.menu width={16}/>
      </button>
      {open && (
        <>
          <div onClick={close} style={{ position:"fixed", inset:0, zIndex:200 }}/>
          <div role="menu" style={{
            position:"fixed",
            top:    pos.top,    bottom: pos.bottom,
            left:   pos.left,   right:  pos.right,
            zIndex:201, minWidth:210, padding:6, textAlign:"left",
            background:"var(--bg-1)", border:"1px solid var(--line)",
            borderRadius:12, boxShadow:"var(--shadow-3)"
          }}>
            <MinMenuItem icon={<Ic.edit  width={15}/>} label="Editar"        onClick={() => { close(); onEdit(item); }}/>
            <MinMenuItem icon={<Ic.users width={15}/>} label="Ver miembros"  onClick={() => { close(); onViewMembers(item); }}/>
            <MinMenuItem icon={<Ic.star  width={15}/>} label="Asignar líder" accent onClick={() => { close(); onAssignLeader(item); }}/>
            <MinMenuItem icon={<Ic.cal   width={15}/>} label="Ver eventos"   onClick={() => { close(); onViewEvents(item); }}/>
            <div style={{ height:1, background:"var(--line)", margin:"4px 6px" }}/>
            <MinMenuItem icon={<Ic.trash width={15}/>} label="Eliminar"      danger onClick={() => { close(); onDelete(item); }}/>
          </div>
        </>
      )}
    </div>
  );
}

// ============ Stack de avatares de miembros ============
function MemberAvatarStack({ memberIds, members, max = 4 }) {
  const ids     = memberIds || [];
  const visible = ids.slice(0, max);
  const extra   = ids.length - max;
  if (ids.length === 0) {
    return <span className="muted tiny">Sin miembros</span>;
  }
  return (
    <div style={{ display:"flex", alignItems:"center" }}>
      {visible.map((id, i) => {
        const m = members.find(x => x.id === id);
        if (!m) return null;
        const initials = m.initials || m.name.split(" ").map(s => s[0]).slice(0,2).join("");
        return (
          <span key={id} title={m.name}
            style={{ marginLeft: i === 0 ? 0 : -8, zIndex: max - i, position:"relative" }}>
            <Avatar initials={initials} size="sm"/>
          </span>
        );
      })}
      {extra > 0 && (
        <span className="chip" style={{ marginLeft:4, fontSize:11, padding:"2px 7px" }}>
          +{extra}
        </span>
      )}
    </div>
  );
}

// ============ Color icon (monograma) ============
function MinIcon({ name, color, size = 36, radius = 10, fontSize = 13 }) {
  return (
    <span style={{
      width:size, height:size, borderRadius:radius, flexShrink:0,
      background:`color-mix(in oklab, ${color} 18%, transparent)`,
      color, display:"grid", placeItems:"center",
      fontWeight:700, fontSize, fontFamily:"var(--font-mono)", letterSpacing:"-0.02em"
    }}>
      {name.slice(0,2).toUpperCase()}
    </span>
  );
}

// ============ Badges ============
function EstadoBadge({ active }) {
  return (
    <span className={`chip ${active ? "success" : ""}`}
      style={!active ? { color:"var(--ink-3)" } : undefined}>
      <span className="pip"/> {active ? "Activo" : "Inactivo"}
    </span>
  );
}
function DestacadoBadge() {
  return (
    <span className="chip violet" style={{ fontWeight:600 }}>
      <Ic.star width={11}/> Destacado
    </span>
  );
}

// ============ Member combobox (click-to-open, filtrable, multi-select) ============
function MemberCombobox({ selectedIds, members, onChange }) {
  const [open, setOpen] = useStateMin(false);
  const [q,    setQ]    = useStateMin("");
  const inputRef        = React.useRef(null);

  const filtered = q.trim()
    ? members.filter(m =>
        m.name.toLowerCase().includes(q.toLowerCase()) ||
        m.role.toLowerCase().includes(q.toLowerCase()))
    : members;

  const toggle = (id) => onChange(
    selectedIds.includes(id)
      ? selectedIds.filter(x => x !== id)
      : [...selectedIds, id]
  );

  const selected = members.filter(m => selectedIds.includes(m.id));

  return (
    <div style={{ position:"relative" }}>
      {selected.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:8 }}>
          {selected.map(m => {
            const initials = m.initials || m.name.split(" ").map(s=>s[0]).slice(0,2).join("");
            return (
              <span key={m.id} style={{
                display:"flex", alignItems:"center", gap:5,
                padding:"2px 8px 2px 3px", borderRadius:999,
                background:"var(--accent-soft)",
                border:"1px solid color-mix(in oklab, var(--accent) 30%, transparent)",
                fontSize:12, fontWeight:500, color:"var(--accent)"
              }}>
                <Avatar initials={initials} size="sm"/>
                <span style={{ marginLeft:2 }}>{m.name.split(" ")[0]}</span>
                <span onClick={e => { e.stopPropagation(); toggle(m.id); }}
                  style={{ marginLeft:4, cursor:"pointer", opacity:0.6, fontSize:15, lineHeight:1 }}>×</span>
              </span>
            );
          })}
        </div>
      )}
      <div className="input-wrap" style={{ cursor:"text" }}
        onClick={() => { setOpen(true); inputRef.current?.focus(); }}>
        <Ic.search width={14} stroke="var(--ink-3)"/>
        <input ref={inputRef}
          placeholder={selected.length === 0
            ? "Buscar miembros…"
            : `${selected.length} seleccionado${selected.length !== 1 ? "s" : ""} · buscar más…`}
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ flex:1, background:"transparent", border:0, outline:0,
            color:"inherit", font:"inherit", fontSize:13 }}/>
        <Ic.arrowDn width={14} stroke="var(--ink-3)"/>
      </div>
      {open && (
        <>
          <div onClick={() => { setOpen(false); setQ(""); }}
            style={{ position:"fixed", inset:0, zIndex:50 }}/>
          <div style={{
            position:"absolute", top:"calc(100% + 4px)", left:0, right:0, zIndex:51,
            background:"var(--bg-1)", border:"1px solid var(--line)",
            borderRadius:10, boxShadow:"var(--shadow-3)",
            maxHeight:220, overflowY:"auto"
          }}>
            {filtered.map((m, i) => {
              const sel      = selectedIds.includes(m.id);
              const initials = m.initials || m.name.split(" ").map(s=>s[0]).slice(0,2).join("");
              return (
                <div key={m.id}
                  onClick={e => { e.stopPropagation(); toggle(m.id); }}
                  style={{
                    display:"flex", alignItems:"center", gap:10,
                    padding:"9px 12px", cursor:"pointer",
                    background: sel ? "var(--accent-soft)" : "transparent",
                    borderBottom: i < filtered.length - 1 ? "1px solid var(--hairline)" : "none",
                    transition:"background 0.1s"
                  }}>
                  <Avatar initials={initials} size="sm"/>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight: sel ? 600 : 500 }}>{m.name}</div>
                    <div className="tiny muted">{m.role}</div>
                  </div>
                  {sel && <Ic.check width={14} stroke="var(--accent)"/>}
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div style={{ padding:"20px 12px", textAlign:"center" }} className="muted tiny">
                Sin resultados
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============ Drawer de creación / edición ============
function MinForm({ mode, item, members, onSave, onClose }) {
  const [v, setV] = useStateMin({
    name:        item?.name        || "",
    description: item?.description || "",
    leader:      item?.leader      || "",
    memberIds:   item?.memberIds   ? [...item.memberIds] : [],
    color:       item?.color       || "violet",
    active:      item?.active      ?? true,
    featured:    item?.featured    ?? false,
  });
  const [errs, setErrs] = useStateMin({});
  const upd = (k, val) => setV(s => ({ ...s, [k]: val }));

  const submit = () => {
    const e = {};
    if (!v.name.trim())  e.name   = "Obligatorio";
    if (!v.leader)       e.leader = "Selecciona un líder";
    setErrs(e);
    if (Object.keys(e).length) return;
    onSave({
      name:        v.name.trim(),
      description: v.description.trim(),
      leader:      v.leader,
      memberIds:   v.memberIds,
      color:       v.color,
      active:      v.active,
      featured:    v.featured,
    });
  };

  const COLOR_OPTS = [
    { value:"violet", label:"Morado", css:"var(--accent)"  },
    { value:"lila",   label:"Lila",   css:"var(--lila)"    },
    { value:"green",  label:"Verde",  css:"var(--success)" },
  ];

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex:1 }}>
            <div className="eyebrow">{mode === "new" ? "Nuevo registro" : "Edición"}</div>
            <h2 style={{ margin:"4px 0 0", fontSize:18 }}>
              {mode === "new" ? "Nuevo ministerio" : "Editar ministerio"}
            </h2>
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>

        <div className="drawer-body col gap-md">

          {/* Nombre */}
          <div className="field">
            <label>Nombre del ministerio <span style={{ color:"var(--danger)" }}>*</span></label>
            <div className={`input-wrap${errs.name ? " error" : ""}`}>
              <input value={v.name} placeholder="Ej. Alabanza y Adoración"
                onChange={e => upd("name", e.target.value)}/>
            </div>
            {errs.name && <div className="help error">{errs.name}</div>}
          </div>

          {/* Descripción */}
          <div className="field">
            <label>Descripción</label>
            <div className="input-wrap" style={{ alignItems:"flex-start", padding:"10px 12px" }}>
              <textarea rows={3} value={v.description}
                placeholder="Propósito y alcance del ministerio…"
                onChange={e => upd("description", e.target.value)}/>
            </div>
          </div>

          {/* Líder */}
          <div className="field">
            <label>Líder <span style={{ color:"var(--danger)" }}>*</span></label>
            <div className={`input-wrap${errs.leader ? " error" : ""}`}>
              <select value={v.leader} onChange={e => upd("leader", e.target.value)}>
                <option value="">Selecciona un líder…</option>
                {members.map(m => (
                  <option key={m.id} value={m.name}>{m.name} · {m.role}</option>
                ))}
              </select>
            </div>
            {errs.leader && <div className="help error">{errs.leader}</div>}
          </div>

          {/* Miembros — combobox con búsqueda */}
          <div className="field">
            <label>Miembros del ministerio</label>
            <MemberCombobox
              selectedIds={v.memberIds}
              members={members}
              onChange={ids => upd("memberIds", ids)}
            />
          </div>

          {/* Color */}
          <div className="field">
            <label>Color identificador</label>
            <div style={{ display:"flex", gap:8, marginTop:6 }}>
              {COLOR_OPTS.map(c => (
                <div key={c.value} onClick={() => upd("color", c.value)}
                  style={{ display:"flex", alignItems:"center", gap:8, flex:1,
                    padding:"8px 12px", borderRadius:8, cursor:"pointer",
                    border:`2px solid ${v.color === c.value ? c.css : "var(--hairline)"}`,
                    background: v.color === c.value
                      ? `color-mix(in oklab, ${c.css} 12%, transparent)` : "transparent",
                    transition:"all 0.15s" }}>
                  <span style={{ width:11, height:11, borderRadius:999,
                    background:c.css, flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:500 }}>{c.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activo */}
          <div className="row between"
            style={{ padding:"10px 0", borderTop:"1px solid var(--line)" }}>
            <div>
              <div style={{ fontWeight:500, fontSize:13 }}>Ministerio activo</div>
              <div className="tiny muted">Si está inactivo, queda archivado sin eliminarse.</div>
            </div>
            <CrudSwitch on={v.active} onChange={val => upd("active", val)}/>
          </div>

          {/* Destacado */}
          <div className="row between"
            style={{ padding:"10px 0", borderTop:"1px solid var(--line)" }}>
            <div>
              <div style={{ fontWeight:500, fontSize:13 }}>Destacado</div>
              <div className="tiny muted">Aparece primero en el listado.</div>
            </div>
            <CrudSwitch on={v.featured} onChange={val => upd("featured", val)}/>
          </div>

        </div>

        <div className="drawer-foot">
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={submit}>
            <Ic.check width={14}/>{" "}
            {mode === "new" ? "Crear ministerio" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

// ============ Lista principal ============
function MinisteriosList({ items, setItems, toast, onNav }) {
  const members = window.EVO_DATA.members;

  const [q,        setQ]        = useStateMin("");
  const [statusF,  setStatusF]  = useStateMin("all");
  const [view,     setView]     = useStateMin("grid");
  const [delItem,  setDelItem]  = useStateMin(null);
  const [formItem, setFormItem] = useStateMin(null);   // { mode, item }
  const [page,     setPage]     = useStateMin(1);
  const [pageSize, setPageSize] = useStateMin(10);

  const filtered = items.filter(m => {
    if (statusF === "active"   && !m.active) return false;
    if (statusF === "inactive" &&  m.active) return false;
    const qLow = q.trim().toLowerCase();
    if (qLow && !m.name.toLowerCase().includes(qLow)
             && !m.leader.toLowerCase().includes(qLow)) return false;
    return true;
  });

  useEffectMin(() => { setPage(1); }, [q, statusF, pageSize, view]);

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageEnd    = Math.min(pageStart + pageSize, total);

  // Destacados al frente
  const pageRows = [...filtered.slice(pageStart, pageEnd)]
    .sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  // ── Handlers ────────────────────────────────────────────────
  const doDelete = () => {
    setItems(items.filter(x => x.id !== delItem.id));
    toast?.("success", "Ministerio eliminado", delItem.name);
    setDelItem(null);
  };

  const saveForm = (data) => {
    if (formItem.mode === "new") {
      const id = Math.max(0, ...items.map(x => x.id)) + 1;
      setItems([...items, { id, createdAt: new Date().toISOString().slice(0,10), ...data }]);
      toast?.("success", "Ministerio creado", data.name);
    } else {
      setItems(items.map(x => x.id === formItem.item.id ? { ...x, ...data } : x));
      toast?.("success", "Ministerio actualizado", data.name);
    }
    setFormItem(null);
  };

  const menuProps = (item) => ({
    item,
    onEdit:         ()  => setFormItem({ mode:"edit", item }),
    onViewMembers:  ()  => toast?.("info", "Miembros", item.name),
    onAssignLeader: ()  => setFormItem({ mode:"edit", item }),
    onViewEvents:   ()  => onNav?.("eventos"),
    onDelete:       (x) => setDelItem(x),
  });

  // ── Render ──────────────────────────────────────────────────
  return (
    <div>

      {/* ── Toolbar ── */}
      <div className="card flat" style={{ padding:14, display:"flex", gap:12,
        flexWrap:"wrap", alignItems:"center", marginBottom:14 }}>

        <div className="search" style={{ flex:1, minWidth:220 }}>
          <Ic.search width={16} stroke="var(--ink-3)"/>
          <input placeholder="Buscar ministerio o líder…"
            value={q} onChange={e => setQ(e.target.value)}/>
        </div>

        {/* Filtro estado */}
        <div className="row" style={{ gap:4, padding:4,
          background:"var(--surface-2)", borderRadius:10 }}>
          {[["all","Todos"],["active","Activos"],["inactive","Inactivos"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusF(v)} className="btn sm" style={{
              background: statusF === v ? "var(--surface)" : "transparent",
              color:      statusF === v ? "var(--ink)"     : "var(--ink-3)",
              boxShadow:  statusF === v ? "var(--shadow-1)": "none",
              fontWeight:500, padding:"6px 12px"
            }}>{l}</button>
          ))}
        </div>

        {/* Toggle vista */}
        <div className="row" style={{ gap:4, padding:4,
          background:"var(--surface-2)", borderRadius:10 }}>
          {[["grid", <Ic.grid width={16}/>], ["list", <Ic.list width={16}/>]].map(([v, ic]) => (
            <button key={v} onClick={() => setView(v)} className="btn sm icon-only"
              title={v === "grid" ? "Cuadrícula" : "Lista"} style={{
                background: view === v ? "var(--surface)" : "transparent",
                color:      view === v ? "var(--accent)"  : "var(--ink-3)",
                boxShadow:  view === v ? "var(--shadow-1)": "none", padding:7
              }}>{ic}</button>
          ))}
        </div>

        <button className="btn primary"
          onClick={() => setFormItem({ mode:"new", item:null })}>
          <Ic.plus width={14}/> Nuevo ministerio
        </button>
      </div>

      {/* ── Vista cuadrícula ── */}
      {view === "grid" && (
        <div className="grid-12">
          {pageRows.map(m => {
            const cv = colorVar(m.color);
            const leaderInitials = m.leader.split(" ").map(s => s[0]).slice(0,2).join("");
            return (
              <div key={m.id} className="card span-4"
                style={{ display:"flex", flexDirection:"column", gap:12 }}>

                {/* Cabecera: icono + nombre + menú */}
                <div className="row between" style={{ alignItems:"flex-start", gap:8 }}>
                  <div className="row" style={{ gap:10, alignItems:"flex-start", minWidth:0, flex:1 }}>
                    <MinIcon name={m.name} color={cv} size={38} radius={10}/>
                    <div style={{ minWidth:0 }}>
                      <div className="display"
                        style={{ fontSize:17, letterSpacing:"-0.01em",
                          overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                        {m.name}
                      </div>
                      <div style={{ marginTop:6, display:"flex", gap:5, flexWrap:"wrap" }}>
                        <EstadoBadge active={m.active}/>
                        {m.featured && <DestacadoBadge/>}
                      </div>
                    </div>
                  </div>
                  <MinActionMenu {...menuProps(m)}/>
                </div>

                {/* Descripción */}
                <div className="muted" style={{ fontSize:12.5, lineHeight:1.55,
                  minHeight:36, display:"-webkit-box", WebkitLineClamp:2,
                  WebkitBoxOrient:"vertical", overflow:"hidden" }}>
                  {m.description || "—"}
                </div>

                {/* Miembros */}
                <div>
                  <div className="tiny muted" style={{ marginBottom:6 }}>Miembros</div>
                  <MemberAvatarStack memberIds={m.memberIds || []} members={members}/>
                </div>

                {/* Footer: líder + fecha */}
                <div style={{ borderTop:"1px solid var(--hairline)", paddingTop:10,
                  display:"flex", justifyContent:"space-between",
                  alignItems:"center", gap:8 }}>
                  <div className="row" style={{ gap:8, alignItems:"center", minWidth:0 }}>
                    <Avatar initials={leaderInitials} size="sm"/>
                    <span style={{ fontSize:12.5, fontWeight:500,
                      overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                      {m.leader}
                    </span>
                  </div>
                  <span className="tiny muted row" style={{ gap:4, flexShrink:0 }}>
                    <Ic.cal width={12}/> {fmtMinDate(m.createdAt)}
                  </span>
                </div>

              </div>
            );
          })}

          {total === 0 && (
            <div className="card span-12" style={{ padding:40, textAlign:"center" }}>
              <div className="muted">No hay ministerios que coincidan con los filtros.</div>
            </div>
          )}
        </div>
      )}

      {/* ── Vista lista ── */}
      {view === "list" && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-actions">Acciones</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Líder</th>
                <th>Miembros</th>
                <th>Activo desde</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(m => {
                const cv = colorVar(m.color);
                const leaderInitials = m.leader.split(" ").map(s => s[0]).slice(0,2).join("");
                return (
                  <tr key={m.id}>
                    <td className="col-actions">
                      <MinActionMenu {...menuProps(m)}/>
                    </td>
                    <td>
                      <div className="row" style={{ gap:10, alignItems:"center" }}>
                        <MinIcon name={m.name} color={cv} size={28} radius={7} fontSize={11}/>
                        <div>
                          <span style={{ fontWeight:600 }}>{m.name}</span>
                          {m.featured && (
                            <span style={{ marginLeft:6 }}><DestacadoBadge/></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td><EstadoBadge active={m.active}/></td>
                    <td>
                      <div className="row" style={{ gap:8, alignItems:"center" }}>
                        <Avatar initials={leaderInitials} size="sm"/>
                        <span style={{ fontSize:13 }}>{m.leader}</span>
                      </div>
                    </td>
                    <td>
                      <MemberAvatarStack
                        memberIds={m.memberIds || []} members={members} max={3}/>
                    </td>
                    <td className="muted tnum">{fmtMinDate(m.createdAt)}</td>
                  </tr>
                );
              })}
              {total === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign:"center", padding:40 }} className="muted">
                    No hay ministerios que coincidan con los filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {total > 0 && (
        <Pagination
          page={safePage} totalPages={totalPages} total={total}
          pageStart={pageStart} pageEnd={pageEnd} pageSize={pageSize}
          onPage={setPage} onPageSize={setPageSize} noun="ministerios"/>
      )}

      {/* Confirm delete */}
      {delItem && (
        <ConfirmDialog
          title="¿Eliminar ministerio?"
          message="Se quitará de la lista. Esta acción no se puede deshacer."
          item={{ name: delItem.name }}
          onConfirm={doDelete}
          onClose={() => setDelItem(null)}
        />
      )}

      {/* Drawer crear / editar */}
      {formItem && (
        <MinForm
          mode={formItem.mode}
          item={formItem.item}
          members={members}
          onSave={saveForm}
          onClose={() => setFormItem(null)}
        />
      )}
    </div>
  );
}

// ============ Screen wrapper ============
function MinisteriosScreen({ toast, onNav }) {
  const [items, setItems] = useStateMin(window.EVO_DATA.ministries);

  return (
    <div>
      <div className="row between" style={{ flexWrap:"wrap", gap:16, marginBottom:24 }}>
        <div>
          <div className="eyebrow">Comunidad</div>
          <h1 className="display"
            style={{ fontSize:40, margin:"4px 0 6px", letterSpacing:"-0.025em" }}>
            Ministerios{" "}
            <span style={{ color:"var(--ink-3)", fontStyle:"italic" }}>· equipos de servicio</span>
          </h1>
        </div>
      </div>
      <MinisteriosList items={items} setItems={setItems} toast={toast} onNav={onNav}/>
    </div>
  );
}

Object.assign(window, { MinisteriosScreen });
