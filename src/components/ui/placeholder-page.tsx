import { getTranslations } from "next-intl/server";

type PlaceholderPageProps = {
  title: string;
  subtitle?: string;
};

export async function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  const tPlaceholder = await getTranslations("placeholder");
  const tCommon = await getTranslations("common");

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
          {tCommon("comingSoon")}
        </p>
        <p style={{ marginTop: 8, fontSize: 13 }}>
          {tPlaceholder("nextPhase")}
        </p>
      </div>
    </div>
  );
}
