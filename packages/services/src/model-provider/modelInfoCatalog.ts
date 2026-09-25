import { ModelConfig, type ModelConfigObject } from "@kcode/provider";

import {
  arrayOfStrings,
  bestMatch,
  compactInfo,
  hasParameter,
  inputModalities,
  modalityFlags,
  modalityWords,
  modelEntries,
  nested,
  nestedArray,
  nestedNumber,
  nestedString,
  numberValue,
  positiveInt,
  readId,
  reasoningLevelsFromOpenRouter,
  reasoningLevelsFromOptions,
  mapReasoningLevels,
} from "./modelInfoCatalogParse.js";

/** 供应商 /models 与公开目录都能填进模型配置的字段。供应商返回值优先。 */
export interface CatalogModelInfo {
  readonly contextWindow?: number;
  readonly maxOutputTokens?: number;
  readonly supportsImage?: boolean;
  readonly supportsVideo?: boolean;
  readonly supportsAudio?: boolean;
  readonly supportsPdf?: boolean;
  readonly supportsToolCall?: boolean;
  readonly supportsNativeWebSearch?: boolean;
  readonly reasoningLevels?: readonly string[];
}

export function parseProviderModelCatalog(payload: unknown): {
  readonly modelIds: string[];
  readonly info: Readonly<Record<string, CatalogModelInfo>>;
} {
  const entries = modelEntries(payload);
  const modelIds: string[] = [];
  const seen = new Set<string>();
  const info: Record<string, CatalogModelInfo> = {};
  for (const entry of entries) {
    const modelId = readId(entry);
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    modelIds.push(modelId);
    const parsed = infoFromProviderEntry(entry);
    if (parsed) info[modelId] = parsed;
  }
  return { modelIds, info };
}

export function mergeCatalogModelInfo(
  current: CatalogModelInfo | undefined,
  incoming: CatalogModelInfo,
): CatalogModelInfo {
  return {
    contextWindow: current?.contextWindow ?? incoming.contextWindow,
    maxOutputTokens: current?.maxOutputTokens ?? incoming.maxOutputTokens,
    supportsImage: current?.supportsImage ?? incoming.supportsImage,
    supportsVideo: current?.supportsVideo ?? incoming.supportsVideo,
    supportsAudio: current?.supportsAudio ?? incoming.supportsAudio,
    supportsPdf: current?.supportsPdf ?? incoming.supportsPdf,
    supportsToolCall: current?.supportsToolCall ?? incoming.supportsToolCall,
    supportsNativeWebSearch:
      current?.supportsNativeWebSearch ?? incoming.supportsNativeWebSearch,
    reasoningLevels:
      current?.reasoningLevels && current.reasoningLevels.length > 0
        ? current.reasoningLevels
        : incoming.reasoningLevels,
  };
}

export function findModelsDevInfo(catalog: unknown, modelId: string): CatalogModelInfo | undefined {
  if (!catalog || typeof catalog !== "object") return undefined;
  return bestMatch(modelId, function* () {
    for (const provider of Object.values(catalog as Record<string, unknown>)) {
      if (!provider || typeof provider !== "object") continue;
      const models = (provider as { models?: unknown }).models;
      if (!models || typeof models !== "object") continue;
      for (const [key, value] of Object.entries(models as Record<string, unknown>)) {
        if (!value || typeof value !== "object") continue;
        const record = value as Record<string, unknown>;
        const remoteId = typeof record.id === "string" ? record.id : key;
        const limit = record.limit;
        const contextWindow = positiveInt(nestedNumber(limit, "context"));
        const maxOutputTokens = positiveInt(nestedNumber(limit, "output"));
        const modalities = inputModalities(record.modalities);
        const info = compactInfo({
          contextWindow,
          maxOutputTokens,
          ...modalityFlags(modalities),
          supportsToolCall: record.tool_call === true ? true : undefined,
          reasoningLevels: reasoningLevelsFromOptions(record.reasoning_options),
        });
        if (info) yield { remoteId, info };
        if (info) yield { remoteId: key, info };
      }
    }
  });
}

export function findOpenRouterInfo(
  catalog: unknown,
  modelId: string,
): CatalogModelInfo | undefined {
  const data = nestedArray(catalog, "data");
  if (!data) return undefined;
  return bestMatch(modelId, function* () {
    for (const item of data) {
      if (!item || typeof item !== "object") continue;
      const record = item as Record<string, unknown>;
      if (typeof record.id !== "string") continue;
      const architecture = record.architecture;
      const modalities = arrayOfStrings(nested(architecture, "input_modalities"));
      const info = compactInfo({
        contextWindow: positiveInt(
          numberValue(record.context_length) ??
            nestedNumber(record.top_provider, "context_length"),
        ),
        maxOutputTokens: positiveInt(
          nestedNumber(record.top_provider, "max_completion_tokens"),
        ),
        ...modalityFlags(modalities),
        supportsToolCall: hasParameter(record.supported_parameters, [
          "tools",
          "tool_choice",
        ])
          ? true
          : undefined,
        supportsNativeWebSearch: undefined,
        reasoningLevels: reasoningLevelsFromOpenRouter(record.reasoning),
      });
      if (info) yield { remoteId: record.id, info };
    }
  });
}

export function findLiteLlmInfo(catalog: unknown, modelId: string): CatalogModelInfo | undefined {
  if (!catalog || typeof catalog !== "object") return undefined;
  return bestMatch(modelId, function* () {
    for (const [key, value] of Object.entries(catalog as Record<string, unknown>)) {
      if (key === "sample_spec" || !value || typeof value !== "object") continue;
      const record = value as Record<string, unknown>;
      const info = compactInfo({
        contextWindow: positiveInt(
          numberValue(record.max_input_tokens) ?? numberValue(record.max_tokens),
        ),
        maxOutputTokens: positiveInt(numberValue(record.max_output_tokens)),
        supportsImage: record.supports_vision === true ? true : undefined,
        supportsToolCall: record.supports_function_calling === true ? true : undefined,
        supportsNativeWebSearch: record.supports_web_search === true ? true : undefined,
      });
      if (info) yield { remoteId: key, info };
    }
  });
}

/** 只生成具体内置规则还没写过的叶子，避免目录覆盖用户或模型专用配置。 */
export function modelConfigFromCatalog(
  specific: ModelConfigObject,
  info: CatalogModelInfo | undefined,
): ModelConfig | undefined {
  if (!info) return undefined;
  const properties: NonNullable<ModelConfigObject["properties"]> = {};
  if (specific.properties?.contextWindow == null && info.contextWindow) {
    properties.contextWindow = info.contextWindow;
  }
  const inputFormat: NonNullable<NonNullable<ModelConfigObject["properties"]>["inputFormat"]> =
    {};
  assignMissingModality(inputFormat, specific, "supportsImage", info.supportsImage);
  assignMissingModality(inputFormat, specific, "supportsVideo", info.supportsVideo);
  assignMissingModality(inputFormat, specific, "supportsAudio", info.supportsAudio);
  assignMissingModality(inputFormat, specific, "supportsPdf", info.supportsPdf);
  if (Object.keys(inputFormat).length > 0) properties.inputFormat = inputFormat;
  if (specific.properties?.supportsToolCall == null && info.supportsToolCall === true) {
    properties.supportsToolCall = true;
  }
  if (
    specific.properties?.supportsNativeWebSearch == null &&
    info.supportsNativeWebSearch === true
  ) {
    properties.supportsNativeWebSearch = true;
  }
  const optionSpecs: NonNullable<ModelConfigObject["optionSpecs"]> = {};
  if (specific.optionSpecs?.maxOutputTokens?.max == null && info.maxOutputTokens) {
    optionSpecs.maxOutputTokens = { max: info.maxOutputTokens };
  }
  if (
    specific.optionSpecs?.reasoningLevel?.values == null &&
    info.reasoningLevels &&
    info.reasoningLevels.length > 0
  ) {
    optionSpecs.reasoningLevel = { values: info.reasoningLevels };
  }
  if (Object.keys(properties).length === 0 && Object.keys(optionSpecs).length === 0) {
    return undefined;
  }
  return ModelConfig.fromData({
    ...(Object.keys(properties).length > 0 ? { properties } : {}),
    ...(Object.keys(optionSpecs).length > 0 ? { optionSpecs } : {}),
  });
}

function assignMissingModality(
  target: NonNullable<NonNullable<ModelConfigObject["properties"]>["inputFormat"]>,
  specific: ModelConfigObject,
  key: "supportsImage" | "supportsVideo" | "supportsAudio" | "supportsPdf",
  value: boolean | undefined,
) {
  if (specific.properties?.inputFormat?.[key] != null || value == null) return;
  target[key] = value;
}

function infoFromProviderEntry(entry: unknown): CatalogModelInfo | undefined {
  if (!entry || typeof entry !== "object") return undefined;
  const record = entry as Record<string, unknown>;
  const modalities = [
    ...arrayOfStrings(nested(record.architecture, "input_modalities")),
    ...modalityWords(nestedString(record.architecture, "modality")),
  ];
  const capabilities = arrayOfStrings(record.capabilities).map((item) => item.toLowerCase());
  return compactInfo({
    contextWindow: positiveInt(
      numberValue(record.context_length) ??
        numberValue(record.context_window) ??
        numberValue(record.max_model_len) ??
        nestedNumber(record.top_provider, "context_length"),
    ),
    maxOutputTokens: positiveInt(
      numberValue(record.max_output_tokens) ??
        numberValue(record.max_completion_tokens) ??
        nestedNumber(record.top_provider, "max_completion_tokens"),
    ),
    ...modalityFlags(modalities.length > 0 ? modalities : undefined),
    supportsToolCall:
      capabilities.some(
        (item) =>
          item === "tools" || item === "tool_calling" || item === "function_calling",
      ) || hasParameter(record.supported_parameters, ["tools", "tool_choice"])
        ? true
        : undefined,
    supportsNativeWebSearch: capabilities.includes("web_search") ? true : undefined,
    reasoningLevels:
      reasoningLevelsFromOpenRouter(record.reasoning) ??
      mapReasoningLevels(arrayOfStrings(record.reasoning_options)),
  });
}
