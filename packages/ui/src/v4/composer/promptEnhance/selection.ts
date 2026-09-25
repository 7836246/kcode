/**
 * 提示词增强的模型通道解析。
 *
 * 自动通道跟随 kcode 当前生效模型（preferredSelection），因此用户改模型配置后无需重新配置；
 * 独立通道只从设置里已选的 provider/model 取，不接受自由填写，凭据仍走 provider 体系。
 *
 * 纯函数模块，无 React 与服务依赖，便于单测直接加载。
 */
import type { ModelSelection, PromptEnhanceSettings } from "@kcode/shared";

export function resolvePromptEnhanceSelection(params: {
  settings: PromptEnhanceSettings;
  preferredSelection: ModelSelection | null | undefined;
}): ModelSelection | null {
  if (params.settings.channel === "auto") {
    // 原样透传当前生效选型（含该模型自己的 reasoning），自动通道不改写任何档位。
    const preferred = params.preferredSelection;
    return preferred ? { ...preferred } : null;
  }

  const custom = params.settings.customSelection;
  if (!custom) return null;

  const reasoningLevel = params.settings.reasoningLevel;
  return {
    providerId: custom.providerId,
    modelId: custom.modelId,
    ...(reasoningLevel === "default" ? {} : { options: { reasoningLevel } }),
  };
}
