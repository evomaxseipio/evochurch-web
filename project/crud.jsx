/* global React, Ic */
/**
 * <CrudModule> — Componente genérico para módulos de configuración.
 *
 * Maneja listado + búsqueda + crear / editar / eliminar para cualquier
 * entidad simple (Usuarios, Gastos, Ministerios, etc.). El módulo
 * consumidor solo declara columnas y campos: el resto es automático.
 *
 * Props:
 *   title       string             Título del módulo
 *   subtitle    string             Subtítulo descriptivo
 *   eyebrow     string             Pre-título (ej. "Configuración")
 *   data        Array<Record>      Lista actual (se renderiza tal cual)
 *   setData     (next) => void     Setter; recibe el nuevo array
 *   columns     [{key,label,render,width}]   Columnas de la tabla
 *   fields      [{key,label,type,options,required,placeholder,multiline}]   Campos del form
 *   searchKeys  string[]           Llaves que entran en el buscador
 *   filters     [{key,label,options}]   Filtros adicionales tipo segmented
 *   newLabel    string             Texto del botón nuevo
 *   onChange    (action, item)     Callback ("create"|"update"|"delete")
 *   emptyHint   string             Mensaje cuando no hay items
 *
 * Tipos de campo soportados:
 *   text · email · number · textarea · select · switch · multiselect
 */

const { useState: useStateCR, useMemo: useMemoCR, useEffect: useEffectCR, useRef: useRefCR } = React;

function CrudModule({
  title, subtitle, eyebrow, data, setData,
  columns = [], fields = [], searchKeys = [], filters = [],
  newLabel = "Nuevo", onChange, emptyHint = "Sin registros todavía",
  rightExtras = null, showHeader = true,
}) {
  const [q, setQ] = useStateCR("");
  const [filterVals, setFilterVals] = useStateCR({});
  const [drawer, setDrawer] = useStateCR(null);    // { mode: "new"|"edit", item }
  const [confirm, setConfirm] = useStateCR(null);  // { item }
  const [page, setPage] = useStateCR(1);
  const [pageSize, setPageSize] = useStateCR(10);

  // ----- filtrado -----
  const filtered = useMemoCR(() => {
    let arr = data;
    // filtros segmented
    for (const f of filters) {
      const v = filterVals[f.key] ?? "all";
      if (v !== "all") arr = arr.filter(it => String(it[f.key]) === v);
    }
    // búsqueda
    if (q.trim()) {
      const Q = q.trim().toLowerCase();
      arr = arr.filter(it =>
        searchKeys.some(k => String(it[k] ?? "").toLowerCase().includes(Q))
      );
    }
    return arr;
  }, [data, q, filterVals]);

  // reset a pág 1 cuando cambia filtro/búsqueda/tamaño
  useEffectCR(() => { setPage(1); }, [q, filterVals, pageSize]);

  const total      = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage   = Math.min(page, totalPages);
  const pageStart  = (safePage - 1) * pageSize;
  const pageEnd    = Math.min(pageStart + pageSize, total);
  const pageRows   = filtered.slice(pageStart, pageEnd);

  // ----- mutaciones -----
  const handleSave = (next) => {
    if (drawer.mode === "new") {
      const id = Math.max(0, ...data.map(d => d.id || 0)) + 1;
      const item = { id, ...next };
      setData([...data, item]);
      onChange?.("create", item);
    } else {
      const item = { ...drawer.item, ...next };
      setData(data.map(d => d.id === item.id ? item : d));
      onChange?.("update", item);
    }
    setDrawer(null);
  };
  const handleDelete = () => {
    const item = confirm.item;
    setData(data.filter(d => d.id !== item.id));
    onChange?.("delete", item);
    setConfirm(null);
  };

  return (
    <div>
      {/* Header */}
      {showHeader && <div className="row between" style={{ flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
        <div>
          {eyebrow && <div className="eyebrow">{eyebrow}</div>}
          <div className="page-title" style={{ marginTop: 4 }}>{title}</div>
          {subtitle && <div className="page-subtitle">{subtitle}</div>}
        </div>
        <div className="row" style={{ gap: 8 }}>
          {rightExtras}
          <button className="btn primary" onClick={() => setDrawer({ mode: "new", item: null })}>
            <Ic.plus width={14}/> {newLabel}
          </button>
        </div>
      </div>}


      {/* Filtros + búsqueda */}
      <div className="card flat" style={{
        padding: 12, marginBottom: 12,
        display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center"
      }}>
        <div className="search" style={{ flex: 1, minWidth: 220, width: "auto" }}>
          <Ic.search width={14} stroke="var(--muted)"/>
          <input placeholder="Buscar…" value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        {filters.map(f => {
          const v = filterVals[f.key] ?? "all";
          return (
            <div key={f.key} className="row" style={{
              gap: 2, padding: 3, background: "var(--bg-2)",
              borderRadius: 8, border: "1px solid var(--line)"
            }}>
              {[{ value: "all", label: "Todos" }, ...f.options].map(opt => (
                <button key={opt.value} className="btn sm" style={{
                  background: v === opt.value ? "var(--bg-1)" : "transparent",
                  color: v === opt.value ? "var(--fg)" : "var(--muted)",
                  border: "1px solid " + (v === opt.value ? "var(--line)" : "transparent"),
                  fontWeight: 500, padding: "4px 10px"
                }} onClick={() => setFilterVals(s => ({ ...s, [f.key]: opt.value }))}>
                  {opt.label}
                </button>
              ))}
            </div>
          );
        })}
        {!showHeader && (
          <button className="btn primary" onClick={() => setDrawer({ mode: "new", item: null })}>
            <Ic.plus width={14}/> {newLabel}
          </button>
        )}
      </div>

      {/* Tabla */}
      {filtered.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-actions" style={{ width: 44 }}>Acciones</th>
                {columns.map(c => (
                  <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.map(it => (
                <tr key={it.id}>
                  <td className="col-actions">
                    <CrudActionMenu
                      onEdit={() => setDrawer({ mode: "edit", item: it })}
                      onDelete={() => setConfirm({ item: it })}
                    />
                  </td>
                  {columns.map(c => (
                    <td key={c.key}>
                      {c.render ? c.render(it[c.key], it) : (it[c.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <div className="muted" style={{ marginBottom: 12 }}>{emptyHint}</div>
          <button className="btn primary" onClick={() => setDrawer({ mode: "new", item: null })}>
            <Ic.plus width={14}/> {newLabel}
          </button>
        </div>
      )}

      {total > 0 && (
        <CrudPagination
          page={safePage} totalPages={totalPages} total={total}
          pageStart={pageStart} pageEnd={pageEnd}
          pageSize={pageSize} onPage={setPage} onPageSize={setPageSize}
        />
      )}

      {/* Form drawer */}
      {drawer && (
        <FormDrawer
          mode={drawer.mode}
          item={drawer.item}
          title={drawer.mode === "new" ? `${newLabel}` : `Editar`}
          fields={fields}
          onSave={handleSave}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Confirm delete */}
      {confirm && (
        <ConfirmDialog
          title="¿Eliminar registro?"
          message="Esta acción no se puede deshacer."
          item={confirm.item}
          onConfirm={handleDelete}
          onClose={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

// ============ FormDrawer ============
function FormDrawer({ mode, item, title, fields, onSave, onClose }) {
  const init = {};
  for (const f of fields) {
    if (item && item[f.key] !== undefined) init[f.key] = item[f.key];
    else init[f.key] = f.default ?? (f.type === "switch" ? false : f.type === "multiselect" ? [] : "");
  }
  const [vals, setVals] = useStateCR(init);
  const [errs, setErrs] = useStateCR({});

  const upd = (k, v) => setVals(s => ({ ...s, [k]: v }));

  const submit = () => {
    const e = {};
    for (const f of fields) {
      if (f.required) {
        const v = vals[f.key];
        if (v === "" || v === null || v === undefined || (Array.isArray(v) && v.length === 0)) {
          e[f.key] = "Obligatorio";
        }
      }
    }
    setErrs(e);
    if (Object.keys(e).length) return;
    onSave(vals);
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{mode === "new" ? "Nuevo registro" : "Edición"}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>{title}</h2>
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>
        <div className="drawer-body col gap-md">
          {fields.map(f => (
            <FieldRow key={f.key} field={f} value={vals[f.key]} error={errs[f.key]} onChange={v => upd(f.key, v)}/>
          ))}
        </div>
        <div className="drawer-foot">
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={submit}>
            <Ic.check width={14}/> {mode === "new" ? "Crear" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

function FieldRow({ field, value, error, onChange }) {
  const { key, label, type, options, placeholder, hint, multiline } = field;

  if (type === "switch") {
    return (
      <div className="row between" style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 13 }}>{label}</div>
          {hint && <div className="tiny muted">{hint}</div>}
        </div>
        <CrudSwitch on={!!value} onChange={onChange}/>
      </div>
    );
  }
  if (type === "select") {
    return (
      <div className="field">
        <label>{label}{field.required && <span style={{ color: "var(--danger)" }}> *</span>}</label>
        <div className={`input-wrap ${error ? "error" : ""}`}>
          <select value={value || ""} onChange={e => onChange(e.target.value)}>
            <option value="" disabled>Seleccionar…</option>
            {(options || []).map(o => (
              <option key={typeof o === "object" ? o.value : o} value={typeof o === "object" ? o.value : o}>
                {typeof o === "object" ? o.label : o}
              </option>
            ))}
          </select>
        </div>
        {error && <div className="help error">{error}</div>}
        {!error && hint && <div className="help">{hint}</div>}
      </div>
    );
  }
  if (type === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    const toggle = (v) => {
      onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v]);
    };
    return (
      <div className="field">
        <label>{label}{field.required && <span style={{ color: "var(--danger)" }}> *</span>}</label>
        <div style={{
          maxHeight: 220, overflowY: "auto",
          border: "1px solid " + (error ? "var(--danger)" : "var(--line)"),
          borderRadius: 8, padding: 6, background: "var(--bg-2)"
        }}>
          {(options || []).map(o => {
            const v = typeof o === "object" ? o.value : o;
            const l = typeof o === "object" ? o.label : o;
            const sub = typeof o === "object" ? o.sub : null;
            const checked = selected.includes(v);
            return (
              <label key={v} className="row" style={{
                gap: 10, padding: "7px 8px", borderRadius: 6, cursor: "pointer",
                background: checked ? "var(--accent-soft)" : "transparent"
              }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(v)}
                       style={{ accentColor: "var(--accent)" }}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{l}</div>
                  {sub && <div className="tiny muted">{sub}</div>}
                </div>
              </label>
            );
          })}
        </div>
        {error && <div className="help error">{error}</div>}
        {!error && hint && <div className="help">{hint} · {selected.length} seleccionados</div>}
        {!error && !hint && <div className="help">{selected.length} seleccionados</div>}
      </div>
    );
  }
  if (multiline || type === "textarea") {
    return (
      <div className="field">
        <label>{label}{field.required && <span style={{ color: "var(--danger)" }}> *</span>}</label>
        <div className={`input-wrap ${error ? "error" : ""}`} style={{ alignItems: "flex-start", padding: "10px 12px" }}>
          <textarea rows={3} value={value || ""} placeholder={placeholder}
                    onChange={e => onChange(e.target.value)}/>
        </div>
        {error && <div className="help error">{error}</div>}
      </div>
    );
  }
  return (
    <div className="field">
      <label>{label}{field.required && <span style={{ color: "var(--danger)" }}> *</span>}</label>
      <div className={`input-wrap ${error ? "error" : ""}`}>
        <input type={type || "text"} value={value || ""} placeholder={placeholder}
               onChange={e => onChange(type === "number" ? +e.target.value : e.target.value)}/>
      </div>
      {error && <div className="help error">{error}</div>}
      {!error && hint && <div className="help">{hint}</div>}
    </div>
  );
}

// ============ Confirm Dialog ============
function ConfirmDialog({ title, message, item, onConfirm, onClose }) {
  return (
    <>
      <div className="drawer-backdrop" style={{ zIndex: 60 }} onClick={onClose}/>
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 61, background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)", padding: 24, width: 420, maxWidth: "92vw",
        boxShadow: "var(--shadow-3)"
      }}>
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <span style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: "color-mix(in oklab, var(--danger) 16%, transparent)",
            color: "var(--danger)", display: "grid", placeItems: "center"
          }}>
            <Ic.trash width={18}/>
          </span>
          <div>
            <h3 style={{ margin: 0, fontSize: 16 }}>{title}</h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>{message}</p>
            {item && (item.name || item.title || item.email) && (
              <div className="chip" style={{ marginTop: 10 }}>{item.name || item.title || item.email}</div>
            )}
          </div>
        </div>
        <div className="row" style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}>
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          <button className="btn danger" onClick={onConfirm}><Ic.trash width={14}/> Eliminar</button>
        </div>
      </div>
    </>
  );
}

// ============ Switch (reutilizable) ============
function CrudSwitch({ on, onChange }) {
  return (
    <div onClick={() => onChange(!on)} style={{
      width: 40, height: 22, borderRadius: 999, padding: 2, cursor: "pointer",
      background: on ? "var(--accent)" : "var(--line-2)",
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

// ============ CrudMenuItem ============
function CrudMenuItem({ icon, label, onClick, danger }) {
  const [hov, setHov] = useStateCR(false);
  const col = danger ? "var(--danger)" : "var(--fg)";
  const bg  = danger ? "color-mix(in oklab, var(--danger) 12%, transparent)" : "var(--bg-2)";
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

// ============ CrudActionMenu ============
function CrudActionMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useStateCR(false);
  const [pos,  setPos]  = useStateCR({ top:0, bottom:"auto", left:0, right:"auto" });
  const btnRef = useRefCR(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r     = btnRef.current.getBoundingClientRect();
      const menuH = 44 * 2 + 20;
      const menuW = 180;
      const below  = window.innerHeight - r.bottom;
      const toLeft = window.innerWidth  - r.left;
      setPos({
        top:    below  < menuH + 16 ? "auto"                          : r.bottom + 6,
        bottom: below  < menuH + 16 ? window.innerHeight - r.top + 6  : "auto",
        left:   toLeft < menuW + 8  ? "auto"                          : r.left,
        right:  toLeft < menuW + 8  ? window.innerWidth  - r.right    : "auto",
      });
    }
    setOpen(o => !o);
  };

  const close = () => setOpen(false);

  return (
    <div style={{ display:"inline-block" }}>
      <button ref={btnRef} className="btn ghost icon-only sm" title="Acciones" onClick={handleToggle}>
        <Ic.menu width={16}/>
      </button>
      {open && (
        <>
          <div onClick={close} style={{ position:"fixed", inset:0, zIndex:200 }}/>
          <div role="menu" style={{
            position:"fixed",
            top: pos.top, bottom: pos.bottom,
            left: pos.left, right: pos.right,
            zIndex:201, minWidth:180, padding:6, textAlign:"left",
            background:"var(--bg-1)", border:"1px solid var(--line)",
            borderRadius:12, boxShadow:"var(--shadow-3)",
          }}>
            <CrudMenuItem icon={<Ic.edit  width={15}/>} label="Editar"    onClick={() => { close(); onEdit(); }}/>
            <div style={{ height:1, background:"var(--line)", margin:"4px 6px" }}/>
            <CrudMenuItem icon={<Ic.trash width={15}/>} label="Eliminar" danger onClick={() => { close(); onDelete(); }}/>
          </div>
        </>
      )}
    </div>
  );
}

// ============ CrudPagination ============
function CrudPagination({ page, totalPages, total, pageStart, pageEnd, pageSize, onPage, onPageSize }) {
  const sizeOptions = [10, 15, 25, 50];
  const pageButtons = useMemoCR(() => {
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
    <div className="card flat" style={{
      marginTop: 14, padding: "10px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      gap: 12, flexWrap: "wrap",
    }}>
      <div className="row" style={{ gap: 12, alignItems: "center" }}>
        <span className="tiny muted">
          Mostrando <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{pageStart + 1}</b>
          {" – "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{pageEnd}</b>
          {" de "}
          <b style={{ color: "var(--fg)", fontFamily: "var(--font-mono)" }}>{total.toLocaleString("es-DO")}</b> registros
        </span>
        <span style={{ width: 1, height: 18, background: "var(--line)" }}/>
        <label className="row" style={{ gap: 6, fontSize: 12, color: "var(--muted)" }}>
          Filas
          <select className="select" style={{ padding: "4px 8px", width: "auto", fontSize: 12 }}
            value={pageSize} onChange={e => onPageSize(parseInt(e.target.value, 10))}>
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
          <span key={"e"+i} style={{ padding: "0 6px", color: "var(--dim)", fontFamily: "var(--font-mono)" }}>…</span>
        ) : (
          <button key={b} onClick={() => onPage(b)}
            className={"btn sm " + (b === page ? "primary" : "outline")}
            style={{ minWidth: 32, padding: "5px 0", fontFamily: "var(--font-mono)" }}>
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

Object.assign(window, { CrudModule, FormDrawer, ConfirmDialog, CrudSwitch });
