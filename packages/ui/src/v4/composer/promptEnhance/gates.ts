/**
 * 提示词增强的三道闸：发起前的行内引用闸、「还原」的覆盖闸，以及「回填」的覆盖闸。
 *
 * 纯判定模块，不依赖 React 与服务；单测直接断言放行/拒绝结果。
 */

export type PromptEnhanceRequestBlockReason = "emptyDraft" | "inlineReference";

export type PromptEnhanceRequestDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: PromptEnhanceRequestBlockReason };

export type PromptEnhanceRestoreDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "modifiedAfterEnhance" };

export type PromptEnhanceFillDecision =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: "draftChanged" };

/**
 * 只拦「回填会真正破坏的东西」：回填三连重写编辑器内容，因此唯一会丢的是行内引用节点
 * （@文件 / @子代理 / `$技能` / `/命令` / `#会话`）。附件与引用面板（网页元素、PPT 元素、
 * 代码评论、对话选区）都不在编辑器里，草稿记录里也没有它们的字段，回填碰不到——
 * 因此不参与判定。判定用真实节点而不是解析文本形态：`$PATH`、`/tmp` 这类手打 token
 * 没有派发语义，解析文本会误拦（详见 docs/prompt-enhance.md「行内引用闸」）。
 */
export function evaluatePromptEnhanceRequest(params: {
  draftText: string;
  hasInlineReferences: boolean;
  allowInlineReferenceRewrite: boolean;
}): PromptEnhanceRequestDecision {
  // 空草稿先于引用闸：用户看到的是「没有可改写内容」，而不是引用相关提示。
  if (!params.draftText.trim()) {
    return { allowed: false, reason: "emptyDraft" };
  }
  if (params.hasInlineReferences && !params.allowInlineReferenceRewrite) {
    return { allowed: false, reason: "inlineReference" };
  }
  return { allowed: true };
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

/**
 * 回填闸：结果只允许覆盖「与发起时逐字一致」的草稿。
 *
 * 请求在途期间编辑器不受 running 约束，用户可以接着输入；此时无条件回填会连他刚写的
 * 内容一起盖掉，而随后立下的还原点只含发起时的原文——那些新输入没有任何找回路径。
 * 因此以发起时的快照为基准比对，不一致就把整条结果丢弃（与取消、scope 变化同口径）。
 */
export function evaluatePromptEnhanceFill(params: {
  capturedDraftText: string;
  currentDraftText: string;
}): PromptEnhanceFillDecision {
  return promptEnhanceTextMatches(params.capturedDraftText, params.currentDraftText)
    ? { allowed: true }
    : { allowed: false, reason: "draftChanged" };
}
