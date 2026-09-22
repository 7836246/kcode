import { useState, type ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import type { ModelConfigObject } from "@kcode/provider";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import type {
  ProviderModelDraftCommitResult,
  ProviderModelDraftValues,
} from "@/settings/model-provider-section/ProviderModelMetadata.js";
import { JsonSlotEditor } from "@/settings/model-provider-section/ProviderModelMetadataFields.js";
import { ProviderModelReasoningLevelEditor } from "@/settings/model-provider-section/ProviderModelReasoningLevelEditor.js";
import { ModelConfigHelp } from "@/settings/model-provider-section/ModelConfigHelp.js";
import {
  formatReasoningMapFields,
  reasoningLevelChange,
  reasoningMapSummary,
  type ReasoningMapApiType,
} from "@/settings/model-provider-section/reasoningLevelCatalog.js";

export function ModelSettingsGroup({
  group,
  children,
}: {
  group: "basic" | "tokens" | "modalities" | "capabilities" | "reasoning" | "advanced";
  children: ReactNode;
}) {
  return (
    <section className="space-y-4" data-model-settings-group={group}>
      {children}
    </section>
  );
}

export function ProviderModelReasoningSettings({
  draft,
  open,
  apiFormat,
  errorField,
  personalConfig,
  inheritedConfig,
  overrideFields,
  onDraftChange,
}: {
  draft: ProviderModelDraftValues;
  open: boolean;
  apiFormat: ReasoningMapApiType;
  errorField?: Extract<ProviderModelDraftCommitResult, { status: "invalid" }>["field"] | null;
  personalConfig?: ModelConfigObject;
  inheritedConfig?: ModelConfigObject;
  overrideFields?: ReadonlySet<string>;
  onDraftChange: (patch: Partial<ProviderModelDraftValues>) => void;
}) {
  const { intl, locale } = useKCodeIntl();
  const [customRequested, setCustomRequested] = useState(false);
  // 关闭弹窗时收起；映射校验失败时在同一轮渲染里展开，避免焦点落到尚未挂载的输入框。
  if (!open && customRequested) setCustomRequested(false);
  else if (open && errorField === "reasoningLevelMap" && !customRequested) setCustomRequested(true);
  const inheritedMap = inheritedConfig?.optionSpecs?.reasoningLevel?.map ?? undefined;
  const summary = reasoningMapSummary({
    personalMap: draft.reasoningLevelMapValue,
    inheritedMap,
    useRecommended: draft.useRecommendedConfigValue !== false,
    apiType: apiFormat,
  });
  const summaryText =
    "fields" in summary
      ? intl.formatMessage(
          { id: summary.id },
          { fields: formatReasoningMapFields(summary.fields, locale) },
        )
      : intl.formatMessage({ id: summary.id });

  return (
    <ModelSettingsGroup group="reasoning">
      <div className="space-y-1">
        <div className="block text-ui-base text-foreground-subtle">
          {intl.formatMessage({ id: "settings.modelProvider.reasoningLevelsOrdered" })}
          <ModelConfigHelp field="reasoningLevelsOrdered" />
        </div>
        <ProviderModelReasoningLevelEditor
          values={draft.reasoningLevelValuesValue}
          overridden={
            overrideFields
              ? overrideFields.has("reasoningLevelValuesValue")
              : personalConfig?.optionSpecs?.reasoningLevel?.values !== undefined
          }
          addLabel={intl.formatMessage({ id: "settings.modelProvider.reasoningLevelAdd" })}
          deleteLabel={intl.formatMessage({
            id: "settings.modelProvider.reasoningLevelDelete",
          })}
          onChange={(nextValues) =>
            onDraftChange(
              reasoningLevelChange({
                nextValues,
                mapValue: draft.reasoningLevelMapValue,
                inheritedMap,
                useRecommended: draft.useRecommendedConfigValue !== false,
                apiType: apiFormat,
              }),
            )
          }
        />
      </div>
      <div data-model-reasoning-level-map-editor="true" className="space-y-2">
        <p className="text-ui-sm text-foreground-subtle" data-model-reasoning-map-summary="true">
          {summaryText}
        </p>
        <button
          type="button"
          data-model-reasoning-map-customize="true"
          aria-expanded={customRequested}
          onClick={() => setCustomRequested((value) => !value)}
          className="flex w-fit cursor-pointer items-center gap-1.5 rounded-sm bg-transparent px-1 py-0.5 text-ui-base text-foreground-subtle hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
        >
          <ChevronRightIcon
            className={`size-3.5 transition-transform motion-reduce:transition-none ${customRequested ? "rotate-90" : ""}`}
            aria-hidden="true"
          />
          {intl.formatMessage({ id: "settings.modelProvider.reasoningMapCustomize" })}
        </button>
        {customRequested ? (
          <JsonSlotEditor
            label={intl.formatMessage({ id: "settings.modelProvider.reasoningLevelMapping" })}
            labelHelp={<ModelConfigHelp field="reasoningLevelMapping" />}
            value={draft.reasoningLevelMapValue}
            effectiveValue={draft.useRecommendedConfigValue === false ? undefined : inheritedMap}
            overridden={
              overrideFields
                ? overrideFields.has("reasoningLevelMapValue")
                : personalConfig?.optionSpecs?.reasoningLevel?.map !== undefined
            }
            onChange={(reasoningLevelMapValue) => onDraftChange({ reasoningLevelMapValue })}
          />
        ) : null}
      </div>
    </ModelSettingsGroup>
  );
}
