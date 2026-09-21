import type { OffPeakPort } from "@kcode/contracts";
import type {
  KCodeProtocolAgentServerContext,
  KCodeProtocolSessionRecord,
} from "./server-types.js";

const OFF_PEAK_CREATE_FROM_OFF_PEAK_RUN_ERROR =
  "Cannot create an idle-time task while running an idle-time task.";

/**
 * Off-Peak 协议端口。与 automation-port 的取舍：
 * - 只防「闲时轮递归创建」（activeOffPeakTaskId）；不查 activeAutomationId——cron 自动轮
 *   放行 OffPeakCreate（定时派生闲时任务）。
 * - 会话内创建绑定当前会话（对齐 CronCreate targetTaskId），派发时 resume 本会话执行。
 *   绑定守卫只拒「本会话已有未终态闲时任务」（两个无人值守 prompt 抢同一会话）；任务终结后可再建，
 *   与 cron 的一会话一任务永久拒绝不同。官方 ticket list/create 已下线，
 *   查询与创建均 fail-closed，不再向官方 POST /ticket 发请求。
 * - 不注入 runtimeModel/mode/thoughtLevel：缺省在 host 端解析
 *   （yolo / allowed_models 末位 / 最高推理档），会话运行态与闲时白名单无关。
 * - 不冻结会话标题：绑定的是用户的工作会话，标题不该被任务改写。
 */
export function createProtocolOffPeakPort(
  context: KCodeProtocolAgentServerContext,
  resolveOwnSession?: () => KCodeProtocolSessionRecord | undefined,
): OffPeakPort {
  return {
    async create(_input, createContext) {
      const activeSession =
        resolveOwnSession?.() ??
        (createContext?.sessionId ? context.sessions.get(createContext.sessionId) : undefined);
      if (activeSession?.activeOffPeakTaskId?.trim()) {
        // 本 turn 已由闲时任务派发；闲时轮内再创建闲时任务 = 递归自我派生，直接拒绝。
        // 该判断是 turn denylist 与 handler offPeakTurn 之外的第三层纵深。
        throw new Error(OFF_PEAK_CREATE_FROM_OFF_PEAK_RUN_ERROR);
      }
      // 官方闲时取号 API 已下线。创建必须 fail-closed，不能向官方 ticket 接口发请求。
      return {
        ok: false,
        failureStage: "ticket_request",
        errorCategory: "unknown",
        errorCode: "official_ticket_unsupported",
      };
    },
    async list() {
      // 官方 ticket list 已下线。不向 host/官方接口发请求，返回空列表。
      return [];
    },
  };
}
