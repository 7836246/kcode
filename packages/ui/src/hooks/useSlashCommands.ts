/**
 * KCode Agent Slash Commands 便捷 hook
 *
 * 返回当前 workspace 下 Agent 广播的可用 slash commands 列表。
 */
import { useKCodeSessionStore, selectWorkspaceKCodeState } from "../store/kcodeSessionStore.js";

export function useSlashCommands(workspacePath: string, workspaceIdentity?: string) {
  return useKCodeSessionStore(
    (state) => selectWorkspaceKCodeState(state, workspacePath, workspaceIdentity).slashCommands,
  );
}
