import {
  MODEL_FALLBACK_CHAIN_LIMIT,
  normalizeModelFallbackChain,
  type ModelFallbackRef,
} from "@kcode/shared";

const FAILOVER_REASONS = new Set([
  "timeout",
  "stream_idle_timeout",
  "stale_connection",
  "rate_limited",
  "provider_overloaded",
  "server_error",
]);

const BLOCKING_REASONS = new Set([
  "auth_failed",
  "auth_refresh",
  "cancelled",
  "context_exceeded",
  "invalid_request",
  "provider_not_configured",
  "proxy_error",
  "tls_error",
]);

const CODE_TO_REASON: Record<string, string> = {
  model_rate_limited: "rate_limited",
  model_request_timeout: "timeout",
};

export function modelFallbackKey(ref: ModelFallbackRef): string {
  return `${ref.providerId}\n${ref.modelId}`;
}

export function readModelFailoverReason(error: unknown): string | null {
  const signal = readFailoverSignal(error);
  if (!signal) return null;
  if (signal.reason && BLOCKING_REASONS.has(signal.reason)) return null;
  if (signal.reason && FAILOVER_REASONS.has(signal.reason)) return signal.reason;
  if (signal.reason) return null;
  return reasonFromStatusCode(signal.statusCode);
}

export function selectNextModelFallback(input: {
  current: ModelFallbackRef;
  chain: readonly ModelFallbackRef[];
  tried: readonly ModelFallbackRef[];
}): ModelFallbackRef | null {
  const skipped = new Set([
    modelFallbackKey(input.current),
    ...input.tried.map((item) => modelFallbackKey(item)),
  ]);
  for (const candidate of normalizeModelFallbackChain(input.chain)) {
    if (skipped.has(modelFallbackKey(candidate))) continue;
    return candidate;
  }
  return null;
}

export { MODEL_FALLBACK_CHAIN_LIMIT, normalizeModelFallbackChain };

function reasonFromStatusCode(statusCode: number | undefined): string | null {
  if (statusCode === 429) return "rate_limited";
  if (statusCode === 408 || statusCode === 504) return "timeout";
  if (typeof statusCode === "number" && statusCode >= 500 && statusCode <= 599) {
    return "server_error";
  }
  return null;
}

function readFailoverSignal(
  error: unknown,
): { reason?: string; statusCode?: number } | null {
  let current: unknown = error;
  const seen = new Set<object>();
  for (let depth = 0; depth < 8; depth += 1) {
    if (!current || typeof current !== "object" || seen.has(current)) break;
    seen.add(current);
    const record = current as {
      cause?: unknown;
      code?: unknown;
      context?: unknown;
      error?: unknown;
      lastError?: unknown;
    };
    const context =
      record.context && typeof record.context === "object"
        ? (record.context as { code?: unknown; reason?: unknown; statusCode?: unknown })
        : undefined;
    const code = typeof record.code === "string" ? record.code : context?.code;
    const reason =
      readReason(context?.reason) ??
      readReason(typeof code === "string" ? CODE_TO_REASON[code] : undefined);
    const statusCode =
      typeof context?.statusCode === "number" && Number.isFinite(context.statusCode)
        ? context.statusCode
        : undefined;
    if (reason || statusCode !== undefined) {
      return { ...(reason ? { reason } : {}), ...(statusCode !== undefined ? { statusCode } : {}) };
    }
    const next = record.cause ?? record.lastError ?? record.error;
    if (!next || next === current) break;
    current = next;
  }
  return null;
}

function readReason(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const reason = value.trim();
  return reason.length > 0 ? reason : undefined;
}
