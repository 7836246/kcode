/**
 * workspace prepare 的协议 RPC 收口。
 *
 * 拆出原因：useWorkspacePrepare.ts 只保留可单测的轻量判定入口；
 * 这里只读取 workspace presentation（mode/slash commands）；模型选择事实由目标 Host View 提供。
 */
import type { IKCodeSessionService } from "@kcode/services";
import { type KCodeProvider, type KCodeWorkspacePrepareResult } from "@kcode/shared";
import { getChatErrorMessage } from "@/lib/chatPrepareError.js";
import { logger } from "@/logger.js";
import { kcodeWorkspacePresentationToConfigOptions } from "@/lib/kcodeSessionProjection.js";

export async function prepareWorkspaceWithKCodeSessionService(params: {
  workspacePath: string;
  workspaceIdentity?: string;
  provider: KCodeProvider;
  kcodeSessionService: Pick<IKCodeSessionService, "readWorkspacePresentation">;
}): Promise<KCodeWorkspacePrepareResult> {
  const startedAt = Date.now();
  logger.info("[kcode-workspace-presentation] workspace prepare start", {
    workspacePath: params.workspacePath,
    workspaceIdentity: params.workspaceIdentity ?? null,
    provider: params.provider,
  });

  let presentation: Awaited<ReturnType<IKCodeSessionService["readWorkspacePresentation"]>>;
  try {
    presentation = await params.kcodeSessionService.readWorkspacePresentation({
      workspacePath: params.workspacePath,
      workspaceIdentity: params.workspaceIdentity,
    });
  } catch (error) {
    logger.warn("[kcode-workspace-presentation] readWorkspacePresentation failed", {
      workspacePath: params.workspacePath,
      workspaceIdentity: params.workspaceIdentity ?? null,
      provider: params.provider,
      durationMs: Date.now() - startedAt,
      error: getChatErrorMessage(error),
    });
    throw error;
  }

  const readPresentationDurationMs = Date.now() - startedAt;
  const configOptions = kcodeWorkspacePresentationToConfigOptions(presentation.mode);
  const totalDurationMs = Date.now() - startedAt;
  logger.info("[kcode-workspace-presentation] readWorkspacePresentation done", {
    workspacePath: params.workspacePath,
    workspaceIdentity: params.workspaceIdentity ?? null,
    provider: params.provider,
    readPresentationDurationMs,
    totalDurationMs,
    configOptionsCount: configOptions.length,
    modeCurrent: presentation.mode,
  });

  return {
    workspacePath: params.workspacePath,
    preparedSessionId: "",
    version: "KCode Protocol/1",
    provider: params.provider,
    configOptions,
    slashCommands: presentation.slashCommands,
  };
}
