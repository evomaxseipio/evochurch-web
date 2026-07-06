"use client";

function installDevPerformanceShim() {
  if (process.env.NODE_ENV !== "development") return;
  if (typeof performance === "undefined") return;

  const perf = performance as Performance & { __evoMeasureShim?: boolean };
  if (perf.__evoMeasureShim) return;

  const original = perf.measure.bind(perf);
  perf.measure = (...args: Parameters<Performance["measure"]>) => {
    try {
      return original(...args);
    } catch (error) {
      if (
        error instanceof TypeError &&
        error.message.includes("negative time stamp")
      ) {
        return undefined;
      }
      throw error;
    }
  };
  perf.__evoMeasureShim = true;
}

installDevPerformanceShim();

/** Ensures the dev performance shim module is loaded on the client. */
export function DevPerformanceShim() {
  return null;
}
