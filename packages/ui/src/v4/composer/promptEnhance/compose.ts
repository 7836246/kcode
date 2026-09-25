/**
 * 提示词增强的消息拼装：占位符替换、会话背景前置、模型消息组装。
 *
 * 纯函数模块，不依赖 React 与服务；只做 type-only 的共享类型导入，便于单测直接加载。
 */
import type { PromptEnhanceMode } from "@kcode/shared";
import { resolvePromptEnhanceTemplate } from "./prompts.js";

/** 背景抬头的固定文案；开关关闭或无历史时整段不拼，不留空抬头。 */
export const PROMPT_ENHANCE_CONTEXT_HEADER =
  "【前序会话背景（仅作理解指代参考，切勿回答历史问题）】";

/** 单条背景文本截断长度：防止长回合把背景撑大，超出部分丢弃。 */
export const PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT = 500;

export interface PromptEnhanceContextRound {
  readonly user: string;
  /** 助手回复可能缺失（进行中/被中断），缺失时该轮只放用户一侧。 */
  readonly assistant?: string;
}

/** 只发 system + user 两类消息；写成可辨识联合以对齐协议消息类型。 */
export type PromptEnhanceRequestMessage =
  | { readonly role: "system"; readonly content: string }
  | { readonly role: "user"; readonly content: string };

/** 占位符匹配：`{inputJson}` 必须先于 `{input}` 被识别（`}` 已把它排除，顺序只作声明）。 */
const PLACEHOLDER_PATTERN = /\{inputJson\}|\{input\}/g;

/**
 * 占位符替换必须是字面量替换，且只能扫一遍模板：
 * - 走函数式 replacer，草稿里的 `$&`、`$'`、`$$` 才不会被当成替换模式二次解释；
 * - 单次扫描保证插入的草稿正文不再参与后续替换，草稿里出现 `{input}` 字样也不会被改写。
 */
export function fillPromptEnhanceTemplate(
  template: string,
  values: { readonly input: string; readonly inputJson: string },
): string {
  return template.replace(PLACEHOLDER_PATTERN, (placeholder) =>
    placeholder === "{input}" ? values.input : values.inputJson,
  );
}

export function truncatePromptEnhanceContextText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT
    ? `${trimmed.slice(0, PROMPT_ENHANCE_CONTEXT_TEXT_LIMIT)}…`
    : trimmed;
}

/**
 * 有内容时返回「固定抬头 + 带角色标注的背景正文」；无内容返回空串。
 * 角色标注用于让模型区分指代来自用户还是上一轮回答。
 */
export function formatPromptEnhanceContextBlock(
  rounds: readonly PromptEnhanceContextRound[],
): string {
  const lines: string[] = [];
  for (const round of rounds) {
    const user = truncatePromptEnhanceContextText(round.user);
    if (user) lines.push(`用户：${user}`);
    const assistant = truncatePromptEnhanceContextText(round.assistant ?? "");
    if (assistant) lines.push(`助手：${assistant}`);
  }
  if (lines.length === 0) return "";
  return `${PROMPT_ENHANCE_CONTEXT_HEADER}\n${lines.join("\n")}`;
}

export function composePromptEnhanceUserMessage(params: {
  mode: PromptEnhanceMode;
  draftText: string;
  contextRounds?: readonly PromptEnhanceContextRound[];
}): string {
  const filled = fillPromptEnhanceTemplate(resolvePromptEnhanceTemplate(params.mode).user, {
    input: params.draftText,
    inputJson: JSON.stringify(params.draftText),
  });
  const contextBlock = formatPromptEnhanceContextBlock(params.contextRounds ?? []);
  return contextBlock ? `${contextBlock}\n\n${filled}` : filled;
}

export function buildPromptEnhanceMessages(params: {
  mode: PromptEnhanceMode;
  draftText: string;
  contextRounds?: readonly PromptEnhanceContextRound[];
}): PromptEnhanceRequestMessage[] {
  return [
    { role: "system", content: resolvePromptEnhanceTemplate(params.mode).system },
    { role: "user", content: composePromptEnhanceUserMessage(params) },
  ];
}
