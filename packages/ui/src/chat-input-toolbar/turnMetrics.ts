/**
 * Composer 生成指标状态栏的展示投影。
 *
 * 指标由 CLI 投影写入 `snapshot.composerTurnMetrics`。这里只做空值收口和格式化，
 * 不重算指标、不补默认值、不估算，也不从 row window 挑轮次。
 * 纯函数、无 React 与 i18n provider 依赖，文案通过 `formatMessage` 注入，便于单测。
 */
import { formatCompactTokenNumber } from "../lib/tokenNumberFormat.js";

// 与协议 turnMetricsSchema 同形；UI 只读。
export interface TurnMetrics {
  firstTokenMs: number | null;
  outputTokens: number;
  tokensPerSecond: number | null;
}

export type TurnMetricsSegmentId = "firstToken" | "tokensPerSecond" | "outputTokens";

export interface TurnMetricsSegment {
  id: TurnMetricsSegmentId;
  /** 段落标签；tok/s 段的单位并入 value，没有独立标签。 */
  label: string | null;
  value: string;
}

export interface TurnMetricsView {
  metrics: TurnMetrics;
  /** 该轮仍在生成中（turnHeader.state === "running"）。 */
  streaming: boolean;
}

export type TurnMetricsMessageFormat = (
  descriptor: { id: string },
  values?: Record<string, string | number>,
) => string;

/**
 * 状态栏只读投影下发的当前轮指标。null 表示本轮还没有可展示的数字，
 * 不回退到更早轮次：新一轮刚开始时继续展示上一轮，会让用户以为那是本轮的实时值。
 */
export function resolveTurnMetricsView(
  composerTurnMetrics: TurnMetricsView | null | undefined,
): TurnMetricsView | null {
  if (!composerTurnMetrics) return null;
  return {
    metrics: composerTurnMetrics.metrics,
    streaming: composerTurnMetrics.streaming,
  };
}

/** 首 token 延迟：不足 1 秒给毫秒，其余给秒（10 秒以上取整），与轨迹耗时同一可读性档位。 */
export function formatTurnFirstTokenMs(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  const seconds = ms / 1000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
}

/** 解码速度保留一位小数，与 Developer Tools 的 TPS 列一致。 */
export function formatTurnTokensPerSecond(tokensPerSecond: number, locale: string): string {
  if (!Number.isFinite(tokensPerSecond) || tokensPerSecond < 0) return "";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(tokensPerSecond);
}

/** 按「首 token → tok/s → 输出 token」顺序生成段落；缺值的段落不出现。 */
export function buildTurnMetricsSegments(
  metrics: TurnMetrics,
  formatMessage: TurnMetricsMessageFormat,
  locale: string,
): TurnMetricsSegment[] {
  const segments: TurnMetricsSegment[] = [];
  if (metrics.firstTokenMs !== null) {
    segments.push({
      id: "firstToken",
      label: formatMessage({ id: "chat.turnMetrics.firstToken" }),
      value: formatTurnFirstTokenMs(metrics.firstTokenMs),
    });
  }
  if (metrics.tokensPerSecond !== null) {
    segments.push({
      id: "tokensPerSecond",
      label: null,
      value: formatMessage(
        { id: "chat.turnMetrics.tokensPerSecond" },
        { value: formatTurnTokensPerSecond(metrics.tokensPerSecond, locale) },
      ),
    });
  }
  if (metrics.outputTokens > 0) {
    segments.push({
      id: "outputTokens",
      label: formatMessage({ id: "chat.turnMetrics.outputTokens" }),
      value: formatCompactTokenNumber(locale, metrics.outputTokens),
    });
  }
  return segments.filter((segment) => segment.value !== "");
}
