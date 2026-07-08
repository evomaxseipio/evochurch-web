import { LoginForm } from "@/components/auth/login-form";
import { Icons } from "@/components/icons";
import { getOrgSession } from "@/lib/auth/org-session";
import { getVerifiedUser } from "@/lib/supabase/session";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function OrgLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; email?: string }>;
}) {
  const session = await getOrgSession();
  if (session) {
    redirect("/org/dashboard");
  }

  const user = await getVerifiedUser();
  const { next, error, email } = await searchParams;
  const t = await getTranslations("org.login");

  return (
    <div className="login">
      <div className="formside" style={{ margin: "0 auto", maxWidth: 440 }}>
        <div className="login-brand">
          <div className="login-mark">
            <Icons.cross size={20} stroke="#fff" />
          </div>
          <div className="display" style={{ fontSize: 21, lineHeight: 1 }}>
            Evo<em style={{ fontStyle: "italic", color: "var(--accent)" }}>Council</em>
          </div>
        </div>
        <div className="mb-6 text-center">
          <h1 className="display" style={{ fontSize: 32, margin: "12px 0 8px" }}>
            {t("title")}
          </h1>
          <p className="muted text-sm">{t("subtitle")}</p>
        </div>

        {user ? (
          <p
            className="rounded-xl px-4 py-3 text-sm"
            style={{ background: "var(--danger-bg)", color: "var(--danger)" }}
          >
            {t("noOrgAccess")}
          </p>
        ) : (
          <LoginForm
            next={next ?? "/org/dashboard"}
            email={email}
            loginError={error}
          />
        )}

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          {t("churchHint")}
        </p>
      </div>
    </div>
  );
}
