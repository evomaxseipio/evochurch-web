"use client";

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void) {
  const mq = window.matchMedia("(min-width: 900px)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia("(min-width: 900px)").matches;
}

export function useIsDesktop() {
  // Mobile-first en SSR para evitar mismatch con viewport real al hidratar.
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
