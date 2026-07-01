/* global React, Ic, fmtRD, ConfirmDialog, CrudSwitch, Pagination */
/**
 * fondos.jsx — Pestaña de Fondos de Finanzas.
 *
 * - FundsSummary: banda superior con dona (leyenda Top 5 + dona) y card "Todos los fondos"
 *   con barras de progreso y scroll.
 * - FundsList: listado de fondos al estilo EvoChurch, con buscador, filtros
 *   (Todos/Activos/Inactivos), toggle de vista (cuadrícula/lista) y menú popup por fondo
 *   (Editar · Agregar transacción · Marcar como primario · Ver transacciones ·
 *    Ver contribuciones · Eliminar).
 *
 * Exporta: FundsSummary, FundsList
 */

const { useState: useStateF, useEffect: useEffectF } = React;

// ============ FONDOS · Banda resumen (dona + ranking) ============
const FUND_PALETTE = ["var(--primary)", "var(--accent)", "var(--success)", "#A855F7", "var(--info)", "var(--warm)"];
const FUND_OTHER_COLOR = "var(--ink-4)";

function fmtChartNum(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return Math.round(n).toString();
}

function FundsSummary({ funds }) {
  const sorted = [...funds].sort((a, b) => b.balance - a.balance);
  const total = sorted.reduce((s, f) => s + f.balance, 0);
  const max = sorted[0]?.balance || 1;

  // Top 5 individuales + "Otros" agrupado (escala a 20+ fondos)
  const TOP = 5;
  const topFunds = sorted.slice(0, TOP);
  const rest = sorted.slice(TOP);
  const restSum = rest.reduce((s, f) => s + f.balance, 0);

  const slices = topFunds.map((f, i) => ({ label: f.name, v: f.balance, color: FUND_PALETTE[i % FUND_PALETTE.length] }));
  if (rest.length) slices.push({ label: `Otros (${rest.length})`, v: restSum, color: FUND_OTHER_COLOR });

  // Color por posición para la lista completa (Top conserva su color; resto, gris)
  const colorFor = (idx) => idx < TOP ? FUND_PALETTE[idx % FUND_PALETTE.length] : FUND_OTHER_COLOR;

  return (
    <div className="grid-12" style={{ marginBottom: 18 }}>
      {/* Columna 1 — Dona + leyenda Top 5 */}
      <div className="card span-6">
        <div className="row between" style={{ alignItems: "flex-start", gap: 16 }}>
          <div>
            <div className="display" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>Distribución por fondo</div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>Participación de cada fondo en el total recaudado</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div className="tiny muted" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}>Total Fondos</div>
            <div className="display tnum" style={{ fontSize: 24, letterSpacing: "-0.02em", marginTop: 4 }}>{fmtRD(total)}</div>
          </div>
        </div>

        <div className="row" style={{ gap: 20, alignItems: "center", marginTop: 18, flexWrap: "wrap" }}>
          {/* Leyenda Top 5 — izquierda */}
          <div className="col" style={{ gap: 12, flex: 1, minWidth: 150 }}>
            {slices.map((s, i) => (
              <div key={i} className="row" style={{ gap: 10, alignItems: "center", fontSize: 13.5 }}>
                <span style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0 }}/>
                <span style={{ flex: 1, minWidth: 0, color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</span>
                <span className="tnum mono" style={{ flexShrink: 0, fontWeight: 600, color: "var(--ink)" }}>{fmtChartNum(s.v)}</span>
              </div>
            ))}
          </div>
          {/* Dona — derecha */}
          <FundDonut slices={slices} total={total}/>
        </div>
      </div>

      {/* Columna 2 — Todos los fondos (scroll + progress) */}
      <div className="card span-6">
        <div className="row between" style={{ alignItems: "flex-start" }}>
          <div>
            <div className="eyebrow">Mayordomía</div>
            <div className="display" style={{ fontSize: 22, marginTop: 4 }}>Todos los fondos</div>
          </div>
          <span className="chip">{sorted.length} fondos</span>
        </div>
        <div className="col" style={{ gap: 16, marginTop: 18, maxHeight: 280, overflowY: "auto", paddingRight: 4 }}>
          {sorted.map((f, i) => {
            const pct = total ? (f.balance / total * 100) : 0;
            const barPct = max ? (f.balance / max * 100) : 0;
            return (
              <div key={f.id}>
                <div className="row between" style={{ gap: 10, marginBottom: 7 }}>
                  <div className="row" style={{ gap: 10, minWidth: 0 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: colorFor(i), flexShrink: 0 }}/>
                    <span style={{ fontSize: 13.5, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                  </div>
                  <div className="row" style={{ gap: 10, flexShrink: 0 }}>
                    <span className="tnum mono" style={{ fontSize: 13, fontWeight: 600 }}>{fmtChartNum(f.balance)}</span>
                    <span className="tnum mono muted" style={{ fontSize: 12, minWidth: 42, textAlign: "right" }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div style={{ height: 7, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                  <div style={{ width: barPct + "%", height: "100%", background: colorFor(i), borderRadius: 999, transition: "width 0.4s ease" }}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FundDonut({ slices, total }) {
  const r = 58, R = 92;   // anillo delgado, hueco grande (sin texto al centro)
  let angle = -Math.PI / 2;
  const arcs = slices.map((d, i) => {
    const frac = total ? d.v / total : 0;
    const sweep = frac * Math.PI * 2;
    const a0 = angle, a1 = angle + sweep - (slices.length > 1 ? 0.014 : 0);
    angle += sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const x0 = 100 + R * Math.cos(a0), y0 = 100 + R * Math.sin(a0);
    const x1 = 100 + R * Math.cos(a1), y1 = 100 + R * Math.sin(a1);
    const x0i = 100 + r * Math.cos(a0), y0i = 100 + r * Math.sin(a0);
    const x1i = 100 + r * Math.cos(a1), y1i = 100 + r * Math.sin(a1);
    return <path key={i} d={`M ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} L ${x1i} ${y1i} A ${r} ${r} 0 ${large} 0 ${x0i} ${y0i} Z`} fill={d.color}/>;
  });
  return (
    <svg viewBox="0 0 200 200" style={{ width: 210, height: 210, flexShrink: 0, display: "block" }}>
      {arcs}
    </svg>
  );
}

// ============ FONDOS · Input de monto formateado ============
function MoneyInput({ value, onChange, placeholder, hasError }) {
  const [focused, setFocused] = useStateF(false);
  const fmt = (n) => n === "" || n === undefined || n === null ? "" :
    Number(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return (
    <div className={`input-wrap${hasError ? " error" : ""}`}>
      <span className="tnum" style={{ color: "var(--ink-3)", fontWeight: 600, fontSize: 13, flexShrink: 0 }}>RD$</span>
      <input
        type={focused ? "number" : "text"}
        inputMode="decimal"
        min="0"
        value={focused ? (value === "" ? "" : value) : fmt(value)}
        placeholder={placeholder || "0.00"}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onChange={e => onChange(e.target.value)}
        style={{ minWidth: 0 }}
      />
    </div>
  );
}

// ============ FONDOS · Mantenimiento (crear / editar fondo) ============
function FundForm({ mode, item, onSave, onClose }) {
  const [v, setV] = useStateF({
    name:        item?.name || "",
    description: item?.description || "",
    goal:        item?.goal ?? "",
    balance:     item?.balance ?? "",
    startDate:   item?.startDate || "",
    endDate:     item?.endDate || "",
    active:      item?.active ?? true,
    primary:     item?.primary ?? false,
  });
  const [errs, setErrs] = useStateF({});
  const upd = (k, val) => setV(s => ({ ...s, [k]: val }));

  const submit = () => {
    const e = {};
    if (!v.name.trim()) e.name = "Obligatorio";
    if (v.goal === "" || +v.goal <= 0) e.goal = "Meta inválida";
    if (!v.startDate) e.startDate = "Obligatorio";
    setErrs(e);
    if (Object.keys(e).length) return;
    onSave({
      name: v.name.trim(), description: v.description.trim(),
      goal: +v.goal, balance: +(v.balance || 0),
      startDate: v.startDate, endDate: v.endDate || null,
      active: v.active, primary: v.primary,
    });
  };

  const pct = v.goal && +v.goal > 0 ? Math.min(100, (+(v.balance || 0)) / +v.goal * 100) : 0;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{mode === "new" ? "Nuevo registro" : "Edición"}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>{mode === "new" ? "Nuevo fondo" : "Editar fondo"}</h2>
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>

        <div className="drawer-body col gap-md">
          <div className="field">
            <label>Nombre del fondo <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className={`input-wrap ${errs.name ? "error" : ""}`}>
              <input value={v.name} placeholder="Ej. Construcción del Templo" onChange={e => upd("name", e.target.value)}/>
            </div>
            {errs.name && <div className="help error">{errs.name}</div>}
          </div>

          <div className="field">
            <label>Descripción</label>
            <div className="input-wrap" style={{ alignItems: "flex-start", padding: "10px 12px" }}>
              <textarea rows={3} value={v.description} placeholder="¿Para qué es este fondo?"
                        onChange={e => upd("description", e.target.value)}/>
            </div>
          </div>

          <div className="row" style={{ gap: 12, flexWrap: "wrap" }}>
            <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label>Meta <span style={{ color: "var(--danger)" }}>*</span></label>
              <MoneyInput value={v.goal} onChange={val => upd("goal", val)} hasError={!!errs.goal}/>
              {errs.goal && <div className="help error">{errs.goal}</div>}
            </div>
            <div className="field" style={{ flex: "1 1 140px", minWidth: 0 }}>
              <label>Recaudado</label>
              <MoneyInput value={v.balance} onChange={val => upd("balance", val)}/>
            </div>
          </div>

          {/* Previsualización del avance */}
          {v.goal && +v.goal > 0 && (
            <div>
              <div className="row between" style={{ marginBottom: 6 }}>
                <span className="tiny muted">Avance hacia la meta</span>
                <span className="tnum mono" style={{ fontSize: 12, fontWeight: 600, color: pct >= 100 ? "var(--success)" : "var(--accent)" }}>{pct.toFixed(1)}%</span>
              </div>
              <div style={{ height: 7, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", borderRadius: 999, background: pct >= 100 ? "var(--success)" : "var(--accent)", transition: "width 0.3s ease" }}/>
              </div>
            </div>
          )}

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha inicio <span style={{ color: "var(--danger)" }}>*</span></label>
              <div className={`input-wrap ${errs.startDate ? "error" : ""}`}>
                <input type="date" value={v.startDate} onChange={e => upd("startDate", e.target.value)}/>
              </div>
              {errs.startDate && <div className="help error">{errs.startDate}</div>}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha fin</label>
              <div className="input-wrap">
                <input type="date" value={v.endDate} onChange={e => upd("endDate", e.target.value)}/>
              </div>
            </div>
          </div>

          <div className="row between" style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Fondo activo</div>
              <div className="tiny muted">Si está inactivo, no aparece al registrar movimientos.</div>
            </div>
            <CrudSwitch on={v.active} onChange={val => upd("active", val)}/>
          </div>

          <div className="row between" style={{ padding: "10px 0", borderTop: "1px solid var(--line)" }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 13 }}>Marcar como primario</div>
              <div className="tiny muted">El fondo primario recibe los ingresos por defecto.</div>
            </div>
            <CrudSwitch on={v.primary} onChange={val => upd("primary", val)}/>
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          <button className="btn primary" onClick={submit}>
            <Ic.check width={14}/> {mode === "new" ? "Crear fondo" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </>
  );
}

// ============ FONDOS · Listado (cards / tabla + menú popup) ============
const FUND_MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function fmtFundDate(s) {
  if (!s) return "—";
  const [y, m, d] = s.split("-").map(Number);
  return `${String(d).padStart(2,"0")} ${FUND_MES[m-1]} ${y}`;
}

function FundMenuItem({ icon, label, onClick, accent, danger }) {
  const [hover, setHover] = useStateF(false);
  const color = danger ? "var(--danger)" : accent ? "var(--accent)" : "var(--fg)";
  const bg = danger ? "color-mix(in oklab, var(--danger) 12%, transparent)" : accent ? "var(--accent-soft)" : "var(--bg-2)";
  return (
    <button role="menuitem" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 10px", borderRadius: 8,
        border: 0, cursor: "pointer", font: "inherit", fontSize: 13, fontWeight: 500, color,
        background: hover ? bg : "transparent", transition: "background 0.1s" }}>
      <span style={{ display: "grid", placeItems: "center", color }}>{icon}</span>{label}
    </button>
  );
}

function FundActionMenu({ fund, onEdit, onAddTx, onMakePrimary, onViewTx, onViewContrib, onDelete }) {
  const [open, setOpen] = useStateF(false);
  const close = () => setOpen(false);
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button className="btn ghost icon-only sm" title="Acciones" style={{ opacity: 1 }} onClick={() => setOpen(o => !o)}>
        <Ic.menu width={16}/>
      </button>
      {open && (
        <>
          <div onClick={close} style={{ position: "fixed", inset: 0, zIndex: 40 }}/>
          <div role="menu" style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 41,
            minWidth: 210, padding: 6, textAlign: "left",
            background: "var(--bg-1)", border: "1px solid var(--line)",
            borderRadius: 12, boxShadow: "var(--shadow-3)"
          }}>
            <FundMenuItem icon={<Ic.edit width={15}/>} label="Editar" onClick={() => { close(); onEdit(fund); }}/>
            <FundMenuItem icon={<Ic.plus width={15}/>} label="Agregar transacción" onClick={() => { close(); onAddTx(fund); }}/>
            {!fund.primary && <FundMenuItem icon={<Ic.star width={15}/>} label="Marcar como primario" accent onClick={() => { close(); onMakePrimary(fund); }}/>}
            <FundMenuItem icon={<Ic.list width={15}/>} label="Ver transacciones" onClick={() => { close(); onViewTx(fund); }}/>
            <FundMenuItem icon={<Ic.wallet width={15}/>} label="Ver contribuciones" onClick={() => { close(); onViewContrib(fund); }}/>
            <div style={{ height: 1, background: "var(--line)", margin: "4px 6px" }}/>
            <FundMenuItem icon={<Ic.trash width={15}/>} label="Eliminar" danger onClick={() => { close(); onDelete(fund); }}/>
          </div>
        </>
      )}
    </div>
  );
}

function FundsList({ funds, setFunds, toast, onNav }) {
  const [q, setQ] = useStateF("");
  const [statusF, setStatusF] = useStateF("all");
  const [view, setView] = useStateF("grid");
  const [delFund, setDelFund] = useStateF(null);
  const [formFund, setFormFund] = useStateF(null);   // { mode, item }
  const [page, setPage] = useStateF(1);
  const [pageSize, setPageSize] = useStateF(10);

  const filtered = funds.filter(f => {
    if (statusF === "active" && !f.active) return false;
    if (statusF === "inactive" && f.active) return false;
    if (q.trim() && !f.name.toLowerCase().includes(q.trim().toLowerCase())) return false;
    return true;
  });

  // Paginación (estándar 10/15/25/50)
  useEffectF(() => { setPage(1); }, [q, statusF, pageSize, view]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  const pctOf = (f) => f.goal ? Math.min(100, f.balance / f.goal * 100) : 0;

  // Handlers de menú
  const makePrimary = (f) => { setFunds(funds.map(x => ({ ...x, primary: x.id === f.id }))); toast?.("success", "Fondo primario actualizado", f.name); };
  const doDelete = () => { setFunds(funds.filter(x => x.id !== delFund.id)); toast?.("success", "Fondo eliminado", delFund.name); setDelFund(null); };
  const saveForm = (data) => {
    if (formFund.mode === "new") {
      const id = Math.max(0, ...funds.map(x => x.id)) + 1;
      let next = [...funds, { id, change: 0, ...data }];
      if (data.primary) next = next.map(x => ({ ...x, primary: x.id === id }));
      setFunds(next);
      toast?.("success", "Fondo creado", data.name);
    } else {
      const editId = formFund.item.id;
      let next = funds.map(x => x.id === editId ? { ...x, ...data } : x);
      if (data.primary) next = next.map(x => ({ ...x, primary: x.id === editId }));
      setFunds(next);
      toast?.("success", "Fondo actualizado", data.name);
    }
    setFormFund(null);
  };
  const menuProps = (f) => ({
    fund: f,
    onEdit: () => setFormFund({ mode: "edit", item: f }),
    onAddTx: () => { onNav?.("transacciones"); toast?.("info", "Nueva transacción", f.name); },
    onMakePrimary: makePrimary,
    onViewTx: () => onNav?.("transacciones"),
    onViewContrib: () => onNav?.("contribuciones"),
    onDelete: (x) => setDelFund(x),
  });

  const PrimarioBadge = () => (
    <span className="chip violet" style={{ fontWeight: 600 }}><Ic.star width={11}/> Primario</span>
  );
  const EstadoBadge = ({ active }) => (
    <span className={`chip ${active ? "success" : ""}`} style={!active ? { color: "var(--ink-3)" } : undefined}>
      <span className="pip"/> {active ? "Activo" : "Inactivo"}
    </span>
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="card flat" style={{ padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div className="search" style={{ flex: 1, minWidth: 220 }}>
          <Ic.search width={16} stroke="var(--ink-3)"/>
          <input placeholder="Buscar fondo…" value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
          {[["all","Todos"],["active","Activos"],["inactive","Inactivos"]].map(([v, l]) => (
            <button key={v} onClick={() => setStatusF(v)} className="btn sm" style={{
              background: statusF === v ? "var(--surface)" : "transparent",
              color: statusF === v ? "var(--ink)" : "var(--ink-3)",
              boxShadow: statusF === v ? "var(--shadow-1)" : "none",
              fontWeight: 500, padding: "6px 12px"
            }}>{l}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
          {[["grid", <Ic.grid width={16}/>], ["list", <Ic.list width={16}/>]].map(([v, ic]) => (
            <button key={v} onClick={() => setView(v)} className="btn sm icon-only" title={v === "grid" ? "Cuadrícula" : "Lista"} style={{
              background: view === v ? "var(--surface)" : "transparent",
              color: view === v ? "var(--accent)" : "var(--ink-3)",
              boxShadow: view === v ? "var(--shadow-1)" : "none", padding: 7
            }}>{ic}</button>
          ))}
        </div>
        <button className="btn primary" onClick={() => setFormFund({ mode: "new", item: null })}>
          <Ic.plus width={14}/> Nuevo fondo
        </button>
      </div>

      {/* Vista cuadrícula */}
      {view === "grid" && (
        <div className="grid-12">
          {pageRows.map(f => {
            const pct = pctOf(f);
            return (
              <div key={f.id} className="card span-4" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="row between" style={{ alignItems: "flex-start", gap: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="display" style={{ fontSize: 18, letterSpacing: "-0.01em" }}>{f.name}</span>
                      {f.primary && <PrimarioBadge/>}
                    </div>
                    <div style={{ marginTop: 8 }}><EstadoBadge active={f.active}/></div>
                  </div>
                  <FundActionMenu {...menuProps(f)}/>
                </div>
                <div className="muted" style={{ fontSize: 12.5, lineHeight: 1.5, minHeight: 38,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {f.description}
                </div>
                <div className="row between" style={{ gap: 12 }}>
                  <div>
                    <div className="tiny muted">Recaudado</div>
                    <div className="tnum" style={{ fontWeight: 700, fontSize: 18, marginTop: 2 }}>{fmtRD(f.balance)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="tiny muted">Meta</div>
                    <div className="tnum mono muted" style={{ fontSize: 13, marginTop: 4 }}>{fmtRD(f.goal)}</div>
                  </div>
                </div>
                <div>
                  <div style={{ height: 7, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                    <div style={{ width: pct + "%", height: "100%", borderRadius: 999, transition: "width 0.4s ease",
                      background: pct >= 100 ? "var(--success)" : "var(--accent)" }}/>
                  </div>
                  <div className="row between" style={{ marginTop: 6 }}>
                    <span className="tiny muted row" style={{ gap: 5 }}><Ic.cal width={12}/> {fmtFundDate(f.startDate)}</span>
                    <span className="tnum mono" style={{ fontSize: 12, fontWeight: 600, color: pct >= 100 ? "var(--success)" : "var(--accent)" }}>{pct.toFixed(1)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          {total === 0 && (
            <div className="card span-12" style={{ padding: 40, textAlign: "center" }}>
              <div className="muted">No hay fondos que coincidan con los filtros.</div>
            </div>
          )}
        </div>
      )}

      {/* Vista lista */}
      {view === "list" && (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="col-actions">Acciones</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th style={{ textAlign: "right" }}>Recaudado</th>
                <th style={{ textAlign: "right" }}>Meta</th>
                <th style={{ textAlign: "right" }}>% avance</th>
                <th>Activo desde</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map(f => {
                const pct = pctOf(f);
                return (
                  <tr key={f.id}>
                    <td className="col-actions"><FundActionMenu {...menuProps(f)}/></td>
                    <td>
                      <div className="row" style={{ gap: 8, alignItems: "center" }}>
                        <span style={{ fontWeight: 500 }}>{f.name}</span>
                        {f.primary && <PrimarioBadge/>}
                      </div>
                    </td>
                    <td><EstadoBadge active={f.active}/></td>
                    <td className="tnum mono" style={{ textAlign: "right", fontWeight: 600 }}>{fmtRD(f.balance)}</td>
                    <td className="tnum mono muted" style={{ textAlign: "right" }}>{fmtRD(f.goal)}</td>
                    <td style={{ textAlign: "right" }}>
                      <div className="row" style={{ gap: 8, justifyContent: "flex-end", alignItems: "center" }}>
                        <div style={{ width: 64, height: 6, background: "var(--surface-2)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ width: pct + "%", height: "100%", borderRadius: 999, background: pct >= 100 ? "var(--success)" : "var(--accent)" }}/>
                        </div>
                        <span className="tnum mono" style={{ fontSize: 12.5, fontWeight: 600, minWidth: 44, color: pct >= 100 ? "var(--success)" : "var(--accent)" }}>{pct.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="muted tnum">{fmtFundDate(f.startDate)}</td>
                  </tr>
                );
              })}
              {total === 0 && (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 40 }} className="muted">No hay fondos que coincidan con los filtros.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {total > 0 && (
        <Pagination page={safePage} totalPages={totalPages} total={total}
          pageStart={pageStart} pageEnd={pageEnd} pageSize={pageSize}
          onPage={setPage} onPageSize={setPageSize} noun="fondos"/>
      )}

      {delFund && (
        <ConfirmDialog
          title="¿Eliminar fondo?"
          message="Se quitará de la lista. Esta acción no se puede deshacer."
          item={{ name: delFund.name }}
          onConfirm={doDelete}
          onClose={() => setDelFund(null)}
        />
      )}

      {formFund && (
        <FundForm
          mode={formFund.mode}
          item={formFund.item}
          onSave={saveForm}
          onClose={() => setFormFund(null)}
        />
      )}
    </div>
  );
}

Object.assign(window, { FundsSummary, FundsList });
