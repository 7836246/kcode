import type { KCodeSessionStateSnapshot } from "@kcode/shared";
import { createServiceLogger } from "#src/logger/serviceLogger.js";
import { repairImportedClaudeSessionSnapshot } from "#src/session/claude-native/importedClaudeHistoryRepair.js";
import type { IKCodeAgentService } from "#src/kcode-agent/kcodeAgent.js";
import type {
  KCodeSessionReadParams,
  KCodeSessionResumeParams,
} from "#src/kcode-session/kcodeSession.js";

const logger = createServiceLogger("kcode-session-service");

export async function repairEmptyImportedClaudeSessionSnapshot(params: {
  agentService: IKCodeAgentService;
  snapshot: KCodeSessionStateSnapshot;
  target: KCodeSessionResumeParams | KCodeSessionReadParams;
}): Promise<KCodeSessionStateSnapshot> {
  const repaired = await repairImportedClaudeSessionSnapshot({
    snapshot: params.snapshot,
    target: {
      workspacePath: params.target.workspacePath,
      workspaceIdentity: params.target.workspaceIdentity,
      taskId: params.target.sessionId,
      ...("mcpServers" in params.target && params.target.mcpServers
        ? { mcpServers: params.target.mcpServers }
        : {}),
    },
    createSession: (input) => params.agentService.createSession(input),
    onRepair: (history) => {
      logger.warn(
        undefined,
        `[kcode-session-service] Claude 导入 session 历史异常，按 ${history.source} 回填 taskId=${params.target.sessionId}`,
      );
    },
  });
  return repaired ?? params.snapshot;
}
