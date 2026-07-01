"use client";

import { login, type LoginState } from "@/app/(auth)/login/actions";
import { Icons } from "@/components/icons";
import Link from "next/link";
import { useActionState, useState } from "react";

const initial: LoginState = {};

export function LoginForm({
  next,
  authError,
}: {
  next?: string;
  authError?: boolean;
}) {
  const [state, formAction, pending] = useActionState(login, initial);
  const [showPw, setShowPw] = useState(false);

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
          Bienvenido de nuevo
        </h1>
        <p className="muted" style={{ marginTop: 12, fontSize: 14.5 }}>
          Ingresa tu correo y contraseña para acceder a tu cuenta.
        </p>
      </div>

      {authError ? (
        <p
          className="help error"
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 8,
            background: "var(--danger-bg)",
          }}
        >
          No se pudo completar el inicio de sesión. Intenta de nuevo.
        </p>
      ) : null}

      <form action={formAction} className="col" style={{ gap: 16 }}>
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="field">
          <label htmlFor="email">Correo electrónico</label>
          <div className="input-wrap">
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="tu@iglesia.do"
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="password">Contraseña</label>
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
              aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
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
            Recordarme
          </label>
          <Link
            href="/login/forgot"
            style={{ fontSize: 13, color: "var(--primary)", fontWeight: 600 }}
          >
            ¿Olvidaste tu clave?
          </Link>
        </div>

        {state.error ? (
          <div className="help error">{state.error}</div>
        ) : null}

        <button type="submit" className="btn primary lg" style={{ marginTop: 8 }} disabled={pending}>
          {pending ? (
            <>
              <div
                className="ring"
                style={{ width: 16, height: 16, borderWidth: 2, borderTopColor: "#fff" }}
              />
              Entrando…
            </>
          ) : (
            "Iniciar sesión"
          )}
        </button>

        <div className="row" style={{ gap: 12, alignItems: "center", margin: "10px 0" }}>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
          <span className="tiny muted">o continúa con</span>
          <div style={{ flex: 1, height: 1, background: "var(--hairline)" }} />
        </div>

        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn outline" style={{ flex: 1 }} disabled title="Próximamente">
            <Icons.google width={16} /> Google
          </button>
          <button type="button" className="btn outline" style={{ flex: 1 }} disabled title="Próximamente">
            <Icons.apple width={16} /> Apple
          </button>
        </div>
      </form>

      <p className="tiny muted" style={{ marginTop: 32, textAlign: "center" }}>
        ¿Tu iglesia aún no usa EvoChurch?{" "}
        <span style={{ color: "var(--primary)", fontWeight: 600, cursor: "not-allowed" }}>
          Solicita acceso
        </span>
      </p>
    </div>
  );
}
