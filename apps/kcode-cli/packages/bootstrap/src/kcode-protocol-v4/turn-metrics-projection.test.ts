import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionEvent,
  SessionEventType,
  type MessageId,
  type ModelId,
  type ModelProviderId,
  type SessionId,
  type TraceId,
  type TurnId,
} from "@kcode/contracts";
import type { TurnHeaderRow } from "@kcode/shared/kcode-protocol-v4";
import { ProductProjection } from "./product-projection.js";

const sessionId = "session-metrics" as SessionId;
const turnId = "turn-1" as TurnId;
const traceId = "trace-metrics" as TraceId;
const providerId = "provider" as ModelProviderId;
const modelId = "model" as ModelId;

function projection(): ProductProjection {
  return new ProductProjection(sessionId, "turn-metrics-test");
}

function applyTurnStarted(target: ProductProjection, sequenceNumber: number, messageId: string): void {
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnStarted,
      sessionId,
      {
        turnNumber: 1,
        input: "hello",
        messageId: messageId as MessageId,
      },
      { turnId, traceId, sequenceNumber },
    ),
  );
}

function applyCompleted(
  target: ProductProjection,
  sequenceNumber: number,
  input: {
    requestId: string;
    outputTokens: number;
    durationMs: number;
    querySource?: string;
    timeToFirstContentMs?: number;
  },
): void {
  target.applyEvent(
    createSessionEvent(
      SessionEventType.ModelNetworkStatus,
      sessionId,
      {
        type: "model_request_completed",
        timestamp: new Date(0).toISOString(),
        traceId,
        requestId: input.requestId,
        providerId,
        modelId,
        transport: "sse",
        attempt: 1,
        maxAttempts: 1,
        durationMs: input.durationMs,
        ...(input.querySource !== undefined ? { querySource: input.querySource } : {}),
        ...(input.timeToFirstContentMs !== undefined
          ? { timeToFirstContentMs: input.timeToFirstContentMs }
          : {}),
        usage: { outputTokens: input.outputTokens },
      },
      { turnId, traceId, sequenceNumber },
    ),
  );
}

function headers(target: ProductProjection): TurnHeaderRow[] {
  return target
    .getSnapshot()
    .rows.window.filter((row): row is TurnHeaderRow => row.kind === "turnHeader");
}

test("旁路请求不改指标，缺计时请求不抬高 tok/s", () => {
  const target = projection();
  applyTurnStarted(target, 1, "msg-1");
  applyCompleted(target, 2, {
    requestId: "main-1",
    querySource: "main_turn",
    outputTokens: 100,
    durationMs: 1400,
    timeToFirstContentMs: 400,
  });

  const afterMain = target.getSnapshot().composerTurnMetrics;
  assert.deepEqual(afterMain, {
    streaming: true,
    metrics: { firstTokenMs: 400, outputTokens: 100, tokensPerSecond: 100 },
  });

  applyCompleted(target, 3, {
    requestId: "title-1",
    querySource: "session_title",
    outputTokens: 9000,
    durationMs: 300,
    timeToFirstContentMs: 20,
  });
  applyCompleted(target, 4, {
    requestId: "compact-1",
    querySource: "compact",
    outputTokens: 8000,
    durationMs: 5000,
    timeToFirstContentMs: 100,
  });
  applyCompleted(target, 5, {
    requestId: "untagged-1",
    outputTokens: 7000,
    durationMs: 5000,
    timeToFirstContentMs: 50,
  });
  assert.deepEqual(target.getSnapshot().composerTurnMetrics, afterMain);

  applyCompleted(target, 6, {
    requestId: "main-2",
    querySource: "main_turn",
    outputTokens: 50,
    durationMs: 9000,
  });
  assert.deepEqual(target.getSnapshot().composerTurnMetrics, {
    streaming: true,
    metrics: { firstTokenMs: 400, outputTokens: 150, tokensPerSecond: 100 },
  });
});

test("轮收口保留数字，下一轮开始立刻清空", () => {
  const target = projection();
  applyTurnStarted(target, 1, "msg-1");
  applyCompleted(target, 2, {
    requestId: "main-1",
    querySource: "main_turn",
    outputTokens: 100,
    durationMs: 1400,
    timeToFirstContentMs: 400,
  });
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnComplete,
      sessionId,
      {
        response: "done",
        tokenCount: 100,
        toolCallCount: 0,
        duration: 1400,
        resultType: "success",
      },
      { turnId, traceId, sequenceNumber: 3 },
    ),
  );

  assert.equal(target.getSnapshot().composerTurnMetrics?.streaming, false);
  assert.equal(target.getSnapshot().composerTurnMetrics?.metrics.outputTokens, 100);

  applyTurnStarted(target, 4, "msg-2");
  assert.equal(target.getSnapshot().composerTurnMetrics, null);
  assert.equal(headers(target)[0]?.metrics?.outputTokens, 100);
  assert.equal(headers(target).at(-1)?.metrics, undefined);
});

test("queue 切段后新段从零开始，上一段 header 保留自己的指标", () => {
  const target = projection();
  applyTurnStarted(target, 1, "msg-1");
  applyCompleted(target, 2, {
    requestId: "main-1",
    querySource: "main_turn",
    outputTokens: 100,
    durationMs: 1400,
    timeToFirstContentMs: 400,
  });
  applyCompleted(target, 3, {
    requestId: "main-2",
    querySource: "main_turn",
    outputTokens: 50,
    durationMs: 9000,
  });
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnSteerDrained,
      sessionId,
      {
        pendingInputIds: ["pending-1"],
        targetTurnId: turnId,
        injectedMessageIds: ["msg-2" as MessageId],
        drainedInputs: [
          {
            pendingInputId: "pending-1",
            messageId: "msg-2" as MessageId,
            text: "next",
            delivery: "queue",
          },
        ],
      },
      { turnId, traceId, sequenceNumber: 4 },
    ),
  );

  assert.equal(target.getSnapshot().composerTurnMetrics, null);
  const [closed, opened] = headers(target);
  assert.equal(closed?.metrics?.outputTokens, 150);
  assert.equal(closed?.metrics?.tokensPerSecond, 100);
  assert.equal(opened?.metrics, undefined);

  applyCompleted(target, 5, {
    requestId: "main-3",
    querySource: "main_turn",
    outputTokens: 10,
    durationMs: 1200,
    timeToFirstContentMs: 200,
  });
  assert.deepEqual(target.getSnapshot().composerTurnMetrics, {
    streaming: true,
    metrics: { firstTokenMs: 200, outputTokens: 10, tokensPerSecond: 10 },
  });
  assert.equal(headers(target)[0]?.metrics?.outputTokens, 150);
});
