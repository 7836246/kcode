import assert from "node:assert/strict";
import test from "node:test";
import type { ModelEvent } from "@kcode/contracts";
import { accumulateWorkspaceGenerateTextStream } from "./workspace-generate-text-accumulate.js";

async function* streamOf(events: ModelEvent[]): AsyncGenerator<ModelEvent> {
  for (const event of events) {
    yield event;
  }
}

test("text_delta 顺序拼接成完整正文，其余无贡献事件被忽略", async () => {
  const result = await accumulateWorkspaceGenerateTextStream(
    streamOf([
      { type: "start" },
      { type: "text_start", id: "t1" },
      { type: "text_delta", id: "t1", text: "优化后" },
      { type: "reasoning_start", id: "r1" },
      { type: "reasoning_delta", id: "r1", text: "思考过程" },
      { type: "text_delta", id: "t1", text: "的提示词" },
      { type: "text_end", id: "t1" },
      { type: "finish", finishReason: "stop", usage: {} },
    ]),
  );
  assert.equal(result.text, "优化后的提示词");
  assert.equal(result.finishReason, "stop");
  assert.equal("reasoning" in result, false);
});

test("tool_call 按 id 去重，无 toolCalls 时结果不携带该字段", async () => {
  const withTools = await accumulateWorkspaceGenerateTextStream(
    streamOf([
      {
        type: "tool_call",
        toolCall: { id: "call-1", name: "read_file", input: { path: "a.ts" } },
      },
      {
        type: "tool_call",
        toolCall: { id: "call-1", name: "read_file", input: { path: "a.ts" } },
      },
      {
        type: "tool_call",
        toolCall: { id: "call-2", name: "grep", input: { pattern: "x" } },
      },
      { type: "finish", finishReason: "tool-calls", usage: {} },
    ]),
  );
  assert.equal(withTools.toolCalls?.length, 2);
  assert.deepEqual(
    withTools.toolCalls?.map((call) => call.id),
    ["call-1", "call-2"],
  );

  const withoutTools = await accumulateWorkspaceGenerateTextStream(
    streamOf([
      { type: "text_delta", text: "ok" },
      { type: "finish", finishReason: "stop", usage: {} },
    ]),
  );
  assert.equal("toolCalls" in withoutTools, false);
});

test("finish 提供 finishReason 与 usage", async () => {
  const usage = { inputTokens: 12, outputTokens: 5 };
  const result = await accumulateWorkspaceGenerateTextStream(
    streamOf([
      { type: "text_delta", text: "x" },
      { type: "finish", finishReason: "length", usage },
    ]),
  );
  assert.equal(result.finishReason, "length");
  assert.equal(result.usage, usage);
});

test("error 事件按流式错误语义抛出：Error 原样、字符串与非 Error 归一", async () => {
  const original = new Error("provider boom");
  await assert.rejects(
    accumulateWorkspaceGenerateTextStream(
      streamOf([
        { type: "text_delta", text: "部分" },
        { type: "error", error: original },
      ]),
    ),
    (error: unknown) => error === original,
  );

  await assert.rejects(
    accumulateWorkspaceGenerateTextStream(streamOf([{ type: "error", error: "stream broke" }])),
    (error: unknown) => error instanceof Error && error.message === "stream broke",
  );

  // ProviderBusinessError 的 plain object 形态不能丢 providerCode。
  const plainBusinessError = {
    name: "ProviderBusinessError",
    isProviderBusinessError: true,
    providerCode: 3007,
    providerMessage: "suspicious request",
  };
  await assert.rejects(
    accumulateWorkspaceGenerateTextStream(streamOf([{ type: "error", error: plainBusinessError }])),
    (error: unknown) => {
      const record = error as Record<string, unknown> & { message?: string; context?: unknown };
      return (
        record.message === "suspicious request" &&
        (record.context as Record<string, unknown>)?.providerCode === "3007"
      );
    },
  );
});

test("流在 finish 事件前结束判失败，不产出半截结果", async () => {
  await assert.rejects(
    accumulateWorkspaceGenerateTextStream(streamOf([{ type: "text_delta", text: "半截" }])),
    /finish/,
  );
  await assert.rejects(accumulateWorkspaceGenerateTextStream(streamOf([])), /finish/);
});
