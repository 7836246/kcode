import { useState } from "react";
import { MODEL_FALLBACK_CHAIN_LIMIT, type ModelFallbackRef } from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.js";
import { toast } from "@/components/ui/toast.js";
import { useModelSelectionView } from "@/hooks/useModelSelectionView.js";
import { useSettings } from "@/hooks/useSettingService.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import {
  readWorkspaceModelFallbackChain,
  workspaceModelFallbackKey,
} from "@/lib/modelFallbackSettings.js";

const ADD_PLACEHOLDER = "__add_fallback__";

export function ModelFallbackSetting({
  remoteSessionId,
  remoteTarget,
  workspaceIdentity,
  workspacePath,
}: {
  remoteSessionId?: string | null;
  remoteTarget?: unknown;
  workspaceIdentity?: string;
  workspacePath?: string | null;
}) {
  const { intl } = useKCodeIntl();
  const { settings, update } = useSettings();
  const [saving, setSaving] = useState(false);
  const workspaceKey = workspacePath
    ? workspaceModelFallbackKey(workspaceIdentity, workspacePath)
    : "";
  const chain = readWorkspaceModelFallbackChain(settings, workspaceKey);
  const modelSelectionRead = useModelSelectionView(
    workspacePath,
    remoteSessionId,
    workspaceIdentity,
    remoteTarget,
    { selection: null },
  );
  const providers =
    modelSelectionRead.state.status === "ready" ? modelSelectionRead.state.view.providers : [];
  const options = providers.flatMap((provider) =>
    provider.models.map((model) => ({
      providerId: provider.providerId,
      modelId: model.modelId,
      label: `${provider.providerName} / ${model.modelId}`,
      value: `${provider.providerId}\n${model.modelId}`,
    })),
  );
  const used = new Set(chain.map((item) => `${item.providerId}\n${item.modelId}`));
  const available = options.filter((option) => !used.has(option.value));

  const writeChain = async (next: ModelFallbackRef[]) => {
    if (!workspaceKey || !settings) return;
    setSaving(true);
    try {
      const modelFallbackByWorkspace = { ...settings.modelFallbackByWorkspace };
      if (next.length === 0) {
        delete modelFallbackByWorkspace[workspaceKey];
      } else {
        modelFallbackByWorkspace[workspaceKey] = next;
      }
      await update({ modelFallbackByWorkspace });
    } catch (error) {
      logger.warn("[settings] 更新备用模型失败", { error: String(error) });
      toast(intl.formatMessage({ id: "settings.modelFallback.saveError" }));
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h3 className="text-ui-base font-medium text-foreground">
          {intl.formatMessage({ id: "settings.modelFallback.title" })}
        </h3>
        <p className="text-ui-sm text-foreground-subtle">
          {intl.formatMessage({ id: "settings.modelFallback.description" })}
        </p>
      </div>
      {workspaceKey ? (
        <div className="flex flex-col gap-2">
          {chain.length === 0 ? (
            <p className="text-ui-sm text-foreground-subtle">
              {intl.formatMessage({ id: "settings.modelFallback.empty" })}
            </p>
          ) : (
            <ol className="flex flex-col gap-2">
              {chain.map((item, index) => {
                const option = options.find(
                  (candidate) =>
                    candidate.providerId === item.providerId && candidate.modelId === item.modelId,
                );
                return (
                  <li className="flex items-center gap-2" key={`${item.providerId}/${item.modelId}`}>
                    <span className="min-w-0 flex-1 truncate text-ui-sm text-foreground">
                      {option?.label ?? `${item.providerId} / ${item.modelId}`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || index === 0}
                      onClick={() => {
                        const next = chain.slice();
                        const [moved] = next.splice(index, 1);
                        if (moved) next.splice(index - 1, 0, moved);
                        void writeChain(next);
                      }}
                    >
                      {intl.formatMessage({ id: "settings.modelFallback.moveUp" })}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || index === chain.length - 1}
                      onClick={() => {
                        const next = chain.slice();
                        const [moved] = next.splice(index, 1);
                        if (moved) next.splice(index + 1, 0, moved);
                        void writeChain(next);
                      }}
                    >
                      {intl.formatMessage({ id: "settings.modelFallback.moveDown" })}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving}
                      onClick={() => {
                        void writeChain(chain.filter((_, itemIndex) => itemIndex !== index));
                      }}
                    >
                      {intl.formatMessage({ id: "settings.modelFallback.remove" })}
                    </Button>
                  </li>
                );
              })}
            </ol>
          )}
          <Select
            value={ADD_PLACEHOLDER}
            disabled={saving || chain.length >= MODEL_FALLBACK_CHAIN_LIMIT || available.length === 0}
            onValueChange={(value) => {
              if (value === ADD_PLACEHOLDER) return;
              const option = available.find((candidate) => candidate.value === value);
              if (!option) return;
              void writeChain([
                ...chain,
                { providerId: option.providerId, modelId: option.modelId },
              ]);
            }}
          >
            <SelectTrigger className="w-full max-w-md" size="lg">
              <SelectValue
                placeholder={intl.formatMessage({ id: "settings.modelFallback.add" })}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ADD_PLACEHOLDER}>
                {intl.formatMessage({ id: "settings.modelFallback.add" })}
              </SelectItem>
              {available.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <p className="text-ui-sm text-foreground-subtle">
          {intl.formatMessage({ id: "settings.modelFallback.workspaceMissing" })}
        </p>
      )}
    </section>
  );
}
