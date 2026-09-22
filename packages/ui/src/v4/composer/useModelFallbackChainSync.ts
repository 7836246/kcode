import { useEffect, useRef } from "react";
import type { CommandAck, CommandType } from "@kcode/shared/kcode-protocol-v4";
import { useSettings } from "@/hooks/useSettingService.js";
import { logger } from "@/logger.js";
import {
  readWorkspaceModelFallbackChain,
  workspaceModelFallbackKey,
} from "@/lib/modelFallbackSettings.js";

type DispatchCommand = (
  type: CommandType,
  payload: Record<string, unknown>,
  targetSessionId: string | null,
) => Promise<CommandAck>;

/** 把当前工作区的备用链写进已存在的会话。创建请求也会带上同一条链，避免首回合空窗。 */
export function useModelFallbackChainSync(input: {
  dispatchCommand: DispatchCommand;
  sessionId: string | null;
  workspaceIdentity?: string;
  workspacePath: string;
}): void {
  const { settings, loading } = useSettings();
  const dispatchRef = useRef(input.dispatchCommand);
  dispatchRef.current = input.dispatchCommand;
  const workspaceKey = workspaceModelFallbackKey(input.workspaceIdentity, input.workspacePath);
  const chain = readWorkspaceModelFallbackChain(settings, workspaceKey);
  const chainKey = JSON.stringify(chain);
  const ready = !loading && settings !== null;

  useEffect(() => {
    const sessionId = input.sessionId;
    if (!sessionId || !ready) return;
    let cancelled = false;
    void dispatchRef
      .current("setModelFallbackChain", { chain: JSON.parse(chainKey) as unknown }, sessionId)
      .then((ack) => {
        if (cancelled || ack.status === "accepted" || ack.status === "noop") return;
        logger.warn("[model-fallback] 同步备用模型被拒绝", {
          reasonCode: ack.reasonCode ?? null,
          sessionId,
          status: ack.status,
        });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        logger.warn("[model-fallback] 同步备用模型失败", { error: String(error), sessionId });
      });
    return () => {
      cancelled = true;
    };
  }, [chainKey, input.sessionId, ready]);
}
