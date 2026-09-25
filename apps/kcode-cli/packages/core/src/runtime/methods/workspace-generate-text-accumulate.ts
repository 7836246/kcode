import { normalizeStreamError } from "../helpers/index.js";
import type { ModelEvent, ModelTextResult, ModelToolCall } from "@kcode/contracts";

/**
 * 把 workspace 生成的模型流累积成与非流式 generateText 等价的结果。
 *
 * 不走非流式 doGenerate 的原因：部分 openai-compatible 网关的非流式响应包在自定义
 * 信封里（如 `{"success":…,"data":…}`），AI SDK 按标准 OpenAI 形状做 schema 校验
 * 失败后统一报 Invalid JSON response；同一网关的流式 SSE 是标准格式（主回合与
 * 连通性探测都走流式）。累积口径对齐 `model.ts` 的主回合执行链。
 */
export async function accumulateWorkspaceGenerateTextStream(
  events: AsyncIterable<ModelEvent>,
): Promise<ModelTextResult> {
  let text = "";
  let finishReason: string | undefined;
  let usage: ModelTextResult["usage"] = {};
  const toolCalls: ModelToolCall[] = [];
  const toolCallIds = new Set<string>();

  for await (const event of events) {
    switch (event.type) {
      case "text_delta": {
        text += event.text;
        break;
      }
      case "tool_call": {
        // 协议兼容或自定义 adapter 路径可能重复投递同 id 的 final tool_call，
        // 按 id 去重，避免同一响应内的工具调用被计两次。
        if (toolCallIds.has(event.toolCall.id)) break;
        toolCallIds.add(event.toolCall.id);
        toolCalls.push(event.toolCall);
        break;
      }
      case "finish": {
        finishReason = event.finishReason;
        usage = event.usage;
        break;
      }
      case "error": {
        // AI SDK 的 error chunk 常是 ProviderBusinessError 的 plain object（如 3007），
        // 直接抛原始值会丢 providerCode；与 model.ts 的流式错误口径一致。
        throw normalizeStreamError(event.error);
      }
    }
  }

  if (finishReason === undefined) {
    // 与连通性探测同口径：流在 finish 前结束说明结果不完整，不能当成功返回。
    throw new Error("workspace 生成流在 finish 事件前结束");
  }

  return {
    text,
    finishReason,
    usage,
    ...(toolCalls.length > 0 ? { toolCalls } : {}),
  };
}
