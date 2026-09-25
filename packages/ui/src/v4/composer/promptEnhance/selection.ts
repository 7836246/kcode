/**
 * 提示词增强的模型选型解析。
 *
 * 自动通道跟随 kcode 当前生效模型（preferredSelection），用户改模型配置后无需重新配置；
 * 独立通道只从设置里已选的 provider/model 取，不接受自由填写，凭据仍走 provider 体系。
 *
 * 两个字段必须在**这里**定死，因为 CLI 侧按模型的完整配置校验请求：
 * - `maxOutputTokens`：`workspace/generateText` 的请求预算缺了会被判越界（校验要求它必须有值），
 *   这里取模型声明的上限——与 `workspace/generateText` 非 git 分支的既有口径一致
 *   （普通 Turn 会按剩余上下文窗口再收窄一次，辅助改写请求没有这个必要）；
 * - `reasoningLevel`：选择里缺档位或不支持的档位都会被 Registry 直接拒（`reasoning-level-missing`
 *   / `reasoning-level-not-supported`），所以要落到模型声明的档位集合上，而不是原样透传设置。
 * 两者都只能从 Selection View 的完整 Model Config 读到；模型不在已发布列表里就无法构造合法请求。
 *
 * 纯函数模块，无 React 依赖，便于单测直接加载。
 */
import type { ModelSelection, PromptEnhanceSettings } from "@kcode/shared";

/**
 * 只依赖 Selection View 里本模块真正读到的字段，不绑服务侧完整类型：
 * 真实 View 的 Model Config 比这里更宽，赋进来即可（形状漂移会在 hook 调用点编译期报错）。
 */
export interface PromptEnhanceSelectionView {
  readonly providers: readonly {
    readonly providerId: string;
    readonly models: readonly {
      readonly modelId: string;
      readonly config: {
        readonly optionSpecs: {
          readonly maxOutputTokens: { readonly max?: number };
          readonly reasoningLevel: { readonly values: readonly string[] };
        };
      };
    }[];
  }[];
}

export interface PromptEnhanceModelFacts {
  /** 模型声明的输出上限，直接作为请求预算。 */
  maxOutputTokens: number;
  /** 档位顺序来自 Model Config，末位是模型声明的默认档。 */
  reasoningLevels: readonly string[];
}

export interface PromptEnhanceTarget {
  selection: ModelSelection;
  /** 请求级输出预算，随请求下发给 CLI。 */
  maxOutputTokens: number;
  /** 请求的档位不被模型支持时被替换掉的档位；调用方据此留一条轨迹。 */
  unsupportedReasoningLevel?: string;
}

/** 在 Selection View 里找模型；找不到（已删除/未发布）返回 null。 */
export function resolvePromptEnhanceModelFacts(params: {
  modelSelectionView: PromptEnhanceSelectionView | null | undefined;
  selection: ModelSelection;
}): PromptEnhanceModelFacts | null {
  const model = params.modelSelectionView?.providers
    .find((provider) => provider.providerId === params.selection.providerId)
    ?.models.find((candidate) => candidate.modelId === params.selection.modelId);
  const maxOutputTokens = model?.config.optionSpecs.maxOutputTokens.max;
  const reasoningLevels = model?.config.optionSpecs.reasoningLevel.values;
  if (
    typeof maxOutputTokens !== "number" ||
    !Number.isInteger(maxOutputTokens) ||
    maxOutputTokens <= 0 ||
    !reasoningLevels ||
    reasoningLevels.length === 0
  ) {
    return null;
  }
  return { maxOutputTokens, reasoningLevels: [...reasoningLevels] };
}

/**
 * 选出一个模型支持的档位：请求的档位被支持就用它，否则回落到模型声明的默认档
 * （末位）。不能返回空——选择里缺档位同样会被 Registry 拒绝。
 */
export function resolvePromptEnhanceReasoningLevel(params: {
  requested: string | undefined;
  facts: PromptEnhanceModelFacts;
}): string {
  const requested = params.requested;
  if (requested !== undefined && params.facts.reasoningLevels.includes(requested)) {
    return requested;
  }
  return params.facts.reasoningLevels[params.facts.reasoningLevels.length - 1]!;
}

/** 解析本次增强要用的选型与输出预算；返回 null 表示当前没有可构造请求的模型。 */
export function resolvePromptEnhanceTarget(params: {
  settings: PromptEnhanceSettings;
  preferredSelection: ModelSelection | null | undefined;
  modelSelectionView: PromptEnhanceSelectionView | null | undefined;
}): PromptEnhanceTarget | null {
  const custom = params.settings.customSelection;
  const base = params.settings.channel === "auto" ? params.preferredSelection : custom;
  if (!base) return null;

  const facts = resolvePromptEnhanceModelFacts({
    modelSelectionView: params.modelSelectionView,
    selection: base,
  });
  if (!facts) return null;

  // 自动通道沿用当前生效档位；独立通道用设置里的档位，"default" = 交给模型默认档。
  const requested =
    params.settings.channel === "auto"
      ? params.preferredSelection?.options?.reasoningLevel
      : params.settings.reasoningLevel === "default"
        ? undefined
        : params.settings.reasoningLevel;

  return {
    selection: {
      providerId: base.providerId,
      modelId: base.modelId,
      options: {
        reasoningLevel: resolvePromptEnhanceReasoningLevel({ requested, facts }),
      },
    },
    maxOutputTokens: facts.maxOutputTokens,
    ...(requested !== undefined && !facts.reasoningLevels.includes(requested)
      ? { unsupportedReasoningLevel: requested }
      : {}),
  };
}
