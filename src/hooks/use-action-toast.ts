"use client";

import { toast } from "@/lib/toast";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";

type ToastActionResult =
  | { ok: true }
  | { ok: false; error?: string; errorKey?: string };

export function useActionToast<T extends ToastActionResult>(
  state: T | null,
  options: {
    successMessage: string;
    onSuccess?: (result: Extract<T, { ok: true }>) => void;
    resolveError?: (errorKey?: string, error?: string) => string;
  },
) {
  const t = useTranslations();
  const onSuccessRef = useRef(options.onSuccess);
  const resolveErrorRef = useRef(options.resolveError);
  const handledStateRef = useRef<T | null>(null);

  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
    resolveErrorRef.current = options.resolveError;
  });

  useEffect(() => {
    if (!state || state === handledStateRef.current) return;
    handledStateRef.current = state;

    if (state.ok) {
      toast.success(options.successMessage);
      onSuccessRef.current?.(state as Extract<T, { ok: true }>);
    } else {
      const message = resolveErrorRef.current
        ? resolveErrorRef.current(state.errorKey, state.error)
        : state.errorKey && t.has(state.errorKey)
          ? t(state.errorKey)
          : state.error && state.error.includes(".") && t.has(state.error)
            ? t(state.error)
            : state.error ?? state.errorKey ?? t("errors.serverError");
      toast.error(message);
    }
  }, [state, options.successMessage, t]);
}
