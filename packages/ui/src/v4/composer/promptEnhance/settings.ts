/**
 * 提示词增强设置的读写辅助。
 *
 * `ISettingService.update` 只对外层字段做浅合并（`{ ...current, ...patch }`），嵌套对象是整体替换。
 * 因此写回必须提交完整对象：只交单个字段会让 schema 默认值把用户已选的其它字段重置。
 *
 * 纯函数模块，只依赖共享默认值常量，便于单测直接加载。
 */
import { PROMPT_ENHANCE_SETTINGS_DEFAULTS, type PromptEnhanceSettings } from "@kcode/shared";

/** 把持久化里可能缺失或半截的配置补齐成完整设置。 */
export function resolvePromptEnhanceSettings(
  stored: Partial<PromptEnhanceSettings> | null | undefined,
): PromptEnhanceSettings {
  const defaults = PROMPT_ENHANCE_SETTINGS_DEFAULTS;
  if (!stored) return { ...defaults };
  const customSelection = stored.customSelection;
  return {
    mode: stored.mode ?? defaults.mode,
    contextEnabled: stored.contextEnabled ?? defaults.contextEnabled,
    contextRounds: stored.contextRounds ?? defaults.contextRounds,
    allowStructuredOverwrite: stored.allowStructuredOverwrite ?? defaults.allowStructuredOverwrite,
    channel: stored.channel ?? defaults.channel,
    ...(customSelection ? { customSelection } : {}),
    reasoningLevel: stored.reasoningLevel ?? defaults.reasoningLevel,
  };
}

/** 生成写盘用的完整对象：浅合并语义下这是唯一安全的写入形状。 */
export function mergePromptEnhanceSettingsPatch(
  current: PromptEnhanceSettings,
  patch: Partial<PromptEnhanceSettings>,
): PromptEnhanceSettings {
  return resolvePromptEnhanceSettings({ ...current, ...patch });
}
