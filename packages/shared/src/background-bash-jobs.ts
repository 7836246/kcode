import {
  collectVisibleKCodeBackgroundTaskControlItems,
  getKCodeBackgroundTaskControlItemElapsedMs,
  isActiveKCodeBackgroundTaskControlItem,
  parseKCodeBackgroundTaskControlItems,
  type KCodeBackgroundTaskControlItem,
  type KCodeBackgroundTaskControlStatus,
} from "./background-task-controls.js";

export type KCodeBackgroundBashJobStatus = KCodeBackgroundTaskControlStatus;
export type KCodeBackgroundBashJob = KCodeBackgroundTaskControlItem & {
  taskKind: "bash";
};

export function parseKCodeBackgroundBashJobs(value: unknown): KCodeBackgroundBashJob[] {
  return parseKCodeBackgroundTaskControlItems(value).filter(isBackgroundBashJob);
}

export function isActiveKCodeBackgroundBashJob(job: KCodeBackgroundBashJob): boolean {
  return isActiveKCodeBackgroundTaskControlItem(job);
}

export function getKCodeBackgroundBashJobElapsedMs(
  job: KCodeBackgroundBashJob,
  now = Date.now(),
): number {
  return getKCodeBackgroundTaskControlItemElapsedMs(job, now);
}

export function collectVisibleKCodeBackgroundBashJobs(
  jobs: readonly KCodeBackgroundBashJob[],
  now = Date.now(),
  thresholdMs = 30_000,
): Array<KCodeBackgroundBashJob & { elapsedMs: number }> {
  return collectVisibleKCodeBackgroundTaskControlItems(jobs, now, thresholdMs) as Array<
    KCodeBackgroundBashJob & { elapsedMs: number }
  >;
}

function isBackgroundBashJob(job: KCodeBackgroundTaskControlItem): job is KCodeBackgroundBashJob {
  return job.taskKind === "bash";
}
