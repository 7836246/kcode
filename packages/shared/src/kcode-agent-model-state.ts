// ── 旧协议兼容面（过渡期）──────────────────────────────
// 剩余 5 个导出：旧 configOptions 投影函数（formatModelPickerValue/normalizeAvailableKCodeMode/
// getKCodeAgentModeSelectOptions/getKCodeAgentAvailableModes/
// kcodeSessionSettingsToKCodeConfigOptions）。
// 消费者：services kcodeConfigOptions、UI kcodeSessionProjection 等旧栈。
import { formatModelPickerValue } from "./model-selection.js";
import type { KCodeSessionMode, KCodeSessionSettingsState } from "./kcode-protocol/index.js";
import type { KCodeConfigOption, KCodeTaskModeInfo } from "./kcode-task-types-core.js";
const MODEL_CONFIG_ID = "model";
const MODEL_CONFIG_CATEGORY = "model";
const MODE_CONFIG_ID = "mode";
const MODE_CONFIG_CATEGORY = "mode";
const THOUGHT_LEVEL_CONFIG_ID = "thought_level";
const THOUGHT_LEVEL_CONFIG_CATEGORY = "thought_level";
const KCODE_AGENT_MODE_OPTIONS = [
  {
    id: "build",
    name: "Ask before changes",
    description: "Ask before each file changes.",
  },
  {
    id: "edit",
    name: "Edit automatically",
    description: "Edit selected files or relevant workspace files automatically.",
  },
  {
    id: "plan",
    name: "Plan mode",
    description: "Inspect the code and present a plan before editing.",
  },
  {
    id: "yolo",
    name: "Full access",
    description: "Edit and run commands with fewer confirmations.",
  },
] as const satisfies readonly KCodeTaskModeInfo[];
const KCODE_AGENT_MODE_ID_SET = new Set<string>(KCODE_AGENT_MODE_OPTIONS.map((mode) => mode.id));

// OpenRouter 会把 `:free` 作为模型 ID 的一部分。UI/configOptions 的展示态
// 不能再用冒号分隔 thought level，否则草稿选择会静默截断真实 modelId。
export function normalizeAvailableKCodeMode(mode: KCodeSessionMode): string {
  return KCODE_AGENT_MODE_ID_SET.has(mode) ? mode : "build";
}

export function getKCodeAgentModeSelectOptions(): NonNullable<KCodeConfigOption["options"]> {
  return KCODE_AGENT_MODE_OPTIONS.map((mode) => ({
    value: mode.id,
    name: mode.name,
    description: mode.description,
  }));
}

export function getKCodeAgentAvailableModes(): KCodeTaskModeInfo[] {
  return KCODE_AGENT_MODE_OPTIONS.map((mode) => ({ ...mode }));
}

export function kcodeSessionSettingsToKCodeConfigOptions(
  settings: KCodeSessionSettingsState,
): KCodeConfigOption[] {
  const configOptions: KCodeConfigOption[] = [
    {
      id: MODEL_CONFIG_ID,
      name: "Model",
      category: MODEL_CONFIG_CATEGORY,
      type: "select",
      currentValue: formatModelPickerValue(settings.model.current),
      options: settings.model.available.map((model) => {
        const modelThoughtLevels = model.reasoning?.levels.map((level) => level.value);
        const modelDefaultThoughtLevel =
          model.reasoning?.defaultLevel &&
          modelThoughtLevels?.includes(model.reasoning.defaultLevel)
            ? model.reasoning.defaultLevel
            : undefined;
        return {
          value: formatModelPickerValue(model.ref),
          name: model.label,
          description: model.description,
          modelProviderId: model.ref.providerId,
          modelProviderName: model.providerLabel ?? model.ref.providerId,
          ...(modelThoughtLevels ? { modelThoughtLevels } : {}),
          ...(modelDefaultThoughtLevel ? { modelDefaultThoughtLevel } : {}),
        };
      }),
    },
    {
      id: MODE_CONFIG_ID,
      name: "Mode",
      category: MODE_CONFIG_CATEGORY,
      type: "select",
      currentValue: normalizeAvailableKCodeMode(settings.mode.current),
      options: getKCodeAgentModeSelectOptions(),
    },
  ];
  if (settings.thoughtLevel.enabled) {
    const thoughtLevelValues = new Set(settings.thoughtLevel.available.map((level) => level.value));
    const defaultThoughtLevel =
      settings.thoughtLevel.defaultLevel &&
      thoughtLevelValues.has(settings.thoughtLevel.defaultLevel)
        ? settings.thoughtLevel.defaultLevel
        : undefined;
    configOptions.push({
      id: THOUGHT_LEVEL_CONFIG_ID,
      name: "Thought Level",
      category: THOUGHT_LEVEL_CONFIG_CATEGORY,
      type: "select",
      currentValue:
        settings.thoughtLevel.current ??
        defaultThoughtLevel ??
        settings.thoughtLevel.available[0]?.value ??
        "",
      options: settings.thoughtLevel.available.map((level) => ({
        value: level.value,
        name: level.label,
        description: level.description,
      })),
    });
  }
  return configOptions;
}
