"use client";

import type { DashboardHeroData } from "@/lib/dashboard/types";
import { useTranslations } from "next-intl";

function getGreeting(
  t: (key: "goodMorning" | "goodAfternoon" | "goodEvening") => string,
): string {
  const hour = new Date().getHours();
  if (hour < 12) return t("goodMorning");
  if (hour < 19) return t("goodAfternoon");
  return t("goodEvening");
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
  const t = useTranslations("dashboard");
  const greeting = getGreeting(t);

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
        <h2 suppressHydrationWarning>
          {greeting}, {t("pastor")} <em>{pastor}</em>.
          <br />
          <span style={{ color: "var(--fg-dim)", fontSize: 26 }}>
            {t("harvestWeek")}
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
