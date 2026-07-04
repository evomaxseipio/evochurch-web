import { LoginPillars } from "@/components/auth/login-pillars";
import { getTranslations } from "next-intl/server";

export async function LoginHero() {
  const t = await getTranslations("auth.hero");

  return (
    <div className="relative flex flex-col justify-between px-8 py-12 lg:px-14 lg:py-16">
      <div className="login-fade-up">
        <p className="login-eyebrow">{t("eyebrow")}</p>
        <h2 className="login-display mt-6 max-w-xl">
          {t("title")}{" "}
          <span className="text-primary-light">{t("titleAccent")}</span>.
        </h2>
        <p className="login-lead mt-6 max-w-lg">{t("lead")}</p>
      </div>

      <div className="login-fade-up login-fade-delay mt-14 hidden flex-col gap-10 lg:flex">
        <blockquote className="login-quote max-w-lg">
          &ldquo;{t("quote")}&rdquo;
        </blockquote>
        <p className="login-cite">— {t("quoteRef")}</p>
        <LoginPillars
          pillars={[
            { value: t("pillar1Value"), label: t("pillar1Label") },
            { value: t("pillar2Value"), label: t("pillar2Label") },
            { value: t("pillar3Value"), label: t("pillar3Label") },
          ]}
        />
      </div>
    </div>
  );
}
