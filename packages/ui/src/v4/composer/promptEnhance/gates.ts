/**
 * 提示词增强的两道闸：发起前的结构化内容闸，以及「还原」的覆盖闸。
 *
 * 纯判定模块，不依赖 React 与服务；单测直接断言放行/拒绝结果。
 */
import { parseMentionMarkdown } from "../../../mentions/mentionMarkdown.js";

export type PromptEnhanceRequestBlockReason = "emptyDraft" | "structuredDraft";

export type PromptEnhanceRequestDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: PromptEnhanceRequestBlockReason };

export type PromptEnhanceRestoreDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "modifiedAfterEnhance" };

/** Lexical mention 在 markdown 里表现为链接或 `@`/`$` 行内 token，改写会把它降级成纯文本。 */
export function hasPromptEnhanceMentions(draftText: string): boolean {
  return parseMentionMarkdown(draftText).some((part) => part.type !== "text");
}

export function evaluatePromptEnhanceRequest(params: {
  draftText: string;
  hasAttachments: boolean;
  hasContexts: boolean;
  hasReferences: boolean;
  allowStructuredOverwrite: boolean;
}): PromptEnhanceRequestDecision {
  // 空草稿先于结构化闸：用户看到的是「没有可改写内容」，而不是附件相关提示。
  if (!params.draftText.trim()) {
    return { allowed: false, reason: "emptyDraft" };
  }
  if (params.allowStructuredOverwrite) {
    return { allowed: true };
  }
  const structured =
    params.hasAttachments ||
    params.hasContexts ||
    params.hasReferences ||
    hasPromptEnhanceMentions(params.draftText);
  return structured ? { allowed: false, reason: "structuredDraft" } : { allowed: true };
}

/**
 * 文本比对前的归一化：编辑器回填会出现 CRLF/首尾空白差异，这不是用户改动。
 * 其余差异一律视为用户手改，避免覆盖用户输入。
 */
export function normalizePromptEnhanceText(text: string): string {
  return text.replace(/\r\n?/g, "\n").trim();
}

export function promptEnhanceTextMatches(left: string, right: string): boolean {
  return normalizePromptEnhanceText(left) === normalizePromptEnhanceText(right);
}

export function evaluatePromptEnhanceRestore(params: {
  currentDraftText: string;
  enhancedText: string;
}): PromptEnhanceRestoreDecision {
  return promptEnhanceTextMatches(params.currentDraftText, params.enhancedText)
    ? { allowed: true }
    : { allowed: false, reason: "modifiedAfterEnhance" };
}
