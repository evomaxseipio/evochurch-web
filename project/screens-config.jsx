/* global React, Ic, Avatar, CrudModule */
/**
 * Módulos de configuración con CRUD genérico.
 *
 * Cada función-pantalla es independiente y autocontenida. Si terminamos
 * el desarrollo a mitad de archivo, los módulos completados siguen
 * funcionando — no hay dependencias cruzadas.
 *
 *   - MinisteriosScreen   /ministerios
 *   - UsuariosScreen      /configuraciones/usuarios
 *   - GastosScreen        /expenses
 */
const { useState: useStateK } = React;

// ============================================================
// MÓDULO: Usuarios administradores
// ============================================================
function UsuariosScreen({ toast }) {
  const D = window.EVO_DATA;
  const [items, setItems] = useStateK(D.adminUsers);

  const roleColors = {
    "Administrador": "violet", "Pastor": "violet",
    "Tesorero": "green", "Secretario": "lila", "Líder": "lila",
  };

  const stats = {
    total:    items.length,
    activos:  items.filter(u => u.active).length,
    inactivos:items.filter(u => !u.active).length,
    roles:    D.roles.length,
    hoy:      items.filter(u => u.lastLogin?.startsWith("Hoy")).length,
  };

  const allCards = [
    { l: "Total de usuarios", v: stats.total,     c: "var(--primary)",    ic: "users"  },
    { l: "Usuarios activos",  v: stats.activos,   c: "var(--success)",    ic: "check"  },
    { l: "Inactivos",         v: stats.inactivos, c: "var(--muted)",      ic: "x"      },
    { l: "Conectados hoy",    v: stats.hoy,       c: "var(--info)",       ic: "bell"   },
  ];

  return (
    <div>
      {/* ── Page header ── */}
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Configuración · Acceso</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Usuarios <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>del sistema</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            {items.length} cuentas con acceso administrativo · {stats.activos} activas ahora
          </p>
        </div>
        <div className="row">
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "Usuarios_May2026.pdf descargado")}>
            <Ic.download width={16}/> PDF
          </button>
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "Usuarios_May2026.xlsx descargado")}>
            <Ic.download width={16}/> Excel
          </button>
        </div>
      </div>

      {/* ── Stat cards uniformes ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginTop: 22 }}>
        {allCards.map((s, i) => {
          const Icon = Ic[s.ic];
          return (
            <div key={i} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row between" style={{ alignItems: "center" }}>
                <div className="eyebrow">{s.l}</div>
                <div style={{
                  width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `color-mix(in oklab, ${s.c} 16%, transparent)`,
                  display: "grid", placeItems: "center", color: s.c,
                }}>
                  <Icon width={16}/>
                </div>
              </div>
              <div className="display" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", color: s.c }}>
                {s.v}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── CrudModule (sin header propio) ── */}
      <div style={{ marginTop: 18 }}>
        <CrudModule
          showHeader={false}
          newLabel="Nuevo usuario"
          data={items}
          setData={setItems}
          searchKeys={["email", "firstName", "lastName", "role"]}
          filters={[{ key: "active", label: "Estado", options: [
            { value: "true", label: "Activos" }, { value: "false", label: "Inactivos" },
          ]}]}
          columns={[
            { key: "email", label: "Usuario", render: (v, it) => (
              <div className="row" style={{ gap: 10 }}>
                <Avatar
                  initials={((it.firstName?.[0] || "") + (it.lastName?.[0] || "")).toUpperCase() || "??"}
                  size="md"
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{it.firstName} {it.lastName}</div>
                  <div className="tiny muted">{v}</div>
                </div>
              </div>
            )},
            { key: "role", label: "Rol", render: (v) => (
              <span className={`chip ${roleColors[v] || "info"}`}>{v}</span>
            )},
            { key: "lastLogin", label: "Último acceso", render: (v) => (
              <span className="tiny muted">{v || "Nunca"}</span>
            )},
            { key: "active", label: "Estado", render: (v) => (
              <span className={`chip ${v ? "green" : ""}`}>
                <span className="pip"/> {v ? "Activo" : "Inactivo"}
              </span>
            )},
          ]}
          fields={[
            { key: "firstName", label: "Nombre",             type: "text",   required: true, placeholder: "Roberto" },
            { key: "lastName",  label: "Apellido",           type: "text",   required: true, placeholder: "Almonte" },
            { key: "email",     label: "Correo electrónico", type: "email",  required: true, placeholder: "usuario@iglesia.do" },
            { key: "role",      label: "Rol",                type: "select", required: true,
              options: D.roles.map(r => ({ value: r.name, label: r.name })) },
            { key: "active",    label: "Cuenta activa",      type: "switch", default: true,
              hint: "Si está inactiva, el usuario no podrá iniciar sesión" },
          ]}
          onChange={(action, item) => {
            if (action === "create") toast?.("success", "Usuario creado",      `${item.email} ya puede iniciar sesión.`);
            if (action === "update") toast?.("success", "Usuario actualizado", `${item.email} guardado.`);
            if (action === "delete") toast?.("info",    "Usuario eliminado",   `${item.email} fue removido.`);
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// MÓDULO: Tipos de gasto
// ============================================================
function GastosScreen({ toast }) {
  const D = window.EVO_DATA;
  const [items, setItems] = useStateK(D.expenseTypes);

  const cards = [
    { l: "Tipos de gasto", v: items.length,                          c: "var(--accent)",  ic: "wallet" },
    { l: "Activos",        v: items.filter(t => t.active).length,    c: "var(--success)", ic: "check"  },
    { l: "Inactivos",      v: items.filter(t => !t.active).length,   c: "var(--muted)",   ic: "x"      },
  ];

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Finanzas · Configuración</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Tipos de gasto <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>de la iglesia</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>Categorías para clasificar las salidas de dinero en transacciones.</p>
        </div>
        <div className="row">
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "TiposGasto_May2026.pdf descargado")}>
            <Ic.download width={16}/> PDF
          </button>
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "TiposGasto_May2026.xlsx descargado")}>
            <Ic.download width={16}/> Excel
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 22 }}>
        {cards.map((s, i) => {
          const Icon = Ic[s.ic];
          return (
            <div key={i} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row between" style={{ alignItems: "center" }}>
                <div className="eyebrow">{s.l}</div>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `color-mix(in oklab, ${s.c} 16%, transparent)`,
                  display: "grid", placeItems: "center", color: s.c }}>
                  <Icon width={16}/>
                </div>
              </div>
              <div className="display" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", color: s.c }}>{s.v}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <CrudModule
          showHeader={false}
          newLabel="Nuevo tipo de gasto"
          data={items}
          setData={setItems}
          searchKeys={["name", "description"]}
          filters={[{ key: "active", label: "Estado", options: [
            { value: "true", label: "Activos" }, { value: "false", label: "Inactivos" },
          ]}]}
          columns={[
            { key: "name", label: "Tipo de gasto", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
            { key: "description", label: "Descripción", render: (v) => (
              <span className="muted" style={{ fontSize: 13 }}>{v || "—"}</span>
            )},
            { key: "active", label: "Estado", width: 120, render: (v) => (
              <span className={`chip ${v ? "green" : ""}`}><span className="pip"/> {v ? "Activo" : "Inactivo"}</span>
            )},
          ]}
          fields={[
            { key: "name",        label: "Nombre del tipo", type: "text",     required: true, placeholder: "Ej. Servicios básicos" },
            { key: "description", label: "Descripción",     type: "textarea", placeholder: "¿Qué tipo de gastos entran en esta categoría?" },
            { key: "active",      label: "Activo",          type: "switch",   default: true,  hint: "Si está inactivo, no aparecerá al registrar nuevas transacciones" },
          ]}
          onChange={(action, item) => {
            if (action === "create") toast?.("success", "Tipo de gasto creado",       item.name);
            if (action === "update") toast?.("success", "Tipo de gasto actualizado",  item.name);
            if (action === "delete") toast?.("info",    "Tipo de gasto eliminado",    item.name);
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// MÓDULO: Tipos de ingreso
// ============================================================
function IngresosScreen({ toast }) {
  const D = window.EVO_DATA;
  const [items, setItems] = useStateK(() => D.incomeTypes.map(t => ({ ...t })));

  const cards = [
    { l: "Tipos de ingreso", v: items.length,                        c: "var(--d-funds)", ic: "trendUp" },
    { l: "Activos",          v: items.filter(t => t.active).length,  c: "var(--success)", ic: "check"   },
    { l: "Inactivos",        v: items.filter(t => !t.active).length, c: "var(--muted)",   ic: "x"       },
  ];

  return (
    <div>
      <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
        <div>
          <div className="eyebrow">Finanzas · Configuración</div>
          <h1 className="display" style={{ fontSize: 40, margin: "4px 0 6px", letterSpacing: "-0.025em" }}>
            Tipos de ingreso <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>de la iglesia</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>Categorías para clasificar las entradas de dinero en transacciones.</p>
        </div>
        <div className="row">
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "TiposIngreso_May2026.pdf descargado")}>
            <Ic.download width={16}/> PDF
          </button>
          <button className="btn outline" onClick={() => toast?.("success", "Reporte generado", "TiposIngreso_May2026.xlsx descargado")}>
            <Ic.download width={16}/> Excel
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 22 }}>
        {cards.map((s, i) => {
          const Icon = Ic[s.ic];
          return (
            <div key={i} className="card" style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row between" style={{ alignItems: "center" }}>
                <div className="eyebrow">{s.l}</div>
                <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                  background: `color-mix(in oklab, ${s.c} 16%, transparent)`,
                  display: "grid", placeItems: "center", color: s.c }}>
                  <Icon width={16}/>
                </div>
              </div>
              <div className="display" style={{ fontSize: 36, lineHeight: 1, letterSpacing: "-0.02em", color: s.c }}>{s.v}</div>
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 18 }}>
        <CrudModule
          showHeader={false}
          newLabel="Nuevo tipo de ingreso"
          data={items}
          setData={setItems}
          searchKeys={["name", "description"]}
          filters={[{ key: "active", label: "Estado", options: [
            { value: "true", label: "Activos" }, { value: "false", label: "Inactivos" },
          ]}]}
          columns={[
            { key: "name", label: "Tipo de ingreso", render: (v) => <span style={{ fontWeight: 600 }}>{v}</span> },
            { key: "description", label: "Descripción", render: (v) => (
              <span className="muted" style={{ fontSize: 13 }}>{v || "—"}</span>
            )},
            { key: "active", label: "Estado", width: 120, render: (v) => (
              <span className={`chip ${v ? "green" : ""}`}><span className="pip"/> {v ? "Activo" : "Inactivo"}</span>
            )},
          ]}
          fields={[
            { key: "name",        label: "Nombre del tipo", type: "text",     required: true, placeholder: "Ej. Evento" },
            { key: "description", label: "Descripción",     type: "textarea", placeholder: "¿Qué tipo de ingresos entran en esta categoría?" },
            { key: "active",      label: "Activo",          type: "switch",   default: true,  hint: "Si está inactivo, no aparecerá al registrar nuevas transacciones" },
          ]}
          onChange={(action, item) => {
            if (action === "create") toast?.("success", "Tipo de ingreso creado",      item.name);
            if (action === "update") toast?.("success", "Tipo de ingreso actualizado", item.name);
            if (action === "delete") toast?.("info",    "Tipo de ingreso eliminado",   item.name);
          }}
        />
      </div>
    </div>
  );
}

// ============================================================
// Stat card chiquita (reutilizable dentro de este archivo)
// ============================================================
function StatCard({ label, value, color, icon }) {
  return (
    <div className="span-3 card" style={{ padding: 14 }}>
      <div className="row" style={{ gap: 10, alignItems: "center" }}>
        <span style={{
          width: 32, height: 32, borderRadius: 8,
          background: `color-mix(in oklab, ${color} 18%, transparent)`,
          color, display: "grid", placeItems: "center", flexShrink: 0
        }}>{icon}</span>
        <div>
          <div className="eyebrow" style={{ fontSize: 10 }}>{label}</div>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600,
            color: "var(--fg)", lineHeight: 1.1, marginTop: 2
          }}>{value}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { UsuariosScreen, GastosScreen, IngresosScreen });
