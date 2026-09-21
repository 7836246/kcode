import { useEffect } from "react";
import type { AppSettings } from "@kcode/shared";
import { useServices } from "@/hooks/useServices.js";
import { useOffPeakTaskStore } from "@/store/offPeakTaskStore.js";

/** 闲时入口只拉存量任务列表；官方套餐资格检查已下线。 */
export function useOffPeakEligibility(
  _settings: AppSettings | null | undefined,
  _registryRevision: number | undefined,
): void {
  const { offPeakTaskService } = useServices();
  const initialize = useOffPeakTaskStore((state) => state.initialize);

  useEffect(() => {
    if (!offPeakTaskService) return;
    void initialize({ offPeakTaskService });
  }, [initialize, offPeakTaskService]);
}
