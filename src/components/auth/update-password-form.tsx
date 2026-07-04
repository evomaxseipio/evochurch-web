"use client";

import {
  changeTempPasswordAction,
  type ChangeTempPasswordState,
} from "@/app/(auth)/login/update-password/actions";
import { Icons } from "@/components/icons";
import { signOut } from "@/app/(auth)/login/actions";
import { useTranslations } from "next-intl";
import { useActionState, useState } from "react";

const initial: ChangeTempPasswordState = {};

export function UpdatePasswordForm({ email }: { email?: string | null }) {
  const t = useTranslations("auth");
  const tErrors = useTranslations("auth.errors");
  const [state, formAction, pending] = useActionState(
    changeTempPasswordAction,
    initial,
  );
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const errorMessage = state.errorKey
    ? state.errorKey.startsWith("auth.errors.")
      ? tErrors(state.errorKey.replace("auth.errors.", "") as "updateFailed")
      : state.error
    : state.error;

  return (
    <div className="inner">
      <div style={{ textAlign: "center", marginBottom: 30 }}>
        <h1
          className="display"
          style={{
            fontSize: 34,
            lineHeight: 1.08,
            letterSpacing: "-0.025em",
            margin: 0,
            color: "var(--ink)",
          }}
        >
          {t("updatePasswordTitle")}
        </h1>
        <p className="muted" style={{ marginTop: 12, fontSize: 14.5 }}>
          {t("updatePasswordSubtitle")}
          {email ? (
            <>
              {" "}
              (<strong style={{ color: "var(--fg)" }}>{email}</strong>)
            </>
          ) : null}
        </p>
      </div>

      {errorMessage ? (
        <p className="help error" role="alert" style={{ marginBottom: 12 }}>
          {errorMessage}
        </p>
      ) : null}

      <form action={formAction} className="col" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="password">{t("newPassword")}</label>
          <div className="input-wrap">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("minPassword")}
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

        <div className="field">
          <label htmlFor="confirm">{t("confirmPassword")}</label>
          <div className="input-wrap">
            <input
              id="confirm"
              name="confirm"
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder={t("repeatPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              style={{
                border: 0,
                background: "transparent",
                padding: 0,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
              aria-label={
                showConfirm ? t("hideConfirmPassword") : t("showConfirmPassword")
              }
            >
              <Icons.eye width={18} style={{ color: "var(--ink-4)" }} />
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="btn primary lg"
          style={{ marginTop: 8 }}
          disabled={pending}
        >
          {pending ? (
            <>
              <div
                className="ring"
                style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff" }}
              />
              {t("saving")}
            </>
          ) : (
            t("saveAndContinue")
          )}
        </button>
      </form>

      <form action={signOut} style={{ marginTop: 16, textAlign: "center" }}>
        <button type="submit" className="btn ghost sm">
          {t("backToLogin")}
        </button>
      </form>
    </div>
  );
}
