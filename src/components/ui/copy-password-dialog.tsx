"use client";

import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";

export function CopyPasswordDialog({
  open,
  title,
  message,
  email,
  password,
  onClose,
}: {
  open: boolean;
  title: string;
  message: string;
  email: string;
  password: string;
  onClose: () => void;
}) {
  const t = useTranslations("common");
  const tAdmin = useTranslations("adminUsers");

  if (!open) return null;

  async function copyPassword() {
    try {
      await navigator.clipboard.writeText(password);
      toast.success(t("copied"), tAdmin("passwordCopied"));
    } catch {
      toast.error(tAdmin("copyFailed"), tAdmin("copyFailedHint"));
    }
  }

  return (
    <>
      <div
        className="drawer-backdrop"
        style={{ zIndex: 220 }}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-labelledby="copy-password-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 221,
          width: "min(420px, calc(100vw - 32px))",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          boxShadow: "var(--shadow-3)",
        }}
      >
        <h2 id="copy-password-title" style={{ margin: "0 0 8px", fontSize: 18 }}>
          {title}
        </h2>
        <p className="muted" style={{ margin: "0 0 16px", fontSize: 13, lineHeight: 1.5 }}>
          {message}
        </p>
        <div className="field" style={{ marginBottom: 16 }}>
          <label className="tiny muted">{tAdmin("accessEmail")}</label>
          <div
            className="card flat"
            style={{
              padding: "10px 12px",
              marginTop: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 13,
            }}
          >
            {email}
          </div>
        </div>
        <div className="field" style={{ marginBottom: 20 }}>
          <label className="tiny muted">{tAdmin("tempPassword")}</label>
          <div
            className="card flat"
            style={{
              padding: "10px 12px",
              marginTop: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.04em",
              wordBreak: "break-all",
            }}
          >
            {password}
          </div>
        </div>
        <div className="row" style={{ gap: 10, justifyContent: "flex-end" }}>
          <button type="button" className="btn outline" onClick={onClose}>
            {t("close")}
          </button>
          <button type="button" className="btn primary" onClick={copyPassword}>
            {tAdmin("copyPassword")}
          </button>
        </div>
      </div>
    </>
  );
}
