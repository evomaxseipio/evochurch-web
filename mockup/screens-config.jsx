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
// MÓDULO: Ministerios
// ============================================================
function MinisteriosScreen({ toast }) {
  const D = window.EVO_DATA;
  const [items, setItems] = useStateK(D.ministries);

  // Opciones para multiselect de miembros
  const memberOptions = D.members.map(m => ({
    value: m.id, label: m.name, sub: m.role + " · " + m.sector,
  }));
  const memberNameById = (id) => D.members.find(m => m.id === id)?.name || `#${id}`;

  // Stats header
  const totalMembers = items.reduce((s, m) => s + (m.memberIds?.length || 0), 0);

  return (
    <>
      <div className="grid-12" style={{ marginBottom: 18 }}>
        <StatCard label="Ministerios" value={items.length} color="var(--accent)" icon={<Ic.users width={16}/>}/>
        <StatCard label="Activos"     value={items.filter(m => m.active).length} color="var(--green)" icon={<Ic.check width={16}/>}/>
        <StatCard label="Líderes"     value={new Set(items.map(m => m.leader)).size} color="var(--lila)" icon={<Ic.pin width={16}/>}/>
        <StatCard label="Hermanos en ministerios" value={totalMembers} color="var(--accent)" icon={<Ic.users width={16}/>}/>
      </div>

      <CrudModule
        eyebrow="Comunidad · Configuración"
        title="Ministerios"
        subtitle="Equipos de servicio dentro de la iglesia. Asigna líderes y miembros."
        newLabel="Nuevo ministerio"
        data={items}
        setData={setItems}
        searchKeys={["name", "leader", "description"]}
        filters={[{ key: "active", label: "Estado", options: [
          { value: "true", label: "Activos" }, { value: "false", label: "Inactivos" },
        ]}]}
        columns={[
          { key: "name", label: "Ministerio", render: (v, it) => (
            <div className="row" style={{ gap: 10 }}>
              <span style={{
                width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                background: `color-mix(in oklab, var(--${it.color || "accent"}) 22%, transparent)`,
                color: `var(--${it.color || "accent"})`,
                display: "grid", placeItems: "center", fontWeight: 600, fontSize: 12,
              }}>{v.slice(0,2).toUpperCase()}</span>
              <div>
                <div style={{ fontWeight: 600 }}>{v}</div>
                <div className="tiny muted" style={{
                  maxWidth: 320, overflow: "hidden",
                  textOverflow: "ellipsis", whiteSpace: "nowrap"
                }}>{it.description}</div>
              </div>
            </div>
          )},
          { key: "leader", label: "Líder", render: (v) => (
            <div className="row" style={{ gap: 8 }}>
              <Avatar initials={v.split(" ").map(s=>s[0]).slice(0,2).join("")} size="sm"/>
              <span style={{ fontSize: 13 }}>{v}</span>
            </div>
          )},
          { key: "memberIds", label: "Miembros", render: (v) => (
            <div className="row" style={{ gap: -6 }}>
              {(v || []).slice(0, 4).map((id, i) => (
                <span key={id} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                  <Avatar initials={memberNameById(id).split(" ").map(s=>s[0]).slice(0,2).join("")} size="sm"/>
                </span>
              ))}
              {v && v.length > 4 && (
                <span className="chip" style={{ marginLeft: -4 }}>+{v.length - 4}</span>
              )}
              {(!v || v.length === 0) && <span className="muted tiny">Sin miembros</span>}
            </div>
          )},
          { key: "active", label: "Estado", render: (v) => (
            <span className={`chip ${v ? "green" : ""}`}>
              <span className="pip"/> {v ? "Activo" : "Inactivo"}
            </span>
          )},
        ]}
        fields={[
          { key: "name", label: "Nombre del ministerio", type: "text", required: true,
            placeholder: "Ej. Alabanza y Adoración" },
          { key: "leader", label: "Líder", type: "select", required: true,
            options: D.members.map(m => ({ value: m.name, label: m.name })) },
          { key: "description", label: "Descripción", type: "textarea",
            placeholder: "Propósito y alcance del ministerio…" },
          { key: "memberIds", label: "Miembros del ministerio", type: "multiselect",
            options: memberOptions,
            hint: "Marca a los hermanos que sirven en este equipo" },
          { key: "color", label: "Color identificador", type: "select",
            default: "violet",
            options: [
              { value: "violet", label: "Morado" },
              { value: "lila", label: "Lila" },
              { value: "green", label: "Verde" },
            ]},
          { key: "active", label: "Activo", type: "switch", default: true,
            hint: "Los ministerios inactivos quedan archivados (sin eliminarse)" },
        ]}
        onChange={(action, item) => {
          if (action === "create") toast?.("success", "Ministerio creado", `${item.name} ya está en la lista.`);
          if (action === "update") toast?.("success", "Cambios guardados", `${item.name} actualizado.`);
          if (action === "delete") toast?.("info",    "Ministerio eliminado", `${item.name} fue removido.`);
        }}
      />
    </>
  );
}

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

  return (
    <>
      <div className="grid-12" style={{ marginBottom: 18 }}>
        <StatCard label="Usuarios"  value={items.length} color="var(--accent)" icon={<Ic.users width={16}/>}/>
        <StatCard label="Activos"   value={items.filter(u => u.active).length} color="var(--green)" icon={<Ic.check width={16}/>}/>
        <StatCard label="Inactivos" value={items.filter(u => !u.active).length} color="var(--muted)" icon={<Ic.x width={16}/>}/>
        <StatCard label="Roles"     value={new Set(items.map(u => u.role)).size} color="var(--lila)" icon={<Ic.settings width={16}/>}/>
      </div>

      <CrudModule
        eyebrow="Configuración · Acceso"
        title="Usuarios administradores"
        subtitle="Cuentas con acceso al panel administrativo de EvoChurch."
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
              <Avatar initials={((it.firstName?.[0] || "") + (it.lastName?.[0] || "")).toUpperCase() || "??"} size="md"/>
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
          { key: "firstName", label: "Nombre", type: "text", required: true, placeholder: "Roberto" },
          { key: "lastName",  label: "Apellido", type: "text", required: true, placeholder: "Almonte" },
          { key: "email",     label: "Correo electrónico", type: "email", required: true,
            placeholder: "usuario@iglesia.do" },
          { key: "role",      label: "Rol", type: "select", required: true,
            options: D.roles.map(r => ({ value: r.name, label: r.name })) },
          { key: "active",    label: "Cuenta activa", type: "switch", default: true,
            hint: "Si está inactiva, el usuario no podrá iniciar sesión" },
        ]}
        onChange={(action, item) => {
          if (action === "create") toast?.("success", "Usuario creado", `${item.email} ya puede iniciar sesión.`);
          if (action === "update") toast?.("success", "Usuario actualizado", `${item.email} guardado.`);
          if (action === "delete") toast?.("info",    "Usuario eliminado", `${item.email} fue removido.`);
        }}
      />
    </>
  );
}

// ============================================================
// MÓDULO: Tipos de gasto
// ============================================================
function GastosScreen({ toast }) {
  const D = window.EVO_DATA;
  const [items, setItems] = useStateK(D.expenseTypes);

  return (
    <>
      <div className="grid-12" style={{ marginBottom: 18 }}>
        <StatCard label="Tipos de gasto" value={items.length} color="var(--accent)" icon={<Ic.wallet width={16}/>}/>
        <StatCard label="Activos"        value={items.filter(t => t.active).length} color="var(--green)" icon={<Ic.check width={16}/>}/>
        <StatCard label="Inactivos"      value={items.filter(t => !t.active).length} color="var(--muted)" icon={<Ic.x width={16}/>}/>
      </div>

      <CrudModule
        eyebrow="Finanzas · Configuración"
        title="Tipos de gasto"
        subtitle="Categorías que se usan para clasificar las salidas de dinero."
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
            <span className={`chip ${v ? "green" : ""}`}>
              <span className="pip"/> {v ? "Activo" : "Inactivo"}
            </span>
          )},
        ]}
        fields={[
          { key: "name", label: "Nombre del tipo", type: "text", required: true,
            placeholder: "Ej. Servicios básicos" },
          { key: "description", label: "Descripción", type: "textarea",
            placeholder: "¿Qué tipo de gastos entran en esta categoría?" },
          { key: "active", label: "Activo", type: "switch", default: true,
            hint: "Si está inactivo, no aparecerá al registrar nuevas transacciones" },
        ]}
        onChange={(action, item) => {
          if (action === "create") toast?.("success", "Tipo de gasto creado", item.name);
          if (action === "update") toast?.("success", "Tipo de gasto actualizado", item.name);
          if (action === "delete") toast?.("info",    "Tipo de gasto eliminado", item.name);
        }}
      />
    </>
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

Object.assign(window, { MinisteriosScreen, UsuariosScreen, GastosScreen });
