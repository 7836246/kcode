// ── 旧协议兼容面（过渡期）──────────────────────────────
// 剩余 1 个导出：deriveKCodeTaskStatusFromSessionSnapshot。
// 消费者：kcodeTaskServiceAdapter/kcodeTaskIndexSyncer/kcodeSessionProjection（旧投影栈）。
import type { KCodeSessionStateSnapshot } from "./kcode-protocol/index.js";
import { getKCodeUserVisibleMessages } from "./kcode-session-visible-content.js";
import type { KCodeTaskMeta } from "./kcode-task-types-core.js";
type KCodeTaskStatus = KCodeTaskMeta["status"];

function statusFromKCodeSession(
  status: KCodeSessionStateSnapshot["session"]["status"],
): KCodeTaskStatus {
  if (status === "running" || status === "waiting" || status === "paused") {
    return "running";
  }
  if (status === "error") return "error";
  if (status === "completed") return "completed";
  return undefined;
}

function hasBlockingActiveSnapshotRuntime(snapshot: KCodeSessionStateSnapshot): boolean {
  if (snapshot.runtime.activeTurnId || snapshot.runtime.activeTurnKind) {
    return true;
  }
  // projection.currentTurnId 是最后一次投影的 turn 边界，完成后会保留；
  // 只有 runtime active 字段、权限或工具调用才能证明当前仍有真实阻塞运行态。
  if ((snapshot.projection.pendingPermissions ?? []).length > 0) {
    return true;
  }
  return (snapshot.projection.activeToolCalls ?? []).some(
    (toolCall) => toolCall.status === "pending" || toolCall.status === "running",
  );
}

function hasActiveSnapshotRuntime(snapshot: KCodeSessionStateSnapshot): boolean {
  return hasBlockingActiveSnapshotRuntime(snapshot);
}

function isToolCallContinuationFinish(finish: string | undefined): boolean {
  const normalized = finish?.trim().toLowerCase().replace(/_/g, "-");
  return normalized === "tool-calls";
}

function hasCompletedVisibleAssistantTurn(snapshot: KCodeSessionStateSnapshot): boolean {
  const visibleMessages = getKCodeUserVisibleMessages(snapshot.messages, {
    target: snapshot.projection.target,
  });
  const latestVisibleMessage = visibleMessages.at(-1);
  if (latestVisibleMessage?.info.role !== "assistant") {
    return false;
  }
  if (isToolCallContinuationFinish(latestVisibleMessage.info.finish)) {
    return false;
  }
  return typeof latestVisibleMessage.info.time.completed === "number";
}

export function deriveKCodeTaskStatusFromSessionSnapshot(
  snapshot: KCodeSessionStateSnapshot,
): KCodeTaskStatus {
  if (snapshot.projection.lastError) {
    return "error";
  }

  const status = statusFromKCodeSession(snapshot.session.status);
  if (status === "error" || status === "completed") {
    return status;
  }
  if (hasCompletedVisibleAssistantTurn(snapshot) && !hasBlockingActiveSnapshotRuntime(snapshot)) {
    // desktop continuous 的 session/read 依赖 runtime projection。
    // 旧投影有可能只 replay 到 model_streaming finish，漏掉 turn_complete，导致 currentTurnId
    // 短暂或长期残留。此时持久化 assistant 已有 completed 时间，比 stale currentTurnId 更权威。
    return "completed";
  }
  if (hasActiveSnapshotRuntime(snapshot)) {
    return status ?? "running";
  }
  return status;
}
