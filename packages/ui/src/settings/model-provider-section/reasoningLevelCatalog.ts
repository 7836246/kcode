export const REASONING_LEVEL_CATALOG = [
  "disabled",
  "enabled",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
  "ultra",
] as const;

export const REASONING_LEVEL_PRESETS = [
  { id: "switch", values: ["disabled", "enabled"] },
  { id: "three", values: ["low", "medium", "high"] },
  { id: "intensity", values: ["low", "high", "max"] },
  { id: "full", values: ["minimal", "low", "medium", "high", "xhigh"] },
] as const;

export type ReasoningLevelPresetId = (typeof REASONING_LEVEL_PRESETS)[number]["id"];

export type ReasoningMapApiType =
  | "anthropic-messages"
  | "openai-chat-completions"
  | "openai-responses";

type ReasoningMapTemplate = {
  readonly source: string;
  readonly fields: readonly string[];
};

// 正文与内置目录里各 API 格式的默认 modelApiRules 相同，包含 disabled/enabled 的改写。
const REASONING_MAP_TEMPLATES: Record<ReasoningMapApiType, ReasoningMapTemplate> = {
  "anthropic-messages": {
    fields: ["thinking", "output_config.effort"],
    source: `reasoningLevel == "disabled"
  ? {
      "thinking": {
        "type": "disabled"
      }
    }
  : {
      "thinking": {
        "type": "adaptive"
      },
      "output_config": {
        "effort": reasoningLevel == "enabled" ? "high" : reasoningLevel
      }
    }`,
  },
  "openai-chat-completions": {
    fields: ["reasoning_effort", "reasoning.effort", "thinking"],
    source: `{
  "thinking": {
    "type": reasoningLevel == "disabled" || reasoningLevel == "none" ? "disabled" : "enabled"
  },
  "enable_thinking": reasoningLevel != "disabled" && reasoningLevel != "none",
  "reasoning_effort": reasoningLevel == "disabled" ? "none" : reasoningLevel == "enabled" ? "high" : reasoningLevel,
  "reasoning": {
    "effort": reasoningLevel == "disabled" ? "none" : reasoningLevel == "enabled" ? "high" : reasoningLevel
  }
}`,
  },
  "openai-responses": {
    fields: ["reasoning.effort"],
    source: `{
  "reasoning": {
    "effort": reasoningLevel == "disabled" ? "none" : reasoningLevel == "enabled" ? "high" : reasoningLevel
  }
}`,
  },
};

const EXTRA_KNOWN_REASONING_MAPS: readonly ReasoningMapTemplate[] = [
  { source: `{"reasoning_effort": reasoningLevel}`, fields: ["reasoning_effort"] },
  { source: `{"reasoning": {"effort": reasoningLevel}}`, fields: ["reasoning.effort"] },
];

export type ReasoningMapSummary =
  | { id: "settings.modelProvider.reasoningMapWillWrite"; fields: readonly string[] }
  | { id: "settings.modelProvider.reasoningMapWillWriteAfterSelect"; fields: readonly string[] }
  | { id: "settings.modelProvider.reasoningMapRecommended" }
  | { id: "settings.modelProvider.reasoningMapCustom" };

export function matchingReasoningPreset(
  values: readonly string[],
): ReasoningLevelPresetId | undefined {
  return REASONING_LEVEL_PRESETS.find(
    (preset) =>
      preset.values.length === values.length &&
      preset.values.every((value, index) => value === values[index]),
  )?.id;
}

export function reasoningMapTemplate(apiType: ReasoningMapApiType): ReasoningMapTemplate {
  return REASONING_MAP_TEMPLATES[apiType];
}

export function formatReasoningMapFields(fields: readonly string[], locale: string): string {
  return fields.join(locale.toLowerCase().startsWith("zh") ? "、" : ", ");
}

export function reasoningMapSummary(input: {
  personalMap: string;
  inheritedMap?: string;
  useRecommended: boolean;
  apiType: ReasoningMapApiType;
}): ReasoningMapSummary {
  const personal = input.personalMap.trim();
  const inherited = input.useRecommended ? (input.inheritedMap?.trim() ?? "") : "";
  const effective = personal || inherited;
  if (!effective) {
    return {
      id: "settings.modelProvider.reasoningMapWillWriteAfterSelect",
      fields: REASONING_MAP_TEMPLATES[input.apiType].fields,
    };
  }
  const fields = knownReasoningMapFields(effective);
  if (fields) return { id: "settings.modelProvider.reasoningMapWillWrite", fields };
  return {
    id: personal
      ? "settings.modelProvider.reasoningMapCustom"
      : "settings.modelProvider.reasoningMapRecommended",
  };
}

/** 只有完全没有可用映射时才写入模板；已有推荐或自定义表达式保持不动。 */
export function reasoningLevelChange(input: {
  nextValues: readonly string[];
  mapValue: string;
  inheritedMap?: string;
  useRecommended: boolean;
  apiType: ReasoningMapApiType;
}): {
  reasoningLevelValuesValue: readonly string[];
  reasoningLevelMapValue?: string;
} {
  const personal = input.mapValue.trim();
  const inherited = input.useRecommended ? (input.inheritedMap?.trim() ?? "") : "";
  if (personal || inherited) return { reasoningLevelValuesValue: input.nextValues };
  return {
    reasoningLevelValuesValue: input.nextValues,
    reasoningLevelMapValue: REASONING_MAP_TEMPLATES[input.apiType].source,
  };
}

function knownReasoningMapFields(source: string): readonly string[] | undefined {
  const compact = compactMap(source);
  for (const known of [...Object.values(REASONING_MAP_TEMPLATES), ...EXTRA_KNOWN_REASONING_MAPS]) {
    if (compactMap(known.source) === compact) return known.fields;
  }
  return undefined;
}

function compactMap(source: string): string {
  return source.replace(/\s+/g, "");
}
