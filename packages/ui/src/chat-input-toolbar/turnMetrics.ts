/**
 * Composer 生成指标状态栏的展示投影。
 *
 * 指标本身由 CLI 投影从模型请求完成事实累加后下发（`turnHeader.metrics`）；这里
 * 只做「取哪一轮 + 格式化成可渲染段落」，不重算指标、不补默认值、不估算。
 * 纯函数、无 React 与 i18n provider 依赖，文案通过 `formatMessage` 注入，便于单测。
 */
import { formatCompactTokenNumber } from "../lib/tokenNumberFormat.js";

// 与协议 turnMetricsSchema 同形；UI 只读。
export interface TurnMetrics {
  firstTokenMs: number | null;
  outputTokens: number;
  tokensPerSecond: number | null;
}

// 结构化入参：只认渲染需要的三个字段，避免把协议行类型绑进纯函数。
export interface TurnMetricsSourceRow {
  kind: string;
  state?: string;
  metrics?: TurnMetrics | null;
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
 * 状态栏跟随「当前会话最后一条 turnHeader」（row window 尾部）。
 *
 * 最后一条 turnHeader 没有指标时返回 null，而不是回退到更早的轮次：新一轮刚开始、
 * 首个模型请求尚未完成时，继续展示上一轮的数字会让用户以为那是本轮的实时值。
 */
export function resolveTurnMetricsView(
  rows: readonly TurnMetricsSourceRow[] | undefined,
): TurnMetricsView | null {
  if (!rows || rows.length === 0) return null;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index]!;
    if (row.kind !== "turnHeader") continue;
    if (!row.metrics) return null;
    return { metrics: row.metrics, streaming: row.state === "running" };
  }
  return null;
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
