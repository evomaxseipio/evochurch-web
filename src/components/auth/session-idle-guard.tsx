"use client";

import { createClient } from "@/lib/supabase/client";
import { Icons } from "@/components/icons";
import {
  ACTIVITY_STORAGE_KEY,
  clearSessionIdleActivity,
  SESSION_IDLE_MS,
  SESSION_IDLE_WARN_MS,
} from "@/lib/auth/session-idle";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

const ACTIVITY_EVENTS = ["mousedown", "keydown", "scroll", "touchstart"] as const;
const ACTIVITY_THROTTLE_MS = 30_000;
const SYNC_CHANNEL = "evochurch-session-idle";

function readLastActivity(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = sessionStorage.getItem(ACTIVITY_STORAGE_KEY);
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function writeLastActivity(at: number) {
  sessionStorage.setItem(ACTIVITY_STORAGE_KEY, String(at));
}

function idleElapsedMs(lastActivity: number): number {
  return Date.now() - lastActivity;
}

export function SessionIdleGuard() {
  const t = useTranslations("auth.sessionIdle");
  const tCommon = useTranslations("common");
  const [showWarning, setShowWarning] = useState(false);
  const warnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastThrottle = useRef(0);
  const signingOut = useRef(false);
  const broadcast = useRef<BroadcastChannel | null>(null);

  const clearTimers = useCallback(() => {
    clearTimeout(warnTimer.current);
    clearTimeout(logoutTimer.current);
    warnTimer.current = undefined;
    logoutTimer.current = undefined;
  }, []);

  const performSignOut = useCallback(() => {
    if (signingOut.current) return;
    signingOut.current = true;
    clearTimers();
    broadcast.current?.postMessage({ type: "sign-out" });

    void (async () => {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } finally {
        clearSessionIdleActivity();
        window.location.assign("/login?reason=idle");
      }
    })();
  }, [clearTimers]);

  const scheduleFrom = useCallback(
    (lastActivity: number) => {
      clearTimers();
      setShowWarning(false);

      const elapsed = idleElapsedMs(lastActivity);
      const remainingIdle = SESSION_IDLE_MS - elapsed;
      const remainingWarn = SESSION_IDLE_WARN_MS - elapsed;

      if (remainingIdle <= 0) {
        performSignOut();
        return;
      }

      if (remainingWarn <= 0) {
        setShowWarning(true);
      } else {
        warnTimer.current = setTimeout(() => setShowWarning(true), remainingWarn);
      }

      logoutTimer.current = setTimeout(performSignOut, remainingIdle);
    },
    [clearTimers, performSignOut],
  );

  const touchActivity = useCallback(
    (force = false) => {
      const now = Date.now();
      if (!force && now - lastThrottle.current < ACTIVITY_THROTTLE_MS) return;
      lastThrottle.current = now;
      writeLastActivity(now);
      broadcast.current?.postMessage({ type: "activity", at: now });
      scheduleFrom(now);
    },
    [scheduleFrom],
  );

  const continueSession = useCallback(() => {
    touchActivity(true);
  }, [touchActivity]);

  useEffect(() => {
    // Tras login o navegación al shell, no reutilizar timestamps de sesiones anteriores.
    const now = Date.now();
    lastThrottle.current = now;
    writeLastActivity(now);
    scheduleFrom(now);

    const onActivity = () => touchActivity();
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, onActivity, { passive: true }),
    );

    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      scheduleFrom(readLastActivity());
    };
    document.addEventListener("visibilitychange", onVisibility);

    if (typeof BroadcastChannel !== "undefined") {
      broadcast.current = new BroadcastChannel(SYNC_CHANNEL);
      broadcast.current.onmessage = (event: MessageEvent<{ type: string; at?: number }>) => {
        if (event.data?.type === "sign-out") {
          performSignOut();
          return;
        }
        if (event.data?.type === "activity" && typeof event.data.at === "number") {
          writeLastActivity(event.data.at);
          scheduleFrom(event.data.at);
        }
      };
    }

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((event) => window.removeEventListener(event, onActivity));
      document.removeEventListener("visibilitychange", onVisibility);
      broadcast.current?.close();
    };
  }, [clearTimers, performSignOut, scheduleFrom, touchActivity]);

  if (!showWarning) return null;

  return (
    <>
      <div className="drawer-backdrop" style={{ zIndex: 80 }} aria-hidden />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="session-idle-title"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 81,
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
          width: 420,
          maxWidth: "92vw",
          boxShadow: "var(--shadow-3)",
        }}
      >
        <div className="row" style={{ gap: 14, alignItems: "flex-start" }}>
          <span
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              flexShrink: 0,
              background: "color-mix(in oklab, var(--accent) 16%, transparent)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.bell size={18} />
          </span>
          <div>
            <h3 id="session-idle-title" style={{ margin: 0, fontSize: 16 }}>
              {t("title")}
            </h3>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              {t("body")}
            </p>
          </div>
        </div>
        <div
          className="row"
          style={{ marginTop: 20, justifyContent: "flex-end", gap: 8 }}
        >
          <button type="button" className="btn primary" onClick={continueSession}>
            {t("continue")}
          </button>
          <button type="button" className="btn outline" onClick={performSignOut}>
            {tCommon("signOut")}
          </button>
        </div>
      </div>
    </>
  );
}
