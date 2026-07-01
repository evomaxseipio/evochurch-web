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

const { useState: useStateCR, useMemo: useMemoCR } = React;

function CrudModule({
  title, subtitle, eyebrow, data, setData,
  columns = [], fields = [], searchKeys = [], filters = [],
  newLabel = "Nuevo", onChange, emptyHint = "Sin registros todavía",
  rightExtras = null,
}) {
  const [q, setQ] = useStateCR("");
  const [filterVals, setFilterVals] = useStateCR({});
  const [drawer, setDrawer] = useStateCR(null);    // { mode: "new"|"edit", item }
  const [confirm, setConfirm] = useStateCR(null);  // { item }

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
      <div className="row between" style={{ flexWrap: "wrap", gap: 16, marginBottom: 18 }}>
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
      </div>

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
        <span className="tiny muted" style={{ marginLeft: "auto" }}>
          {filtered.length} de {data.length}
        </span>
      </div>

      {/* Tabla */}
      {filtered.length > 0 ? (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                {columns.map(c => (
                  <th key={c.key} style={c.width ? { width: c.width } : undefined}>{c.label}</th>
                ))}
                <th className="col-actions" style={{ width: 1 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(it => (
                <tr key={it.id}>
                  {columns.map(c => (
                    <td key={c.key}>
                      {c.render ? c.render(it[c.key], it) : (it[c.key] ?? "—")}
                    </td>
                  ))}
                  <td className="col-actions">
                    <div className="row" style={{ gap: 2 }}>
                      <button className="btn ghost icon-only sm" title="Editar"
                              onClick={() => setDrawer({ mode: "edit", item: it })}>
                        <Ic.edit width={14}/>
                      </button>
                      <button className="btn ghost icon-only sm" title="Eliminar"
                              onClick={() => setConfirm({ item: it })}>
                        <Ic.trash width={14}/>
                      </button>
                    </div>
                  </td>
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

Object.assign(window, { CrudModule, FormDrawer, ConfirmDialog, CrudSwitch });
