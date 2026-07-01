/* global React, Ic, fmtRD */
/**
 * transacciones.jsx — Pestaña de Transacciones de Finanzas.
 *
 * Vista global de todos los movimientos (Ingresos y Egresos) de todos los fondos.
 * Columnas: Movimiento · Fondo · Monto · Estado · Creado por (+fecha) · Autorizado por (+fecha) · Acciones
 *
 * Reglas de negocio:
 *   - INGRESO: quien lo crea es la misma persona que lo autoriza (createdBy === authorizedBy),
 *     y la autorización ocurre en el mismo instante. Nace "Confirmado".
 *   - EGRESO: una persona lo registra (createdBy) y otra con permisos lo autoriza (authorizedBy).
 *     Mientras está "Pendiente", authorizedBy/authorizedAt son null. La acción "Autorizar"
 *     del menú solo aparece para egresos pendientes.
 *
 * Componentes exportados: TransaccionesTab
 */

const { useState: useStateTx, useMemo: useMemoTx, useEffect: useEffectTx, useRef: useRefTx } = React;

const TX_FUNDS   = ["General", "Construcción", "Beneficencia", "Misiones Haití"];
const TX_PEOPLE  = ["Roberto Almonte", "Wilkin Almonte", "Carmen Rosario", "José Manuel Frías", "Yokasta Mejía"];
const TX_METHODS = ["Efectivo", "Transferencia", "Cheque", "Tarjeta"];
// Usuario "sesión actual" — quien autoriza/registra desde la app
const TX_CURRENT_USER = "Roberto Almonte";
const TX_IS_ADMIN     = true;   // en producción vendrá del contexto de sesión

// ---- helpers de fecha ----
function txParse(s) {
  // "2026-05-08 09:14" | "2026-05-08"
  if (!s) return null;
  const [d, t] = s.split(" ");
  const [y, m, day] = d.split("-").map(Number);
  let hh = 0, mm = 0;
  if (t) { [hh, mm] = t.split(":").map(Number); }
  return new Date(y, m - 1, day, hh, mm);
}
const TX_MES = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
function txFmtDate(s) {
  const d = txParse(s);
  if (!d) return "—";
  return `${String(d.getDate()).padStart(2,"0")} ${TX_MES[d.getMonth()]} ${d.getFullYear()}`;
}
function txFmtTime(s) {
  const d = txParse(s);
  if (!d || s.indexOf(" ") === -1) return null;
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2,"0");
  const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
  return `${h}:${m} ${ap}`;
}
function txNowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2,"0");
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

// =================================================================
// Celda persona + fecha (reutilizada para "Creado por" y "Autorizado por")
// =================================================================
function PersonCell({ name, stamp, pendingLabel }) {
  if (!name) {
    return <span className="chip warn" style={{ fontWeight: 500 }}><span className="pip"/> {pendingLabel || "Pendiente"}</span>;
  }
  const time = txFmtTime(stamp);
  return (
    <div>
      <div style={{ fontWeight: 500, fontSize: 13, whiteSpace: "nowrap" }}>{name}</div>
      <div className="tiny muted" style={{ whiteSpace: "nowrap" }}>
        {txFmtDate(stamp)}{time ? ` · ${time}` : ""}
      </div>
    </div>
  );
}

// =================================================================
// Menú de acciones (hamburguesa) por fila
// =================================================================
function TxActionMenu({ tx, onEdit, onAuthorize, onDelete, isAdmin }) {
  const [open, setOpen] = useStateTx(false);
  const [menuPos, setMenuPos] = useStateTx({ top: 0, bottom: "auto", left: 0, right: "auto" });
  const btnRef = useRefTx(null);
  const canAuthorize = isAdmin && tx.type === "Egreso" && tx.status === "Pendiente";

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const menuW = 196;
      const menuH = 44 * (2 + (canAuthorize ? 1 : 0));
      const spaceBelow = window.innerHeight - r.bottom;
      const spaceRight = window.innerWidth - r.left;
      const openUp   = spaceBelow < menuH + 24;
      const openLeft = spaceRight < menuW + 8;
      setMenuPos({
        top:    openUp   ? "auto"                        : r.bottom + 6,
        bottom: openUp   ? window.innerHeight - r.top + 6 : "auto",
        left:   openLeft ? "auto"                        : r.left,
        right:  openLeft ? window.innerWidth - r.right    : "auto",
      });
    }
    setOpen(o => !o);
  };

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        ref={btnRef}
        className="btn ghost icon-only sm"
        title="Acciones"
        style={{ opacity: 1 }}
        onClick={handleToggle}
      >
        <Ic.menu width={16}/>
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 200 }}/>
          <div
            role="menu"
            style={{
              position: "fixed",
              top: menuPos.top,
              bottom: menuPos.bottom,
              left: menuPos.left,
              right: menuPos.right,
              zIndex: 201,
              minWidth: 188, padding: 6, textAlign: "left",
              background: "var(--bg-1)", border: "1px solid var(--line)",
              borderRadius: 12, boxShadow: "var(--shadow-3)"
            }}
          >
            <TxMenuItem icon={<Ic.edit width={15}/>} label="Editar"
              onClick={() => { setOpen(false); onEdit(tx); }} />
            {canAuthorize && (
              <TxMenuItem icon={<Ic.check width={15}/>} label="Autorizar" accent
                onClick={() => { setOpen(false); onAuthorize(tx); }} />
            )}
            <div style={{ height: 1, background: "var(--line)", margin: "4px 6px" }}/>
            <TxMenuItem icon={<Ic.trash width={15}/>} label="Eliminar" danger
              onClick={() => { setOpen(false); onDelete(tx); }} />
          </div>
        </>
      )}
    </div>
  );
}

function TxMenuItem({ icon, label, onClick, accent, danger }) {
  const [hover, setHover] = useStateTx(false);
  const color = danger ? "var(--danger)" : accent ? "var(--accent)" : "var(--fg)";
  const bg = danger ? "color-mix(in oklab, var(--danger) 12%, transparent)"
           : accent ? "var(--accent-soft)"
           : "var(--bg-2)";
  return (
    <button
      role="menuitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%",
        padding: "8px 10px", borderRadius: 8, border: 0, cursor: "pointer",
        font: "inherit", fontSize: 13, fontWeight: 500,
        color, background: hover ? bg : "transparent",
        transition: "background 0.1s"
      }}
    >
      <span style={{ display: "grid", placeItems: "center", color }}>{icon}</span>
      {label}
    </button>
  );
}

// =================================================================
// Modal: Registrar / Editar movimiento
// =================================================================
function MovimientoForm({ mode, item, onSave, onAuthorize, onClose }) {
  const init = {
    type:    item?.type    || "Ingreso",
    category: item?.category || "",
    desc:    item?.desc    || "",
    fund:    item?.fund    || "",
    amount:  item ? Math.abs(item.amount) : "",
    method:  item?.method  || "",
    member:  item?.member && item.member !== "—" ? item.member : "",
    date:    item?.date    || "2026-05-08",
    createdBy: item?.createdBy || TX_CURRENT_USER,
  };
  const [vals, setVals] = useStateTx(init);
  const [errs, setErrs] = useStateTx({});
  const upd = (k, v) => setVals(s => ({ ...s, [k]: v }));
  const isIngreso = vals.type === "Ingreso";

  const submit = (doAuth = false) => {
    const e = {};
    if (!vals.desc.trim()) e.desc = "Obligatorio";
    if (!vals.fund) e.fund = "Obligatorio";
    if (!vals.amount || +vals.amount <= 0) e.amount = "Monto inválido";
    if (!vals.method) e.method = "Obligatorio";
    if (!vals.category) e.category = "Obligatorio";
    if (!vals.createdBy) e.createdBy = "Obligatorio";
    setErrs(e);
    if (Object.keys(e).length) return;
    if (doAuth && onAuthorize) { onAuthorize(vals); } else { onSave(vals); }
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose}/>
      <div className="drawer">
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <div className="eyebrow">{mode === "new" ? "Nuevo registro" : mode === "authorize" ? "Pendiente de autorización" : "Edición"}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 18 }}>
              {mode === "new" ? "Registrar movimiento" : mode === "authorize" ? "Autorizar movimiento" : "Editar movimiento"}
            </h2>
          </div>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>

        <div className="drawer-body col gap-md">
          {/* Tipo — segmented */}
          <div className="field">
            <label>Tipo de movimiento</label>
            <div className="row" style={{ gap: 8 }}>
              {[["Ingreso","var(--ok)"],["Egreso","var(--danger)"]].map(([t, c]) => {
                const active = vals.type === t;
                return (
                  <button key={t} type="button" onClick={() => upd("type", t)} className="btn"
                    style={{
                      flex: 1, justifyContent: "center",
                      background: active ? "color-mix(in oklab, " + c + " 14%, transparent)" : "transparent",
                      color: active ? c : "var(--fg-dim)",
                      borderColor: active ? "color-mix(in oklab, " + c + " 40%, transparent)" : "var(--line-2)",
                      fontWeight: 600
                    }}>
                    {t === "Ingreso" ? <Ic.arrowUp width={14}/> : <Ic.arrowDn width={14}/>} {t}
                  </button>
                );
              })}
            </div>
            <div className="help">
              {isIngreso
                ? "En ingresos, quien registra autoriza automáticamente."
                : "Los egresos quedan Pendientes hasta que un usuario con permisos los autorice."}
            </div>
          </div>

          {/* Categoría según tipo */}
          <div className="field">
            <label>{isIngreso ? "Categoría" : "Tipo de gasto"} <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className={`input-wrap ${errs.category ? "error" : ""}`}>
              <select value={vals.category} onChange={e => upd("category", e.target.value)}>
                <option value="" disabled>Seleccionar…</option>
                {(isIngreso
                  ? (window.EVO_DATA.incomeTypes  || []).filter(t => t.active)
                  : (window.EVO_DATA.expenseTypes || []).filter(t => t.active)
                ).map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
              </select>
            </div>
            {errs.category && <div className="help error">{errs.category}</div>}
          </div>

          <div className="field">
            <div className={`input-wrap ${errs.desc ? "error" : ""}`}>
              <input value={vals.desc} placeholder="Ej. Diezmo dominical, Pago electricidad…"
                     onChange={e => upd("desc", e.target.value)}/>
            </div>
            {errs.desc && <div className="help error">{errs.desc}</div>}
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Fondo <span style={{ color: "var(--danger)" }}>*</span></label>
              <div className={`input-wrap ${errs.fund ? "error" : ""}`}>
                <select value={vals.fund} onChange={e => upd("fund", e.target.value)}>
                  <option value="" disabled>Seleccionar…</option>
                  {TX_FUNDS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              {errs.fund && <div className="help error">{errs.fund}</div>}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Monto (RD$) <span style={{ color: "var(--danger)" }}>*</span></label>
              <div className={`input-wrap ${errs.amount ? "error" : ""}`}>
                <input type="number" min="0" value={vals.amount} placeholder="0.00"
                       onChange={e => upd("amount", e.target.value)}/>
              </div>
              {errs.amount && <div className="help error">{errs.amount}</div>}
            </div>
          </div>

          <div className="row" style={{ gap: 12 }}>
            <div className="field" style={{ flex: 1 }}>
              <label>Método de pago <span style={{ color: "var(--danger)" }}>*</span></label>
              <div className={`input-wrap ${errs.method ? "error" : ""}`}>
                <select value={vals.method} onChange={e => upd("method", e.target.value)}>
                  <option value="" disabled>Seleccionar…</option>
                  {TX_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              {errs.method && <div className="help error">{errs.method}</div>}
            </div>
            <div className="field" style={{ flex: 1 }}>
              <label>Fecha</label>
              <div className="input-wrap">
                <input type="date" value={vals.date} onChange={e => upd("date", e.target.value)}/>
              </div>
            </div>
          </div>

          {isIngreso && (
            <div className="field">
              <label>Contribuyente <span className="muted" style={{ fontWeight: 400 }}>(opcional)</span></label>
              <div className="input-wrap">
                <input value={vals.member} placeholder="Nombre del miembro o dejar en blanco"
                       onChange={e => upd("member", e.target.value)}/>
              </div>
            </div>
          )}

          <div className="field">
            <label>Creado por <span style={{ color: "var(--danger)" }}>*</span></label>
            <div className={`input-wrap ${errs.createdBy ? "error" : ""}`}>
              <select value={vals.createdBy} onChange={e => upd("createdBy", e.target.value)}>
                {TX_PEOPLE.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {isIngreso
              ? <div className="help">Se asignará también como autorizador.</div>
              : <div className="help">El autorizador se asigna al momento de autorizar.</div>}
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn outline" onClick={onClose}>Cancelar</button>
          {mode === "authorize" ? (
            <>
              <button className="btn outline" onClick={() => submit(false)}>Guardar cambios</button>
              <button className="btn primary" style={{ background: "var(--accent)" }} onClick={() => submit(true)}>
                <Ic.check width={14}/> Autorizar
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={() => submit(false)}>
              <Ic.check width={14}/> {mode === "new" ? "Registrar movimiento" : "Guardar cambios"}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

// =================================================================
// Modal: Autorizar transacción (+ confirmación anidada)
// =================================================================
function AuthorizeModal({ tx, onConfirm, onClose }) {
  const [confirming, setConfirming] = useStateTx(false);

  const Row = ({ label, children }) => (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
      <div className="tiny muted" style={{ marginBottom: 3 }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: 15, color: "var(--accent)" }}>{children}</div>
    </div>
  );

  return (
    <>
      <div className="drawer-backdrop" style={{ zIndex: 60 }} onClick={onClose}/>
      <div style={{
        position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        zIndex: 61, background: "var(--bg-1)", border: "1px solid var(--line)",
        borderRadius: "var(--radius-lg)", width: 480, maxWidth: "94vw",
        boxShadow: "var(--shadow-3)", overflow: "hidden"
      }}>
        {/* Header */}
        <div className="row" style={{
          gap: 12, alignItems: "center", padding: "16px 18px",
          borderBottom: "1px solid var(--line)", background: "var(--bg-2)"
        }}>
          <span style={{
            width: 36, height: 36, borderRadius: 10, flexShrink: 0,
            background: "var(--accent-soft)", color: "var(--accent)",
            display: "grid", placeItems: "center"
          }}>
            <Ic.check width={18}/>
          </span>
          <h3 style={{ margin: 0, fontSize: 17, flex: 1 }}>Autorizar transacción</h3>
          <button className="btn ghost icon-only" onClick={onClose}><Ic.x width={18}/></button>
        </div>

        {/* Detalles */}
        <div style={{ padding: "4px 20px 18px" }}>
          <Row label="Fondo">{tx.fund}</Row>
          <Row label="Monto">RD$ {fmtRD(Math.abs(tx.amount))}</Row>
          <Row label="Descripción">{tx.desc}</Row>
          <Row label="Método de pago">{tx.method || "—"}</Row>
          <div style={{ padding: "12px 0" }}>
            <div className="tiny muted" style={{ marginBottom: 3 }}>Creado por</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: "var(--accent)" }}>{tx.createdBy}</div>
            <div className="tiny muted" style={{ marginTop: 2 }}>{txFmtDate(tx.createdAt)}{txFmtTime(tx.createdAt) ? ` · ${txFmtTime(tx.createdAt)}` : ""}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="row" style={{
          justifyContent: "flex-end", gap: 8, padding: "14px 18px",
          borderTop: "1px solid var(--line)", background: "var(--bg-2)"
        }}>
          <button className="btn outline" onClick={onClose}><Ic.x width={14}/> Cancelar</button>
          <button className="btn primary" onClick={() => setConfirming(true)}>
            <Ic.check width={14}/> Autorizar
          </button>
        </div>
      </div>

      {/* Confirmación anidada */}
      {confirming && (
        <>
          <div className="drawer-backdrop" style={{ zIndex: 70, background: "rgba(0,0,0,0.35)" }} onClick={() => setConfirming(false)}/>
          <div style={{
            position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
            zIndex: 71, background: "var(--bg-1)", border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)", padding: 24, width: 400, maxWidth: "92vw",
            boxShadow: "var(--shadow-3)", textAlign: "center"
          }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Confirmar autorización</h3>
            <p className="muted" style={{ margin: "10px 0 0", fontSize: 13.5, lineHeight: 1.5 }}>
              ¿Autorizar esta transacción? Esta acción marcará el movimiento como aprobado.
            </p>
            <div className="row" style={{ justifyContent: "center", gap: 8, marginTop: 22 }}>
              <button className="btn outline" onClick={() => setConfirming(false)}>Cancelar</button>
              <button className="btn primary" onClick={() => onConfirm(tx)}>
                <Ic.check width={14}/> Autorizar
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

// =================================================================
// Pestaña principal
// =================================================================
function TransaccionesTab({ toast }) {
  const D = window.EVO_DATA;
  const [rows, setRows]   = useStateTx(() => D.transactions.map(t => ({ ...t })));
  const [typeF, setTypeF] = useStateTx("all");
  const [statusF, setStatusF] = useStateTx("all");
  const [q, setQ] = useStateTx("");

  const [form, setForm]   = useStateTx(null);   // { mode, item }
  const [authTx, setAuthTx] = useStateTx(null);
  const [delTx, setDelTx] = useStateTx(null);

  const [page, setPage] = useStateTx(1);
  const [pageSize, setPageSize] = useStateTx(10);

  const filtered = useMemoTx(() => {
    let arr = rows;
    if (typeF !== "all")   arr = arr.filter(t => t.type.toLowerCase() === typeF);
    if (statusF !== "all") arr = arr.filter(t => t.status === statusF);
    if (q.trim()) {
      const Q = q.trim().toLowerCase();
      arr = arr.filter(t =>
        [t.desc, t.member, t.fund, t.createdBy, t.authorizedBy].some(v => String(v || "").toLowerCase().includes(Q))
      );
    }
    return arr;
  }, [rows, typeF, statusF, q]);

  // ---- paginación ----
  useEffectTx(() => { setPage(1); }, [typeF, statusF, q, pageSize]);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, total);
  const pageRows = filtered.slice(pageStart, pageEnd);

  // ---- mutaciones ----
  const saveForm = (vals) => {
    const signed = vals.type === "Egreso" ? -Math.abs(+vals.amount) : Math.abs(+vals.amount);
    if (form.mode === "new") {
      const id = Math.max(0, ...rows.map(r => r.id)) + 1;
      const stamp = txNowStamp();
      const isIngreso = vals.type === "Ingreso";
      const rec = {
        id, date: vals.date, desc: vals.desc.trim(), member: vals.member.trim() || "—",
        amount: signed, type: vals.type, fund: vals.fund, method: vals.method,
        status: isIngreso ? "Confirmado" : "Pendiente",
        createdBy: vals.createdBy, createdAt: stamp,
        authorizedBy: isIngreso ? vals.createdBy : null,
        authorizedAt: isIngreso ? stamp : null,
      };
      setRows([rec, ...rows]);
      toast?.("success", "Movimiento registrado", `${vals.type} · RD$ ${fmtRD(Math.abs(signed))}`);
    } else {
      const prev = form.item;
      const isIngreso = vals.type === "Ingreso";
      const next = {
        ...prev,
        date: vals.date, desc: vals.desc.trim(), member: vals.member.trim() || "—",
        amount: signed, type: vals.type, fund: vals.fund, method: vals.method,
        createdBy: vals.createdBy,
      };
      // Si es ingreso, autorizador sigue al creador
      if (isIngreso) {
        next.status = "Confirmado";
        next.authorizedBy = vals.createdBy;
        next.authorizedAt = prev.authorizedAt || txNowStamp();
      } else if (prev.type === "Ingreso") {
        // cambió de Ingreso a Egreso → vuelve a pendiente
        next.status = "Pendiente";
        next.authorizedBy = null;
        next.authorizedAt = null;
      }
      setRows(rows.map(r => r.id === prev.id ? next : r));
      toast?.("success", "Cambios guardados", next.desc);
    }
    setForm(null);
  };

  const doAuthorize = (tx) => {
    setRows(rows.map(r => r.id === tx.id
      ? { ...r, status: "Confirmado", authorizedBy: TX_CURRENT_USER, authorizedAt: txNowStamp() }
      : r));
    setAuthTx(null);
    toast?.("success", "Transacción autorizada", `${tx.desc} · aprobada por ${TX_CURRENT_USER}`);
  };

  const authorizeFromForm = (vals) => {
    const prev = form.item;
    const signed = -Math.abs(+vals.amount);
    const next = {
      ...prev,
      date: vals.date, desc: vals.desc.trim(), member: (vals.member || "").trim() || "—",
      amount: signed, type: "Egreso", fund: vals.fund, method: vals.method,
      createdBy: vals.createdBy,
      status: "Confirmado", authorizedBy: TX_CURRENT_USER, authorizedAt: txNowStamp(),
    };
    setRows(rows.map(r => r.id === prev.id ? next : r));
    setForm(null);
    toast?.("success", "Transacción autorizada", `${next.desc} · aprobada por ${TX_CURRENT_USER}`);
  };

  const doDelete = () => {
    setRows(rows.filter(r => r.id !== delTx.id));
    toast?.("success", "Movimiento eliminado", delTx.desc);
    setDelTx(null);
  };

  const segBtn = (cur, set, opts) => (
    <div className="row" style={{ gap: 4, padding: 4, background: "var(--surface-2)", borderRadius: 10 }}>
      {opts.map(([v, l]) => (
        <button key={v} onClick={() => set(v)} className="btn sm" style={{
          background: cur === v ? "var(--surface)" : "transparent",
          color: cur === v ? "var(--ink)" : "var(--ink-3)",
          boxShadow: cur === v ? "var(--shadow-1)" : "none",
          fontWeight: 500, padding: "6px 12px"
        }}>{l}</button>
      ))}
    </div>
  );

  return (
    <>
      {/* Filtros */}
      <div className="card flat" style={{ padding: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 14 }}>
        <div className="search" style={{ flex: 1, minWidth: 240 }}>
          <Ic.search width={16} stroke="var(--ink-3)"/>
          <input placeholder="Buscar por descripción, persona, fondo…"
                 value={q} onChange={e => setQ(e.target.value)}/>
        </div>
        {segBtn(typeF, setTypeF, [["all","Todos"],["ingreso","Ingresos"],["egreso","Egresos"]])}
        {segBtn(statusF, setStatusF, [["all","Todo estado"],["Pendiente","Pendientes"],["Confirmado","Aprobados"]])}
        <button className="btn primary" onClick={() => setForm({ mode: "new", item: null })}>
          <Ic.plus width={14}/> Registrar movimiento
        </button>
      </div>

      {/* Tabla */}
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th className="col-actions">Acciones</th>
              <th>Movimiento</th>
              <th>Fondo</th>
              <th style={{ textAlign: "right" }}>Monto</th>
              <th>Estado</th>
              <th>Creado por</th>
              <th>Autorizado por</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map(t => (
              <tr key={t.id}>
                <td className="col-actions">
                  <TxActionMenu
                    tx={t}
                    isAdmin={TX_IS_ADMIN}
                    onEdit={(x) => setForm({ mode: "edit", item: x })}
                    onAuthorize={(x) => setForm({ mode: "authorize", item: x })}
                    onDelete={(x) => setDelTx(x)}
                  />
                </td>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 10, display: "grid", placeItems: "center", flexShrink: 0,
                      background: t.type === "Ingreso" ? "var(--success-bg)" : "var(--danger-bg)",
                      color: t.type === "Ingreso" ? "var(--success)" : "var(--danger)"
                    }}>
                      {t.type === "Ingreso" ? <Ic.arrowUp width={16}/> : <Ic.arrowDn width={16}/>}
                    </span>
                    <div>
                      <div style={{ fontWeight: 500 }}>{t.desc}</div>
                      <div className="tiny muted">{t.type}{t.member && t.member !== "—" ? ` · ${t.member}` : ""}</div>
                    </div>
                  </div>
                </td>
                <td><span className="chip">{t.fund}</span></td>
                <td className="tnum mono" style={{ textAlign: "right", fontWeight: 600,
                  color: t.type === "Ingreso" ? "var(--success)" : "var(--danger)" }}>
                  {t.type === "Ingreso" ? "+" : "−"}{fmtRD(Math.abs(t.amount))}
                </td>
                <td>
                  <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className={`chip ${t.status === "Confirmado" ? "success" : "warn"}`}>
                      <span className="pip"/> {t.status === "Confirmado" ? "Aprobado" : "Pendiente"}
                    </span>
                    {TX_IS_ADMIN && t.type === "Egreso" && t.status === "Pendiente" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setForm({ mode: "authorize", item: t }); }}
                        style={{
                          padding: "3px 10px", borderRadius: 6, border: "1px solid var(--accent)",
                          background: "transparent", color: "var(--accent)",
                          fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap"
                        }}
                      >Autorizar</button>
                    )}
                  </div>
                </td>
                <td><PersonCell name={t.createdBy} stamp={t.createdAt}/></td>
                <td><PersonCell name={t.authorizedBy} stamp={t.authorizedAt} pendingLabel="Pendiente"/></td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: 40 }} className="muted">
                  No hay transacciones que coincidan con los filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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
          noun="movimientos"
        />
      )}

      {/* Modales */}
      {form && (
        <MovimientoForm
          mode={form.mode}
          item={form.item}
          onSave={saveForm}
          onAuthorize={authorizeFromForm}
          onClose={() => setForm(null)}
        />
      )}

      {delTx && (
        <ConfirmDialog
          title="¿Eliminar movimiento?"
          message="Esta acción no se puede deshacer."
          item={{ name: delTx.desc }}
          onConfirm={doDelete}
          onClose={() => setDelTx(null)}
        />
      )}
    </>
  );
}

Object.assign(window, { TransaccionesTab });
