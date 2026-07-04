"use client";

import { login, type LoginState } from "@/app/(auth)/login/actions";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

const initial: LoginState = {};

const ERROR_KEYS = ["auth", "credentials", "no_church"] as const;

export function LoginForm({
  next,
  email,
  loginError,
}: {
  next?: string;
  email?: string;
  loginError?: string;
}) {
  const t = useTranslations("auth");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("auth.errors");
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPw, setShowPw] = useState(false);

  const bannerError =
    (loginError && ERROR_KEYS.includes(loginError as (typeof ERROR_KEYS)[number])
      ? tErrors(loginError as (typeof ERROR_KEYS)[number])
      : undefined) ??
    (state.errorKey
      ? tErrors(state.errorKey.replace("auth.errors.", "") as (typeof ERROR_KEYS)[number])
      : undefined) ??
    state.error;

  return (
    <div className="inner">
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1
          className="display"
          style={{
            fontSize: 38,
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {t("welcomeBack")}
        </h1>
        <p className="muted" style={{ marginTop: 12, fontSize: 14.5 }}>
          {t("loginSubtitle")}
        </p>
      </div>

      {bannerError ? (
        <p
          className="help error"
          role="alert"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--danger-bg)",
            color: "var(--danger)",
          }}
        >
          {bannerError}
        </p>
      ) : null}

      <form action={formAction} className="col" style={{ gap: 16 }}>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="field">
          <label htmlFor="email">{t("email")}</label>
          <div className="input-wrap">
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={email ?? ""}
              placeholder="tu@iglesia.do"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">{t("password")}</label>
          <div className="input-wrap">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              aria-label={showPw ? t("hidePassword") : t("showPassword")}
            >
              <Icons.eye width={18} style={{ color: "var(--ink-4)" }} />
            </button>
          </div>
        </div>

        <div className="row between" style={{ marginTop: -4 }}>
          <label
            className="row"
            style={{ gap: 8, fontSize: 13, cursor: "pointer", color: "var(--ink-2)" }}
          >
            <input
              type="checkbox"
              name="remember"
              defaultChecked
              style={{ accentColor: "var(--primary)" }}
            />
            {t("rememberMe")}
          </label>
          <Link
            href="/login/forgot"
            style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}
          >
            {t("forgotPassword")}
          </Link>
        </div>

        <button type="submit" className="btn primary lg" style={{ marginTop: 8 }} disabled={pending}>
          {pending ? (
            <>
              <div
                className="ring"
                style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff" }}
              />
              {t("signingIn")}
            </>
          ) : (
            t("signIn")
          )}
        </button>

        <div className="row" style={{ gap: 12, alignItems: "center", margin: "10px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          <span className="tiny muted">{t("orContinueWith")}</span>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn outline" style={{ flex: 1 }} disabled title={tCommon("comingSoon")}>
            <Icons.google width={16} /> Google
          </button>
          <button type="button" className="btn outline" style={{ flex: 1 }} disabled title={tCommon("comingSoon")}>
            <Icons.apple width={16} /> Apple
          </button>
        </div>
      </form>

      <p className="tiny muted" style={{ marginTop: 32, textAlign: "center" }}>
        {t("noChurchYet")}{" "}
        <span style={{ color: "var(--primary)", fontWeight: 600, cursor: "not-allowed" }}>
          {t("requestAccess")}
        </span>
      </p>
    </div>
  );
}
