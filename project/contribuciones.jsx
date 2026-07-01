/* global React, Ic, fmtRD, Avatar, Pagination, ConfirmDialog */
/**
 * contribuciones.jsx — Pestaña de Contribuciones de Finanzas.
 *
 * Registro de INGRESOS (diezmos, ofrendas, donaciones), individuales y colectivos.
 * A diferencia de Transacciones, aquí NO hay flujo de autorización: en contribuciones
 * quien registra es quien autoriza (siempre nacen confirmadas). Por eso no hay columnas
 * "Creado/Autorizado por".
 *
 * Columnas: Tipo · Fondo · Contribuyente · Monto · Fecha · Método de pago · Modo · Acciones
 * Stats header: Total ingresos · Diezmos · Ofrendas · Donaciones
 * Wizard "Agregar ingreso": Tipo → Fondo → Modo → Contribuyente → Monto/Fecha/Método
 *
 * Exporta: ContribucionesTab
 */

const { useState: useStateCo, useMemo: useMemoCo, useEffect: useEffectCo } = React;

const CO_CATS    = ["Diezmo", "Ofrenda", "Donación"];
const CO_METHODS = ["Efectivo", "Transferencia", "Cheque", "Tarjeta"];
const CO_CAT_CHIP = { "Diezmo": "violet", "Ofrenda": "info", "Donación": "green" };

const CO_MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function coFmtDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return `${String(d).padStart(2,"0")} ${CO_MES[m-1]} ${y}`;
}

// =================================================================
// Stat card del header
// =================================================================
function CoStat({ label, value, accent }) {
  return (
    <div className="card span-3" style={{ padding: "16px 18px" }}>
      <div className="tiny muted" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>{label}</div>
      <div className="display tnum" style={{ fontSize: 30, marginTop: 8, letterSpacing: "-0.02em", color: accent || "var(--ink)" }}>
        {value}
      </div>
    </div>
  );
}

// =================================================================
// Menú de acciones (hamburguesa) — Editar / Eliminar
// =================================================================
function CoActionMenu({ row, onEdit, onDelete }) {
  const [open, setOpen] = useStateCo(false);
  const [menuPos, setMenuPos] = useStateCo({ top: 0, bottom: "auto", left: 0, right: "auto" });
  const btnRef = React.useRef(null);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuW = 188, menuH = 44 * 2 + 13;
      const openUp   = window.innerHeight - r.bottom < menuH + 24;
      const openLeft = window.innerWidth  - r.left   < menuW + 8;
      setMenuPos({
        top:    openUp   ? "auto"                          : r.bottom + 6,
        bottom: openUp   ? window.innerHeight - r.top + 6 : "auto",
        left:   openLeft ? "auto"                          : r.left,
        right:  openLeft ? window.innerWidth - r.right     : "auto",
      });
    }
    setOpen(o => !o);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button ref={btnRef} className="btn ghost icon-only sm" title="Acciones" style={{ opacity: 1 }} onClick={handleToggle}>
        <Ic.menu width={16}/>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }}/>
          <div role="menu" style={{
            position: "fixed",
            top: menuPos.top, bottom: menuPos.bottom,
            left: menuPos.left, right: menuPos.right,
            zIndex: 201, minWidth: 188, padding: 6, textAlign: "left",
            background: "var(--bg-1)", border: "1px solid var(--line)",
            borderRadius: 12, boxShadow: "var(--shadow-3)"
          }}>
            <CoMenuItem icon={<Ic.edit width={15}/>} label="Editar" onClick={() => { setOpen(false); onEdit(row); }}/>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 6px" }}/>
            <CoMenuItem icon={<Ic.trash width={15}/>} label="Eliminar" danger onClick={() => { setOpen(false); onDelete(row); }}/>
          </div>
        </>
      )}
    </div>
  );
}
function CoMenuItem({ icon, label, onClick, danger }) {
  const [hover, setHover] = useStateCo(false);
  const color = danger ? "var(--danger)" : "var(--fg)";
  const bg = danger ? "color-mix(in oklab, var(--danger) 12%, transparent)" : "var(--bg-2)";
  return (
    <button role="menuitem" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8,
        border: 0, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 500, color,
        background: hover ? bg : "transparent", transition: "background 0.1s" }}>
      <span style={{ display: "grid", placeItems: "center", color }}>{icon}</span>{label}
    </button>
  );
}

// =================================================================
// Formulario: Agregar / Editar ingreso (sin wizard, todo en una vista)
// =================================================================
function IngresoWizard({ mode, item, funds, members, onSave, onClose }) {
  const editing = mode === "edit";
  const [v, setV] = useStateCo({
    category:    item?.category || "",
    fund:        item?.fund || "",
    mode:        item?.mode || "Individual",
    contributor: item?.contributor && !["Ofrenda colectiva"].includes(item.contributor) ? item.contributor : "",
    anon:        item?.contributor === "Anónimo",
    amount:      item ? Math.abs(item.amount) : "",
    date:        item?.date || "2026-05-08",
    method:      item?.method || "",
  });
  const upd = (k, val) => setV(s => ({ ...s, [k]: val }));
  const [amountFocused, setAmountFocused] = useStateCo(false);
  const fmtInput = (n) => (!n || isNaN(+n)) ? "" : (+n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const stripFmt = (s) => s.replace(/[^0-9.]/g, "");

  const isColectivo = v.mode === "Colectivo";
  const valid = v.category && v.fund && v.method && v.amount && +v.amount > 0 &&
    (isColectivo || v.anon || !!v.contributor.trim());

  const finish = () => {
    const contributor = isColectivo ? "Ofrenda colectiva" : (v.anon ? "Anónimo" : v.contributor.trim());
    onSave({
      category: v.category, fund: v.fund, mode: v.mode, contributor,
      amount: Math.abs(+v.amount), date: v.date, method: v.method,
    });
  };

  const fmtResumen = (n) => {
    if (!n || isNaN(+n)) return "—";
    return "RD$ " + (+n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const OptionCard = ({ active, onClick, title, sub, chip }) => (
    <button type="button" onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
      padding: "14px 16px", borderRadius: 12, cursor: "pointer", font: "inherit",
      background: active ? "var(--accent-soft)" : "var(--bg-2)",
      border: "1px solid " + (active ? "color-mix(in oklab, var(--accent) 45%, transparent)" : "var(--line)"),
      transition: "background 0.12s, border-color 0.12s"
    }}>
      {chip && <span className={`chip ${chip}`} style={{ flexShrink: 0 }}><span className="pip"/></span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{title}</div>
        {sub && <div className="tiny muted">{sub}</div>}
      </div>
      {active && <Ic.check width={16} stroke="var(--accent)"/>}
    </button>
  );

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{editing ? "Edición" : "Nuevo ingreso"}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>{editing ? "Editar ingreso" : "Agregar ingreso"}</h2>
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>

        <div className="drawer-body col gap-md">

          {/* Tipo de ingreso */}
          <div className="field">
            <label>Tipo de ingreso</label>
            <div className="col" style={{ gap: 8 }}>
              {CO_CATS.map(c => (
                <OptionCard key={c} active={v.category === c} onClick={() => upd("category", c)}
                  chip={CO_CAT_CHIP[c]} title={c}
                  sub={c === "Diezmo" ? "Aporte del 10% del miembro" : c === "Ofrenda" ? "Aporte voluntario al culto" : "Aporte para una causa específica"}/>
              ))}
            </div>
          </div>

          {/* Fondo destino */}
          <div className="field">
            <label>Fondo destino</label>
            <div className="input-wrap">
              <select value={v.fund} onChange={e => upd("fund", e.target.value)}>
                <option value="" disabled>Seleccionar fondo…</option>
                {funds.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
          </div>

          {/* Modo de colecta */}
          <div className="field">
            <label>Modo de colecta</label>
            <div className="row" style={{ gap: 10 }}>
              {["Individual","Colectivo"].map(m => (
                <button key={m} type="button" onClick={() => upd("mode", m)} className="btn"
                  style={{ flex: 1, justifyContent: "center", fontWeight: 600,
                    background: v.mode === m ? "var(--accent-soft)" : "transparent",
                    color: v.mode === m ? "var(--accent)" : "var(--fg-dim)",
                    borderColor: v.mode === m ? "color-mix(in oklab, var(--accent) 40%, transparent)" : "var(--line-2)" }}>
                  {m}
                </button>
              ))}
            </div>
            <div className="help">{isColectivo ? "Se registrará como “Ofrenda colectiva” sin contribuyente individual." : "Se asocia a un miembro o es anónimo."}</div>
          </div>

          {/* Contribuyente */}
          <div className="field">
            <label>Contribuyente</label>
            {isColectivo ? (
              <div className="card flat" style={{ padding: 14 }}>
                <div className="row" style={{ gap: 10 }}>
                  <span className="chip"><span className="pip"/> Colectivo</span>
                  <span style={{ fontWeight: 600 }}>Ofrenda colectiva</span>
                </div>
                <div className="help" style={{ marginTop: 6 }}>No requiere identificar a un contribuyente.</div>
              </div>
            ) : (
              <>
                <label style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", cursor: "pointer", width: "fit-content" }}>
                  <input type="checkbox" checked={v.anon} onChange={e => upd("anon", e.target.checked)}
                    style={{ accentColor: "var(--accent)", width: 15, height: 15, cursor: "pointer", flexShrink: 0 }}/>
                  <span style={{ fontSize: 13 }}>Registrar como <b>Anónimo</b></span>
                </label>
                {!v.anon && (
                  <div className="input-wrap" style={{ marginTop: 4 }}>
                    <select value={v.contributor} onChange={e => upd("contributor", e.target.value)}>
                      <option value="" disabled>Seleccionar miembro…</option>
                      {members.map(m => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Método de pago — encima de monto/fecha */}
          <div className="field">
            <label>Método de pago <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className="input-wrap">
              <select value={v.method} onChange={e => upd("method", e.target.value)}>
                <option value="" disabled>Seleccionar…</option>
                {CO_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* Monto y Fecha */}
          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Monto <span style={{ color: "var(--danger)" }}>*</span></label>
              <div className="input-wrap" style={{ position: "relative" }}>
                <span style={{
                  position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                  fontSize: 13, fontWeight: 600, color: "var(--ink-3)", pointerEvents: "none", userSelect: "none"
                }}>RD$</span>
                <input type="text" inputMode="decimal" value={amountFocused ? v.amount : fmtInput(v.amount)} placeholder="0.00"
                  style={{ paddingLeft: 44 }}
                  onFocus={() => setAmountFocused(true)}
                  onBlur={() => setAmountFocused(false)}
                  onChange={e => upd("amount", stripFmt(e.target.value))}/>
              </div>
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha</label>
              <div className="input-wrap">
                <input type="date" value={v.date} onChange={e => upd("date", e.target.value)}/>
              </div>
            </div>
          </div>

          {/* Resumen */}
          {v.category && v.fund && (
            <div className="card flat" style={{ padding: 14 }}>
              <div className="eyebrow" style={{ marginBottom: 8 }}>Resumen</div>
              {/* Nombre (inicio) · Monto (final) */}
              <div className="row" style={{ alignItems: "center", justifyContent: "space-between", fontSize: 13, marginBottom: 10 }}>
                <span style={{ fontWeight: 500 }}>{isColectivo ? "Ofrenda colectiva" : (v.anon ? "Anónimo" : (v.contributor || "—"))}</span>
                {v.amount && +v.amount > 0 && (
                  <span style={{ fontWeight: 700, color: "var(--success)", fontVariantNumeric: "tabular-nums" }}>
                    {fmtResumen(v.amount)}
                  </span>
                )}
              </div>
              {/* Badges centrados */}
              <div className="row" style={{ gap: 8, flexWrap: "wrap", fontSize: 13, alignItems: "center", justifyContent: "center" }}>
                <span className={`chip ${CO_CAT_CHIP[v.category]}`}><span className="pip"/> {v.category}</span>
                <span className="chip">{v.fund}</span>
                <span className="chip">{v.mode}</span>
              </div>
            </div>
          )}

        </div>

        <div className="drawer-foot">
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={!valid} onClick={finish}>
            <Ic.check width={14}/> {editing ? "Guardar cambios" : "Registrar ingreso"}
          </button>
        </div>
      </div>
    </>
  );
}

// =================================================================
// Pestaña principal
// =================================================================
function ContribucionesTab({ toast }) {
  const D = window.EVO_DATA;
  const [rows, setRows] = useStateCo(() => D.contributions.map(c => ({ ...c })));
  const [catF, setCatF] = useStateCo("all");
  const [q, setQ] = useStateCo("");
  const [wizard, setWizard] = useStateCo(null);   // { mode, item }
  const [delRow, setDelRow] = useStateCo(null);
  const [page, setPage] = useStateCo(1);
  const [pageSize, setPageSize] = useStateCo(10);

  const fundNames = D.funds.map(f => f.name);

  const filtered = useMemoCo(() => {
    let arr = rows;
    if (catF !== "all") arr = arr.filter(c => c.category === catF);
    if (q.trim()) {
      const Q = q.trim().toLowerCase();
      arr = arr.filter(c => [c.contributor, c.fund, c.category, c.method].some(x => String(x || "").toLowerCase().includes(Q)));
    }
    return arr;
  }, [rows, catF, q]);

  useEffectCo(() => { setPage(1); }, [catF, q, pageSize]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  // Stats (sobre todo el set, no el filtrado)
  const sum = (cat) => rows.filter(c => cat ? c.category === cat : true).reduce((s, c) => s + c.amount, 0);
  const fmtK = (n) => n >= 1e6 ? "RD$ " + (n/1e6).toFixed(2) + "M" : fmtRD(n);

  const saveWizard = (data) => {
    if (wizard.mode === "new") {
      const id = Math.max(0, ...rows.map(r => r.id)) + 1;
      setRows([{ id, ...data }, ...rows]);
      toast?.("success", "Ingreso registrado", `${data.category} · RD$ ${fmtRD(data.amount)}`);
    } else {
      setRows(rows.map(r => r.id === wizard.item.id ? { ...r, ...data } : r));
      toast?.("success", "Cambios guardados", data.category);
    }
    setWizard(null);
  };
  const doDelete = () => {
    setRows(rows.filter(r => r.id !== delRow.id));
    toast?.("success", "Ingreso eliminado", `${delRow.category} · ${delRow.contributor}`);
    setDelRow(null);
  };

  return (
    <>
      {/* Filtros */}
      <div className="card flat" style={{ padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <Ic.search width={16} stroke="var(--ink-3)"/>
          <input placeholder="Buscar por contribuyente, fondo, método…" value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
          {[["all","Todos"],["Diezmo","Diezmos"],["Ofrenda","Ofrendas"],["Donación","Donaciones"]].map(([val, l]) => (
            <button key={val} onClick={() => setCatF(val)} className="btn sm" style={{
              background: catF === val ? "var(--surface)" : "transparent",
              color: catF === val ? "var(--ink)" : "var(--ink-3)",
              boxShadow: catF === val ? "var(--shadow-1)" : "none",
              fontWeight: 500, padding: "6px 12px"
            }}>{l}</button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setWizard({ mode: "new", item: null })}>
          <Ic.plus width={14}/> Agregar ingreso
        </button>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="col-actions">Acciones</th>
              <th>Tipo</th>
              <th>Fondo</th>
              <th>Contribuyente</th>
              <th style={{ textAlign: "right" }}>Monto</th>
              <th>Fecha</th>
              <th>Método de pago</th>
              <th>Modo</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(c => (
              <tr key={c.id}>
                <td className="col-actions">
                  <CoActionMenu row={c}
                    onEdit={(x) => setWizard({ mode: "edit", item: x })}
                    onDelete={(x) => setDelRow(x)}/>
                </td>
                <td><span className={`chip ${CO_CAT_CHIP[c.category] || ""}`}><span className="pip"/> {c.category}</span></td>
                <td><span className="chip">{c.fund}</span></td>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    {c.mode === "Colectivo"
                      ? <span style={{ width: 28, height: 28, borderRadius: 8, display: "grid", placeItems: "center", background: "var(--surface-2)", color: "var(--ink-3)", flexShrink: 0 }}><Ic.users width={15}/></span>
                      : <Avatar initials={(c.contributor || "?").split(" ").map(s=>s[0]).slice(0,2).join("")} size="sm"/>}
                    <div style={{ fontWeight: 500 }}>{c.contributor}</div>
                  </div>
                </td>
                <td className="tnum mono" style={{ textAlign: "right", fontWeight: 600, color: "var(--success)" }}>+{fmtRD(c.amount)}</td>
                <td className="muted">{coFmtDate(c.date)}</td>
                <td><span className="muted">{c.method}</span></td>
                <td><span className="tiny muted" style={{ fontWeight: 600 }}>{c.mode}</span></td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: 40 }} className="muted">No hay ingresos que coincidan con los filtros.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <Pagination page={safePage} totalPages={totalPages} total={total}
          pageStart={pageStart} pageEnd={pageEnd} pageSize={pageSize}
          onPage={setPage} onPageSize={setPageSize} noun="ingresos"/>
      )}

      {/* Modales */}
      {wizard && (
        <IngresoWizard
          mode={wizard.mode}
          item={wizard.item}
          funds={fundNames}
          members={D.members}
          onSave={saveWizard}
          onClose={() => setWizard(null)}
        />
      )}
      {delRow && (
        <ConfirmDialog
          title="¿Eliminar ingreso?"
          message="Esta acción no se puede deshacer."
          item={{ name: `${delRow.category} · ${delRow.contributor}` }}
          onConfirm={doDelete}
          onClose={() => setDelRow(null)}
        />
      )}
    </>
  );
}

Object.assign(window, { ContribucionesTab });
