import { useEffect, useMemo } from "react";
import {
  useDynamicWorkflowAvailabilityStore,
  type DynamicWorkflowAvailabilitySnapshot,
} from "@/store/dynamicWorkflowAvailabilityStore.js";

/**
 * 读动态工作流灰度快照。
 * 只读，不触发请求：取数由 Root 里的 loader 唯一负责。
 */
export function useDynamicWorkflowAvailability(): DynamicWorkflowAvailabilitySnapshot {
  const status = useDynamicWorkflowAvailabilityStore((state) => state.status);
  const enabled = useDynamicWorkflowAvailabilityStore((state) => state.enabled);
  const config = useDynamicWorkflowAvailabilityStore((state) => state.config);
  return useMemo(() => ({ status, enabled, config }), [config, enabled, status]);
}

/**
 * 官方套餐服务已下线；动态工作流入口 fail-closed。
 */
export function useDynamicWorkflowAvailabilityLoader(): void {
  const markUnavailable = useDynamicWorkflowAvailabilityStore((state) => state.markUnavailable);
  useEffect(() => {
    markUnavailable();
  }, [markUnavailable]);
}
