import type { ReactNode } from "react";

/** Mismo layout que `SectionCard` en mockup/screens-2.jsx */
export function SectionCard({
  eyebrow,
  title,
  sub,
  action,
  children,
  style,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  action?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div className="card" style={{ padding: 0, ...style }}>
      <div
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid var(--line)",
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
          justifyContent: "space-between",
          flexWrap: "wrap",
        }}
      >
        <div style={{ minWidth: 0 }}>
          {eyebrow ? <div className="eyebrow">{eyebrow}</div> : null}
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginTop: eyebrow ? 3 : 0,
              color: "var(--fg)",
            }}
          >
            {title}
          </div>
          {sub ? (
            <div className="tiny muted" style={{ marginTop: 4, maxWidth: 580 }}>
              {sub}
            </div>
          ) : null}
        </div>
        {action ? <div style={{ flexShrink: 0 }}>{action}</div> : null}
      </div>
      <div style={{ padding: 18 }}>{children}</div>
    </div>
  );
}
