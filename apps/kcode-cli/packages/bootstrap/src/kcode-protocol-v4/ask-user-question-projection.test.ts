import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionEvent,
  SessionEventType,
  type MessageId,
  type SessionId,
  type ToolCallId,
  type TraceId,
  type TurnId,
} from "@kcode/contracts";
import { conversationRowSchema, type ToolCallRow } from "@kcode/shared/kcode-protocol-v4";
import { ProductProjection } from "./product-projection.js";

// AskUserQuestion 的答案只在 display 通道里；工具入参（模型声明的 questions）与模型可见文本
// （formatModelContent 拍的 `"Q"="A"`）都不是答案来源。投影必须原样把 display 带到 row.output，
// 少一个 strict union 成员就会被整块剥掉——卡片退回「未提供回答」（原 bug 形态）。
const sessionId = "session-ask-user-question" as SessionId;
const turnId = "turn-ask-user-question" as TurnId;
const traceId = "trace-ask-user-question" as TraceId;
const toolCallId = "tool-ask-user-question" as ToolCallId;

const QUESTIONS = [
  {
    question: "用哪个方案？",
    header: "方案",
    options: [
      { label: "A 方案", description: "先做 A" },
      { label: "B 方案", description: "先做 B" },
    ],
    multiSelect: false,
  },
];
const MODEL_TEXT = 'User has answered your questions: "用哪个方案？"="A 方案".';

function projectionWithAnswers(answers: Record<string, string> | undefined): ProductProjection {
  const target = new ProductProjection(sessionId, "ask-user-question-projection-test");
  target.applyEvent(
    createSessionEvent(
      SessionEventType.TurnStarted,
      sessionId,
      { turnNumber: 1, input: "先问一下", messageId: "msg-ask-1" as MessageId },
      { turnId, traceId, sequenceNumber: 1 },
    ),
  );
  target.applyEvent(
    createSessionEvent(
      SessionEventType.ToolCallScheduled,
      sessionId,
      {
        toolCallId,
        assistantMessageId: "msg-ask-2" as MessageId,
        toolName: "AskUserQuestion",
        input: { questions: QUESTIONS },
        schedule: { parallelGroups: [[toolCallId]], executionOrder: [toolCallId] },
      },
      { turnId, traceId, sequenceNumber: 2 },
    ),
  );
  target.applyEvent(
    createSessionEvent(
      SessionEventType.ToolCallResult,
      sessionId,
      {
        toolCallId,
        duration: 12,
        result: {
          success: true,
          content: MODEL_TEXT,
          ...(answers === undefined
            ? {}
            : { display: { kind: "ask_user_question" as const, answers } }),
        },
      },
      { turnId, traceId, sequenceNumber: 3 },
    ),
  );
  return target;
}

function toolRowOf(target: ProductProjection): ToolCallRow {
  const row = target
    .getSnapshot()
    .rows.window.find((candidate): candidate is ToolCallRow => candidate.kind === "toolCall");
  assert.ok(row);
  return row;
}

test("结构化答案经 row.output.display 到达前端，协议校验后仍在场", () => {
  const row = toolRowOf(projectionWithAnswers({ "用哪个方案？": "A 方案" }));
  assert.deepEqual(row.output?.display, {
    kind: "ask_user_question",
    answers: { "用哪个方案？": "A 方案" },
  });
  // 协议 schema 缺成员时 display 会被 .catch(undefined) 静默剥掉，因此在这里直接断言往返结果。
  const parsed = conversationRowSchema.parse(row);
  assert.equal(parsed.kind, "toolCall");
  assert.deepEqual(
    parsed.kind === "toolCall" ? parsed.output?.display : undefined,
    row.output?.display,
  );
});

test("display 不改模型可见文本，工具入参仍是模型声明的原始 questions", () => {
  const row = toolRowOf(projectionWithAnswers({ "用哪个方案？": "A 方案" }));
  assert.equal(row.output?.text, MODEL_TEXT);
  assert.deepEqual(row.input, { questions: QUESTIONS });
});

test("answers 为空对象仍保留 display（未作答、自动继续的显式语义）", () => {
  const row = toolRowOf(projectionWithAnswers({}));
  assert.deepEqual(row.output?.display, { kind: "ask_user_question", answers: {} });
});

test("没有 display 的结果不产生 display 字段（拒绝/取消/旧数据回落）", () => {
  const row = toolRowOf(projectionWithAnswers(undefined));
  assert.equal(row.output?.display, undefined);
});
