import type { KCodeBackgroundTaskControlItem } from "./background-task-controls.js";

export function mergeKCodeBackgroundTaskControlItems(
  current: readonly KCodeBackgroundTaskControlItem[],
  updates: readonly KCodeBackgroundTaskControlItem[],
): KCodeBackgroundTaskControlItem[] {
  const jobsById = new Map(current.map((job) => [job.jobId, job] as const));
  for (const job of updates) {
    jobsById.set(job.jobId, job);
  }
  return Array.from(jobsById.values());
}
