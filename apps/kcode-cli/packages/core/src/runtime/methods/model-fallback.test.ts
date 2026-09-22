import assert from "node:assert/strict";
import test from "node:test";
import { readModelFailoverReason, selectNextModelFallback } from "./model-fallback.js";

test("超时、限流和 5xx 可以换备用模型", () => {
  assert.equal(readModelFailoverReason(contextError("timeout")), "timeout");
  assert.equal(readModelFailoverReason(contextError("rate_limited")), "rate_limited");
  assert.equal(readModelFailoverReason(contextError("server_error")), "server_error");
  assert.equal(readModelFailoverReason(contextError("provider_overloaded")), "provider_overloaded");
  assert.equal(
    readModelFailoverReason({ code: "model_request_timeout", context: {} }),
    "timeout",
  );
});

test("没有 reason 时按状态码判断", () => {
  assert.equal(readModelFailoverReason({ context: { statusCode: 429 } }), "rate_limited");
  assert.equal(readModelFailoverReason({ context: { statusCode: 504 } }), "timeout");
  assert.equal(readModelFailoverReason({ context: { statusCode: 503 } }), "server_error");
});

test("鉴权、取消、内容拒绝和上下文超限不换模型", () => {
  for (const reason of ["auth_failed", "auth_refresh", "cancelled", "invalid_request", "context_exceeded"]) {
    assert.equal(readModelFailoverReason(contextError(reason)), null);
  }
  assert.equal(readModelFailoverReason({ context: { reason: "auth_failed", statusCode: 500 } }), null);
  assert.equal(readModelFailoverReason({ context: { statusCode: 401 } }), null);
  assert.equal(readModelFailoverReason(new Error("boom")), null);
});

test("备用链跳过当前模型和已经试过的模型", () => {
  const chain = [
    { providerId: "a", modelId: "primary" },
    { providerId: "a", modelId: "backup-1" },
    { providerId: "b", modelId: "backup-2" },
  ];
  assert.deepEqual(
    selectNextModelFallback({
      current: { providerId: "a", modelId: "primary" },
      chain,
      tried: [],
    }),
    { providerId: "a", modelId: "backup-1" },
  );
  assert.deepEqual(
    selectNextModelFallback({
      current: { providerId: "a", modelId: "backup-1" },
      chain,
      tried: [{ providerId: "a", modelId: "primary" }],
    }),
    { providerId: "b", modelId: "backup-2" },
  );
  assert.equal(
    selectNextModelFallback({
      current: { providerId: "b", modelId: "backup-2" },
      chain,
      tried: [
        { providerId: "a", modelId: "primary" },
        { providerId: "a", modelId: "backup-1" },
      ],
    }),
    null,
  );
});

function contextError(reason: string): { context: { reason: string } } {
  return { context: { reason } };
}
