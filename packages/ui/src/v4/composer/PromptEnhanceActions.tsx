/**
 * 输入框工具条的提示词增强入口：增强 / 还原 / 设置。
 *
 * 纯展示件 + 一个流程 hook。草稿读写、结构化内容聚合、模型 View 由 composer 注入，
 * 本组件不持第二份草稿状态，也不在本地判定模型通道。
 *
 * 平台/服务门分两层（照 V4ComposerCuaEntry）：composer 会在没有 ServiceProvider 的宿主
 * （含组件级测试）里渲染，内层用的 useSettings / useServices 缺 provider 会抛异常，
 * 因此外层先用 optional 变体判定，缺失即不渲染。
 */
import { SettingsIcon, SparklesIcon, Undo2Icon } from "lucide-react";
import { Button } from "@/components/ui/button.js";
import { Spinner } from "@/components/ui/spinner.js";
import { useNowTicker } from "@/components/workflow-graph/use-now-ticker.js";
import { ControlHintTooltip } from "@/ControlHintTooltip.js";
import { useOptionalServices } from "@/hooks/useServices.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { setPendingSettingsSectionIntent } from "@/lib/settingsNavigation.js";
import { useOptionalTabStore } from "@/store/TabStoreProvider.js";
import { usePromptEnhance, type UsePromptEnhanceParams } from "./usePromptEnhance.js";

export type PromptEnhanceActionsProps = UsePromptEnhanceParams;

export function PromptEnhanceActions(props: PromptEnhanceActionsProps) {
  const services = useOptionalServices();
  if (!services) return null;
  return <PromptEnhanceActionsMounted {...props} />;
}

function PromptEnhanceActionsMounted(props: PromptEnhanceActionsProps) {
  const { intl } = useKCodeIntl();
  const openSettingsTab = useOptionalTabStore((state) => state.openSettingsTab);
  const { canRestore, disabled, enhance, restore, runningStartedAt } = usePromptEnhance(props);

  const running = runningStartedAt !== null;
  const now = useNowTicker(running);
  const elapsedSeconds =
    runningStartedAt === null ? 0 : Math.max(0, Math.floor((now - runningStartedAt) / 1000));

  const enhanceLabel = running
    ? intl.formatMessage({ id: "chat.toolbar.promptEnhance.running" }, { seconds: elapsedSeconds })
    : intl.formatMessage({ id: "chat.toolbar.promptEnhance.label" });
  const enhanceTooltip = intl.formatMessage({
    id: running
      ? "chat.toolbar.promptEnhance.cancelTooltip"
      : "chat.toolbar.promptEnhance.startTooltip",
  });
  const restoreLabel = intl.formatMessage({ id: "chat.toolbar.promptEnhance.restoreLabel" });

  const openEnhanceSettings = () => {
    setPendingSettingsSectionIntent("promptEnhance");
    openSettingsTab();
  };

  return (
    <>
      <ControlHintTooltip title={enhanceTooltip}>
        <Button
          type="button"
          variant="ghost"
          size="default"
          disabled={disabled}
          onClick={enhance}
          data-testid="v4-composer-prompt-enhance"
          data-composer-collapse-priority="3"
          data-prompt-enhance-state={running ? "running" : "idle"}
          aria-label={enhanceLabel}
          className="group/enhance h-7 w-fit shrink-0 justify-center gap-1 rounded-lg px-1.5 py-1.5 text-ui-base data-[composer-compact=true]:size-7 data-[composer-compact=true]:gap-0 data-[composer-compact=true]:p-0"
        >
          {running ? (
            <Spinner className="size-4 shrink-0" />
          ) : (
            <SparklesIcon className="size-4 shrink-0" aria-hidden />
          )}
          <span className="inline-flex whitespace-nowrap group-data-[composer-compact=true]/enhance:hidden">
            {enhanceLabel}
          </span>
        </Button>
      </ControlHintTooltip>
      {canRestore ? (
        <ControlHintTooltip
          title={intl.formatMessage({ id: "chat.toolbar.promptEnhance.restoreTooltip" })}
        >
          <Button
            type="button"
            variant="ghost"
            size="default"
            disabled={disabled || running}
            onClick={restore}
            data-testid="v4-composer-prompt-enhance-restore"
            data-composer-collapse-priority="4"
            aria-label={restoreLabel}
            className="group/enhance-restore h-7 w-fit shrink-0 justify-center gap-1 rounded-lg px-1.5 py-1.5 text-ui-base data-[composer-compact=true]:size-7 data-[composer-compact=true]:gap-0 data-[composer-compact=true]:p-0"
          >
            <Undo2Icon className="size-4 shrink-0" aria-hidden />
            <span className="inline-flex whitespace-nowrap group-data-[composer-compact=true]/enhance-restore:hidden">
              {restoreLabel}
            </span>
          </Button>
        </ControlHintTooltip>
      ) : null}
      <ControlHintTooltip
        title={intl.formatMessage({ id: "chat.toolbar.promptEnhance.settingsTooltip" })}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon-md"
          onClick={openEnhanceSettings}
          data-testid="v4-composer-prompt-enhance-settings"
          aria-label={intl.formatMessage({ id: "chat.toolbar.promptEnhance.settingsLabel" })}
          className="shrink-0 rounded-lg"
        >
          <SettingsIcon className="size-4" aria-hidden />
        </Button>
      </ControlHintTooltip>
    </>
  );
}
