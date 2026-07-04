import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  titleAccent,
  subtitle,
  actions,
}: {
  eyebrow: string;
  title: string;
  titleAccent?: string;
  subtitle: string;
  actions?: ReactNode;
}) {
  return (
    <div className="row between" style={{ flexWrap: "wrap", gap: 16 }}>
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1
          className="display"
          style={{
            fontSize: 40,
            margin: "4px 0 6px",
            letterSpacing: "-0.025em",
          }}
        >
          {title}
          {titleAccent ? (
            <>
              {" "}
              <span style={{ color: "var(--ink-3)", fontStyle: "italic" }}>
                {titleAccent}
              </span>
            </>
          ) : null}
        </h1>
        <p className="muted" style={{ margin: 0 }}>
          {subtitle}
        </p>
      </div>
      {actions ? <div className="row">{actions}</div> : null}
    </div>
  );
}
