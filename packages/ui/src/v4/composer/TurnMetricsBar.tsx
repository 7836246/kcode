import { memo, useMemo } from "react";
import { ActivityIcon } from "lucide-react";
import { TID_V4_COMPOSER_TURN_METRICS } from "@kcode/shared";
import { cn } from "@/components/lib/utils.js";
import { ControlHintTooltip } from "@/ControlHintTooltip.js";
import { useOptionalServices } from "@/hooks/useServices.js";
import { useSettings } from "@/hooks/useSettingService.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import {
  buildTurnMetricsSegments,
  formatTurnMetricsSummary,
  isComposerTurnMetricsVisible,
  type TurnMetricsView,
} from "@/chat-input-toolbar/turnMetrics.js";

/**
 * Composer 生成指标状态栏：当前会话最后一轮的「首 token · tok/s · 输出 token」。
 *
 * 指标来自 `snapshot.composerTurnMetrics`（CLI 权威下发），这里不估算。展示开关读
 * `composerTurnMetricsVisible`；窄宽折叠由父级 `data-composer-compact` 驱动，
 * 收成 icon 后 tooltip 仍给出完整三个数。
 */
export const TurnMetricsBar = memo(function TurnMetricsBarImpl(props: TurnMetricsView) {
  const services = useOptionalServices();
  if (!services) return <TurnMetricsBarView {...props} />;
  return <TurnMetricsBarWithSettings {...props} />;
});

function TurnMetricsBarWithSettings(props: TurnMetricsView) {
  const { settings } = useSettings();
  if (!isComposerTurnMetricsVisible(settings)) return null;
  return <TurnMetricsBarView {...props} />;
}

const TurnMetricsBarView = memo(function TurnMetricsBarViewImpl({
  metrics,
  streaming,
}: TurnMetricsView) {
  const { intl, locale } = useKCodeIntl();
  const segments = useMemo(
    () => buildTurnMetricsSegments(metrics, intl.formatMessage, locale),
    [metrics, intl, locale],
  );
  const summary = useMemo(() => formatTurnMetricsSummary(segments), [segments]);

  if (segments.length === 0) return null;

  return (
    <ControlHintTooltip title={summary}>
      <span
        data-testid={TID_V4_COMPOSER_TURN_METRICS}
        data-turn-metrics-streaming={streaming ? "true" : undefined}
        role="status"
        tabIndex={0}
        aria-label={summary}
        className="inline-flex h-7 shrink-0 items-center gap-1.5 overflow-hidden rounded-full bg-foreground/6 px-2.5 leading-none text-ui-xs text-foreground-subtle tabular-nums whitespace-nowrap group-data-[composer-compact=true]/metrics:size-7 group-data-[composer-compact=true]/metrics:justify-center group-data-[composer-compact=true]/metrics:gap-0 group-data-[composer-compact=true]/metrics:px-0"
      >
        <span
          aria-hidden
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-success group-data-[composer-compact=true]/metrics:hidden",
            streaming && "animate-pulse motion-reduce:animate-none",
          )}
        />
        <ActivityIcon
          aria-hidden
          className={cn(
            "hidden size-4 shrink-0 group-data-[composer-compact=true]/metrics:inline-block",
            streaming && "animate-pulse motion-reduce:animate-none",
          )}
        />
        {segments.map((segment, index) => (
          <span
            key={segment.id}
            className="inline-flex items-center gap-1 group-data-[composer-compact=true]/metrics:hidden"
          >
            {index > 0 ? (
              <span aria-hidden className="opacity-55">
                ·
              </span>
            ) : null}
            {segment.label ? <span>{segment.label}</span> : null}
            <span className={segment.id === "tokensPerSecond" ? "text-warning" : "text-foreground"}>
              {segment.value}
            </span>
          </span>
        ))}
      </span>
    </ControlHintTooltip>
  );
});
