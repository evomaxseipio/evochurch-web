/* global React */
const { useState, useEffect, useRef, useMemo } = React;

// ============ Icons (inline SVG, stroke-based) ============
const Ic = {
  home: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>,
  users: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-3.3 2.9-6 6.5-6s6.5 2.7 6.5 6"/><circle cx="17" cy="9" r="2.5"/><path d="M21.5 18c0-2.3-2-4-4.5-4"/></svg>,
  wallet: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1H5a2 2 0 0 1 0-4h13"/><circle cx="17" cy="14" r="1.2" fill="currentColor"/></svg>,
  cal: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>,
  chat: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12a8 8 0 0 1-11.5 7.2L4 21l1.7-5A8 8 0 1 1 21 12z"/></svg>,
  bell: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 9a6 6 0 1 1 12 0c0 4 2 5 2 7H4c0-2 2-3 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>,
  settings: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>,
  plus: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>,
  check: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m4 12 5 5L20 6"/></svg>,
  x: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M6 6l12 12M18 6 6 18"/></svg>,
  arrowUp: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 14l5-5 5 5"/></svg>,
  arrowDn: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M7 10l5 5 5-5"/></svg>,
  more: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>,
  menu: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  send: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>,
  eye: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>,
  edit: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M16 3l5 5-12 12H4v-5z"/></svg>,
  trash: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  trendUp: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>,
  target: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><circle cx="12" cy="12" r="0.5" fill="currentColor"/></svg>,
  download: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3v13M7 12l5 5 5-5M5 21h14"/></svg>,
  filter: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 5h18l-7 9v6l-4-2v-4z"/></svg>,
  cross: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><path d="M12 3v18M6 9h12"/></svg>,
  google: (p) => <svg viewBox="0 0 24 24" {...p}><path fill="#4285F4" d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.3h6c-.3 1.4-1.1 2.6-2.4 3.4v2.8h3.9c2.3-2.1 3.6-5.2 3.6-8.3z"/><path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.1-4.1 1.1-3.1 0-5.8-2.1-6.7-5h-4v3.1C3.4 20.5 7.4 23 12 23z"/><path fill="#FBBC05" d="M5.3 13.2c-.2-.7-.4-1.4-.4-2.2s.1-1.5.4-2.2V5.7h-4C.5 7.3 0 9.1 0 11s.5 3.7 1.3 5.3z"/><path fill="#EA4335" d="M12 4.4c1.7 0 3.3.6 4.6 1.7l3.4-3.4C18 .9 15.2 0 12 0 7.4 0 3.4 2.5 1.3 6.3l4 3.1C6.2 6.5 8.9 4.4 12 4.4z"/></svg>,
  apple: (p) => <svg viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M16.5 12.5c0-2.5 2-3.7 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9s-1.9-.9-3.2-.8c-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3.1 2.5s1.7-.8 3.2-.8 1.9.8 3.2.8 2.2-1.2 3-2.4c.9-1.4 1.3-2.7 1.4-2.8-.1 0-2.7-1-2.8-4zm-2.4-7.4c.7-.8 1.1-2 1-3.1-.9.1-2.1.6-2.7 1.4-.6.7-1.2 1.9-1 3 1 .1 2-.5 2.7-1.3z"/></svg>,
  globe: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>,
  moon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>,
  sun: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>,
  menu: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  pin: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 22s7-7.5 7-13a7 7 0 0 0-14 0c0 5.5 7 13 7 13z"/><circle cx="12" cy="9" r="2.5"/></svg>,
  attach: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m21 12-8.5 8.5a5 5 0 0 1-7-7L14 5a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3l7-7"/></svg>,
  grid: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  list: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>,
  star: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.6 1-5.8L3.5 9.7l5.9-.9z"/></svg>,
};

// ============ Helpers ============
const fmtRD = (n) => "RD$ " + Math.abs(n).toLocaleString("es-DO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtRDshort = (n) => {
  const abs = Math.abs(n);
  if (abs >= 1000000) return "RD$ " + (n/1000000).toFixed(1) + "M";
  if (abs >= 1000) return "RD$ " + (n/1000).toFixed(1) + "K";
  return "RD$ " + n.toFixed(0);
};

// ============ Sparkline ============
function Sparkline({ data, color = "var(--primary)", fill = true }) {
  if (!data?.length) return null;
  const max = Math.max(...data); const min = Math.min(...data);
  const w = 200, h = 50, pad = 2;
  const pts = data.map((v, i) => {
    const x = pad + (i * (w - pad*2)) / (data.length - 1);
    const y = h - pad - ((v - min) / (max - min || 1)) * (h - pad*2);
    return [x, y];
  });
  const d = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const dFill = d + ` L ${w-pad} ${h} L ${pad} ${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height: "100%" }}>
      {fill && <path d={dFill} fill={color} opacity="0.12"/>}
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ============ KPI Card ============
function KPI({ label, value, delta, deltaDir = "up", spark, kind = "elevated", feature, accent, icon }) {
  return (
    <div className={`kpi ${kind} ${feature ? "feature" : ""}`}>
      <div className="head" style={{ display: "flex", alignItems: "center", justifyContent: icon ? "space-between" : undefined }}>
        {icon && (
          <div style={{
            width: 32, height: 32, borderRadius: 9, flexShrink: 0,
            display: "grid", placeItems: "center",
            background: `color-mix(in oklab, ${accent || "var(--d-funds)"} 18%, transparent)`,
            color: accent || "var(--d-funds)"
          }}>{icon}</div>
        )}
        <span className="label" style={{ textAlign: icon ? "right" : undefined }}>{label}</span>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
        <div className="val" style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
        {delta && (
          <span className={`delta ${deltaDir}`} style={{ flexShrink: 0, marginBottom: 4 }}>
            {deltaDir === "up" ? <Ic.arrowUp width={12}/> : <Ic.arrowDn width={12}/>}
            {delta}
          </span>
        )}
      </div>
      {spark && <div className="spark"><Sparkline data={spark} color={feature ? "var(--glow)" : (accent || "var(--accent)")}/></div>}
    </div>
  );
}

// ============ Avatar ============
function Avatar({ initials, size = "md", square = false, color }) {
  const bg = color || `linear-gradient(135deg, hsl(${(initials.charCodeAt(0) * 17) % 360} 50% 45%), hsl(${(initials.charCodeAt(1 % initials.length) * 23) % 360} 60% 35%))`;
  return <span className={`avatar ${size} ${square ? "sq" : ""}`} style={{ background: bg }}>{initials}</span>;
}

// ============ Toast system ============
const ToastCtx = React.createContext(null);
function ToastHost({ toasts }) {
  return <div className="toast-host">{toasts.map(t => (
    <div key={t.id} className={`toast ${t.kind}`}>
      <div className="ic">
        {t.kind === "success" && <Ic.check width={18}/>}
        {t.kind === "error" && <Ic.x width={18}/>}
        {t.kind === "warning" && <Ic.bell width={18}/>}
        {t.kind === "info" && <Ic.bell width={18}/>}
        {t.kind === "loading" && <div className="ring" style={{width:18,height:18,borderWidth:2}}/>}
      </div>
      <div>
        <div className="ttl">{t.title}</div>
        {t.msg && <div className="msg">{t.msg}</div>}
      </div>
    </div>
  ))}</div>;
}

// ============ Bar chart ============
function BarChart({ data, valueKey, labelKey, color = "var(--primary)", accent = "var(--accent)", height = 220 }) {
  const max = Math.max(...data.map(d => d[valueKey]));
  const lastIdx = data.length - 1;
  return (
    <div style={{ height, display: "flex", alignItems: "flex-end", gap: 14, padding: "0 4px" }}>
      {data.map((d, i) => {
        const h = (d[valueKey] / max) * (height - 30);
        const isLast = i === lastIdx;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <div style={{
              width: "100%", height: h,
              background: isLast ? `linear-gradient(180deg, ${accent}, ${color})` : color,
              borderRadius: "8px 8px 2px 2px",
              opacity: isLast ? 1 : 0.85,
              position: "relative"
            }}>
              {isLast && (
                <div style={{
                  position: "absolute", top: -28, left: "50%", transform: "translateX(-50%)",
                  background: "var(--ink)", color: "var(--bg-elev)",
                  padding: "3px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap"
                }}>
                  {d[valueKey].toLocaleString()}
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{d[labelKey]}</div>
          </div>
        );
      })}
    </div>
  );
}

// ============ Line chart for giving ============
function LineChart({ data, valueKey, labelKey, height = 220 }) {
  const w = 600, h = height;
  const max = Math.max(...data.map(d => d[valueKey])); const min = 0;
  const pad = { l: 50, r: 16, t: 20, b: 30 };
  const innerW = w - pad.l - pad.r; const innerH = h - pad.t - pad.b;
  const pts = data.map((d, i) => {
    const x = pad.l + (i * innerW) / (data.length - 1);
    const y = pad.t + innerH - ((d[valueKey] - min) / (max - min || 1)) * innerH;
    return [x, y, d];
  });
  const dPath = pts.map((p, i) => (i === 0 ? "M" : "L") + p[0] + " " + p[1]).join(" ");
  const dFill = dPath + ` L ${pts[pts.length-1][0]} ${pad.t + innerH} L ${pts[0][0]} ${pad.t + innerH} Z`;
  // Y-axis ticks
  const ticks = [0, 0.5, 1].map(t => ({ y: pad.t + innerH - t * innerH, v: max * t }));
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="lcg" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--primary)" stopOpacity="0.35"/>
          <stop offset="1" stopColor="var(--primary)" stopOpacity="0"/>
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={pad.l} x2={w - pad.r} y1={t.y} y2={t.y} stroke="var(--hairline)" strokeDasharray="3 3"/>
          <text x={pad.l - 8} y={t.y + 4} fontSize="10" fill="var(--ink-4)" textAnchor="end">{fmtRDshort(t.v)}</text>
        </g>
      ))}
      <path d={dFill} fill="url(#lcg)"/>
      <path d={dPath} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((p, i) => (
        <g key={i}>
          {i === pts.length - 1 && <circle cx={p[0]} cy={p[1]} r="8" fill="var(--accent)" opacity="0.2"/>}
          <circle cx={p[0]} cy={p[1]} r={i === pts.length - 1 ? 5 : 3} fill={i === pts.length - 1 ? "var(--accent)" : "var(--primary)"} stroke="var(--surface)" strokeWidth="2"/>
          <text x={p[0]} y={h - 8} fontSize="11" fill="var(--ink-3)" textAnchor="middle" fontWeight="600">{p[2][labelKey]}</text>
        </g>
      ))}
    </svg>
  );
}

Object.assign(window, { Ic, fmtRD, fmtRDshort, Sparkline, KPI, Avatar, ToastHost, BarChart, LineChart });
