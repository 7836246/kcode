import { resolveExecutionState, type ModelSelection } from "@kcode/shared";
import { submissionModeSchema, type SubmissionMode } from "@kcode/shared/kcode-protocol-v4";
import type { ModelSelectionView } from "@kcode/services";
import { validateModelSelectionOptions } from "@kcode/provider";

export interface ComposerSubmissionConfig {
  modelSelection: ModelSelection;
  mode: SubmissionMode;
  planEnabled: boolean;
}

/**
 * Composer 展示/提交用的选型。
 *
 * 切模后 inputKey 变化时 hook 不会交出上一份 ready View，因此这里拿到的 View
 * 已经是当前草稿的 getView({ selection })。账号套餐重映射可以改 providerId、
 * 保留 modelId——不能再要求两边身份字面相等，否则会把映射结果当成过期 View 丢掉。
 */
export function resolveComposerModelSelection(
  draftSelection: ModelSelection | null | undefined,
  view:
    | Pick<ModelSelectionView, "effectiveSelection" | "selectionIssue">
    | null
    | undefined,
): ModelSelection | undefined {
  if (!view) return draftSelection ?? undefined;
  if (view.effectiveSelection) return view.effectiveSelection;
  // View 已按当前草稿解析但给不出执行选型（账号连接不可用 / provider 找不到等）。
  // 回落未映射草稿会把不可用的套餐 ID 送进 sendText。
  if (view.selectionIssue) return undefined;
  return draftSelection ?? undefined;
}

/** 进行中的回合已冻结 admitted Selection；此时改共享 Session 选型会污染 sidecar。 */
export function shouldAlignSessionModelBeforeSend(phase: string | undefined): boolean {
  return phase !== "running" && phase !== "prewarming";
}

/** 在点击提交的瞬间，把 Composer 意图冻结成本次 Submission 的执行配置。 */
export function createComposerSubmissionConfig(
  composer:
    | { mode?: string; planEnabled?: boolean; modelSelection?: ModelSelection }
    | null
    | undefined,
  view: ModelSelectionView | null,
): ComposerSubmissionConfig | null {
  // 只读子会话和未挂载 Composer 的 SessionPane 不提供草稿；这类场景没有可提交配置，
  // 不能因为渲染提交门禁而读取 undefined 并让整个会话区域崩溃。
  if (!composer) {
    return null;
  }
  const selection = composer.modelSelection;
  const mode = submissionModeSchema.safeParse(composer.mode);
  const model =
    selection &&
    view?.providers
      .find((provider) => provider.providerId === selection.providerId)
      ?.models.find((candidate) => candidate.modelId === selection.modelId);
  if (!mode.success || !selection || !model || !validateModelSelectionOptions(model, selection).ok)
    return null;
  // 不读取 Session 或显示别名；复制所有选择叶子，防止 await 后用户切模改变本次请求。
  return Object.freeze({
    mode: mode.data === "plan" ? "build" : mode.data,
    planEnabled: resolveExecutionState(composer).planEnabled,
    modelSelection: Object.freeze({
      providerId: selection.providerId,
      modelId: selection.modelId,
      options: Object.freeze({ reasoningLevel: selection.options!.reasoningLevel! }),
    }),
  });
}
