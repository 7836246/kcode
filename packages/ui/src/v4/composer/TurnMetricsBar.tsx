import { memo, useMemo } from "react";
import { TID_V4_COMPOSER_TURN_METRICS } from "@kcode/shared";
import { cn } from "@/components/lib/utils.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import {
  buildTurnMetricsSegments,
  type TurnMetricsView,
} from "@/chat-input-toolbar/turnMetrics.js";

/**
 * Composer 生成指标状态栏：当前会话最后一轮的「首 token · tok/s · 输出 token」。
 *
 * 纯展示组件：指标来自 `turnHeader.metrics`（CLI 权威下发），这里不订阅任何 store、
 * 不持有状态、不做估算。窄 composer 下整枚隐藏，交给容器查询而不是 JS 测量，
 * 避免和 `useComposerToolbarFit` 的折叠优先级互相抢空间。
 */
export const TurnMetricsBar = memo(function TurnMetricsBarImpl({
  metrics,
  streaming,
}: TurnMetricsView) {
  const { intl, locale } = useKCodeIntl();
  const segments = useMemo(
    () => buildTurnMetricsSegments(metrics, intl.formatMessage, locale),
    [metrics, intl, locale],
  );

  if (segments.length === 0) return null;

  return (
    <span
      data-testid={TID_V4_COMPOSER_TURN_METRICS}
      data-turn-metrics-streaming={streaming ? "true" : undefined}
      className="hidden h-5 shrink-0 items-center gap-1.5 self-center overflow-hidden rounded-full bg-foreground/6 px-2.5 text-ui-xs text-foreground-subtle tabular-nums whitespace-nowrap @sm/composer:inline-flex"
    >
      <span
        aria-hidden
        className={cn(
          "size-1.5 shrink-0 rounded-full bg-success",
          streaming && "animate-pulse motion-reduce:animate-none",
        )}
      />
      {segments.map((segment, index) => (
        <span key={segment.id} className="inline-flex items-center gap-1">
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
  );
});
