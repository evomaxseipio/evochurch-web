import type { dashboardMock } from "@/lib/mock/dashboard-data";

type HeroData = (typeof dashboardMock)["hero"];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";
  return "Buenas noches";
}

export function DashboardHero({
  pastor,
  churchName,
  hero,
}: {
  pastor: string;
  churchName?: string;
  hero: HeroData;
}) {
  const greeting = getGreeting();

  return (
    <div className="hero">
      <div className="hero-main">
        <div style={{ fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--muted)" }}>
          {hero.dateLabel}
          {churchName ? (
            <span style={{ marginLeft: 10, opacity: 0.85 }}>· {churchName}</span>
          ) : null}
        </div>
        <h2>
          {greeting}, Pastor <em>{pastor}</em>.
          <br />
          <span style={{ color: "var(--fg-dim)", fontSize: 26 }}>
            Que esta semana sea de cosecha.
          </span>
        </h2>
        <div className="meta-row">
          <div className="m">
            Asistencia este domingo<b>{hero.attendance}</b>
          </div>
          <div className="m">
            Ofrenda del día<b>{hero.offering}</b>
          </div>
          <div className="m">
            Bautismos pendientes<b>{hero.baptisms}</b>
          </div>
        </div>
      </div>
      <div className="versecard">
        &ldquo;{hero.verse}&rdquo;
        <div className="cite">— {hero.verseRef}</div>
      </div>
    </div>
  );
}
