"use client";

import {
  changeTempPasswordAction,
  type ChangeTempPasswordState,
} from "@/app/(auth)/login/update-password/actions";
import { Icons } from "@/components/icons";
import { signOut } from "@/app/(auth)/login/actions";
import { useActionState, useState } from "react";

const initial: ChangeTempPasswordState = {};

export function UpdatePasswordForm({ email }: { email?: string | null }) {
  const [state, formAction, pending] = useActionState(
    changeTempPasswordAction,
    initial,
  );
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

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
          Elige tu contraseña
        </h1>
        <p className="muted" style={{ marginTop: 12, fontSize: 14.5 }}>
          Tu administrador te dio una contraseña temporal
          {email ? (
            <>
              {" "}
              para <strong style={{ color: "var(--fg)" }}>{email}</strong>
            </>
          ) : null}
          . Define una contraseña personal para continuar.
        </p>
      </div>

      <form action={formAction} className="col" style={{ gap: 16 }}>
        <div className="field">
          <label htmlFor="password">Nueva contraseña</label>
          <div className="input-wrap">
            <input
              id="password"
              name="password"
              type={showPw ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
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

        <div className="field">
          <label htmlFor="confirm">Confirmar contraseña</label>
          <div className="input-wrap">
            <input
              id="confirm"
              name="confirm"
              type={showConfirm ? "text" : "password"}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
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
                showConfirm ? "Ocultar confirmación" : "Mostrar confirmación"
              }
            >
              <Icons.eye width={18} style={{ color: "var(--ink-4)" }} />
            </button>
          </div>
        </div>

        {state.error ? (
          <p
            className="help error"
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: 8,
              background: "var(--danger-bg)",
              color: "var(--danger)",
              fontSize: 13,
              lineHeight: 1.45,
            }}
          >
            {state.error}
          </p>
        ) : null}

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
                style={{
                  width: 16,
                  height: 16,
                  borderWidth: 2,
                  borderTopColor: "#fff",
                }}
              />
              Guardando…
            </>
          ) : (
            <>
              <Icons.check width={16} /> Guardar y continuar
            </>
          )}
        </button>
      </form>

      <form action={signOut} style={{ marginTop: 20, textAlign: "center" }}>
        <button
          type="submit"
          className="btn ghost sm"
          style={{ color: "var(--muted)" }}
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
