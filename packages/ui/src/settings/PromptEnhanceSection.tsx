/**
 * 「提示词增强」设置分区。
 *
 * 自包含：自己经 useSettings() 读写，改动即写即生效（无保存按钮）。
 * 写回一律提交完整 promptEnhance 对象——`ISettingService.update` 是浅合并，
 * 只交单个字段会被 schema 默认值重置掉其它字段。
 *
 * 说明文字只留三处：总开关关掉后入口消失、放开行内引用的后果、推理强度仅独立通道生效。
 */
import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import {
  PROMPT_ENHANCE_CONTEXT_ROUNDS_MAX,
  PROMPT_ENHANCE_CONTEXT_ROUNDS_MIN,
  PROMPT_ENHANCE_SETTINGS_DEFAULTS,
  TID_SETTINGS_PROMPT_ENHANCE_ENABLED_SWITCH,
  promptEnhanceChannels,
  promptEnhanceModes,
  promptEnhanceReasoningLevels,
  type PromptEnhanceSettings,
} from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { Switch } from "@/components/ui/switch.js";
import { toast } from "@/components/ui/toast.js";
import { useModelSelectionView } from "@/hooks/useModelSelectionView.js";
import { useSettings } from "@/hooks/useSettingService.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { SettingsGroupCard, SettingsRow } from "@/settings/SettingsPageParts.js";
import { SettingsSegmentedTabs } from "@/settings/SettingsSegmentedTabs.js";
import { formatPromptEnhanceTemplate } from "@/v4/composer/promptEnhance/prompts.js";
import {
  mergePromptEnhanceSettingsPatch,
  resolvePromptEnhanceSettings,
} from "@/v4/composer/promptEnhance/settings.js";

export function PromptEnhanceSection({
  remoteSessionId,
  remoteTarget,
  workspaceIdentity,
  workspacePath,
}: {
  remoteSessionId?: string | null | undefined;
  remoteTarget?: unknown;
  workspaceIdentity?: string | undefined;
  workspacePath?: string | null | undefined;
}) {
  const { intl } = useKCodeIntl();
  const { settings, update } = useSettings();
  const [saving, setSaving] = useState(false);
  const [promptBodyOpen, setPromptBodyOpen] = useState(false);

  const current = useMemo(
    () => resolvePromptEnhanceSettings(settings?.promptEnhance),
    [settings?.promptEnhance],
  );

  const modelSelectionRead = useModelSelectionView(
    workspacePath,
    remoteSessionId,
    workspaceIdentity,
    remoteTarget,
    { selection: null },
  );
  const selectionView =
    modelSelectionRead.state.status === "ready" ? modelSelectionRead.state.view : null;
  const providers = selectionView?.providers ?? [];
  const customProvider = providers.find(
    (provider) => provider.providerId === current.customSelection?.providerId,
  );

  // 当前生效通道只做展示。自动通道跟随的是每个输入框各自的草稿选型（可能互不相同），全局设置页
  // 给不出唯一模型，因此只说明它跟随什么；独立通道是全局唯一的设置，照常显示 provider / 模型。
  const effectiveLabel =
    current.channel === "auto"
      ? intl.formatMessage({ id: "settings.promptEnhance.effective.followSelection" })
      : current.customSelection
        ? `${customProvider?.providerName ?? current.customSelection.providerId} / ${current.customSelection.modelId}`
        : intl.formatMessage({ id: "settings.promptEnhance.effective.unresolved" });

  const write = async (patch: Partial<PromptEnhanceSettings>) => {
    if (!settings) return;
    setSaving(true);
    try {
      await update({ promptEnhance: mergePromptEnhanceSettingsPatch(current, patch) });
    } catch (error) {
      logger.warn("[settings] 提示词增强设置保存失败", { error: String(error) });
      toast(intl.formatMessage({ id: "settings.promptEnhance.saveError" }));
    } finally {
      setSaving(false);
    }
  };

  const writeDefaults = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await update({ promptEnhance: { ...PROMPT_ENHANCE_SETTINGS_DEFAULTS } });
    } catch (error) {
      logger.warn("[settings] 提示词增强恢复默认失败", { error: String(error) });
      toast(intl.formatMessage({ id: "settings.promptEnhance.saveError" }));
    } finally {
      setSaving(false);
    }
  };

  const disabled = saving || !settings;

  return (
    <section className="flex flex-col gap-4">
      <SettingsGroupCard>
        <SettingsRow
          label={intl.formatMessage({ id: "settings.promptEnhance.enabled.label" })}
          description={intl.formatMessage({
            id: "settings.promptEnhance.enabled.description",
          })}
          control={
            <Switch
              checked={current.enabled}
              disabled={disabled}
              data-testid={TID_SETTINGS_PROMPT_ENHANCE_ENABLED_SWITCH}
              aria-label={intl.formatMessage({ id: "settings.promptEnhance.enabled.label" })}
              onCheckedChange={(checked) => void write({ enabled: checked })}
            />
          }
        />
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.promptEnhance.mode.label" })}
          control={
            <SettingsSegmentedTabs
              value={current.mode}
              items={promptEnhanceModes.map((mode) => ({
                value: mode,
                label: intl.formatMessage({ id: `settings.promptEnhance.mode.${mode}` }),
              }))}
              onValueChange={(mode) => void write({ mode })}
              disabled={disabled}
            />
          }
        />
        <SettingsRow
          label={intl.formatMessage({ id: "settings.promptEnhance.context.label" })}
          control={
            <Switch
              checked={current.contextEnabled}
              disabled={disabled}
              aria-label={intl.formatMessage({ id: "settings.promptEnhance.context.label" })}
              onCheckedChange={(checked) => void write({ contextEnabled: checked })}
            />
          }
          detail={
            current.contextEnabled ? (
              <div className="flex items-center gap-2">
                <span className="text-ui-base text-foreground-subtle">
                  {intl.formatMessage({ id: "settings.promptEnhance.context.rounds" })}
                </span>
                <Select
                  value={String(current.contextRounds)}
                  disabled={disabled}
                  onValueChange={(value) => void write({ contextRounds: Number(value) })}
                >
                  <SelectTrigger size="sm" className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(
                      {
                        length:
                          PROMPT_ENHANCE_CONTEXT_ROUNDS_MAX - PROMPT_ENHANCE_CONTEXT_ROUNDS_MIN + 1,
                      },
                      (_, index) => PROMPT_ENHANCE_CONTEXT_ROUNDS_MIN + index,
                    ).map((rounds) => (
                      <SelectItem key={rounds} value={String(rounds)}>
                        {rounds}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null
          }
        />
        <SettingsRow
          label={intl.formatMessage({ id: "settings.promptEnhance.allowInlineReference.label" })}
          description={intl.formatMessage({
            id: "settings.promptEnhance.allowInlineReference.note",
          })}
          control={
            <Switch
              checked={current.allowInlineReferenceRewrite}
              disabled={disabled}
              aria-label={intl.formatMessage({
                id: "settings.promptEnhance.allowInlineReference.label",
              })}
              onCheckedChange={(checked) => void write({ allowInlineReferenceRewrite: checked })}
            />
          }
        />
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.promptEnhance.channel.label" })}
          control={
            <SettingsSegmentedTabs
              value={current.channel}
              items={promptEnhanceChannels.map((channel) => ({
                value: channel,
                label: intl.formatMessage({ id: `settings.promptEnhance.channel.${channel}` }),
              }))}
              onValueChange={(channel) => void write({ channel })}
              disabled={disabled}
            />
          }
        />
        {current.channel === "custom" ? (
          <>
            <SettingsRow
              controlLayout="wide"
              label={intl.formatMessage({ id: "settings.promptEnhance.channel.provider" })}
              control={
                <Select
                  value={current.customSelection?.providerId ?? ""}
                  disabled={disabled || providers.length === 0}
                  onValueChange={(providerId) => {
                    const provider = providers.find(
                      (candidate) => candidate.providerId === providerId,
                    );
                    const firstModel = provider?.models[0]?.modelId;
                    // provider 换了但还没选模型时不要留下「空模型」的半截选择。
                    if (!firstModel) return;
                    void write({ customSelection: { providerId, modelId: firstModel } });
                  }}
                >
                  <SelectTrigger size="lg" className="w-full min-w-0 sm:w-64">
                    <SelectValue
                      placeholder={intl.formatMessage({
                        id: "settings.promptEnhance.channel.providerPlaceholder",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {providers.map((provider) => (
                      <SelectItem key={provider.providerId} value={provider.providerId}>
                        {provider.providerName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              controlLayout="wide"
              label={intl.formatMessage({ id: "settings.promptEnhance.channel.model" })}
              control={
                <Select
                  value={customProvider ? (current.customSelection?.modelId ?? "") : ""}
                  disabled={disabled || !customProvider}
                  onValueChange={(modelId) => {
                    const providerId = current.customSelection?.providerId;
                    if (!providerId) return;
                    void write({ customSelection: { providerId, modelId } });
                  }}
                >
                  <SelectTrigger size="lg" className="w-full min-w-0 sm:w-64">
                    <SelectValue
                      placeholder={intl.formatMessage({
                        id: "settings.promptEnhance.channel.modelPlaceholder",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(customProvider?.models ?? []).map((model) => (
                      <SelectItem key={model.modelId} value={model.modelId}>
                        {model.modelId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <SettingsRow
              controlLayout="wide"
              label={intl.formatMessage({ id: "settings.promptEnhance.reasoning.label" })}
              description={intl.formatMessage({ id: "settings.promptEnhance.reasoning.note" })}
              control={
                <Select
                  value={current.reasoningLevel}
                  disabled={disabled}
                  onValueChange={(level) =>
                    void write({ reasoningLevel: level as PromptEnhanceSettings["reasoningLevel"] })
                  }
                >
                  <SelectTrigger size="lg" className="w-full min-w-0 sm:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {promptEnhanceReasoningLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {intl.formatMessage({ id: `settings.promptEnhance.reasoning.${level}` })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
          </>
        ) : null}
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.promptEnhance.effective.label" })}
          control={
            // 不截断：这一行要答的是「现在到底用哪个模型」，而文案会随语言与字号变化
            // （`--ui-font-size` 由外观设置控制，列宽是固定 px、不跟着放大），
            // 截断会把「推理强度」这种关键信息吃掉。放不下时换行，宁可占两行。
            <span className="min-w-0 break-words text-right text-ui-base text-foreground-subtle">
              {effectiveLabel}
            </span>
          }
        />
        <SettingsRow
          label={intl.formatMessage({ id: "settings.promptEnhance.prompt.label" })}
          control={
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPromptBodyOpen((open) => !open)}
            >
              {intl.formatMessage({
                id: promptBodyOpen
                  ? "settings.promptEnhance.prompt.hide"
                  : "settings.promptEnhance.prompt.show",
              })}
            </Button>
          }
          detail={
            promptBodyOpen ? (
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-surface p-3 text-ui-sm leading-6 text-foreground-subtle">
                {formatPromptEnhanceTemplate(current.mode)}
              </pre>
            ) : null
          }
        />
      </SettingsGroupCard>
      <div>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => void writeDefaults()}
          data-testid="settings-prompt-enhance-reset"
        >
          <RotateCcw className="mr-2 size-4" aria-hidden />
          {intl.formatMessage({ id: "settings.promptEnhance.reset" })}
        </Button>
      </div>
    </section>
  );
}
