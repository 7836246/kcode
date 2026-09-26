import { z } from "zod";

const nonEmptyString = z.string().trim().min(1);

/** 改写模式；展示名由 UI 提供，提示词模板正文不随展示名改动。 */
export const promptEnhanceModes = ["basic", "coding", "creative"] as const;
export const promptEnhanceModeSchema = z.enum(promptEnhanceModes);

/** auto = 跟随当前生效模型；custom = 使用 customSelection 指定的 provider/model。 */
export const promptEnhanceChannels = ["auto", "custom"] as const;
export const promptEnhanceChannelSchema = z.enum(promptEnhanceChannels);

/**
 * 独立通道下发的推理强度。档位只能落在所选模型 `optionSpecs.reasoningLevel.values` 内，
 * `default` 表示「交给模型默认档」——解析时同样会下发一个具体档位（模型取值末位），
 * 因为 selection 缺档位会被 Registry 直接拒；请求的档位不被模型支持时也回落到默认档。
 */
export const promptEnhanceReasoningLevels = ["default", "low", "medium", "high"] as const;
export const promptEnhanceReasoningLevelSchema = z.enum(promptEnhanceReasoningLevels);

export const PROMPT_ENHANCE_CONTEXT_ROUNDS_MIN = 1;
export const PROMPT_ENHANCE_CONTEXT_ROUNDS_MAX = 10;
const PROMPT_ENHANCE_DEFAULT_CONTEXT_ROUNDS = 3;

export type PromptEnhanceMode = (typeof promptEnhanceModes)[number];
export type PromptEnhanceReasoningLevel = (typeof promptEnhanceReasoningLevels)[number];

const promptEnhanceCustomSelectionSchema = z.object({
  providerId: nonEmptyString,
  modelId: nonEmptyString,
});

const promptEnhanceSettingsObjectSchema = z.object({
  mode: promptEnhanceModeSchema.default("basic"),
  contextEnabled: z.boolean().default(true),
  contextRounds: z
    .number()
    .int()
    .min(PROMPT_ENHANCE_CONTEXT_ROUNDS_MIN)
    .max(PROMPT_ENHANCE_CONTEXT_ROUNDS_MAX)
    .default(PROMPT_ENHANCE_DEFAULT_CONTEXT_ROUNDS),
  /**
   * 允许把草稿里的行内引用（@文件 / @子代理 / `$技能` / `/命令` / `#会话`）改写成纯文本。
   * 只覆盖这一处损失：附件与引用面板不在编辑器里，回填碰不到它们（见 docs/prompt-enhance.md）。
   */
  allowInlineReferenceRewrite: z.boolean().default(false),
  channel: promptEnhanceChannelSchema.default("auto"),
  /** 仅 custom 通道使用；切回 auto 时保留，便于用户切回来。 */
  customSelection: promptEnhanceCustomSelectionSchema.optional(),
  /** 仅 custom 通道生效；auto 通道沿用当前生效档位（档位不被模型支持时才回落默认档）。 */
  reasoningLevel: promptEnhanceReasoningLevelSchema.default("default"),
});

export type PromptEnhanceSettings = z.infer<typeof promptEnhanceSettingsObjectSchema>;

/** 显式写出默认值：zod v4 的 `.default()` 不再解析缺省值，传对象字面量会丢掉内层默认。 */
export const PROMPT_ENHANCE_SETTINGS_DEFAULTS: PromptEnhanceSettings = {
  mode: "basic",
  contextEnabled: true,
  contextRounds: PROMPT_ENHANCE_DEFAULT_CONTEXT_ROUNDS,
  allowInlineReferenceRewrite: false,
  channel: "auto",
  reasoningLevel: "default",
};

export const promptEnhanceSettingsSchema = promptEnhanceSettingsObjectSchema.default(
  PROMPT_ENHANCE_SETTINGS_DEFAULTS,
);

/**
 * 设置 patch 的嵌套形状。`.partial()` 只放宽校验，**不会**去掉内层默认值：
 * `parse({ mode: "coding" })` 仍会补齐其余字段的 schema 默认值。配合外层浅合并，
 * 按单个字段写入等于把未提交字段重置为默认——写回必须提交完整对象。
 */
export const promptEnhanceSettingsPatchSchema = promptEnhanceSettingsObjectSchema.partial();
