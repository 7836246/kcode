import type { ModelSelection } from "@kcode/shared";
import type { IKCodeAgentService, KCodeAgentWorkspaceTarget } from "@kcode/services";
import type { PromptEnhanceRequestMessage } from "./compose.js";

/** 直接复用服务接口的入参类型：参数形状漂移会在编译期暴露。 */
type GenerateWorkspaceTextParams = Parameters<IKCodeAgentService["generateWorkspaceText"]>[0];

/**
 * 请求级超时：协议 client 缺省 3 分钟会把一次改写拖到「像卡死」。
 * 这里显式透传自身 deadline，避免默认超时先触发。
 */
export const PROMPT_ENHANCE_REQUEST_TIMEOUT_MS = 60_000;

export const PROMPT_ENHANCE_QUERY_SOURCE = "prompt_enhance";

export interface PromptEnhanceWorkspaceTargetInput {
  workspacePath: string;
  workspaceIdentity?: string | undefined;
  remoteSessionId?: string | undefined;
}

/**
 * workspace 路由字段。发起与取消必须共用这一份构造：少带一个字段，取消就会落到另一台 Host
 * 并静默返回 `cancelled:false`（用户以为已取消，模型还在跑）。
 */
export function buildPromptEnhanceWorkspaceTarget(
  input: PromptEnhanceWorkspaceTargetInput,
): KCodeAgentWorkspaceTarget {
  return {
    workspacePath: input.workspacePath,
    ...(input.workspaceIdentity ? { workspaceIdentity: input.workspaceIdentity } : {}),
    ...(input.remoteSessionId ? { remoteSessionId: input.remoteSessionId } : {}),
  };
}

export interface PromptEnhanceRequestParamsInput extends PromptEnhanceWorkspaceTargetInput {
  selection: ModelSelection;
  messages: readonly PromptEnhanceRequestMessage[];
  /**
   * 请求级输出预算。**必须给**：CLI 的模型校验把缺失的预算判成越界
   * （`maxOutputTokens is outside the model option range`），普通 Turn 也是显式下发这一项。
   */
  maxOutputTokens: number;
  /** 取消句柄：取消端按同一个 id 调 cancelWorkspaceGenerateText。 */
  operationId: string;
}

/**
 * 组装 `generateWorkspaceText` 的调用参数。
 *
 * 这里刻意不带 `signal`：RPC 实参按 JSON 序列化（`packages/rpc` 的 Object fallback），
 * AbortSignal 没有可枚举字段，到服务侧只剩 `{}`，`params.signal?.addEventListener` 会直接抛
 * 「is not a function」。跨进程取消只能走可序列化的 `operationId`。
 */
export function buildPromptEnhanceRequestParams(
  input: PromptEnhanceRequestParamsInput,
): GenerateWorkspaceTextParams {
  return {
    ...buildPromptEnhanceWorkspaceTarget(input),
    selection: input.selection,
    messages: [...input.messages],
    querySource: PROMPT_ENHANCE_QUERY_SOURCE,
    maxOutputTokens: input.maxOutputTokens,
    operationId: input.operationId,
    requestTimeoutMs: PROMPT_ENHANCE_REQUEST_TIMEOUT_MS,
  };
}
