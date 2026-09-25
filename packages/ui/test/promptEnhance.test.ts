import assert from "node:assert/strict";
import test from "node:test";
import {
  PROMPT_ENHANCE_CONTEXT_HEADER,
  PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT,
  buildPromptEnhanceMessages,
} from "../src/v4/composer/promptEnhance/compose.js";
import {
  evaluatePromptEnhanceRequest,
  evaluatePromptEnhanceRestore,
} from "../src/v4/composer/promptEnhance/gates.js";
import { createPromptEnhanceOperationId } from "../src/v4/composer/promptEnhance/operationId.js";
import {
  PROMPT_ENHANCE_REQUEST_TIMEOUT_MS,
  buildPromptEnhanceRequestParams,
  buildPromptEnhanceWorkspaceTarget,
} from "../src/v4/composer/promptEnhance/request.js";
import { createPromptEnhanceRunTracker } from "../src/v4/composer/promptEnhance/runTracker.js";
import { resolvePromptEnhanceSelection } from "../src/v4/composer/promptEnhance/selection.js";
import {
  mergePromptEnhanceSettingsPatch,
  resolvePromptEnhanceSettings,
} from "../src/v4/composer/promptEnhance/settings.js";

/** 从基础档用户消息里取出外层 JSON 结构，验证内嵌草稿仍是合法 JSON 字段。 */
function extractOriginalPromptJson(userMessage: string): unknown {
  const start = userMessage.indexOf("需要优化的用户提示词证据（JSON）：");
  assert.notEqual(start, -1);
  const block = userMessage
    .slice(start + "需要优化的用户提示词证据（JSON）：".length)
    .trimStart()
    .split("\n\n请输出优化后的提示词：")[0];
  return JSON.parse(block);
}

const PLAIN_GATE_INPUT = {
  draftText: "帮我写一个函数",
  hasAttachments: false,
  hasContexts: false,
  hasReferences: false,
  allowStructuredOverwrite: false,
};

test("草稿里的特殊字符在字面量替换后原样保留", () => {
  const draft = '保留 $& 与 $\' 和 "引号"，再换行：\n第二行';
  const [, userMessage] = buildPromptEnhanceMessages({ mode: "coding", draftText: draft });

  assert.ok(userMessage);
  assert.ok(userMessage.content.includes(draft));
  assert.equal(userMessage.content.includes("{input}"), false);
});

test("草稿自身含占位符字样时不会被误替换", () => {
  const draft = "请保留字面量 {input} 与 {inputJson} 还有 $&";
  const [, userMessage] = buildPromptEnhanceMessages({ mode: "creative", draftText: draft });

  assert.ok(userMessage);
  assert.ok(userMessage.content.includes("请保留字面量 {input} 与 {inputJson} 还有 $&"));
});

test("基础档的草稿以 JSON 字面量嵌入，外层 JSON 可解析且字段等于原文", () => {
  const draft = '第一行\n第二行 "带引号" 与 \\反斜杠\\ 和 $&';
  const [, userMessage] = buildPromptEnhanceMessages({ mode: "basic", draftText: draft });

  assert.ok(userMessage);
  assert.deepEqual(extractOriginalPromptJson(userMessage.content), { originalPrompt: draft });
});

test("有背景时带固定抬头并区分角色，无背景时整段省略", () => {
  const withContext = buildPromptEnhanceMessages({
    mode: "basic",
    draftText: "帮我改一下",
    contextRounds: [{ user: "刚才那个报错是什么", assistant: "是端口占用" }],
  });
  const contextMessage = withContext[1];

  assert.ok(contextMessage);
  assert.ok(contextMessage.content.startsWith(PROMPT_ENHANCE_CONTEXT_HEADER));
  assert.ok(contextMessage.content.includes("用户：刚才那个报错是什么"));
  assert.ok(contextMessage.content.includes("助手：是端口占用"));
  assert.ok(contextMessage.content.includes("\n\n请对以下用户提示词进行基础优化"));

  const withoutContext = buildPromptEnhanceMessages({
    mode: "basic",
    draftText: "帮我改一下",
    contextRounds: [],
  });
  const plainMessage = withoutContext[1];

  assert.ok(plainMessage);
  assert.equal(plainMessage.content.includes(PROMPT_ENHANCE_CONTEXT_HEADER), false);
  assert.ok(plainMessage.content.startsWith("请对以下用户提示词进行基础优化"));
});

test("背景单条过长时截断，助手缺失的轮次只放用户一侧", () => {
  const draftText = "x".repeat(PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT + 50);
  const messages = buildPromptEnhanceMessages({
    mode: "creative",
    draftText: "改写我",
    contextRounds: [{ user: draftText }, { user: "第二轮", assistant: "回答" }],
  });
  const [userMessage] = messages.slice(1);

  assert.ok(userMessage);
  assert.ok(userMessage.content.includes(`${"x".repeat(PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT)}…`));
  assert.equal(
    userMessage.content.includes("x".repeat(PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT + 1)),
    false,
  );
  assert.ok(userMessage.content.includes("用户：第二轮"));
  assert.ok(userMessage.content.includes("助手：回答"));
});

test("三个模式各自选中自己的 system 与 user 模板", () => {
  const draftText = "草稿正文";
  const basic = buildPromptEnhanceMessages({ mode: "basic", draftText });
  const coding = buildPromptEnhanceMessages({ mode: "coding", draftText });
  const creative = buildPromptEnhanceMessages({ mode: "creative", draftText });

  for (const pair of [basic, coding, creative]) {
    assert.equal(pair.length, 2);
    assert.equal(pair[0]?.role, "system");
    assert.equal(pair[1]?.role, "user");
  }

  assert.ok(basic[0]?.content.includes("# Role: 用户提示词基础优化助手"));
  assert.ok(basic[1]?.content.includes("请对以下用户提示词进行基础优化"));
  assert.ok(basic[1]?.content.includes('"originalPrompt"'));

  assert.ok(coding[0]?.content.startsWith("You are a Prompt Engineering Expert"));
  assert.ok(coding[1]?.content.includes("You are a prompt enhancement assistant."));

  assert.ok(creative[0]?.content.includes("# Role: 提示词创意改写助手"));
  assert.ok(
    creative[1]?.content.includes("请基于以下草稿，改写成一个更有想象力、更丰富的提示词："),
  );

  const systems = new Set([basic[0]?.content, coding[0]?.content, creative[0]?.content]);
  assert.equal(systems.size, 3);
});

test("空草稿先于结构化内容被拒绝", () => {
  assert.deepEqual(evaluatePromptEnhanceRequest({ ...PLAIN_GATE_INPUT, draftText: "   " }), {
    allowed: false,
    reason: "emptyDraft",
  });
  assert.deepEqual(
    evaluatePromptEnhanceRequest({ ...PLAIN_GATE_INPUT, draftText: "", hasAttachments: true }),
    { allowed: false, reason: "emptyDraft" },
  );
});

test("纯文本草稿放行，含附件/引用/mention 的草稿默认拒绝", () => {
  assert.deepEqual(evaluatePromptEnhanceRequest(PLAIN_GATE_INPUT), { allowed: true });
  assert.deepEqual(
    evaluatePromptEnhanceRequest({
      ...PLAIN_GATE_INPUT,
      draftText: "看下 https://example.com/a(b) 再改",
    }),
    { allowed: true },
  );

  for (const flagged of ["hasAttachments", "hasContexts", "hasReferences"] as const) {
    assert.deepEqual(evaluatePromptEnhanceRequest({ ...PLAIN_GATE_INPUT, [flagged]: true }), {
      allowed: false,
      reason: "structuredDraft",
    });
  }

  assert.deepEqual(
    evaluatePromptEnhanceRequest({
      ...PLAIN_GATE_INPUT,
      draftText: "看下 [@app.ts](./app.ts) 的实现",
    }),
    { allowed: false, reason: "structuredDraft" },
  );
  assert.deepEqual(
    evaluatePromptEnhanceRequest({ ...PLAIN_GATE_INPUT, draftText: "参考 $my-skill 的做法" }),
    { allowed: false, reason: "structuredDraft" },
  );
});

test("显式放开结构化覆盖后放行", () => {
  assert.deepEqual(
    evaluatePromptEnhanceRequest({
      ...PLAIN_GATE_INPUT,
      hasAttachments: true,
      allowStructuredOverwrite: true,
    }),
    { allowed: true },
  );
  assert.deepEqual(
    evaluatePromptEnhanceRequest({
      ...PLAIN_GATE_INPUT,
      draftText: "[@app.ts](./app.ts)",
      allowStructuredOverwrite: true,
    }),
    { allowed: true },
  );
});

test("还原只在草稿仍是增强结果时放行", () => {
  assert.deepEqual(
    evaluatePromptEnhanceRestore({
      currentDraftText: "改写后的正文",
      enhancedText: "改写后的正文",
    }),
    { allowed: true },
  );
  assert.deepEqual(
    evaluatePromptEnhanceRestore({
      currentDraftText: "改写后的正文\n我自己补的一句",
      enhancedText: "改写后的正文",
    }),
    { allowed: false, reason: "modifiedAfterEnhance" },
  );
  assert.deepEqual(
    evaluatePromptEnhanceRestore({
      currentDraftText: "  改写后的正文\r\n",
      enhancedText: "改写后的正文",
    }),
    { allowed: true },
  );
});

test("缺失或半截的持久化配置补齐成完整设置", () => {
  assert.deepEqual(resolvePromptEnhanceSettings(undefined), {
    mode: "basic",
    contextEnabled: true,
    contextRounds: 3,
    allowStructuredOverwrite: false,
    channel: "auto",
    reasoningLevel: "default",
  });
  assert.deepEqual(resolvePromptEnhanceSettings({ mode: "creative" }), {
    mode: "creative",
    contextEnabled: true,
    contextRounds: 3,
    allowStructuredOverwrite: false,
    channel: "auto",
    reasoningLevel: "default",
  });
});

test("写回 patch 是完整对象，浅合并不会把其它字段重置回默认", () => {
  const current = resolvePromptEnhanceSettings({
    mode: "creative",
    contextEnabled: false,
    contextRounds: 8,
    allowStructuredOverwrite: true,
    channel: "custom",
    customSelection: { providerId: "provider-a", modelId: "model-a" },
    reasoningLevel: "high",
  });

  assert.deepEqual(mergePromptEnhanceSettingsPatch(current, { mode: "coding" }), {
    ...current,
    mode: "coding",
  });
  assert.deepEqual(mergePromptEnhanceSettingsPatch(current, { channel: "auto" }), {
    ...current,
    channel: "auto",
  });
});

test("自动通道原样跟随当前生效选型，独立通道按设置下发档位", () => {
  const auto = resolvePromptEnhanceSettings({ channel: "auto" });
  assert.deepEqual(
    resolvePromptEnhanceSelection({
      settings: auto,
      preferredSelection: {
        providerId: "provider-a",
        modelId: "model-a",
        options: { reasoningLevel: "medium" },
      },
    }),
    { providerId: "provider-a", modelId: "model-a", options: { reasoningLevel: "medium" } },
  );
  assert.equal(resolvePromptEnhanceSelection({ settings: auto, preferredSelection: null }), null);

  const custom = resolvePromptEnhanceSettings({
    channel: "custom",
    customSelection: { providerId: "provider-b", modelId: "model-b" },
    reasoningLevel: "high",
  });
  assert.deepEqual(resolvePromptEnhanceSelection({ settings: custom, preferredSelection: null }), {
    providerId: "provider-b",
    modelId: "model-b",
    options: { reasoningLevel: "high" },
  });

  const customDefault = resolvePromptEnhanceSettings({
    channel: "custom",
    customSelection: { providerId: "provider-b", modelId: "model-b" },
  });
  assert.deepEqual(
    resolvePromptEnhanceSelection({ settings: customDefault, preferredSelection: null }),
    {
      providerId: "provider-b",
      modelId: "model-b",
    },
  );
  assert.deepEqual(
    resolvePromptEnhanceSelection({
      settings: resolvePromptEnhanceSettings({ channel: "custom" }),
      preferredSelection: { providerId: "provider-a", modelId: "model-a" },
    }),
    null,
  );
});

test("取消后仍能发起新请求，不被上一次的 run 挡住", () => {
  const tracker = createPromptEnhanceRunTracker(() => 1000);
  const first = tracker.start();
  assert.equal(tracker.current()?.runId, first.runId);

  tracker.invalidate();
  assert.equal(tracker.current(), null);

  const second = tracker.start();
  assert.ok(second.runId > first.runId);
  assert.equal(tracker.isCurrent(second.runId), true);
  assert.equal(tracker.isCurrent(first.runId), false);
});

test("取消后迟到的旧结果不得被当成当前 run", () => {
  const tracker = createPromptEnhanceRunTracker();
  const stale = tracker.start();
  tracker.invalidate();
  const fresh = tracker.start();

  assert.equal(tracker.isCurrent(stale.runId), false);
  assert.equal(tracker.isCurrent(fresh.runId), true);
  // 旧 run 结束时不能把新 run 的活动位让出去。
  assert.equal(tracker.finish(stale.runId), false);
  assert.equal(tracker.isCurrent(fresh.runId), true);
});

test("只有当前 run 能结束自己，结束后不再有活动 run", () => {
  const tracker = createPromptEnhanceRunTracker();
  const run = tracker.start();
  assert.equal(tracker.finish(run.runId), true);
  assert.equal(tracker.current(), null);
  assert.equal(tracker.finish(run.runId), false);
});

test("每次增强生成互不相同的取消句柄", () => {
  const first = createPromptEnhanceOperationId();
  const second = createPromptEnhanceOperationId();
  assert.match(first, /^prompt-enhance-/);
  assert.notEqual(first, second);
});

test("请求参数不带 AbortSignal，只带可序列化的取消句柄", () => {
  const params = buildPromptEnhanceRequestParams({
    workspacePath: "/tmp/ws",
    workspaceIdentity: "local:/tmp/ws",
    selection: { providerId: "provider-a", modelId: "model-a" },
    messages: [
      { role: "system", content: "sys" },
      { role: "user", content: "usr" },
    ],
    operationId: "prompt-enhance-abc",
  });

  // 回归护栏：AbortSignal 过 RPC 的 JSON fallback 会变成 {}，服务侧读 addEventListener
  // 直接抛「is not a function」（真实故障：提示词增强失败）。
  assert.equal("signal" in params, false);
  // 走一遍真实序列化路径：句柄与超时都必须原样存活。
  const roundTripped = JSON.parse(JSON.stringify(params)) as typeof params;
  assert.equal(roundTripped.operationId, "prompt-enhance-abc");
  assert.equal(roundTripped.requestTimeoutMs, PROMPT_ENHANCE_REQUEST_TIMEOUT_MS);
  assert.equal(roundTripped.querySource, "prompt_enhance");
  assert.deepEqual(roundTripped.messages, [
    { role: "system", content: "sys" },
    { role: "user", content: "usr" },
  ]);
});

test("请求参数只在有值时才带工作区身份字段", () => {
  const params = buildPromptEnhanceRequestParams({
    workspacePath: "/tmp/ws",
    selection: { providerId: "provider-a", modelId: "model-a" },
    messages: [{ role: "user", content: "usr" }],
    operationId: "prompt-enhance-abc",
  });

  assert.equal("workspaceIdentity" in params, false);
  assert.equal("remoteSessionId" in params, false);
});

test("发起与取消共用同一份 workspace target 构造", () => {
  // 取消请求就是这份 target + operationId：少带一个字段就会落到别的 Host 并静默
  // 返回 cancelled:false，所以两边必须由同一个函数产出。
  const target = buildPromptEnhanceWorkspaceTarget({
    workspacePath: "/tmp/ws",
    workspaceIdentity: "remote:ssh:host",
    remoteSessionId: "session-1",
  });
  assert.deepEqual(target, {
    workspacePath: "/tmp/ws",
    workspaceIdentity: "remote:ssh:host",
    remoteSessionId: "session-1",
  });
  assert.deepEqual(
    buildPromptEnhanceRequestParams({
      ...target,
      selection: { providerId: "provider-a", modelId: "model-a" },
      messages: [{ role: "user", content: "usr" }],
      operationId: "prompt-enhance-abc",
    }),
    {
      workspacePath: "/tmp/ws",
      workspaceIdentity: "remote:ssh:host",
      remoteSessionId: "session-1",
      selection: { providerId: "provider-a", modelId: "model-a" },
      messages: [{ role: "user", content: "usr" }],
      querySource: "prompt_enhance",
      operationId: "prompt-enhance-abc",
      requestTimeoutMs: PROMPT_ENHANCE_REQUEST_TIMEOUT_MS,
    },
  );
});
