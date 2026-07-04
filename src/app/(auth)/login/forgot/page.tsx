import { LoginBackdrop } from "@/components/auth/login-backdrop";
import { LogoMark } from "@/components/auth/logo-mark";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function ForgotPasswordPage() {
  const t = await getTranslations("auth");

  return (
    <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden p-6">
      <LoginBackdrop />
      <div className="login-glass login-fade-up relative z-10 w-full max-w-md p-8">
        <div className="mb-6 flex items-center gap-3">
          <LogoMark size={40} />
          <div className="font-serif text-xl text-white">
            Evo<em className="text-primary-light not-italic">Church</em>
          </div>
        </div>
        <h1 className="font-serif text-2xl text-white">{t("forgotTitle")}</h1>
        <p className="mt-2 text-sm text-white/50">{t("forgotSubtitle")}</p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-semibold text-primary-light transition hover:text-white"
        >
          {t("backToLogin")}
        </Link>
      </div>
    </div>
  );
}
