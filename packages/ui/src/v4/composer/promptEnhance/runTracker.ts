/**
 * 增强请求的 run 跟踪：把「当前是否有活动 run」与「单调递增的 runId」分成两件事。
 *
 * 两者混用会出一个真实故障：取消/切草稿时用墓碑占位活动 run，下一次点击「增强」就会被
 * 继续判成取消，按钮再也发不出请求；而迟到响应又会因为墓碑的 runId 与自身不等而永不清理。
 *
 * 纯逻辑模块（不依赖 React），可单测；调用方在 ref 里持有一个实例。
 */
export interface PromptEnhanceRun {
  readonly runId: number;
  readonly startedAt: number;
}

export interface PromptEnhanceRunTracker {
  /** 开新 run；runId 只增不复用，保证迟到响应不会认成新 run。 */
  start: () => PromptEnhanceRun;
  /** 作废当前 run（用户取消 / 草稿 scope 变化），返回被作废的 run。 */
  invalidate: () => PromptEnhanceRun | null;
  /** 结束指定 run 并让出活动位；不是当前 run 时返回 false。 */
  finish: (runId: number) => boolean;
  /** 该 runId 是否仍是当前活动 run；迟到响应据此丢弃。 */
  isCurrent: (runId: number) => boolean;
  current: () => PromptEnhanceRun | null;
}

export function createPromptEnhanceRunTracker(
  now: () => number = Date.now,
): PromptEnhanceRunTracker {
  let sequence = 0;
  let active: PromptEnhanceRun | null = null;

  return {
    start: () => {
      sequence += 1;
      active = { runId: sequence, startedAt: now() };
      return active;
    },
    invalidate: () => {
      const run = active;
      active = null;
      return run;
    },
    finish: (runId: number) => {
      if (active?.runId !== runId) return false;
      active = null;
      return true;
    },
    isCurrent: (runId: number) => active?.runId === runId,
    current: () => active,
  };
}
