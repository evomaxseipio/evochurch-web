export function LoginPreview() {
  const stats = [
    { label: "Balance general", value: "RD$ 2.38M", delta: "+9.2%", c: "#7c5cf5" },
    { label: "Ingresos del mes", value: "RD$ 184K", delta: "+12.4%", c: "#10b981" },
    { label: "Miembros activos", value: "312", delta: "+8", c: "#a78bfa" },
  ];
  const rows = [
    { n: "Diezmo dominical", who: "Wilkin A.", amt: "+RD$ 12,500", ok: true },
    { n: "Ofrenda — construcción", who: "Francisco B.", amt: "+RD$ 25,000", ok: true },
    { n: "Pago electricidad", who: "EDENORTE", amt: "−RD$ 8,420", ok: false },
    { n: "Diezmo", who: "María P.", amt: "+RD$ 6,800", ok: true },
  ];
  const bars = [42, 55, 48, 67, 60, 78, 72, 90];

  return (
    <div className="login-preview">
      <div className="lp-card lp-main">
        <div className="lp-head">
          <div className="lp-dot-row">
            <span />
            <span />
            <span />
          </div>
          <div className="lp-title">Panel de finanzas</div>
        </div>

        <div className="lp-stats">
          {stats.map((s) => (
            <div key={s.label} className="lp-stat">
              <div className="lp-stat-label">{s.label}</div>
              <div className="lp-stat-value">{s.value}</div>
              <div className="lp-stat-delta" style={{ color: s.c }}>
                ▲ {s.delta}
              </div>
            </div>
          ))}
        </div>

        <div className="lp-chart">
          <div className="lp-chart-head">
            <span className="lp-chart-title">Ingresos por semana</span>
            <span className="lp-chip">Mayo 2026</span>
          </div>
          <div className="lp-bars">
            {bars.map((h, i) => (
              <span
                key={i}
                style={{
                  height: `${h}%`,
                  background: i === bars.length - 1 ? "#7c5cf5" : "#ddd6fe",
                }}
              />
            ))}
          </div>
        </div>

        <div className="lp-table">
          {rows.map((r) => (
            <div key={r.n} className="lp-row">
              <span className="lp-avatar">{r.who[0]}</span>
              <div className="lp-row-main">
                <div className="lp-row-name">{r.n}</div>
                <div className="lp-row-sub">{r.who}</div>
              </div>
              <div
                className="lp-amt"
                style={{ color: r.ok ? "#10b981" : "#f87171" }}
              >
                {r.amt}
              </div>
              <span
                className="lp-badge"
                style={{
                  background: r.ok
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(248,113,113,0.14)",
                  color: r.ok ? "#10b981" : "#f87171",
                }}
              >
                {r.ok ? "Aprobado" : "Pendiente"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-card lp-float">
        <div className="lp-float-label">Distribución de fondos</div>
        <svg viewBox="0 0 120 120" className="lp-donut">
          <circle cx="60" cy="60" r="46" fill="none" stroke="#ede9fe" strokeWidth="16" />
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#7c5cf5"
            strokeWidth="16"
            strokeDasharray="289"
            strokeDashoffset="96"
            strokeLinecap="round"
            transform="rotate(-90 60 60)"
          />
          <circle
            cx="60"
            cy="60"
            r="46"
            fill="none"
            stroke="#10b981"
            strokeWidth="16"
            strokeDasharray="289"
            strokeDashoffset="231"
            strokeLinecap="round"
            transform="rotate(150 60 60)"
          />
        </svg>
        <div className="lp-float-foot">
          <div className="lp-float-big">RD$ 2.38M</div>
          <div className="lp-float-sub">8 fondos activos</div>
        </div>
      </div>
    </div>
  );
}
