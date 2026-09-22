import assert from "node:assert/strict";
import test from "node:test";
import {
  buildTurnMetricsSegments,
  formatTurnFirstTokenMs,
  formatTurnTokensPerSecond,
  resolveTurnMetricsView,
  type TurnMetricsMessageFormat,
} from "../src/chat-input-toolbar/turnMetrics.js";

// 与 IntlProvider.formatMessage 的占位符替换语义一致：查表后替换 {key}，缺 id 回退 id。
const MESSAGES: Record<string, string> = {
  "chat.turnMetrics.firstToken": "首 token",
  "chat.turnMetrics.tokensPerSecond": "{value} tok/s",
  "chat.turnMetrics.outputTokens": "输出",
};

const formatMessage: TurnMetricsMessageFormat = ({ id }, values) => {
  let message = MESSAGES[id] ?? id;
  for (const [key, value] of Object.entries(values ?? {})) {
    message = message.replaceAll(`{${key}}`, String(value));
  }
  return message;
};

const metrics = {
  firstTokenMs: 820,
  outputTokens: 1200,
  tokensPerSecond: 42.66,
};

test("取 row window 里最后一条 turnHeader 的指标", () => {
  const view = resolveTurnMetricsView([
    { kind: "turnHeader", state: "completedSuccess", metrics: { ...metrics, outputTokens: 10 } },
    { kind: "assistantText" },
    { kind: "turnHeader", state: "running", metrics },
  ]);

  assert.deepEqual(view, { metrics, streaming: true });
});

test("最后一条 turnHeader 没有指标时不回退到上一轮", () => {
  const view = resolveTurnMetricsView([
    { kind: "turnHeader", state: "completedSuccess", metrics },
    { kind: "userInput" },
    { kind: "turnHeader", state: "running" },
  ]);

  assert.equal(view, null);
});

test("没有 turnHeader 或 rows 为空时返回 null", () => {
  assert.equal(resolveTurnMetricsView(undefined), null);
  assert.equal(resolveTurnMetricsView([]), null);
  assert.equal(resolveTurnMetricsView([{ kind: "userInput" }]), null);
});

test("只有 running 轮标记为生成中", () => {
  const rows = [
    { kind: "turnHeader", state: "completedSuccess", metrics },
    { kind: "turnHeader", state: "failed", metrics },
  ];

  assert.equal(resolveTurnMetricsView(rows)?.streaming, false);
});

test("首 token 按毫秒 / 秒 / 十秒以上取整三档格式化", () => {
  assert.equal(formatTurnFirstTokenMs(0), "0ms");
  assert.equal(formatTurnFirstTokenMs(820), "820ms");
  assert.equal(formatTurnFirstTokenMs(1200), "1.2s");
  assert.equal(formatTurnFirstTokenMs(12400), "12s");
  assert.equal(formatTurnFirstTokenMs(Number.NaN), "");
  assert.equal(formatTurnFirstTokenMs(-1), "");
});

test("tok/s 保留一位小数", () => {
  assert.equal(formatTurnTokensPerSecond(42.66, "zh-CN"), "42.7");
  assert.equal(formatTurnTokensPerSecond(Number.NaN, "zh-CN"), "");
});

test("段落顺序固定为首 token → tok/s → 输出 token", () => {
  assert.deepEqual(buildTurnMetricsSegments(metrics, formatMessage, "zh-CN"), [
    { id: "firstToken", label: "首 token", value: "820ms" },
    { id: "tokensPerSecond", label: null, value: "42.7 tok/s" },
    { id: "outputTokens", label: "输出", value: "1200" },
  ]);
});

test("缺值的段落整段省略，不出现空位", () => {
  const onlyTokens = buildTurnMetricsSegments(
    { firstTokenMs: null, outputTokens: 320, tokensPerSecond: null },
    formatMessage,
    "zh-CN",
  );
  assert.deepEqual(onlyTokens, [{ id: "outputTokens", label: "输出", value: "320" }]);

  const onlyLatency = buildTurnMetricsSegments(
    { firstTokenMs: 1500, outputTokens: 0, tokensPerSecond: null },
    formatMessage,
    "zh-CN",
  );
  assert.deepEqual(onlyLatency, [{ id: "firstToken", label: "首 token", value: "1.5s" }]);
});

test("输出 token 走语言相关的紧凑格式", () => {
  const output = (outputTokens: number, locale: string) =>
    buildTurnMetricsSegments(
      { firstTokenMs: null, outputTokens, tokensPerSecond: null },
      formatMessage,
      locale,
    )[0]?.value;

  // 中文紧凑记数从万起步，英文从 k 起步；四位数在中文下仍是原值。
  assert.equal(output(12000, "zh-CN"), "1.2万");
  assert.equal(output(1200, "zh-CN"), "1200");
  assert.equal(output(1200, "en-US"), "1.2K");
});
