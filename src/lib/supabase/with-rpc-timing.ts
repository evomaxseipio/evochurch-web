import { isRpcTimingEnabled, logRpcTiming } from "@/lib/observability/rpc-timing";
import type { SupabaseClient } from "@supabase/supabase-js";

export function withRpcTiming<T extends SupabaseClient>(client: T): T {
  if (!isRpcTimingEnabled()) return client;

  const originalRpc = client.rpc.bind(client);

  const timedRpc: typeof client.rpc = ((fn, params, options) => {
    const started = performance.now();
    const query = originalRpc(fn, params, options);

    return query.then(
      (result) => {
        logRpcTiming({
          rpc: String(fn),
          ms: Math.round(performance.now() - started),
          ok: result.error == null,
          ...(result.error
            ? { err: result.error.message, code: result.error.code }
            : {}),
        });
        return result;
      },
      (err) => {
        logRpcTiming({
          rpc: String(fn),
          ms: Math.round(performance.now() - started),
          ok: false,
        });
        throw err;
      },
    );
  }) as typeof client.rpc;

  return new Proxy(client, {
    get(target, prop, receiver) {
      if (prop === "rpc") return timedRpc;
      return Reflect.get(target, prop, receiver);
    },
  });
}
