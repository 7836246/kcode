/**
 * KCode session UI 状态 store
 *
 * 一个 tab 对应一个 workspace，所以聊天相关状态也必须按 workspace 分桶保存。
 * 这样切换标签页时，当前任务、输入中的草稿态和初始化状态才不会互相串台。
 */
import { create } from "zustand";
import { shouldExposeE2EStoreBridge } from "@/lib/e2eStoreBridge.js";
import { type KCodeSessionStoreState } from "./kcodeSessionStoreTypes.js";
import { getWorkspaceState } from "./kcodeSessionStoreSelectors.js";
import { createNavigationSlice } from "./kcodeSessionStoreNavigation.js";
import { createTaskSlice } from "./kcodeSessionStoreTaskSlice.js";
import { createWorkspaceSlice } from "./kcodeSessionStoreWorkspaceSlice.js";
import { uiMemoryDiagnosticsRegistry } from "@/lib/memoryDiagnostics.js";

export const useKCodeSessionStore = create<KCodeSessionStoreState>()((set, get) => ({
  workspaces: {},
  ...createNavigationSlice(set, get),
  ...createWorkspaceSlice(set),
  ...createTaskSlice(set),
  getWorkspaceState: (workspacePath: string, workspaceIdentity?: string) =>
    getWorkspaceState(get(), workspacePath, workspaceIdentity),
}));

type KCodeSessionStoreE2EBridge = typeof useKCodeSessionStore;

declare global {
  interface Window {
    __kcodeSessionStoreE2E?: KCodeSessionStoreE2EBridge;
  }
}

if (shouldExposeE2EStoreBridge()) {
  // E2E 诊断入口必须由 WDIO 显式打开，不能复用 KCODE_ENV=test，避免产品测试环境暴露可变全局 store。
  window.__kcodeSessionStoreE2E = useKCodeSessionStore;
}

// ────────────────────────────────────────────
// Re-exports: 保持外部 `from '@/store/kcodeSessionStore'` 的导入路径继续工作
// ────────────────────────────────────────────
export * from "./kcodeSessionStoreTypes.js";
export * from "./kcodeSessionStoreSelectors.js";
// Re-export navigation types used externally:
export type {
  TaskNavigationHistory,
  TaskNavEntry,
  WorkspaceNavEntry,
} from "@/lib/taskNavigationHistory.js";

// 内存诊断计数器：workspace 桶全仓无删除路径，先落日志。
uiMemoryDiagnosticsRegistry.register("sessionStore", () => ({
  workspaces: Object.keys(useKCodeSessionStore.getState().workspaces).length,
}));
