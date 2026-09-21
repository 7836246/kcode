import { useCallback, useMemo, useState, type CSSProperties } from "react";
import {
  TID_CHAT_CONTEXT_USAGE_TRIGGER,
  type KCodeContextUsageBreakdownItem,
  type KCodeProvider,
} from "@kcode/shared";
import {
  Context,
  ContextContentBody,
  ContextContent,
  ContextTrigger,
} from "@/components/ai-elements/context.js";
import { cn } from "@/components/lib/utils.js";
import { Progress } from "@/components/ui/progress.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { formatCompactTokenNumber } from "@/lib/tokenNumberFormat.js";

type ContextUsageBreakdownSource = KCodeContextUsageBreakdownItem["source"];

interface ContextUsageBreakdownSegment {
  chars: number;
  percent: number;
  source: ContextUsageBreakdownSource;
}

const CONTEXT_PROGRESS_TONE_COLORS = [
  "var(--color-usage-chart-1)",
  "color-mix(in oklab, var(--color-usage-chart-1) 78%, var(--color-surface))",
  "color-mix(in oklab, var(--color-usage-chart-1) 58%, var(--color-surface))",
  "color-mix(in oklab, var(--color-usage-chart-1) 42%, var(--color-surface))",
  "color-mix(in oklab, var(--color-usage-chart-1) 28%, var(--color-surface))",
] as const;
const PERCENT_MAX = 100;
const CACHE_HIT_RATE_DISPLAY_THRESHOLD = 0.78;

function formatContextUsageTokenCount(
  value: number,
  locale: string,
  options: { maximumFractionDigits?: number } = {},
): string {
  return formatCompactTokenNumber(locale, value, options);
}

function formatContextUsageSummary({
  locale,
  percent,
  size,
  used,
}: {
  locale: string;
  percent: number;
  size: number;
  used: number;
}): string {
  const percentageFormatter = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "percent",
  });
  return `${formatContextUsageTokenCount(used, locale)}/${formatContextUsageTokenCount(
    size,
    locale,
    {
      maximumFractionDigits: 0,
    },
  )} (${percentageFormatter.format(percent)})`;
}

function formatContextCacheHitRateLabel(
  hitRate: number | null | undefined,
  locale: string,
  options: { showBelowThreshold?: boolean } = {},
): string | null {
  if (hitRate === null || hitRate === undefined || !Number.isFinite(hitRate)) {
    return null;
  }
  if (!options.showBelowThreshold && hitRate < CACHE_HIT_RATE_DISPLAY_THRESHOLD) {
    return null;
  }
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    style: "percent",
  }).format(Math.max(0, hitRate));
}

function getBreakdownToneStyle(index: number): CSSProperties {
  return {
    backgroundColor:
      CONTEXT_PROGRESS_TONE_COLORS[Math.min(index, CONTEXT_PROGRESS_TONE_COLORS.length - 1)] ??
      CONTEXT_PROGRESS_TONE_COLORS[0],
  };
}

const BREAKDOWN_SOURCE_LABEL_ID: Record<ContextUsageBreakdownSource, string> = {
  messages: "chat.contextUsage.breakdown.messages",
  system_prompt: "chat.contextUsage.breakdown.systemPrompt",
  meta_user_context: "chat.contextUsage.breakdown.metaUserContext",
  skills: "chat.contextUsage.breakdown.skills",
  tool_prompt: "chat.contextUsage.breakdown.toolPrompt",
  system_tool_schemas: "chat.contextUsage.breakdown.systemTools",
  mcp_tool_schemas: "chat.contextUsage.breakdown.mcpTools",
};

const BREAKDOWN_SOURCE_ORDER: Record<ContextUsageBreakdownSource, number> = {
  messages: 0,
  system_prompt: 1,
  meta_user_context: 2,
  skills: 3,
  tool_prompt: 4,
  system_tool_schemas: 5,
  mcp_tool_schemas: 6,
};

function buildContextUsageBreakdownSegments(
  breakdown: readonly KCodeContextUsageBreakdownItem[] | undefined,
): ContextUsageBreakdownSegment[] {
  const charsBySource = new Map<ContextUsageBreakdownSource, number>();
  for (const item of breakdown ?? []) {
    if (!Number.isFinite(item.chars) || item.chars <= 0) {
      continue;
    }
    charsBySource.set(item.source, (charsBySource.get(item.source) ?? 0) + item.chars);
  }

  const totalChars = [...charsBySource.values()].reduce((sum, chars) => sum + chars, 0);
  if (totalChars <= 0) {
    return [];
  }

  return [...charsBySource.entries()]
    .map(([source, chars]) => ({
      chars,
      percent: chars / totalChars,
      source,
    }))
    .sort(
      (left, right) =>
        right.chars - left.chars ||
        BREAKDOWN_SOURCE_ORDER[left.source] - BREAKDOWN_SOURCE_ORDER[right.source],
    );
}

function buildContextUsageProgressSegments(segments: readonly ContextUsageBreakdownSegment[]) {
  return segments.map((segment, index) => ({
    id: segment.source,
    percent: segment.percent,
    style: getBreakdownToneStyle(index),
  }));
}

export function getRenderableTaskUsage<T extends { used: number; size: number }>(
  taskUsage: T | null,
): T | null {
  if (!taskUsage) {
    return null;
  }
  if (
    !Number.isFinite(taskUsage.used) ||
    !Number.isFinite(taskUsage.size) ||
    taskUsage.used <= 0 ||
    taskUsage.size <= 0
  ) {
    return null;
  }
  return taskUsage;
}

export function getContextCompressionCommand(_provider: KCodeProvider): string {
  return "/compact";
}

export function ChatContextUsage({
  taskUsage,
  intl,
  locale,
}: {
  taskUsage: {
    used: number;
    size: number;
    cache?: { hitRate: number | null };
    breakdown?: KCodeContextUsageBreakdownItem[];
  } | null;
  selectedProvider: KCodeProvider;
  intl: ReturnType<typeof useKCodeIntl>["intl"];
  locale: string;
  onSendCompressionCommand?: (command: string) => void;
  compressionDisabled?: boolean;
}) {
  const [contextOpen, setContextOpen] = useState(false);
  const handleContextOpenChange = useCallback((open: boolean) => {
    setContextOpen(open);
  }, []);
  const renderableTaskUsage = getRenderableTaskUsage(taskUsage);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const contextUsageLabel = useMemo(() => {
    if (!renderableTaskUsage) {
      return null;
    }
    return intl.formatMessage(
      { id: "chat.contextUsage" },
      {
        used: numberFormatter.format(renderableTaskUsage.used),
        total: numberFormatter.format(renderableTaskUsage.size),
      },
    );
  }, [intl, numberFormatter, renderableTaskUsage]);
  const cacheHitRateLabel = useMemo(() => {
    return formatContextCacheHitRateLabel(renderableTaskUsage?.cache?.hitRate, locale, {
      showBelowThreshold: import.meta.env.DEV,
    });
  }, [locale, renderableTaskUsage]);
  const breakdownSegments = useMemo(
    () => buildContextUsageBreakdownSegments(renderableTaskUsage?.breakdown),
    [renderableTaskUsage?.breakdown],
  );
  const progressSegments = useMemo(
    () => buildContextUsageProgressSegments(breakdownSegments),
    [breakdownSegments],
  );
  const percentageFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        maximumFractionDigits: 1,
        style: "percent",
      }),
    [locale],
  );

  if (!renderableTaskUsage || !contextUsageLabel) {
    return null;
  }

  const usagePercent = Math.min(Math.max(renderableTaskUsage.used / renderableTaskUsage.size, 0), 1);
  const compactTokenUsageLabel = formatContextUsageSummary({
    locale,
    percent: usagePercent,
    size: renderableTaskUsage.size,
    used: renderableTaskUsage.used,
  });

  return (
    <Context
      usedTokens={renderableTaskUsage.used}
      maxTokens={renderableTaskUsage.size}
      open={contextOpen}
      onOpenChange={handleContextOpenChange}
    >
      <span className="inline-flex shrink-0">
        <ContextTrigger
          aria-label={contextUsageLabel}
          className="text-foreground-subtle"
          data-chat-toolbar-popover-trigger="true"
          data-testid={TID_CHAT_CONTEXT_USAGE_TRIGGER}
          onPointerDown={(event) => {
            if (
              !event.defaultPrevented &&
              event.pointerType === "touch" &&
              typeof window !== "undefined" &&
              window.matchMedia?.("(hover: none)").matches &&
              !contextOpen
            ) {
              handleContextOpenChange(true);
            }
          }}
        />
      </span>
      <ContextContent className={cn("!w-80 !rounded-xl !shadow-md")} side="top" sideOffset={2}>
        <ContextContentBody className="space-y-3">
          <div className="space-y-2">
            <div className="flex min-w-0 mb-3 items-center gap-3">
              <span className="shrink-0 text-ui-base font-medium text-foreground">
                {intl.formatMessage({ id: "chat.contextUsage.title" })}
              </span>
              <span className="ml-auto shrink-0 text-right font-mono text-ui-sm text-foreground-subtle">
                {compactTokenUsageLabel}
              </span>
            </div>
            <Progress
              className="h-2 bg-surface"
              indicatorClassName="min-w-2"
              segments={progressSegments}
              value={usagePercent * PERCENT_MAX}
            />
          </div>
          {breakdownSegments.length > 0 || cacheHitRateLabel ? (
            <>
              {breakdownSegments.length > 0 ? (
                <div
                  aria-label={intl.formatMessage({
                    id: "chat.contextUsage.breakdown",
                  })}
                  className="space-y-1.5"
                >
                  <div className="grid gap-1.5">
                    {breakdownSegments.map((segment, index) => (
                      <div
                        className="flex min-w-0 items-center gap-2 text-ui-sm"
                        key={segment.source}
                      >
                        <span
                          aria-hidden="true"
                          className="size-2 shrink-0 rounded-sm border border-border"
                          style={getBreakdownToneStyle(index)}
                        />
                        <span className="min-w-0 truncate text-foreground-subtle">
                          {intl.formatMessage({
                            id: BREAKDOWN_SOURCE_LABEL_ID[segment.source],
                          })}
                        </span>
                        <span className="ml-auto min-w-10 shrink-0 text-right font-mono text-ui-sm tabular-nums text-foreground">
                          {percentageFormatter.format(segment.percent)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {cacheHitRateLabel ? (
                <div
                  className={cn(
                    "flex items-center justify-between gap-3 text-ui-sm",
                    breakdownSegments.length > 0 && "border-t border-border pt-3",
                  )}
                >
                  <span className="text-foreground-subtle">
                    {intl.formatMessage({
                      id: "chat.contextUsage.cacheHitRate",
                    })}
                  </span>
                  <span className="font-mono text-ui-sm text-foreground">{cacheHitRateLabel}</span>
                </div>
              ) : null}
            </>
          ) : null}
        </ContextContentBody>
      </ContextContent>
    </Context>
  );
}
