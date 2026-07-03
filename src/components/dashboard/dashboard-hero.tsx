"use client";

import type { DashboardHeroData } from "@/lib/dashboard/types";

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
  hero: DashboardHeroData;
}) {
  const greeting = getGreeting();

  return (
    <div className="hero">
      <div className="hero-main">
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--muted)",
          }}
        >
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
      </div>
      <div className="versecard">
        &ldquo;{hero.verse}&rdquo;
        <div className="cite">— {hero.verseRef}</div>
      </div>
    </div>
  );
}
