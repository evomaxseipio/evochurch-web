export type RpcTimingLog = {
  rpc: string;
  ms: number;
  ok: boolean;
};

export function isRpcTimingEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.RPC_TIMING === "1"
  );
}

/** Structured dev log — RPC name + duration only, no params or PII. */
export function logRpcTiming(entry: RpcTimingLog): void {
  if (!isRpcTimingEnabled()) return;
  console.log(JSON.stringify({ type: "rpc_timing", ...entry }));
}
