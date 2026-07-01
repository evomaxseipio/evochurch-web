type PlaceholderPageProps = {
  title: string;
  subtitle?: string;
};

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <div>
      <div className="section-head" style={{ marginTop: 0 }}>
        <div>
          <h3 className="page-title">{title}</h3>
          {subtitle ? <p className="page-subtitle">{subtitle}</p> : null}
        </div>
      </div>
      <div
        className="card"
        style={{
          padding: 48,
          textAlign: "center",
          color: "var(--muted)",
        }}
      >
        <p style={{ fontSize: 15, fontWeight: 600, color: "var(--fg)", margin: 0 }}>
          Próximamente
        </p>
        <p style={{ marginTop: 8, fontSize: 13 }}>
          Esta pantalla se implementará en la siguiente fase del diseño.
        </p>
      </div>
    </div>
  );
}
