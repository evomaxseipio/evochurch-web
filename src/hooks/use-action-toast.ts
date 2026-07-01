"use client";

import type { ActionResult } from "@/app/(app)/members/actions";
import { toast } from "@/lib/toast";
import { useEffect, useRef } from "react";

export function useActionToast(
  state: ActionResult | null,
  options: {
    successMessage: string;
    onSuccess?: (result: Extract<ActionResult, { ok: true }>) => void;
  },
) {
  const onSuccessRef = useRef(options.onSuccess);
  const handledStateRef = useRef<ActionResult | null>(null);

  useEffect(() => {
    onSuccessRef.current = options.onSuccess;
  });

  useEffect(() => {
    if (!state || state === handledStateRef.current) return;
    handledStateRef.current = state;

    if (state.ok) {
      toast.success(options.successMessage);
      onSuccessRef.current?.(state);
    } else {
      toast.error(state.error);
    }
  }, [state, options.successMessage]);
}
