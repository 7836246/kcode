import {
  databaseStartupErrorCodeSchema,
  databaseStartupErrorDetailsSchema,
  databaseMigrationFactsSchema,
} from "../database-startup.js";
/* oxlint-disable eslint(max-lines) -- KCode Protocol schema 需要单文件导出，方便 app 与 agent 共享同一份协议契约。 */
// ── 旧协议删除边界──────────────────────
// 剩余 ~257 个导出：旧 KCode Protocol 方法契约、请求/响应/事件 schema、
// session/workspace state snapshot 投影等（承重类型已迁 kcode-protocol-legacy-types.ts）。
// 已连根删除的死词（词表+schema+两侧实现）：session/steer、session/rewind、
// session/rewindCascade、session/previewFileRewind、session/applyFileRewind、
// prompt/enhance 全簇（含 promptEnhanceResult 通知）、plugins/marketplace/list；
// session/fork 客户端链已删（op+schema 留存 = v4 forkSessionAtMessage 钩子消费）。
// 消费者：services 旧栈（kcodeProtocolClient/kcodeAgent/kcodeAgentService/kcodeSession*）、
// CLI bootstrap 旧协议 server（kcode-protocol/server-operations、plugins、session-mapper 等）、
// UI 旧投影（kcodeSessionProjection 等读路径）。
// 上述旧协议 client/server 组删除时，本文件整体删除。
// 注：外部零消费 schema 多为存活 schema 联合的内部依赖，随宿主文件一起处理，勿单删。
import { bashOutputDisplaySchema } from "../bash-output-display.js";
// 后台详情共享精简的只读响应 schema，不携带命令或计时元数据。
export * from "../background-bash-output.js";
import { executionOutputPreviewSchema } from "../execution-output-preview.js";
import { z } from "zod";
export * from "../process-diagnostic.js";
import { errorAttributionSchema } from "../kcode-protocol-v4/snapshot.js";
import { modelSelectionSchema } from "../model-selection.js";
import { completeModelPropertiesDataSchema } from "../model-config.js";
import { accountProviderUnavailableReasonSchema } from "../account-provider-state.js";
import { modelExecutionSchema } from "../model-execution.js";
import { APP_USAGE_RANGES, appUsageSnapshotSchema } from "../usage-stats.js";
import { kcodeAutomationBotDeliveryTargetSchema } from "../bots.js";
// browser-use 命令/结果契约单一来源：agent 构造、协议校验和 main executor 共用同一 schema。
import { browserClientModeSchema, browserCommandSchema } from "../browser-use/commands.js";
import {
  browserBackendListResultSchema,
  browserSessionContextKindSchema,
} from "../browser-use/backend.js";
import { browserCommandResultSchema } from "../browser-use/result.js";
import { integratedTerminalShellSelectionSchema } from "../validationAppSettings.js";
import { kcodeTaskModeSchema } from "../kcode-task-mode-schema.js";
import { OFFICIAL_MCP_AUTH_PORT_FAILURE_REASONS } from "../official-mcp-auth.js";
import {
  kcodeDeliveryKindSchema,
  kcodeMessageVisibilitySchema,
  kcodeSyntheticUserMessageSourceSchema as legacyZcodeSyntheticUserMessageSourceSchema,
  kcodeWorkspaceRefSchema,
  kcodePermissionDecisionSchema,
  kcodePermissionResponseSchema,
  kcodePermissionUpdateSchema,
  kcodeSessionModeSchema,
  kcodeSessionStatusSchema,
  kcodeSessionKindSchema,
  kcodeSessionGoalSchema,
  kcodeSessionGoalVerificationSchema,
  kcodeSessionGoalVerificationTimelineSchema,
  kcodeInteractionRequestOriginSchema,
  kcodeToolStateSchema,
  kcodeSessionApiRetryStatusSchema,
  kcodeSessionContextUsageSchema,
  kcodeSessionInfoSchema,
  kcodeSessionRuntimeStateSchema,
  kcodeMessageWithPartsSchema,
  kcodeMessagePartSchema,
} from "../kcode-protocol-legacy-types.js";

export {
  hookExecutionProjectionSchema,
  hookInvocationRowSchema,
  type HookExecutionProjection,
  type HookInvocationRow,
} from "../kcode-protocol-v4/rows.js";

export const KCODE_PROTOCOL_NAME = "KCode Protocol" as const;
export const KCODE_PROTOCOL_VERSION = 1 as const;
// V4 wire 与 legacy 主协议并存；禁止为了 V4 physical framing 改写 legacy 版本。
export const KCODE_PROTOCOL_V4_WIRE_VERSION = 3 as const;
export const kcodeRuntimeCapabilitiesSchema = z.object({
  independentPlanState: z.boolean().optional(),
});
export const kcodeProtocolErrorCodes = {
  sessionUnavailable: -32004,
} as const;

const nonEmptyString = z.string().trim().min(1);
const jsonObjectSchema = z.record(z.string(), z.unknown());
const timestampMsSchema = z.number().int().nonnegative();
const protocolInstantSchema = z.union([timestampMsSchema, nonEmptyString, z.date()]);

// Tool result display 不受模型文本 budget 约束；Node REPL 图片必须在 Agent/App 协议边界
// 做严格限长，避免截图把 continuous 或 replayable 消息扩成无界载荷。
export const kcodeNodeReplImageToolResultDisplaySchema = z
  .object({
    kind: z.literal("node_repl_images"),
    images: z
      .array(
        z
          .object({
            base64: z
              .string()
              .min(1)
              .max(200 * 1024),
            mimeType: z.string().regex(/^image\/[a-z0-9.+-]+$/iu),
          })
          .strict(),
      )
      .min(1)
      .max(2),
    truncated: z.boolean().optional(),
    source: z.literal("browser_turn_end").optional(),
  })
  .strict();

// 同理：CreateWorkflow 的类型检查诊断也是 display 通道，必须在协议边界限长，
// 避免大量诊断把 continuous/replayable 消息扩成无界载荷。
// causalityGraph 在工具输出边界已限长，这里镜像同一组上界（与 v4 rows 保持一致）。
// 图的词汇表刻意很小：step 卡片 + actor 车道 + 一种箭头（runs after，`back` 只标回边）+
// 返回物标记。分析器的 kind / certainty / exact / region 不进载荷。
// 名字只在运行时成形（`` agent(`研究员${i + 1}`) ``）时静态能拿到的形状：第一个洞之前的
// 字面量（head）与最后一个洞之后的字面量（tail）。至少一个在场，两者都已 trim 且含实义字符。
// Bug 修复：这两个字段随 0a8b059f40 落进 contracts 与 v4 镜像，v3 这份漏改——.strict()
// 之下带插值名的工作流会让整个 display 验证失败、图整块消失，所以这里必须与 v4 逐字段对齐。
const kcodeWorkflowNamePatternSchema = z
  .object({
    head: z.string().min(1).max(128).optional(),
    tail: z.string().min(1).max(128).optional(),
  })
  .strict();

// 一条边 = runs after；step 边与阶段边同形，`back` 只标循环回边。
const kcodeWorkflowEdgeSchema = z
  .object({
    from: z.string().min(1).max(64),
    to: z.string().min(1).max(64),
    back: z.literal(true).optional(),
  })
  .strict();

const kcodeCreateWorkflowCausalityGraphDisplaySchema = z
  .object({
    steps: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            kind: z.enum(["ask", "world-read"]),
            label: z.string().min(1).max(128),
            // 内联 `agent()` receiver 让 label 落到兜底串时，那个名字的静态形状。
            labelPattern: kcodeWorkflowNamePatternSchema.optional(),
            line: z.number().int().positive().optional(),
            column: z.number().int().positive().optional(),
            lane: z.string().min(1).max(64),
            lanes: z.array(z.string().min(1).max(64)).max(32).optional(),
            // 展开自的站点 id，只出现在 may-set 车道展开的拷贝上（实时叠加的关联键）；
            // 加字段是 additive 的，不带它的旧载荷照常通过 .strict()。
            source: z.string().min(1).max(64).optional(),
            // 作者用 `phase("…")` 标记划入的阶段。
            // 与图的 phases / phaseEdges / exits 同进同退：全在场或全缺席。
            phase: z.string().min(1).max(64).optional(),
            repeat: z.enum(["stack", "serial"]).optional(),
          })
          .strict(),
      )
      .max(64),
    lanes: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            name: z.string().min(1).max(128).optional(),
            // `name` 缺席而 agent() 首参是带洞的模板串时的静态形状；与 name 互斥。
            namePattern: kcodeWorkflowNamePatternSchema.optional(),
            line: z.number().int().positive().optional(),
            column: z.number().int().positive().optional(),
          })
          .strict(),
      )
      .max(32),
    // 参与者与交接；镜像 v4。
    participants: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            phase: z.string().min(1).max(64),
            lane: z.string().min(1).max(64),
            steps: z.array(z.string().min(1).max(64)).min(1).max(64),
            member: z
              .object({ index: z.number().int().nonnegative(), of: z.number().int().positive() })
              .strict()
              .optional(),
            many: z.literal(true).optional(),
          })
          .strict(),
      )
      .max(64),
    handoffs: z
      .array(
        kcodeWorkflowEdgeSchema
          .extend({ types: z.array(z.string().min(1).max(128)).min(1).max(8).optional() })
          .strict(),
      )
      .max(256),
    // 阶段词汇表：作者施加的分组结构，主画面以它为节点。与 phaseEdges / exits / Step.phase
    // 全有或全无——零标记脚本全缺席，UI 据此退回 step/车道视图。零成员阶段也在表里。
    // `unphased` 无 name，显示名由 UI 本地化。
    phases: z
      .array(
        z
          .object({
            id: z.string().min(1).max(64),
            name: z.string().min(1).max(128).optional(),
            line: z.number().int().positive().optional(),
            column: z.number().int().positive().optional(),
            // 进入本阶段时还在跑的其他阶段（它们的 strand 尚未 join），阶段表序，不含自己，
            // 为空时缺席。是节点事实而不是边——控制没有从那里转移过来，所以不进 phaseEdges。
            // 时间轴据此把相邻阶段折成一条分叉的「带」，侧栏迷你轨道画成双线段。
            alongside: z.array(z.string().min(1).max(64)).min(1).max(32).optional(),
          })
          .strict(),
      )
      .max(32)
      .optional(),
    phaseEdges: z.array(kcodeWorkflowEdgeSchema).max(128).optional(),
    // 控制流可在其后正常完成的阶段（阶段视图的「阶段 → 返回物」箭头）；组内可为空数组。
    exits: z.array(z.string().min(1).max(64)).max(32).optional(),
    sink: z.array(z.string().min(1).max(64)).max(64).optional(),
    truncated: z.boolean().optional(),
  })
  .strict();

export const kcodeCreateWorkflowToolResultDisplaySchema = z
  .object({
    kind: z.literal("create_workflow"),
    ok: z.boolean(),
    errorCount: z.number().int().nonnegative(),
    diagnostics: z
      .array(
        z
          .object({
            line: z.number().int().nonnegative(),
            column: z.number().int().nonnegative(),
            code: z.number().int().nonnegative(),
            message: z.string().min(1).max(2_048),
          })
          .strict(),
      )
      .max(100),
    causalityGraph: kcodeCreateWorkflowCausalityGraphDisplaySchema.optional(),
    truncated: z.boolean().optional(),
  })
  .strict();

const kcodeToolResultObjectSchema = jsonObjectSchema.superRefine((result, context) => {
  const display = result.display;
  if (typeof display !== "object" || display === null || Array.isArray(display)) {
    return;
  }
  const kind = (display as Record<string, unknown>).kind;
  const schemaByKind: Record<string, z.ZodTypeAny> = {
    node_repl_images: kcodeNodeReplImageToolResultDisplaySchema,
    create_workflow: kcodeCreateWorkflowToolResultDisplaySchema,
    bash_output: bashOutputDisplaySchema,
  };
  const schema = typeof kind === "string" ? schemaByKind[kind] : undefined;
  if (!schema) return;
  const parsed = schema.safeParse(display);
  if (parsed.success) return;
  for (const issue of parsed.error.issues) {
    context.addIssue({ ...issue, path: ["display", ...issue.path] });
  }
});

export const kcodeProtocolRequestIdSchema = z.union([z.string(), z.number().int()]);
export type KCodeProtocolRequestId = z.infer<typeof kcodeProtocolRequestIdSchema>;

export const kcodeProtocolTraceSchema = z
  .object({
    traceparent: nonEmptyString.optional(),
    traceId: nonEmptyString.optional(),
    parentId: nonEmptyString.optional(),
    spanId: nonEmptyString.optional(),
  })
  .strict();
export type KCodeProtocolTrace = z.infer<typeof kcodeProtocolTraceSchema>;

export const kcodeProtocolRequestSchema = z
  .object({
    id: kcodeProtocolRequestIdSchema,
    method: nonEmptyString,
    params: z.unknown().optional(),
    trace: kcodeProtocolTraceSchema.optional(),
  })
  .strict();
export type KCodeProtocolRequest = z.infer<typeof kcodeProtocolRequestSchema>;

export const kcodeProtocolNotificationSchema = z
  .object({
    method: nonEmptyString,
    params: z.unknown().optional(),
    trace: kcodeProtocolTraceSchema.optional(),
  })
  .strict();
export type KCodeProtocolNotification = z.infer<typeof kcodeProtocolNotificationSchema>;

export const kcodeProtocolResponseSchema = z
  .object({
    id: kcodeProtocolRequestIdSchema,
    result: z.unknown(),
  })
  .strict();
export type KCodeProtocolResponse = z.infer<typeof kcodeProtocolResponseSchema>;

export const kcodeProtocolErrorSchema = z
  .object({
    id: kcodeProtocolRequestIdSchema,
    error: z
      .object({
        code: z.number().int(),
        message: nonEmptyString,
        data: z.unknown().optional(),
      })
      .strict(),
  })
  .strict();
export type KCodeProtocolError = z.infer<typeof kcodeProtocolErrorSchema>;

export const kcodeProtocolMessageSchema = z.union([
  kcodeProtocolRequestSchema,
  kcodeProtocolNotificationSchema,
  kcodeProtocolResponseSchema,
  kcodeProtocolErrorSchema,
]);
export type KCodeProtocolMessage = z.infer<typeof kcodeProtocolMessageSchema>;

export const kcodeProtocolNotifications = {
  storageStartup: "startup/storageState",
  providerRuntimeHeadersCancelled: "interaction/providerRuntimeHeadersCancelled",
  mcpTelemetry: "process/mcpTelemetry",
  mcpResourceSamples: "process/mcpResourceSamples",
  toolExecResource: "process/toolExecResource",
  pluginOperationProgress: "plugins/operationProgress",
  processResourceSample: "process/resourceSample",
} as const;

/** 启动控制面独立于 task stream；数据库身份不可携带路径/凭据。 */
export const kcodeStorageStartupStateSchema = z
  .object({
    schemaVersion: z.literal(1),
    attemptId: z.string().min(1).max(128),
    sequence: z.number().int().positive(),
    databaseId: z.string().min(1).max(128),
    databaseKind: z.enum(["session", "tasks-index"]),
    phase: z.enum(["checking", "waiting_for_lock", "migrating", "committing", "ready", "failed"]),
    // 包含锁内、版本 SQL 之前的可选 lastAppliedMigrationId；旧通知仍可解析。
    migration: databaseMigrationFactsSchema.optional(),
    elapsedMs: z.number().nonnegative().finite(),
    completed: z.number().int().nonnegative().optional(),
    total: z.number().int().nonnegative().optional(),
    errorCode: databaseStartupErrorCodeSchema.optional(),
    ...databaseStartupErrorDetailsSchema.shape,
  })
  .strict()
  .superRefine((state, context) => {
    if (state.phase === "failed" && !state.errorCode)
      context.addIssue({ code: "custom", message: "failed requires errorCode" });
  });
export type KCodeStorageStartupState = z.infer<typeof kcodeStorageStartupStateSchema>;

const kcodeMcpTelemetryPlatformSchema = z.enum([
  "aix",
  "android",
  "darwin",
  "freebsd",
  "haiku",
  "linux",
  "netbsd",
  "openbsd",
  "sunos",
  "win32",
  "cygwin",
]);
const kcodeMcpTelemetryArchSchema = z.enum([
  "arm",
  "arm64",
  "ia32",
  "loong64",
  "mips",
  "mipsel",
  "ppc",
  "ppc64",
  "riscv64",
  "s390",
  "s390x",
  "x64",
]);
const kcodeMcpTelemetryBaseSchema = z
  .object({
    arch: kcodeMcpTelemetryArchSchema,
    occurredAt: z.number().int().nonnegative(),
    platform: kcodeMcpTelemetryPlatformSchema,
  })
  .strict();
const kcodeMcpProcessTelemetryBaseShape = {
  mcpId: z
    .string()
    .regex(
      /^(?:builtin:(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+(?::(?:[A-Za-z0-9._~-]|%[0-9A-F]{2})+)*|(?:plugin|custom):[a-f0-9]{12})$/,
    ),
  mcpInstanceId: nonEmptyString,
  mcpIsolation: z.enum(["session", "workspace"]),
  mcpSource: z.enum(["builtin", "plugin", "custom"]),
} as const;

export const kcodeMcpTelemetryEventSchema = z.discriminatedUnion("kind", [
  kcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("process_start"),
      ...kcodeMcpProcessTelemetryBaseShape,
    })
    .strict(),
  kcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("process_crash"),
      ...kcodeMcpProcessTelemetryBaseShape,
      affectedSessionCount: z.number().int().nonnegative().max(10_000),
      exitCode: z.number().int().nullable(),
      signal: nonEmptyString.nullable(),
      uptimeMs: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })
    .strict(),
  kcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("session_startup"),
      configuredCount: z.number().int().nonnegative().max(10_000),
      connectedCount: z.number().int().nonnegative().max(10_000),
      failedCount: z.number().int().nonnegative().max(10_000),
      processCount: z.number().int().nonnegative().max(10_000),
      sessionId: nonEmptyString,
    })
    .strict(),
  kcodeMcpTelemetryBaseSchema
    .extend({
      kind: z.literal("memory"),
      ...kcodeMcpProcessTelemetryBaseShape,
      memoryKb: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
      memoryScope: z.enum(["process_tree", "direct_process"]),
      orphanSuspected: z.boolean(),
      ownerSessionCount: z.number().int().nonnegative().max(10_000),
      unownedSeconds: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    })
    .strict(),
]);
export type KCodeMcpTelemetryEvent = z.infer<typeof kcodeMcpTelemetryEventSchema>;

/** MCP 每五分钟只探测一次，周期由生产者与设备总量过期判据共用。 */
export const KCODE_MCP_RESOURCE_SAMPLE_INTERVAL_MS = 5 * 60_000;

export const kcodeMcpResourceSampleSchema = z
  .object({
    mcpId: kcodeMcpProcessTelemetryBaseShape.mcpId,
    instanceToken: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/),
    sampledAt: z.number().int().nonnegative(),
    intervalMs: z.number().finite().positive(),
    processCount: z.number().int().positive().max(100_000),
    rssKbTotal: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    rssKbMaxProcess: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    cpuTimeMsDelta: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    uptimeMinutes: z.number().int().nonnegative(),
    platform: kcodeMcpTelemetryPlatformSchema,
    arch: kcodeMcpTelemetryArchSchema,
    logicalCpuCount: z.number().int().positive().max(4_096),
    totalMemoryGb: z.number().int().nonnegative().max(1_048_576),
  })
  .strict();
export type KCodeMcpResourceSample = z.infer<typeof kcodeMcpResourceSampleSchema>;
// 通知输入有界；main 另按每个上报窗口的 32 个 MCP 分组执行事件额度。
export const kcodeMcpResourceSamplesSchema = z.array(kcodeMcpResourceSampleSchema).max(1_024);

export const BASH_RESOURCE_SAMPLE_INTERVAL_MS = 15_000;
export const BASH_RESOURCE_MAX_SAMPLES = 20;

/** Bash 子进程的有界完成事实；禁止命令、路径与会话标识进入遥测旁路。 */
export const kcodeToolExecResourceSchema = z
  .object({
    // 同一完成事实可能经多个 Host 转发；随机标识仅供 main 去重，旧 CLI 缺字段仍兼容。
    completionToken: z.string().uuid().optional(),
    platform: kcodeMcpTelemetryPlatformSchema,
    toolName: z.literal("bash"),
    durationMs: z.number().finite().min(BASH_RESOURCE_SAMPLE_INTERVAL_MS),
    exitKind: z.enum(["completed", "timeout", "killed", "error"]),
    treeRssKbPeak: z.number().finite().nonnegative().optional(),
    treeCpuTimeMs: z.number().finite().nonnegative().optional(),
    sampleCount: z.number().int().nonnegative().max(BASH_RESOURCE_MAX_SAMPLES),
    cliRssKb: z.number().finite().nonnegative(),
    systemFreeMemoryKb: z.number().finite().nonnegative(),
  })
  .strict();
export type KCodeToolExecResource = z.infer<typeof kcodeToolExecResourceSchema>;

export const kcodeProcessResourceSampleSchema = z
  .object({
    platform: z.enum([
      "aix",
      "android",
      "darwin",
      "freebsd",
      "haiku",
      "linux",
      "netbsd",
      "openbsd",
      "sunos",
      "win32",
      "cygwin",
    ]),
    arch: z.enum([
      "arm",
      "arm64",
      "ia32",
      "loong64",
      "mips",
      "mipsel",
      "ppc",
      "ppc64",
      "riscv64",
      "s390",
      "s390x",
      "x64",
    ]),
    logicalCpuCount: z.number().int().positive().max(4_096),
    intervalMs: z
      .number()
      .int()
      .positive()
      .max(7 * 24 * 60 * 60 * 1_000),
    cpuCores: z.number().finite().nonnegative().max(4_096),
    cpuPercent: z.number().finite().nonnegative().max(100_000),
    rssKb: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER),
    /**
     * 以下四项为遥测新增字段，全部可选：旧 CLI 发来的样本仍能通过校验，因此
     * **不递增协议握手版本号**（握手版本是兼容性开关，不是字段版本）。
     */
    heapUsedKb: z.number().finite().nonnegative().max(Number.MAX_SAFE_INTEGER).optional(),
    uptimeMinutes: z
      .number()
      .int()
      .nonnegative()
      .max(10 * 365 * 24 * 60)
      .optional(),
    totalMemoryGb: z.number().int().nonnegative().max(1_048_576).optional(),
    /**
     * CLI 进程启动时随机生成的实例标识，仅供 app 侧 main 统计「同时存活几个 CLI 进程」
     * 与「最大单进程 RSS」。不进 ARMS 属性、不含 pid。收紧字符集是隐私红线的机械保障：
     * 路径、workspace 标识这类内容不可能通过校验。
     */
    instanceToken: z
      .string()
      .regex(/^[A-Za-z0-9_-]{8,64}$/)
      .optional(),
  })
  .strict();
export type KCodeProcessResourceSample = z.infer<typeof kcodeProcessResourceSampleSchema>;

export const kcodeProcessChildProcessesParamsSchema = z.object({}).strict();
export const kcodeProcessChildProcessSchema = z
  .object({
    pid: z.number().int().positive(),
    serverName: nonEmptyString,
    mcpSource: z.enum(["builtin", "plugin", "custom"]),
    /** 官方/第三方插件的插件名（`plugin:<name>:<key>` 的 name，或官方 host MCP 对应插件）；custom 无 */
    pluginName: nonEmptyString.optional(),
  })
  .strict();
export const kcodeProcessChildProcessesResultSchema = z
  .object({
    processes: z.array(kcodeProcessChildProcessSchema).max(10_000),
  })
  .strict();
export type KCodeProcessChildProcess = z.infer<typeof kcodeProcessChildProcessSchema>;
export type KCodeProcessChildProcessesResult = z.infer<
  typeof kcodeProcessChildProcessesResultSchema
>;

export type KCodeDeliveryKind = z.infer<typeof kcodeDeliveryKindSchema>;
// TurnStarted 与持久 message 必须共用同一来源词表；否则 live event 能通过而 cold
// message 在 app/agent 边界被拒绝，造成 continuous/replayable 语义分叉。
const kcodeTurnInputSourceSchema = legacyZcodeSyntheticUserMessageSourceSchema;
export const kcodeSessionPersistenceSchema = z.enum(["immediate", "deferred"]);
export type KCodeSessionPersistence = z.infer<typeof kcodeSessionPersistenceSchema>;
export type KCodeWorkspaceRef = z.infer<typeof kcodeWorkspaceRefSchema>;
export const kcodePermissionOptionSchema = z
  .object({
    optionId: nonEmptyString,
    kind: nonEmptyString,
    name: nonEmptyString,
    description: z.string().optional(),
    response: kcodePermissionResponseSchema,
  })
  .strict();

const kcodeProtocolMcpEntrySchema = z
  .object({
    name: nonEmptyString,
    value: z.string(),
  })
  .strict();

const kcodeProtocolMcpOAuthSchema = z.union([
  z
    .object({
      type: z.literal("client_credentials"),
      clientId: nonEmptyString,
      clientSecret: nonEmptyString,
      clientName: nonEmptyString.optional(),
      scope: z.string().optional(),
    })
    .strict(),
  z
    .object({
      type: z.literal("authorization_code"),
      clientId: nonEmptyString.optional(),
      clientSecret: nonEmptyString.optional(),
      clientName: nonEmptyString.optional(),
      redirectPath: nonEmptyString.optional(),
      scope: z.string().optional(),
    })
    .strict(),
]);

export const kcodeProtocolMcpServerSchema = z.union([
  z
    .object({
      name: nonEmptyString,
      command: nonEmptyString,
      args: z.array(z.string()),
      env: z.array(kcodeProtocolMcpEntrySchema),
      isolation: z.enum(["session", "workspace"]).optional(),
      protocolVersion: z.enum(["legacy", "auto", "2026-07-28"]).optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .strict(),
  z
    .object({
      name: nonEmptyString,
      type: z.enum(["http", "sse"]),
      url: nonEmptyString,
      headers: z.array(kcodeProtocolMcpEntrySchema),
      oauth: kcodeProtocolMcpOAuthSchema.optional(),
      isolation: z.enum(["session", "workspace"]).optional(),
      protocolVersion: z.enum(["legacy", "auto", "2026-07-28"]).optional(),
      timeoutMs: z.number().int().positive().optional(),
    })
    .strict(),
]);
export type KCodeProtocolMcpServer = z.infer<typeof kcodeProtocolMcpServerSchema>;

export const kcodeMcpServerStatusKindSchema = z.enum([
  "connecting",
  "connected",
  "disabled",
  "disconnected",
  "failed",
  "untrusted",
]);
export const MCP_SERVER_FAILURE_KINDS = [
  "config_invalid",
  "runtime_unavailable",
  "process_start_failed",
  "network_unreachable",
  "connection_timeout",
  "protocol_negotiation_failed",
  "tool_list_failed",
  "unexpected_disconnect",
  "oauth_authorization_failed",
  "official_origin_untrusted",
  "not_authenticated",
  "coding_plan_required",
  "server_not_found",
  "server_unavailable",
  "rate_limited",
  "server_internal_error",
  "protocol_error",
  "status_unavailable",
  "connection_failed",
] as const;
export const mcpServerFailureKindSchema = z.enum(MCP_SERVER_FAILURE_KINDS);
export type McpServerFailureKind = z.infer<typeof mcpServerFailureKindSchema>;
export const kcodeMcpServerStatusSnapshotSchema = z
  .object({
    status: kcodeMcpServerStatusKindSchema,
    transport: z.enum(["stdio", "http", "sse"]),
    toolCount: z.number().int().nonnegative(),
    updatedAt: nonEmptyString,
    error: z.string().optional(),
    failureKind: mcpServerFailureKindSchema.optional(),
    serverRequestId: nonEmptyString.optional(),
    protocolEra: z.enum(["legacy", "modern"]).optional(),
    authorization: z
      .object({
        type: z.literal("oauth_authorization_code"),
        authorizationUrl: nonEmptyString,
        startedAt: nonEmptyString,
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodeMcpServerStatusSnapshot = z.infer<typeof kcodeMcpServerStatusSnapshotSchema>;

export const kcodeMcpListModeSchema = z.enum(["connect", "status"]);
export type KCodeMcpListMode = z.infer<typeof kcodeMcpListModeSchema>;

export const kcodeMcpListParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    mcpServers: z.array(kcodeProtocolMcpServerSchema).optional(),
    mode: kcodeMcpListModeSchema.default("connect"),
  })
  .strict();
export const kcodeMcpListResultSchema = z
  .object({
    statuses: z.record(z.string(), kcodeMcpServerStatusSnapshotSchema),
  })
  .strict();
export type KCodeMcpListResult = z.infer<typeof kcodeMcpListResultSchema>;

export const kcodeSessionImportMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    timestamp: timestampMsSchema.optional(),
  })
  .strict();
export type KCodeSessionImportMessage = z.infer<typeof kcodeSessionImportMessageSchema>;

export const kcodeSessionImportHistorySchema = z.discriminatedUnion("source", [
  z
    .object({
      source: z.literal("claudeCode"),
      title: z.string().optional(),
      createdAt: timestampMsSchema.optional(),
      updatedAt: timestampMsSchema.optional(),
      messages: z.array(kcodeSessionImportMessageSchema).min(1),
    })
    .strict(),
  z
    .object({
      source: z.literal("sharedContext"),
      title: z.string().trim().min(1),
      createdAt: timestampMsSchema.optional(),
      markdown: z.string().min(1),
      provenance: z
        .object({
          shareId: z.string().trim().min(1),
          contextId: z.string().trim().min(1).optional(),
          shareUrl: z.string().url().optional(),
          status: z.enum(["pending", "reserved", "attached", "discarded"]).optional(),
          projectionSha256: z.string().regex(/^[0-9a-f]{64}$/u),
          artifactSetSha256: z.string().regex(/^[0-9a-f]{64}$/u),
          formatterVersion: z.literal(1),
          markdownSha256: z.string().regex(/^[0-9a-f]{64}$/u),
          installedArtifacts: z.array(
            z
              .object({
                artifactId: z.string().trim().min(1),
                workspaceRelativePath: z.string().trim().min(1),
              })
              .strict(),
          ),
        })
        .strict(),
    })
    .strict(),
]);
export type KCodeSessionImportHistory = z.infer<typeof kcodeSessionImportHistorySchema>;

export const kcodeThoughtLevelOptionSchema = z
  .object({
    value: nonEmptyString,
    label: nonEmptyString,
    description: z.string().optional(),
  })
  .strict();
export const kcodeModelReasoningOptionsSchema = z
  .object({
    levels: z.array(kcodeThoughtLevelOptionSchema),
    defaultLevel: nonEmptyString.optional(),
  })
  .strict();
export type KCodeModelReasoningOptions = z.infer<typeof kcodeModelReasoningOptionsSchema>;

export const kcodeModelFormatPropertiesSchema = completeModelPropertiesDataSchema.pick({
  inputFormat: true,
  outputFormat: true,
});
export type KCodeModelFormatProperties = z.infer<typeof kcodeModelFormatPropertiesSchema>;

export const kcodeModelOptionSchema = z
  .object({
    ref: modelSelectionSchema,
    label: nonEmptyString,
    providerLabel: nonEmptyString.optional(),
    description: z.string().optional(),
    contextWindow: z.number().int().positive().optional(),
    maxOutputTokens: z.number().int().positive().optional(),
    reasoning: kcodeModelReasoningOptionsSchema.optional(),
    properties: kcodeModelFormatPropertiesSchema,
    disabledReason: z.string().optional(),
  })
  .strict();
export type KCodeModelOption = z.infer<typeof kcodeModelOptionSchema>;

export const kcodeAccountAccessSchema = z.discriminatedUnion("planKind", [
  z
    .object({
      type: z.literal("zhipu-account"),
      family: z.enum(["zai", "bigmodel"]),
      planKind: z.literal("start-plan"),
    })
    .strict(),
  z
    .object({
      type: z.literal("zhipu-account"),
      family: z.enum(["zai", "bigmodel"]),
      planKind: z.literal("individual-coding-plan"),
    })
    .strict(),
  z
    .object({
      type: z.literal("zhipu-account"),
      family: z.enum(["zai", "bigmodel"]),
      planKind: z.literal("team-coding-plan"),
      productId: nonEmptyString,
      organizationId: nonEmptyString,
      projectId: nonEmptyString,
    })
    .strict(),
]);
export type KCodeAccountAccess = z.infer<typeof kcodeAccountAccessSchema>;

/** Active Model 固定的账号访问类别；当前商品和 Team scope 由账号服务在请求期解析。 */
export const kcodeProviderAccountAccessSchema = z
  .object({
    type: z.literal("zhipu-account"),
    accountType: z.enum(["zai", "bigmodel"]),
    mode: z.enum(["start-plan", "individual-coding-plan", "team-coding-plan", "off-peak"]),
    entitled: z.boolean(),
  })
  .strict();
export type KCodeProviderAccountAccess = z.infer<typeof kcodeProviderAccountAccessSchema>;

export type KCodeSessionMode = z.infer<typeof kcodeSessionModeSchema>;
export type KCodeSessionKind = z.infer<typeof kcodeSessionKindSchema>;
export type KCodeSessionGoal = z.infer<typeof kcodeSessionGoalSchema>;

export const kcodeSessionTodoItemSchema = z
  .object({
    content: nonEmptyString,
    status: z.enum(["pending", "in_progress", "completed"]),
    priority: z.enum(["high", "medium", "low"]),
  })
  .strict();
export const kcodeSessionGoalStatsSchema = z
  .object({
    timeUsedSeconds: z.number().int().nonnegative(),
    tokensUsed: z.number().int().nonnegative(),
    tokenBudget: z.number().int().positive().nullable(),
    contextUsed: z.number().int().nonnegative(),
    contextWindow: z.number().int().nonnegative(),
    toolCallCount: z.number().int().nonnegative(),
    iterationCount: z.number().int().nonnegative(),
  })
  .strict();
export type KCodeSessionGoalStats = z.infer<typeof kcodeSessionGoalStatsSchema>;
export type KCodeSessionGoalVerification = z.infer<typeof kcodeSessionGoalVerificationSchema>;
export type KCodeSessionGoalVerificationTimeline = z.infer<
  typeof kcodeSessionGoalVerificationTimelineSchema
>;

export const kcodeSessionTodoGroupSchema = z
  .object({
    id: nonEmptyString,
    source: z.enum(["goal_iteration", "session"]),
    goalIteration: z.number().int().positive().optional(),
    targetId: nonEmptyString.optional(),
    startedAt: timestampMsSchema.optional(),
    updatedAt: timestampMsSchema.optional(),
    todos: z.array(kcodeSessionTodoItemSchema),
  })
  .strict();
export type KCodeSessionTodoGroup = z.infer<typeof kcodeSessionTodoGroupSchema>;

export const kcodeSessionSettingsStateSchema = z
  .object({
    model: z
      .object({
        // 未绑定是合法恢复状态；不能为满足协议而伪造模型或阻断历史读取。
        current: modelSelectionSchema.optional(),
        available: z.array(kcodeModelOptionSchema),
        lastUsed: modelSelectionSchema.optional(),
      })
      .strict(),
    thoughtLevel: z
      .object({
        enabled: z.boolean(),
        current: nonEmptyString.optional(),
        defaultLevel: nonEmptyString.optional(),
        available: z.array(kcodeThoughtLevelOptionSchema),
      })
      .strict(),
    mode: z
      .object({
        current: kcodeSessionModeSchema,
      })
      .strict(),
    permission: z
      .object({
        mode: kcodeSessionModeSchema.optional(),
        rulesRevision: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodeSessionSettingsState = z.infer<typeof kcodeSessionSettingsStateSchema>;
export const kcodePendingPermissionSchema = z
  .object({
    requestId: nonEmptyString,
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    reason: z.string(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    input: z.unknown().optional(),
    origin: kcodeInteractionRequestOriginSchema.optional(),
    options: z.array(kcodePermissionOptionSchema).min(1),
    requestedAt: timestampMsSchema,
  })
  .strict();
export type KCodePendingPermission = z.infer<typeof kcodePendingPermissionSchema>;

export const kcodeActiveToolCallSchema = z
  .object({
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    status: z.enum(["pending", "running", "completed", "failed", "denied"]),
    startedAt: timestampMsSchema.optional(),
  })
  .strict();
export type KCodeActiveToolCall = z.infer<typeof kcodeActiveToolCallSchema>;

export const kcodeSessionProjectionSchema = z
  .object({
    sessionId: nonEmptyString,
    status: kcodeSessionStatusSchema,
    mode: kcodeSessionModeSchema,
    turnCount: z.number().int().nonnegative(),
    totalTokenCount: z.number().int().nonnegative(),
    contextUsed: z.number().int().nonnegative(),
    contextWindow: z.number().int().nonnegative(),
    currentTurnId: nonEmptyString.optional(),
    pendingPermissions: z.array(kcodePendingPermissionSchema),
    activeToolCalls: z.array(kcodeActiveToolCallSchema),
    backgroundJobs: z.array(jsonObjectSchema),
    target: kcodeSessionGoalSchema.nullable().optional(),
    lastError: z
      .object({
        type: nonEmptyString,
        code: nonEmptyString.optional(),
        message: nonEmptyString,
        detail: z.string().optional(),
        attribution: errorAttributionSchema.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodeSessionProjection = z.infer<typeof kcodeSessionProjectionSchema>;
export type KCodeToolState = z.infer<typeof kcodeToolStateSchema>;
export const kcodeSlashCommandSchema = z
  .object({
    name: nonEmptyString,
    description: z.string(),
    inputHint: z.string().optional(),
    source: z.enum(["builtin", "custom"]).optional(),
  })
  .strict();
export type KCodeSessionApiRetryStatus = z.infer<typeof kcodeSessionApiRetryStatusSchema>;
export type KCodeSessionContextUsage = z.infer<typeof kcodeSessionContextUsageSchema>;
export const kcodeModelStreamingKindSchema = z.enum([
  "start",
  "finish",
  "error",
  "text_start",
  "text_delta",
  "text_end",
  "reasoning_start",
  "reasoning_delta",
  "reasoning_end",
  "tool_input_start",
  "tool_input_delta",
  "tool_input_end",
  "tool_call",
]);
export const kcodeModelStreamingEventPayloadSchema = z
  .object({
    assistantMessageId: z.string().optional(),
    delta: z.string().optional(),
    done: z.boolean().optional(),
    input: z.unknown().optional(),
    kind: kcodeModelStreamingKindSchema,
    partId: z.string().optional(),
    providerExecuted: z.boolean().optional(),
    toolCallId: z.string().optional(),
    toolName: z.string().optional(),
  })
  .strict();
export const kcodeSessionStateSnapshotSchema = z
  .object({
    protocol: z
      .object({
        name: z.literal(KCODE_PROTOCOL_NAME),
        version: z.literal(KCODE_PROTOCOL_VERSION),
      })
      .strict(),
    session: kcodeSessionInfoSchema,
    settings: kcodeSessionSettingsStateSchema,
    projection: kcodeSessionProjectionSchema,
    runtime: kcodeSessionRuntimeStateSchema,
    messages: z.array(kcodeMessageWithPartsSchema),
    goalStats: kcodeSessionGoalStatsSchema.optional(),
    todos: z.array(kcodeSessionTodoItemSchema).optional(),
    todoGroups: z.array(kcodeSessionTodoGroupSchema).optional(),
    slashCommands: z.array(kcodeSlashCommandSchema).optional(),
  })
  .strict();
export type KCodeSessionStateSnapshot = z.infer<typeof kcodeSessionStateSnapshotSchema>;

export const kcodeEventEnvelopeSchema = z
  .object({
    eventId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    seq: z.number().int().nonnegative(),
    traceId: nonEmptyString.optional(),
    timestamp: timestampMsSchema,
    deliveryKind: kcodeDeliveryKindSchema.optional(),
  })
  .strict();

const kcodeComputerUseOperationEventBaseSchema = z
  .object({
    eventId: nonEmptyString,
    sequenceNumber: z.number().int().nonnegative(),
    sessionId: nonEmptyString,
    timestamp: timestampMsSchema,
  })
  .strict();

const kcodeComputerUseTurnStartedEventSchema = kcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("turn-started"),
  turnId: nonEmptyString,
});
const kcodeComputerUseTurnCompletedEventSchema = kcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("turn-completed"),
  turnId: nonEmptyString,
});
const kcodeComputerUseTurnFailedEventSchema = kcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("turn-failed"),
  turnId: nonEmptyString,
});
const kcodeComputerUseToolScheduledEventSchema = kcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("tool-scheduled"),
  turnId: nonEmptyString,
  toolCallId: nonEmptyString,
  toolName: nonEmptyString,
  // 这个 cell 是否在用 Computer Use。只表达布尔事实，不再携带动作名——旧的
  // operationAction 靠从模型源码里抽取动作名得到，SDK 面一变就整体失配（见
  // bootstrap/src/kcode-protocol/computer-use-operation-event.ts 的 usesComputerUse）。
  // 只挂在 scheduled 上：ToolCallStartedPayload 没有 input，start 时已拿不到模型源码。
  computerUse: z.literal(true).optional(),
});
const kcodeComputerUseToolStartedEventSchema = kcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("tool-started"),
  turnId: nonEmptyString.optional(),
  toolCallId: nonEmptyString,
  toolName: nonEmptyString.optional(),
});
const kcodeComputerUseSessionClosedEventSchema = kcodeComputerUseOperationEventBaseSchema.extend({
  kind: z.literal("session-closed"),
});

export const kcodeComputerUseOperationEventSchema = z.discriminatedUnion("kind", [
  kcodeComputerUseTurnStartedEventSchema,
  kcodeComputerUseTurnCompletedEventSchema,
  kcodeComputerUseTurnFailedEventSchema,
  kcodeComputerUseToolScheduledEventSchema,
  kcodeComputerUseToolStartedEventSchema,
  kcodeComputerUseSessionClosedEventSchema,
]);
export type KCodeComputerUseOperationEvent = z.infer<typeof kcodeComputerUseOperationEventSchema>;

export const kcodeSessionEventTypeSchema = z.enum([
  "session.created",
  "session.resumed",
  "session.updated",
  "session.titleUpdated",
  "session.closed",
  "turn.started",
  "turn.steerQueued",
  "turn.steerDrained",
  "turn.completed",
  "turn.failed",
  "message.upserted",
  "message.removed",
  "part.started",
  "part.delta",
  "part.upserted",
  "part.removed",
  "model.streaming",
  "tool.updated",
  "permission.requested",
  "permission.resolved",
  "userInput.requested",
  "userInput.resolved",
  "checkpoint.created",
  "rewind.triggered",
  "streamRecovery.updated",
]);
export type KCodeSessionEventType = z.infer<typeof kcodeSessionEventTypeSchema>;

export const kcodeProtocolErrorDetailSchema = z
  .object({
    type: nonEmptyString,
    message: nonEmptyString,
    stack: z.string().optional(),
    code: z.string().optional(),
    detail: z.string().optional(),
    underlyingErrorMessage: z.string().optional(),
    underlyingErrorDetail: z.string().optional(),
    attribution: errorAttributionSchema.optional(),
    retryable: z.boolean().optional(),
    data: z.unknown().optional(),
  })
  .strict();
export const kcodeSessionCreatedEventPayloadSchema = z
  .object({
    mode: kcodeSessionModeSchema,
    contextWindow: z.number().int().nonnegative(),
  })
  .strict();
export const kcodeSessionResumedEventPayloadSchema = z
  .object({
    directory: nonEmptyString,
    interruptedToolCount: z.number().int().nonnegative(),
    messageCount: z.number().int().nonnegative(),
    partCount: z.number().int().nonnegative(),
    recoveredCompactTimelineCount: z.number().int().nonnegative().optional(),
    recoveredSteerInputCount: z.number().int().nonnegative().optional(),
    resumedTodoCount: z.number().int().nonnegative().optional(),
  })
  .strict();
export const kcodeSessionTitleUpdatedEventPayloadSchema = z
  .object({
    messageID: nonEmptyString.optional(),
    previousTitle: z.string(),
    source: z.enum(["default", "first_input", "generated", "custom"]),
    title: z.string(),
  })
  .strict();
export const kcodeTurnStartedEventPayloadSchema = z
  .object({
    turnNumber: z.number().int().nonnegative(),
    input: z.string(),
    inputId: nonEmptyString.optional(),
    queryId: nonEmptyString.optional(),
    inputSource: kcodeTurnInputSourceSchema.optional(),
    inputVisibility: kcodeMessageVisibilitySchema.optional(),
    executionKind: z.enum(["agent", "controlOnly"]).optional(),
    targetId: nonEmptyString.optional(),
    messageId: nonEmptyString.optional(),
    foregroundExecutionId: nonEmptyString.optional(),
    intent: jsonObjectSchema.optional(),
    originMeta: jsonObjectSchema.optional(),
    // runtime 会透传后台唤醒来源，strict schema 必须同步声明以免丢弃整条事件。
    backgroundSource: z.enum(["bash", "subagent"]).optional(),
    attachments: z.array(jsonObjectSchema).optional(),
  })
  .strict();
const kcodeTurnSteerSourceSchema = z.enum(["plan_approval_feedback", "workflow_refine_feedback"]);
const kcodeTurnSteerCommandKindSchema = z.enum(["sendText", "sendGoalCommand", "compact"]);
const kcodeTurnSteerDeliverySchema = z.enum(["queue", "guide"]);

export const kcodeTurnSteerQueuedEventPayloadSchema = z
  .object({
    pendingInputId: nonEmptyString,
    inputId: nonEmptyString.optional(),
    queryId: nonEmptyString.optional(),
    input: z.string(),
    inputPreview: z.string(),
    inputSize: z.number().int().nonnegative(),
    commandKind: kcodeTurnSteerCommandKindSchema.optional(),
    source: kcodeTurnSteerSourceSchema.optional(),
    toolDisallowlist: z.array(nonEmptyString).optional(),
    delivery: kcodeTurnSteerDeliverySchema.optional(),
    targetTurnId: nonEmptyString,
    queueLength: z.number().int().nonnegative(),
    intent: jsonObjectSchema.optional(),
  })
  .strict();
export const kcodeTurnSteerDrainedEventPayloadSchema = z
  .object({
    pendingInputIds: z.array(nonEmptyString),
    queryIds: z.array(nonEmptyString).optional(),
    targetTurnId: nonEmptyString,
    injectedMessageIds: z.array(nonEmptyString),
    drainedInputs: z
      .array(
        z
          .object({
            pendingInputId: nonEmptyString,
            messageId: nonEmptyString,
            text: z.string(),
            delivery: kcodeTurnSteerDeliverySchema.optional(),
            intent: jsonObjectSchema.optional(),
            toolDisallowlist: z.array(nonEmptyString).optional(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();
export const kcodeTurnCompletedEventPayloadSchema = z
  .object({
    response: z.string(),
    tokenCount: z.number().int().nonnegative(),
    usage: z.unknown().optional(),
    toolCallCount: z.number().int().nonnegative(),
    historyRoundCount: z.number().int().nonnegative().optional(),
    duration: z.number().nonnegative(),
    // runtime turn.completed 会附带 cacheStats，协议 schema 之前漏掉该字段。
    // strict 校验失败会让桌面端丢掉终态事件，表现为消息已完成但 UI 一直没有回复。
    cacheStats: z
      .object({
        totalMessages: z.number().int().nonnegative(),
        cachedMessages: z.number().int().nonnegative(),
        lastCacheHit: z.boolean(),
        cacheReadTokens: z.number().int().nonnegative().optional(),
      })
      .strict()
      .optional(),
    inputId: nonEmptyString.optional(),
    resultType: z.enum([
      "success",
      // "cancelled": 用户主动中断属于正常结束，复用 turn.completed 上报，避免被映射成 turn.failed。
      "cancelled",
      "error_max_turns",
      "error_max_budget",
      "error_during_execution",
      "error_max_tool_calls",
    ]),
    backgroundSubagentResultConsumed: z.boolean().optional(),
  })
  .strict();
export const kcodeTurnFailedEventPayloadSchema = z
  .object({
    error: kcodeProtocolErrorDetailSchema,
    turnPhase: z.string(),
    inputId: nonEmptyString.optional(),
    backgroundSubagentResultConsumed: z.boolean().optional(),
  })
  .strict();
export const kcodeMessageUpsertedEventPayloadSchema = z
  .object({
    content: z.string(),
    attachments: z.array(z.unknown()).optional(),
    toolCalls: z.array(z.unknown()).optional(),
    type: z.string().optional(),
    compactBoundary: z.unknown().optional(),
  })
  .strict();
export const kcodeMessageRemovedEventPayloadSchema = z
  .object({
    messageId: nonEmptyString,
    reason: z.string().optional(),
  })
  .strict();
export const kcodeMessagePartDeltaEventPayloadSchema = z
  .object({
    messageId: nonEmptyString,
    partId: nonEmptyString,
    field: z.enum(["text", "reasoning", "input", "output"]).optional(),
    delta: z.string(),
  })
  .strict();
export const kcodeMessagePartUpsertedEventPayloadSchema = z
  .object({
    part: kcodeMessagePartSchema,
  })
  .strict();
export const kcodeMessagePartRemovedEventPayloadSchema = z
  .object({
    messageId: nonEmptyString,
    partId: nonEmptyString,
    reason: z.string().optional(),
  })
  .strict();
const kcodeToolCallBasePayloadSchema = z
  .object({
    toolCallId: nonEmptyString,
    toolName: z.string().optional(),
    parentToolCallId: nonEmptyString.optional(),
    source: z.enum(["subagent"]).optional(),
    agentId: nonEmptyString.optional(),
    agentType: nonEmptyString.optional(),
    // subagent mirror 会携带后台归因；strict schema 漏字段会让 session/event 整条被丢弃。
    background: z.boolean().optional(),
    childSessionId: nonEmptyString.optional(),
    childToolCallId: nonEmptyString.optional(),
    description: z.string().optional(),
  })
  .strict();

export const kcodeToolUpdatedEventPayloadSchema = z.discriminatedUnion("kind", [
  kcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("scheduled"),
      // 修复：CLI 调度事件已携带所属消息 ID；漏声明会让严格校验丢弃整条事件。
      assistantMessageId: nonEmptyString.optional(),
      toolName: nonEmptyString,
      input: z.unknown().optional(),
      inputByteLength: z.number().int().nonnegative().optional(),
      inputOmitted: z.boolean().optional(),
      inputRef: z.literal("model_stream").optional(),
      dependencies: z.array(nonEmptyString).optional(),
      parallelGroupIndex: z.number().int().nonnegative().optional(),
      canRunParallel: z.boolean().optional(),
      schedule: jsonObjectSchema.optional(),
    })
    .strict(),
  kcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("started"),
      startedAt: protocolInstantSchema,
    })
    .strict(),
  kcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("progress"),
      elapsedMs: z.number().nonnegative().optional(),
      pid: z.number().int().optional(),
      stdoutBytes: z.number().int().nonnegative().optional(),
      stderrBytes: z.number().int().nonnegative().optional(),
      outputBytes: z.number().int().nonnegative().optional(),
      outputPreview: executionOutputPreviewSchema.optional(),
      stdoutTail: z.string().optional(),
      stderrTail: z.string().optional(),
    })
    .strict(),
  kcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("result"),
      result: kcodeToolResultObjectSchema,
      duration: z.number().nonnegative(),
    })
    .strict(),
  kcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("error"),
      error: kcodeProtocolErrorDetailSchema,
    })
    .strict(),
  z
    .object({
      kind: z.literal("batch"),
      toolCallIds: z.array(nonEmptyString),
      successCount: z.number().int().nonnegative(),
      errorCount: z.number().int().nonnegative(),
    })
    .strict(),
  kcodeToolCallBasePayloadSchema
    .extend({
      kind: z.literal("raw"),
      payload: jsonObjectSchema,
    })
    .strict(),
]);
export const kcodePermissionRequestedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString.optional(),
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    reason: z.string(),
    input: z.unknown(),
    suggestedPermissionUpdates: z.array(kcodePermissionUpdateSchema).optional(),
    origin: kcodeInteractionRequestOriginSchema.optional(),
    options: z.array(kcodePermissionOptionSchema).min(1),
    childSessionId: nonEmptyString.optional(),
    background: z.boolean().optional(),
  })
  .strict();
export const kcodePermissionResolvedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString.optional(),
    toolCallId: nonEmptyString,
    toolName: nonEmptyString.optional(),
    decision: kcodePermissionDecisionSchema.optional(),
    reason: z.string().optional(),
    modifiedInput: z.unknown().optional(),
    inputSummary: z.unknown().optional(),
    childSessionId: nonEmptyString.optional(),
    background: z.boolean().optional(),
  })
  .strict();
export const kcodeUserInputRequestedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString,
    prompt: z.string(),
    inputType: z.enum(["text", "choice", "confirm"]).optional(),
    choices: z.array(z.string()).optional(),
  })
  .strict();
export const kcodeUserInputResolvedEventPayloadSchema = z
  .object({
    requestId: nonEmptyString,
    value: z.unknown().optional(),
    cancelled: z.boolean().optional(),
  })
  .strict();
export const kcodeSessionClosedEventPayloadSchema = z
  .object({
    reason: z.string().optional(),
  })
  .strict();

function kcodeSessionEventEnvelopeFor<T extends KCodeSessionEventType>(
  type: T,
  payload: z.ZodTypeAny,
) {
  return kcodeEventEnvelopeSchema.extend({
    type: z.literal(type),
    payload: payload.optional(),
  });
}

export const kcodeSessionEventSchema = z.discriminatedUnion("type", [
  kcodeSessionEventEnvelopeFor("session.created", kcodeSessionCreatedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("session.resumed", kcodeSessionResumedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("session.updated", jsonObjectSchema),
  kcodeSessionEventEnvelopeFor("session.titleUpdated", kcodeSessionTitleUpdatedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("session.closed", kcodeSessionClosedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("turn.started", kcodeTurnStartedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("turn.steerQueued", kcodeTurnSteerQueuedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("turn.steerDrained", kcodeTurnSteerDrainedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("turn.completed", kcodeTurnCompletedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("turn.failed", kcodeTurnFailedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("message.upserted", kcodeMessageUpsertedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("message.removed", kcodeMessageRemovedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("part.started", kcodeMessagePartUpsertedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("part.delta", kcodeMessagePartDeltaEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("part.upserted", kcodeMessagePartUpsertedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("part.removed", kcodeMessagePartRemovedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("model.streaming", kcodeModelStreamingEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("tool.updated", kcodeToolUpdatedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("permission.requested", kcodePermissionRequestedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("permission.resolved", kcodePermissionResolvedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("userInput.requested", kcodeUserInputRequestedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("userInput.resolved", kcodeUserInputResolvedEventPayloadSchema),
  kcodeSessionEventEnvelopeFor("checkpoint.created", jsonObjectSchema),
  kcodeSessionEventEnvelopeFor("rewind.triggered", jsonObjectSchema),
  kcodeSessionEventEnvelopeFor("streamRecovery.updated", jsonObjectSchema),
]);
export type KCodeSessionEvent = z.infer<typeof kcodeSessionEventSchema>;

export const kcodeSessionEventsResultSchema = z
  .object({
    events: z.array(kcodeSessionEventSchema),
  })
  .strict();
export const kcodeSessionMessagesResultSchema = z
  .object({
    messages: z.array(kcodeMessageWithPartsSchema),
  })
  .strict();
export const kcodeStateUpdatedNotificationSchema = z
  .object({
    type: z.literal("state.updated"),
    scope: z.enum(["server", "workspace", "session"]),
    workspace: kcodeWorkspaceRefSchema.optional(),
    sessionId: nonEmptyString.optional(),
    revision: z.number().int().nonnegative(),
    reason: z.string().optional(),
    patch: z.unknown(),
  })
  .strict();
export type KCodeStateUpdatedNotification = z.infer<typeof kcodeStateUpdatedNotificationSchema>;

export const kcodeSessionSubscribeParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    deliveryKind: kcodeDeliveryKindSchema,
    afterSeq: z.number().int().nonnegative().optional(),
    includeSnapshot: z.boolean().default(false),
  })
  .strict();
export type KCodeSessionSubscribeParams = z.infer<typeof kcodeSessionSubscribeParamsSchema>;

export const kcodeSessionSubscribeResultSchema = z
  .object({
    sessionId: nonEmptyString,
    eventSeq: z.number().int().nonnegative(),
    events: z.array(kcodeSessionEventSchema),
    snapshot: kcodeSessionStateSnapshotSchema.optional(),
  })
  .strict();
export const kcodeSessionListResultSchema = z
  .object({
    sessions: z.array(kcodeSessionInfoSchema),
  })
  .strict();

const kcodeSessionSubagentBaseSchema = z
  .object({
    childSessionId: nonEmptyString,
    agentId: nonEmptyString.optional(),
    toolCallId: nonEmptyString.optional(),
    subagentType: nonEmptyString,
    title: nonEmptyString,
    summary: z.string().optional(),
    startedAt: z.number().int().nonnegative().optional(),
    endedAt: z.number().int().nonnegative().optional(),
  })
  .strict();

export const kcodeSessionRunningSubagentSchema = kcodeSessionSubagentBaseSchema.extend({
  status: z.enum(["running", "waiting", "blocked"]),
});
export type KCodeSessionRunningSubagent = z.infer<typeof kcodeSessionRunningSubagentSchema>;

export const kcodeSessionEndedSubagentSchema = kcodeSessionSubagentBaseSchema.extend({
  status: z.enum(["success", "failed", "cancelled", "lost"]),
});
export type KCodeSessionEndedSubagent = z.infer<typeof kcodeSessionEndedSubagentSchema>;

export const kcodeSessionSubagentsResultSchema = z
  .object({
    revision: z.number().int().nonnegative(),
    childSessionIds: z.array(nonEmptyString),
    running: z.array(kcodeSessionRunningSubagentSchema),
    ended: z
      .object({
        total: z.number().int().nonnegative(),
        items: z.array(kcodeSessionEndedSubagentSchema),
        nextCursor: nonEmptyString.optional(),
      })
      .strict(),
  })
  .strict();
export type KCodeSessionSubagentsResult = z.infer<typeof kcodeSessionSubagentsResultSchema>;
export const kcodeSessionCreateParamsSchema = z
  .object({
    sessionId: nonEmptyString.optional(),
    workspace: kcodeWorkspaceRefSchema,
    parentSessionId: nonEmptyString.optional(),
    mode: kcodeSessionModeSchema.optional(),
    model: modelSelectionSchema.optional(),
    persistence: kcodeSessionPersistenceSchema.optional(),
    thoughtLevel: nonEmptyString.optional(),
    titleGenerationEnabled: z.boolean().optional(),
    mcpServers: z.array(kcodeProtocolMcpServerSchema).optional(),
    toolAllowlist: z.array(nonEmptyString).optional(),
    toolDenylist: z.array(nonEmptyString).optional(),
    importedHistory: kcodeSessionImportHistorySchema.optional(),
    // host 只按本地服务装配/远程/端形态决定是否注册工具，不读取灰度；
    // 缺省不下发 = 不注册；灰度与套餐准入在实际创建的 Host handler 校验。
    offPeakToolEnabled: z.boolean().optional(),
    // 动态工作流灰度：与 offPeakToolEnabled 同一
    // 模式——host 裁决后下发，缺省不下发 = 不注册工作流工具簇（fail-closed）。
    dynamicWorkflowEnabled: z.boolean().optional(),
  })
  .strict();
export type KCodeSessionCreateParams = z.infer<typeof kcodeSessionCreateParamsSchema>;

export const kcodeSessionResumeParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    workspace: kcodeWorkspaceRefSchema.optional(),
    // 旧 session 尚无 runtime/model_selection entry 时，由同 task 的索引元数据提供迁移 hint。
    thoughtLevel: nonEmptyString.optional(),
    mcpServers: z.array(kcodeProtocolMcpServerSchema).optional(),
    // 冷恢复重建 runtime 时必须沿用 create 的工具面约束（否则会绕过 allow/deny，尤其 CUA 会话）。
    toolAllowlist: z.array(nonEmptyString).optional(),
    toolDenylist: z.array(nonEmptyString).optional(),
    // 与 create 同语义；resume 不带会导致冷恢复丢 Off-Peak 工具面。
    offPeakToolEnabled: z.boolean().optional(),
    // 与 create 同语义；resume 不带会导致冷恢复丢工作流工具簇。
    dynamicWorkflowEnabled: z.boolean().optional(),
  })
  .strict();
export type KCodeSessionResumeParams = z.infer<typeof kcodeSessionResumeParamsSchema>;

export const kcodeSessionListParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema.optional(),
    // 显式身份查询包含隐藏会话；普通列表仍只返回主任务，避免索引修复激活 runtime。
    sessionIds: z.array(nonEmptyString).min(1).max(64).optional(),
    includeArchived: z.boolean().default(false),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type KCodeSessionListParams = z.infer<typeof kcodeSessionListParamsSchema>;

export const kcodeSessionSubagentsParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    endedCursor: nonEmptyString.optional(),
    endedLimit: z.number().int().positive().max(100).default(20),
  })
  .strict();
export type KCodeSessionSubagentsParams = z.infer<typeof kcodeSessionSubagentsParamsSchema>;

export const kcodeUsageStatsParamsSchema = z
  .object({
    range: z.enum(APP_USAGE_RANGES),
    timeZone: z.string().optional(),
  })
  .strict();
export const kcodeUsageStatsResultSchema = appUsageSnapshotSchema;
export const kcodeTaskTokenUsageParamsSchema = z
  .object({
    sessionId: nonEmptyString,
  })
  .strict();
export const kcodeTaskTokenUsageResultSchema = z
  .object({
    sessionId: nonEmptyString,
    totalTokens: z.number().int().nonnegative(),
    inputTokens: z.number().int().nonnegative(),
    outputTokens: z.number().int().nonnegative(),
    reasoningTokens: z.number().int().nonnegative(),
    cacheCreationTokens: z.number().int().nonnegative(),
    cacheReadTokens: z.number().int().nonnegative(),
    modelRequestCount: z.number().int().nonnegative(),
    modelErrorCount: z.number().int().nonnegative(),
    inputBaselineBySource: z.record(z.string(), z.number().int().nonnegative()),
  })
  .strict();
export type KCodeTaskTokenUsageResult = z.infer<typeof kcodeTaskTokenUsageResultSchema>;

export const kcodeSessionReadParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    deliveryKind: kcodeDeliveryKindSchema.optional(),
    messageLimit: z.number().int().positive().optional(),
    afterSeq: z.number().int().nonnegative().optional(),
  })
  .strict();
export type KCodeSessionReadParams = z.infer<typeof kcodeSessionReadParamsSchema>;

export const kcodeSessionMessagesParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    afterMessageId: nonEmptyString.optional(),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type KCodeSessionMessagesParams = z.infer<typeof kcodeSessionMessagesParamsSchema>;

export const kcodeSessionEventsParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    afterSeq: z.number().int().nonnegative().optional(),
    limit: z.number().int().positive().optional(),
  })
  .strict();
export type KCodeSessionEventsParams = z.infer<typeof kcodeSessionEventsParamsSchema>;

export const kcodeSessionRuntimePreferencesScopeSchema = z.enum([
  "runtime-materialization",
  "user-execution",
]);
export type KCodeSessionRuntimePreferencesScope = z.infer<
  typeof kcodeSessionRuntimePreferencesScopeSchema
>;

export const KCODE_SESSION_RUNTIME_PREFERENCES_REQUEST_TIMEOUT_MS = 15_000;

export const kcodeSessionRequestRuntimePreferencesParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    scope: kcodeSessionRuntimePreferencesScopeSchema,
  })
  .strict();
export type KCodeSessionRequestRuntimePreferencesParams = z.infer<
  typeof kcodeSessionRequestRuntimePreferencesParamsSchema
>;

export const DEFAULT_KCODE_MODEL_CONTEXT_BUDGET_STRATEGY = "preflight-v1" as const;

// 3.12.2：legacy 仅为旧协议接收兼容；Runtime 一律归一为上面的共享默认策略。
export const kcodeModelContextBudgetStrategySchema = z.enum(["legacy", "preflight-v1"]);
export type KCodeModelContextBudgetStrategy = z.infer<typeof kcodeModelContextBudgetStrategySchema>;

export const kcodeSessionRuntimePreferencesResultSchema = z
  .object({
    nativeSearchEnhancementsEnabled: z.boolean(),
    memoryEnabled: z.boolean().default(false),
    askUserQuestionAutoResolutionEnabled: z.boolean().default(true),
    integratedTerminalShell: integratedTerminalShellSelectionSchema.optional(),
    // 兼容旧 Host：缺少字段时在协议解析边界使用当前默认策略。
    modelContextBudgetStrategy: kcodeModelContextBudgetStrategySchema.default(
      DEFAULT_KCODE_MODEL_CONTEXT_BUDGET_STRATEGY,
    ),
  })
  .strict();
export type KCodeSessionRuntimePreferencesResult = z.infer<
  typeof kcodeSessionRuntimePreferencesResultSchema
>;

/**
 * App 在提交 prompt 前只读采集的 IAB 可见状态。该字段只用于 provider-visible
 * ambient context，不进入用户可见 transcript；内容有界，禁止携带页面正文或凭据。
 */
export const kcodeBrowserAmbientContextSchema = z
  .object({
    tabCount: z.number().int().positive().max(100),
    currentUrl: z.string().trim().min(1).max(4096).optional(),
  })
  .strict();
export type KCodeBrowserAmbientContext = z.infer<typeof kcodeBrowserAmbientContextSchema>;

export const kcodeSessionSendParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    modelSelection: modelSelectionSchema.optional(),
    modelExecution: modelExecutionSchema.optional(),
    inputId: nonEmptyString.optional(),
    queryId: nonEmptyString.optional(),
    content: z.string(),
    attachments: z.array(jsonObjectSchema).optional(),
    browserAmbientContext: kcodeBrowserAmbientContextSchema.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    expectedProviderRevision: nonEmptyString.optional(),
    automationId: nonEmptyString.optional(),
    offPeakTaskId: nonEmptyString.optional(),
    offPeakRunType: z.enum(["init", "resume"]).optional(),
    botDeliveryTarget: kcodeAutomationBotDeliveryTargetSchema.optional(),
    toolDenylist: z.array(nonEmptyString).optional(),
  })
  .strict()
  .superRefine((payload, context) => {
    if (payload.automationId && payload.offPeakTaskId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "automationId and offPeakTaskId are mutually exclusive",
      });
    }
    if (payload.offPeakRunType && !payload.offPeakTaskId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "offPeakRunType requires offPeakTaskId",
        path: ["offPeakRunType"],
      });
    }
    if (payload.modelExecution && !payload.modelSelection) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "modelExecution requires modelSelection",
        path: ["modelExecution"],
      });
    }
  });
export const kcodeSessionSendResultSchema = z
  .object({
    sessionId: nonEmptyString,
    accepted: z.literal(true),
    stateRevision: z.number().int().nonnegative(),
  })
  .strict();
export type KCodeSessionSendResult = z.infer<typeof kcodeSessionSendResultSchema>;

export const kcodeSessionHistoryTargetSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("turn"),
      turnIndex: z.number().int().nonnegative(),
    })
    .strict(),
  z
    .object({
      kind: z.literal("message"),
      messageId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal("checkpoint"),
      checkpointId: nonEmptyString,
    })
    .strict(),
  z
    .object({
      kind: z.literal("latestCheckpoint"),
    })
    .strict(),
]);
export type KCodeSessionHistoryTarget = z.infer<typeof kcodeSessionHistoryTargetSchema>;

export const kcodeSessionForkParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    target: kcodeSessionHistoryTargetSchema.default({
      kind: "latestCheckpoint",
    }),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type KCodeSessionForkParams = z.infer<typeof kcodeSessionForkParamsSchema>;

export const kcodeSessionForkResultSchema = z
  .object({
    forkedSessionId: nonEmptyString,
    parentSessionId: nonEmptyString.optional(),
    targetMessageId: nonEmptyString.optional(),
    targetCheckpointId: nonEmptyString.optional(),
    response: z.string(),
    snapshot: kcodeSessionStateSnapshotSchema,
  })
  .strict();
export type KCodeSessionForkResult = z.infer<typeof kcodeSessionForkResultSchema>;

export const kcodeSessionCompactParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    inputId: nonEmptyString.optional(),
    instructions: z.string().optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type KCodeSessionCompactParams = z.infer<typeof kcodeSessionCompactParamsSchema>;

export const kcodeSessionCompactResultSchema = z
  .object({
    response: z.string(),
    snapshot: kcodeSessionStateSnapshotSchema,
    compact: z
      .object({
        state: z.enum(["accepted", "already_running"]),
        inputId: nonEmptyString.optional(),
        operationId: nonEmptyString.optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodeSessionCompactResult = z.infer<typeof kcodeSessionCompactResultSchema>;

export const kcodeSessionGoalActionSchema = z.enum([
  "show",
  "set",
  "replace",
  "pause",
  "resume",
  "clear",
]);
export type KCodeSessionGoalAction = z.infer<typeof kcodeSessionGoalActionSchema>;

export const kcodeSessionGoalParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    inputId: nonEmptyString.optional(),
    action: kcodeSessionGoalActionSchema,
    objective: z.string().optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type KCodeSessionGoalParams = z.infer<typeof kcodeSessionGoalParamsSchema>;

export const kcodeSessionGoalResultSchema = z
  .object({
    response: z.string(),
    snapshot: kcodeSessionStateSnapshotSchema,
    startedTurn: z.boolean().optional(),
  })
  .strict();
export type KCodeSessionGoalResult = z.infer<typeof kcodeSessionGoalResultSchema>;

export const kcodeSessionStopParamsSchema = z
  .object({
    sessionId: nonEmptyString,
  })
  .strict();
const kcodeBackgroundTaskInfoStatusSchema = z.enum([
  "running",
  "completed",
  "failed",
  "timed_out",
  "cancelled",
  "spawn_error",
  "lost",
]);

export const kcodeBackgroundTaskInfoSchema = z
  .object({
    taskId: nonEmptyString,
    toolCallId: nonEmptyString.optional(),
    toolName: nonEmptyString.optional(),
    taskKind: z.enum(["bash", "subagent"]).optional(),
    blocked: z.boolean().optional(),
    blockedReason: z.string().optional(),
    cancellable: z.boolean().optional(),
    cancelRequestedAt: protocolInstantSchema.optional(),
    command: z.string().optional(),
    description: z.string().optional(),
    status: kcodeBackgroundTaskInfoStatusSchema,
    pid: z.number().int().positive().optional(),
    startedAt: protocolInstantSchema.optional(),
    completedAt: protocolInstantSchema.optional(),
    outputPath: z.string().optional(),
    stderrPersistedOutputPath: z.string().optional(),
    stdoutPersistedOutputPath: z.string().optional(),
    outputBytes: z.number().int().nonnegative().optional(),
    outputTruncated: z.boolean().optional(),
    outputTail: z.string().optional(),
    stderrBytes: z.number().int().nonnegative().optional(),
    stderrTail: z.string().optional(),
    stdoutBytes: z.number().int().nonnegative().optional(),
    stdoutTail: z.string().optional(),
    terminalId: nonEmptyString.optional(),
  })
  .strict();
export const kcodeSessionCancelBackgroundTaskParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    taskId: nonEmptyString,
  })
  .strict();
export type KCodeSessionCancelBackgroundTaskParams = z.infer<
  typeof kcodeSessionCancelBackgroundTaskParamsSchema
>;

export const kcodeSessionCancelBackgroundTaskResultSchema = z
  .object({
    cancelled: z.boolean(),
    reason: z.string().optional(),
    snapshot: kcodeBackgroundTaskInfoSchema.optional(),
    status: kcodeBackgroundTaskInfoStatusSchema,
    taskId: nonEmptyString,
  })
  .strict();
export type KCodeSessionCancelBackgroundTaskResult = z.infer<
  typeof kcodeSessionCancelBackgroundTaskResultSchema
>;

export const kcodeSessionSetModelParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    model: modelSelectionSchema,
    expectedRevision: z.number().int().nonnegative().optional(),
    persistAsWorkspaceLastUsed: z.boolean().default(true),
  })
  .strict();
export type KCodeSessionSetModelParams = z.infer<typeof kcodeSessionSetModelParamsSchema>;

export const kcodeSessionSetThoughtLevelParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    thoughtLevel: nonEmptyString.optional(),
    expectedRevision: z.number().int().nonnegative().optional(),
    persistAsWorkspaceLastUsed: z.boolean().default(true),
  })
  .strict();
export type KCodeSessionSetThoughtLevelParams = z.infer<
  typeof kcodeSessionSetThoughtLevelParamsSchema
>;

export const kcodeSessionSetModeParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    mode: kcodeSessionModeSchema,
    expectedRevision: z.number().int().nonnegative().optional(),
  })
  .strict();
export type KCodeSessionSetModeParams = z.infer<typeof kcodeSessionSetModeParamsSchema>;

export const kcodeSessionCloseParamsSchema = z
  .object({
    sessionId: nonEmptyString,
    expectedPersistence: kcodeSessionPersistenceSchema.optional(),
  })
  .strict();
export type KCodeSessionCloseParams = z.infer<typeof kcodeSessionCloseParamsSchema>;
export const kcodeSessionCloseResultSchema = z
  .object({
    closed: z.boolean().optional(),
  })
  .strict();
export type KCodeSessionCloseResult = z.infer<typeof kcodeSessionCloseResultSchema>;
export const kcodeWorkspaceReadPresentationParamsSchema = z
  .object({ workspace: kcodeWorkspaceRefSchema })
  .strict();
export const kcodeWorkspacePresentationSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    mode: kcodeSessionModeSchema,
    slashCommands: z.array(kcodeSlashCommandSchema),
  })
  .strict();
export type KCodeWorkspacePresentation = z.infer<typeof kcodeWorkspacePresentationSchema>;
const workspaceHookSha256DigestSchema = z.string().regex(/^[a-f0-9]{64}$/u);
export const kcodeWorkspaceHookTrustGrantParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    bundleDigest: workspaceHookSha256DigestSchema,
    hookDeclarationDigest: workspaceHookSha256DigestSchema,
  })
  .strict();
export type KCodeWorkspaceHookTrustGrantParams = z.infer<
  typeof kcodeWorkspaceHookTrustGrantParamsSchema
>;
export const kcodeWorkspaceHookTrustGrantReasonCodeSchema = z.enum([
  "workspace_hooks_blocked_by_policy",
  "workspace_hooks_bundle_changed",
  "workspace_hooks_snapshot_mismatch",
  "workspace_hooks_policy_requires_pretrust",
  "workspace_hooks_trust_store_corrupt",
  "workspace_hooks_config_unreadable",
]);
export type KCodeWorkspaceHookTrustGrantReasonCode = z.infer<
  typeof kcodeWorkspaceHookTrustGrantReasonCodeSchema
>;
export const kcodeWorkspaceHookTrustGrantResultSchema = z
  .object({
    accepted: z.boolean(),
    reasonCode: kcodeWorkspaceHookTrustGrantReasonCodeSchema.optional(),
  })
  .strict();
export type KCodeWorkspaceHookTrustGrantResult = z.infer<
  typeof kcodeWorkspaceHookTrustGrantResultSchema
>;
const kcodeWorkspaceModelToolCallSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    input: z.unknown(),
  })
  .strict();
const kcodeWorkspaceModelMessageSchema = z.discriminatedUnion("role", [
  z.object({ role: z.literal("system"), content: z.string() }).strict(),
  z.object({ role: z.literal("user"), content: z.string() }).strict(),
  z
    .object({
      role: z.literal("assistant"),
      content: z.string(),
      toolCalls: z.array(kcodeWorkspaceModelToolCallSchema).optional(),
    })
    .strict(),
  z
    .object({
      role: z.literal("tool"),
      content: z.string(),
      toolCallId: nonEmptyString,
      toolName: nonEmptyString,
      isError: z.boolean().optional(),
    })
    .strict(),
]);
const kcodeWorkspaceModelToolSchema = z
  .object({
    name: nonEmptyString,
    description: z.string().optional(),
    inputSchema: z.record(z.string(), z.unknown()),
  })
  .strict();

export const kcodeWorkspaceGenerateTextParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    selection: modelSelectionSchema,
    prompt: nonEmptyString.optional(),
    messages: z.array(kcodeWorkspaceModelMessageSchema).min(1).optional(),
    tools: z.array(kcodeWorkspaceModelToolSchema).optional(),
    querySource: nonEmptyString,
    maxOutputTokens: z.number().int().positive().optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict()
  .refine((value) => value.prompt !== undefined || value.messages !== undefined, {
    message: "prompt 或 messages 至少需要提供一个",
  });
export const kcodeWorkspaceGenerateTextResultSchema = z
  .object({
    text: z.string(),
    selection: modelSelectionSchema,
    toolCalls: z.array(kcodeWorkspaceModelToolCallSchema).optional(),
    // 可选以兼容仍在运行的旧 app-server；新 CLI 始终返回结构化结束原因。
    finishReason: z.string().optional(),
    usage: z
      .object({
        inputTokens: z.number().nonnegative().optional(),
        outputTokens: z.number().nonnegative().optional(),
        totalTokens: z.number().nonnegative().optional(),
        cacheReadTokens: z.number().nonnegative().optional(),
        cacheWriteTokens: z.number().nonnegative().optional(),
        reasoningTokens: z.number().nonnegative().optional(),
        serverToolUse: z
          .object({
            webSearchRequests: z.number().nonnegative().optional(),
            webFetchRequests: z.number().nonnegative().optional(),
          })
          .strict()
          .optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodeWorkspaceGenerateTextParams = z.infer<
  typeof kcodeWorkspaceGenerateTextParamsSchema
>;
export type KCodeWorkspaceModelMessage = z.infer<typeof kcodeWorkspaceModelMessageSchema>;
export type KCodeWorkspaceModelTool = z.infer<typeof kcodeWorkspaceModelToolSchema>;
export type KCodeWorkspaceGenerateTextResult = z.infer<
  typeof kcodeWorkspaceGenerateTextResultSchema
>;
export const kcodeWorkspaceCancelGenerateTextParamsSchema = z
  .object({ operationId: nonEmptyString })
  .strict();
export const kcodeWorkspaceCancelGenerateTextResultSchema = z
  .object({ operationId: nonEmptyString, cancelled: z.boolean() })
  .strict();
export type KCodeWorkspaceCancelGenerateTextResult = z.infer<
  typeof kcodeWorkspaceCancelGenerateTextResultSchema
>;

export const kcodeProviderTestModelConnectivityParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    selection: modelSelectionSchema,
  })
  .strict();
export const kcodeProviderTestModelConnectivityResultSchema = z
  .object({ success: z.literal(true) })
  .strict();
export type KCodeProviderTestModelConnectivityParams = z.infer<
  typeof kcodeProviderTestModelConnectivityParamsSchema
>;
export type KCodeProviderTestModelConnectivityResult = z.infer<
  typeof kcodeProviderTestModelConnectivityResultSchema
>;

export const kcodeProviderUpdateAccountConfigParamsSchema = z
  .object({
    revision: nonEmptyString,
    basedOnKCodeBuiltinRevision: nonEmptyString,
    // Provider Config 的字段校验由 @kcode/provider 负责；协议层只约束可传输信封。
    providers: z.record(z.string(), z.unknown()),
    // 账号状态与 Overlay 必须一起传递，否则 Worker 会丢失非当前套餐的执行门禁。
    states: z.record(
      z.string(),
      z
        .object({
          availability: z.enum(["available", "pending", "unavailable", "unknown"]),
          entitled: z.boolean(),
          unavailableReason: accountProviderUnavailableReasonSchema.optional(),
          current: z.boolean().optional(),
          connectionKey: z.string().optional(),
          effectiveAt: z.number().finite().optional(),
        })
        .strict(),
    ),
  })
  .strict();
export const kcodeProviderUpdateAccountConfigResultSchema = z
  .object({
    // 收到账号结果不代表配套 Built-in 已到达；应用版本只能读取 Registry 快照。
    receivedRevision: nonEmptyString,
    providerCount: z.number().int().nonnegative(),
    status: z.enum(["received", "unchanged"]),
  })
  .strict();
export type KCodeProviderUpdateAccountConfigResult = z.infer<
  typeof kcodeProviderUpdateAccountConfigResultSchema
>;
export const kcodeInteractionPreferencesSchema = z
  .object({
    askUserQuestionAutoResolutionEnabled: z.boolean(),
  })
  .strict();
export type KCodeInteractionPreferences = z.infer<typeof kcodeInteractionPreferencesSchema>;

export const kcodeWorkspaceUpdateInteractionPreferencesParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    preferences: kcodeInteractionPreferencesSchema,
  })
  .strict();
export type KCodeWorkspaceUpdateInteractionPreferencesParams = z.infer<
  typeof kcodeWorkspaceUpdateInteractionPreferencesParamsSchema
>;

export const kcodeWorkspaceUpdateInteractionPreferencesResultSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    askUserQuestionAutoResolutionEnabled: z.boolean(),
    snoozedInteractionCount: z.number().int().nonnegative(),
  })
  .strict();
export type KCodeWorkspaceUpdateInteractionPreferencesResult = z.infer<
  typeof kcodeWorkspaceUpdateInteractionPreferencesResultSchema
>;

export const kcodeModelIoPreferencesSchema = z
  .object({
    fullRetentionEnabled: z.boolean(),
  })
  .strict();
export type KCodeModelIoPreferences = z.infer<typeof kcodeModelIoPreferencesSchema>;

export const kcodeWorkspaceUpdateModelIoPreferencesParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    preferences: kcodeModelIoPreferencesSchema,
  })
  .strict();
export type KCodeWorkspaceUpdateModelIoPreferencesParams = z.infer<
  typeof kcodeWorkspaceUpdateModelIoPreferencesParamsSchema
>;

export const kcodeWorkspaceUpdateModelIoPreferencesResultSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    fullRetentionEnabled: z.boolean(),
    updatedSessionCount: z.number().int().nonnegative(),
  })
  .strict();
export type KCodeWorkspaceUpdateModelIoPreferencesResult = z.infer<
  typeof kcodeWorkspaceUpdateModelIoPreferencesResultSchema
>;

export const kcodeWorkspaceUpdateOffPeakToolPolicyParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type KCodeWorkspaceUpdateOffPeakToolPolicyParams = z.infer<
  typeof kcodeWorkspaceUpdateOffPeakToolPolicyParamsSchema
>;

export const kcodeWorkspaceUpdateOffPeakToolPolicyResultSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type KCodeWorkspaceUpdateOffPeakToolPolicyResult = z.infer<
  typeof kcodeWorkspaceUpdateOffPeakToolPolicyResultSchema
>;

// 动态工作流灰度门禁：workspace 级事实，
// 与 Off-Peak 同一套 host→CLI 同步模式；旧 CLI method-not-found → host 降级忽略。
export const kcodeWorkspaceUpdateDynamicWorkflowPolicyParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type KCodeWorkspaceUpdateDynamicWorkflowPolicyParams = z.infer<
  typeof kcodeWorkspaceUpdateDynamicWorkflowPolicyParamsSchema
>;

export const kcodeWorkspaceUpdateDynamicWorkflowPolicyResultSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    enabled: z.boolean(),
  })
  .strict();
export type KCodeWorkspaceUpdateDynamicWorkflowPolicyResult = z.infer<
  typeof kcodeWorkspaceUpdateDynamicWorkflowPolicyResultSchema
>;

export const kcodePermissionRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    toolCallId: nonEmptyString,
    toolName: nonEmptyString,
    reason: z.string(),
    riskLevel: z.enum(["low", "medium", "high", "critical"]),
    input: z.unknown(),
    origin: kcodeInteractionRequestOriginSchema.optional(),
    options: z.array(kcodePermissionOptionSchema).min(1),
  })
  .strict();
export type KCodePermissionRequestParams = z.infer<typeof kcodePermissionRequestParamsSchema>;

/** Agent 请求 app 枚举当前 workspace/session 可达且已完成握手的 browser backend。 */
export const kcodeBrowserListParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    workspaceKey: nonEmptyString,
    workspacePath: nonEmptyString,
    workspaceIdentity: nonEmptyString.optional(),
    remoteSessionId: nonEmptyString.optional(),
    clientMode: browserClientModeSchema,
    sessionContext: browserSessionContextKindSchema,
  })
  .strict();
export type KCodeBrowserListParams = z.infer<typeof kcodeBrowserListParamsSchema>;

export const kcodeBrowserListResultSchema = browserBackendListResultSchema;
export type KCodeBrowserListResult = z.infer<typeof kcodeBrowserListResultSchema>;

/** Agent 把一条 browser-use 命令发送给 app 执行。 */
export const kcodeBrowserExecuteParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    browserId: nonEmptyString.optional(),
    browserGeneration: z.number().int().nonnegative().optional(),
    workspaceKey: nonEmptyString.optional(),
    workspacePath: nonEmptyString.optional(),
    workspaceIdentity: nonEmptyString.optional(),
    remoteSessionId: nonEmptyString.optional(),
    clientMode: browserClientModeSchema.optional(),
    sessionContext: browserSessionContextKindSchema.optional(),
    command: browserCommandSchema,
  })
  .strict();
export type KCodeBrowserExecuteParams = z.infer<typeof kcodeBrowserExecuteParamsSchema>;

// browser command result 是 app/agent 的同源协议结果；其中 duplicate_request_id 用于在真正维护
// pending/running 生命周期的边界拒绝 correlation key 冲突，不能依赖上游 UUID 概率保证。
export const kcodeBrowserExecuteResultSchema = browserCommandResultSchema;
export type KCodeBrowserExecuteResult = z.infer<typeof kcodeBrowserExecuteResultSchema>;

export const kcodeUserInputOptionSchema = z
  .object({
    value: nonEmptyString,
    label: nonEmptyString,
    description: z.string().optional(),
    preview: z.string().optional(),
  })
  .strict();
export const kcodeUserInputQuestionSchema = z
  .object({
    question: nonEmptyString,
    header: nonEmptyString,
    options: z.array(kcodeUserInputOptionSchema).min(1),
    multiSelect: z.boolean().optional(),
  })
  .strict();
export type KCodeUserInputQuestion = z.infer<typeof kcodeUserInputQuestionSchema>;

export const kcodeUserInputRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    toolCallId: nonEmptyString.optional(),
    toolName: nonEmptyString.optional(),
    prompt: z.string().optional(),
    questions: z.array(kcodeUserInputQuestionSchema).min(1).optional(),
    input: z.unknown().optional(),
    origin: kcodeInteractionRequestOriginSchema.optional(),
    schema: z.unknown().optional(),
  })
  .strict();
export type KCodeUserInputRequestParams = z.infer<typeof kcodeUserInputRequestParamsSchema>;

export const kcodeUserInputResponseSchema = z
  .object({
    action: z.enum(["accept", "decline", "cancel"]),
    content: jsonObjectSchema.optional(),
    reason: z.string().optional(),
  })
  .strict();
export type KCodeUserInputResponse = z.infer<typeof kcodeUserInputResponseSchema>;

export const kcodeProviderRuntimeHeadersRequestReasonSchema = z.enum(["model-request"]);
export const kcodeProviderRuntimeHeadersRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    turnId: nonEmptyString.optional(),
    workspace: kcodeWorkspaceRefSchema,
    modelSelection: modelSelectionSchema,
    providerId: nonEmptyString,
    accountAccess: kcodeProviderAccountAccessSchema.optional(),
    reason: kcodeProviderRuntimeHeadersRequestReasonSchema,
  })
  .strict();
export type KCodeProviderRuntimeHeadersRequestParams = z.infer<
  typeof kcodeProviderRuntimeHeadersRequestParamsSchema
>;

/** 请求取消只作用于同 workspace/session 的这一轮凭据刷新。 */
export const kcodeProviderRuntimeHeadersCancelledSchema = z
  .object({
    requestId: nonEmptyString,
    sessionId: nonEmptyString,
    workspace: kcodeWorkspaceRefSchema,
  })
  .strict();
export type KCodeProviderRuntimeHeadersCancelled = z.infer<
  typeof kcodeProviderRuntimeHeadersCancelledSchema
>;

export const kcodeProviderRuntimeHeadersResponseSchema = z.discriminatedUnion("headersApplied", [
  z
    .object({
      headersApplied: z.literal(true),
      // 合并重接：成功必须携带当前请求的鉴权材料，不依赖旧 Registry 已被写入。
      requestAuth: z
        .object({
          apiKey: nonEmptyString.optional(),
          headers: z.record(nonEmptyString, nonEmptyString).optional(),
        })
        .strict(),
      errorMessage: nonEmptyString.optional(),
    })
    .strict(),
  z
    .object({
      headersApplied: z.literal(false),
      errorMessage: nonEmptyString.optional(),
    })
    .strict(),
]);
export type KCodeProviderRuntimeHeadersResponse = z.infer<
  typeof kcodeProviderRuntimeHeadersResponseSchema
>;

// ── 官方 Server MCP 鉴权──
// Agent 进程不是用户身份权威：它把 (pluginId, mcpKey, targetOrigin) 报给 host，由 host
// 解析当前 Coding Plan 凭证并回传本次请求的身份头。请求侧不含任何秘密。
// 与 interaction/requestProviderRuntimeHeaders 同类：Agent 发起、host 自动响应、零 UI。
export const kcodeOfficialMcpAuthHeadersRequestParamsSchema = z
  .object({
    requestId: nonEmptyString,
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    mcpKey: nonEmptyString,
    targetOrigin: nonEmptyString,
  })
  .strict();
export type KCodeOfficialMcpAuthHeadersRequestParams = z.infer<
  typeof kcodeOfficialMcpAuthHeadersRequestParamsSchema
>;

/**
 * 失败原因必须可枚举，避免调用方按文本分流；因此响应不含 errorMessage。
 *
 * `official_mcp_origin_untrusted` 是 host 侧二次校验的拒绝原因：`targetOrigin` 不等于当前
 * KCode API origin。判定只看 origin，`pluginId` / `mcpKey` 仅用于日志归属。与"未登录/无凭据"
 * 分开，才能在排查时区分"被拒绝"和"没身份"。
 */
export const kcodeOfficialMcpAuthFailureReasonSchema = z.enum(
  OFFICIAL_MCP_AUTH_PORT_FAILURE_REASONS,
);

export const kcodeOfficialMcpAuthHeadersResponseSchema = z.discriminatedUnion("ok", [
  z
    .object({
      ok: z.literal(true),
      headers: z.record(z.string(), z.string()),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      reason: kcodeOfficialMcpAuthFailureReasonSchema,
    })
    .strict(),
]);
export type KCodeOfficialMcpAuthHeadersResponse = z.infer<
  typeof kcodeOfficialMcpAuthHeadersResponseSchema
>;

// ── Plugin management (list + enable/disable) ──
// 镜像 @kcode/contracts 的 PluginMetadata, 仅保留 UI 需要的可序列化字段。
export const kcodePluginOptionValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type KCodePluginOptionValue = z.infer<typeof kcodePluginOptionValueSchema>;
export const kcodePluginScopeSchema = z.enum(["user", "workspace"]);
export type KCodePluginScope = z.infer<typeof kcodePluginScopeSchema>;
export const kcodePluginHookDetailSchema = z
  .object({
    event: nonEmptyString,
    matcher: z.string().optional(),
    type: z.enum(["command", "process"]),
    command: nonEmptyString,
    args: z.array(z.string()).optional(),
    async: z.boolean().optional(),
    shell: z.union([z.literal(true), z.string()]).optional(),
    timeout: z.number().positive().optional(),
    timeoutMs: z.number().int().positive().optional(),
    statusMessage: z.string().optional(),
    sourcePath: z.string(),
    runnable: z.boolean(),
  })
  .strict();
export const kcodePluginUserConfigOptionSchema = z
  .object({
    default: kcodePluginOptionValueSchema.optional(),
    description: z.string().optional(),
    required: z.boolean().optional(),
    sensitive: z.boolean().optional(),
    title: z.string().optional(),
    type: z.enum(["string", "number", "boolean", "directory", "file"]).optional(),
  })
  .strict();
export type KCodePluginUserConfigOption = z.infer<typeof kcodePluginUserConfigOptionSchema>;

// 组件类型与详情弹窗/市场详情共用的分组顺序保持一致：agent / command / skill / hook / mcp。
// 注意：这三个 schema 必须定义在 kcodePluginInfoSchema 之前，因为后者（.strict()）的 components 字段引用了它们。
export const kcodePluginComponentKindSchema = z.enum(["agent", "command", "skill", "hook", "mcp"]);
export type KCodePluginComponentKind = z.infer<typeof kcodePluginComponentKindSchema>;

export const kcodePluginComponentItemSchema = z
  .object({
    name: nonEmptyString,
    // 描述来自组件 frontmatter（SKILL.md / command / agent）或 manifest；缺失时省略，不伪造。
    description: z.string().optional(),
  })
  .strict();
export const kcodePluginComponentGroupSchema = z
  .object({
    kind: kcodePluginComponentKindSchema,
    items: z.array(kcodePluginComponentItemSchema),
  })
  .strict();
export type KCodePluginComponentGroup = z.infer<typeof kcodePluginComponentGroupSchema>;

export const kcodePluginInfoSchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    description: z.string().optional(),
    version: z.string().optional(),
    enabled: z.boolean(),
    source: nonEmptyString,
    marketplace: nonEmptyString,
    // manifest（plugin.json）的作者/主页回退字段；商店 listing 缺失时详情页信息区用它兜底。
    author: z.string().optional(),
    authorUrl: z.string().optional(),
    homepage: z.string().optional(),
    skillCount: z.number().int().nonnegative().optional(),
    skillRootCount: z.number().int().nonnegative(),
    commandRootCount: z.number().int().nonnegative(),
    // 权威组件清单（名称 + 可选描述），由 CLI 对插件根目录枚举得出，与启用态无关。
    // 详情 UI 直接展示，取代旧的「数量取协议、名称靠 UI 侧 join」脆弱方案。optional 兼容旧 payload。
    components: z.array(kcodePluginComponentGroupSchema).optional(),
    declaredMcpServerNames: z.array(z.string()).optional(),
    hostMcpServerNames: z.array(z.string()).optional(),
    mcpServerNames: z.array(z.string()),
    hookDetails: z.array(kcodePluginHookDetailSchema).optional(),
    rootPath: z.string(),
    userConfig: z.record(z.string(), kcodePluginUserConfigOptionSchema).optional(),
    configuredOptions: z.record(z.string(), kcodePluginOptionValueSchema).optional(),
    // 缺省表示 package 可用；missing 用于保留已声明但目标 Host 尚未物化的配置行。
    packageStatus: z.literal("missing").optional(),
    rootSource: kcodePluginScopeSchema.optional(),
    enabledSource: kcodePluginScopeSchema.optional(),
    optionSources: z.record(z.string(), kcodePluginScopeSchema).optional(),
  })
  .strict();
export type KCodePluginInfo = z.infer<typeof kcodePluginInfoSchema>;

export const kcodePluginDiagnosticSchema = z
  .object({
    code: z.string(),
    message: z.string(),
    severity: z.enum(["warning", "error"]).optional(),
    pluginId: z.string().optional(),
  })
  .strict();
export type KCodePluginDiagnostic = z.infer<typeof kcodePluginDiagnosticSchema>;

export const kcodePluginsListParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    configScope: kcodePluginScopeSchema.optional(),
  })
  .strict();
export const kcodePluginsListResultSchema = z
  .object({
    plugins: z.array(kcodePluginInfoSchema),
    diagnostics: z.array(kcodePluginDiagnosticSchema),
  })
  .strict();
export type KCodePluginsListResult = z.infer<typeof kcodePluginsListResultSchema>;

// ── Plugin 对话引用 catalog──
// Session-scoped 只读投影：带 sessionId → 该 Session 创建时冻结的身份 catalog；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。身份与能力字段保持
// identifiers-only，不携带 rootPath/配置等；可选 icon/displayName(I18n)/description(I18n)
// 仅供 UI 展示与 Picker 搜索，不参与身份、权限或 runtime reminder。
export const kcodePluginReferenceCatalogEntrySchema = z
  .object({
    // 仅 referenceCatalogWithCategory 返回；旧入口保持原结构。
    category: nonEmptyString.optional(),
    pluginId: nonEmptyString,
    name: nonEmptyString,
    marketplace: nonEmptyString,
    icon: z.string().optional(),
    // 商店 listing 的 display-only 本地化显示名投影（沿 icon 先例）：让 Picker 能按
    // 中文显示名搜索/展示；locale 解析复用 shared 的 plugin-display-name helper。
    displayName: z.string().optional(),
    displayNameI18n: z.record(z.string(), z.string()).optional(),
    // 仅供 Picker 展示，不进入能力身份或 model-only reminder。
    description: z.string().optional(),
    descriptionI18n: z.record(z.string(), z.string()).optional(),
    enabled: z.boolean(),
    // 非空 = 与其他 enabled Plugin 共享 manifest name 的 V1 fail closed 冲突：
    // Picker 禁选并展示原因，runtime 解析按 ambiguous 跳过。
    conflictingPluginIds: z.array(nonEmptyString),
    skillQualifiedNames: z.array(nonEmptyString),
    mcpServerNames: z.array(nonEmptyString),
    // 旧 Host 不投影该字段时按空数组兼容；只有新 Agent 会把它用于 reminder live 交集。
    subagentNames: z.array(nonEmptyString).default([]),
  })
  .strict();
export type KCodePluginReferenceCatalogEntry = z.infer<
  typeof kcodePluginReferenceCatalogEntrySchema
>;

export const kcodePluginsReferenceCatalogParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    // 已有 Session 的 Picker 必须带 sessionId 才能拿到 session-owned catalog；
    // session 不存在时按协议错误 fail closed，禁止静默回退 workspace authority。
    sessionId: nonEmptyString.optional(),
  })
  .strict();
export type KCodePluginsReferenceCatalogParams = z.infer<
  typeof kcodePluginsReferenceCatalogParamsSchema
>;
export const kcodePluginsReferenceCatalogResultSchema = z
  .object({
    authority: z.enum(["session", "workspace"]),
    plugins: z.array(kcodePluginReferenceCatalogEntrySchema),
  })
  .strict();
export type KCodePluginsReferenceCatalogResult = z.infer<
  typeof kcodePluginsReferenceCatalogResultSchema
>;

// ── Skill 对话引用 catalog──
// 新草稿读取 workspace 当前目录；已有 Session 读取 AgentRuntime 首次 context
// 初始化时冻结的发现结果。该协议只承载 Composer 的只读引用投影，不替代 Settings
// 的 Skill 管理接口，也不持久化 runtime 快照。
export const kcodeSkillReferenceCatalogEntrySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    description: z.string(),
    path: nonEmptyString,
    scope: z.enum(["workspace", "user", "plugin"]),
    enabled: z.literal(true),
    pluginName: nonEmptyString.optional(),
  })
  .strict();
export type KCodeSkillReferenceCatalogEntry = z.infer<typeof kcodeSkillReferenceCatalogEntrySchema>;

export const kcodeSkillsReferenceCatalogParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    // 带 sessionId 时必须命中该进程内的 resident Session；未知 Session fail closed，
    // 禁止回退到 workspace 当前目录而把新 Skill 泄漏进旧对话。
    sessionId: nonEmptyString.optional(),
  })
  .strict();
export type KCodeSkillsReferenceCatalogParams = z.infer<
  typeof kcodeSkillsReferenceCatalogParamsSchema
>;
export const kcodeSkillsReferenceCatalogResultSchema = z
  .object({
    authority: z.enum(["session", "workspace"]),
    skills: z.array(kcodeSkillReferenceCatalogEntrySchema),
  })
  .strict();
export type KCodeSkillsReferenceCatalogResult = z.infer<
  typeof kcodeSkillsReferenceCatalogResultSchema
>;

// ── 已保存工作流的 GUI 中枢──
// workspace 级、无会话的五个方法，照 skills/referenceCatalog 的先例：每次调用现扫
// `<cwd>/.kcode/workflows/`（挂载时快照会漏掉手改的文件）。形状与 @kcode/contracts 的
// saved-workflow.ts 逐字对齐——依赖方向是 contracts → shared，所以这里结构化地再声明一遍，
// 而不是 import；两边的 strict 形状由 bootstrap 侧的协议测试互相钉住。
export const kcodeSavedWorkflowArgTypeSchema = z.enum(["string", "number", "boolean", "json"]);
export type KCodeSavedWorkflowArgType = z.infer<typeof kcodeSavedWorkflowArgTypeSchema>;
export const kcodeSavedWorkflowArgDeclarationSchema = z
  .object({
    type: kcodeSavedWorkflowArgTypeSchema,
    description: z.string().optional(),
    required: z.boolean().optional(),
    default: z.unknown().optional(),
  })
  .strict();
export type KCodeSavedWorkflowArgDeclaration = z.infer<
  typeof kcodeSavedWorkflowArgDeclarationSchema
>;
export const kcodeSavedWorkflowArgsDeclarationSchema = z.record(
  z.string(),
  kcodeSavedWorkflowArgDeclarationSchema,
);
export type KCodeSavedWorkflowArgsDeclaration = z.infer<
  typeof kcodeSavedWorkflowArgsDeclarationSchema
>;
export const kcodeSavedWorkflowMetaSchema = z
  .object({
    description: nonEmptyString,
    whenToUse: nonEmptyString.optional(),
    args: kcodeSavedWorkflowArgsDeclarationSchema.optional(),
  })
  .strict();
export type KCodeSavedWorkflowMeta = z.infer<typeof kcodeSavedWorkflowMetaSchema>;
// 作用域两档：项目档落 `<cwd>/.kcode/workflows/`、全局档落 agent 机器的 `~/.kcode/workflows/`。作用域由文件所在目录推得，frontmatter 不存 scope。
export const kcodeSavedWorkflowScopeSchema = z.enum(["project", "global"]);
export type KCodeSavedWorkflowScope = z.infer<typeof kcodeSavedWorkflowScopeSchema>;
export const kcodeSavedWorkflowEntrySchema = z
  .object({
    name: nonEmptyString,
    description: z.string(),
    whenToUse: z.string().optional(),
    args: kcodeSavedWorkflowArgsDeclarationSchema.optional(),
    scope: kcodeSavedWorkflowScopeSchema,
    path: nonEmptyString,
  })
  .strict();
export type KCodeSavedWorkflowEntry = z.infer<typeof kcodeSavedWorkflowEntrySchema>;
export const kcodeSavedWorkflowInvalidEntrySchema = z
  .object({ path: nonEmptyString, reason: nonEmptyString })
  .strict();
export type KCodeSavedWorkflowInvalidEntry = z.infer<typeof kcodeSavedWorkflowInvalidEntrySchema>;
/** 名字非法 / 未找到 / frontmatter 坏 / 读错——与 core store 的 resolve 失败四态逐字对应。 */
export const kcodeSavedWorkflowFailureReasonSchema = z.enum([
  "invalid_name",
  "not_found",
  "parse_error",
  "read_error",
]);
export type KCodeSavedWorkflowFailureReason = z.infer<typeof kcodeSavedWorkflowFailureReasonSchema>;
const kcodeSavedWorkflowFailureSchema = z
  .object({
    ok: z.literal(false),
    reason: kcodeSavedWorkflowFailureReasonSchema,
    detail: z.string().optional(),
  })
  .strict();

export const kcodeWorkflowsListParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    // 缺省即 `project`（本项目档）。给 `global` 时改扫本机 `~/.kcode/workflows/`；此时 `workspace`
    // 仍必填，但只是**载体运行时**——协议处理器对全局档不读它的路径。
    scope: kcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type KCodeWorkflowsListParams = z.infer<typeof kcodeWorkflowsListParamsSchema>;
export const kcodeWorkflowsListResultSchema = z
  .object({
    workflows: z.array(kcodeSavedWorkflowEntrySchema),
    invalid: z.array(kcodeSavedWorkflowInvalidEntrySchema),
    // 扫过的目录（本地绝对路径），即使目录还不存在也回：GUI 的文件监听靠它 watch。
    dir: nonEmptyString,
  })
  .strict();
export type KCodeWorkflowsListResult = z.infer<typeof kcodeWorkflowsListResultSchema>;

export const kcodeWorkflowsGetParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    name: nonEmptyString,
    // 缺省 `project`；`global` 时只查本机全局根。`workspace` 语义同 list（全局档只当载体）。
    scope: kcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type KCodeWorkflowsGetParams = z.infer<typeof kcodeWorkflowsGetParamsSchema>;
export const kcodeWorkflowsGetResultSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      name: nonEmptyString,
      path: nonEmptyString,
      scope: kcodeSavedWorkflowScopeSchema,
      meta: kcodeSavedWorkflowMetaSchema,
      /** 脚本本体（frontmatter 之后逐字节），即被类型检查与执行的那一份。 */
      script: z.string(),
    })
    .strict(),
  kcodeSavedWorkflowFailureSchema,
]);
export type KCodeWorkflowsGetResult = z.infer<typeof kcodeWorkflowsGetResultSchema>;

export const kcodeWorkflowsUpdateMetaParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    name: nonEmptyString,
    meta: kcodeSavedWorkflowMetaSchema,
    // 缺省 `project`；`global` 时只写本机全局根那一份。`workspace` 语义同 list。
    scope: kcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type KCodeWorkflowsUpdateMetaParams = z.infer<typeof kcodeWorkflowsUpdateMetaParamsSchema>;
export const kcodeWorkflowsUpdateMetaResultSchema = z.union([
  z.object({ ok: z.literal(true), path: nonEmptyString }).strict(),
  kcodeSavedWorkflowFailureSchema,
]);
export type KCodeWorkflowsUpdateMetaResult = z.infer<typeof kcodeWorkflowsUpdateMetaResultSchema>;

export const kcodeWorkflowsDeleteParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    name: nonEmptyString,
    // 缺省 `project`；`global` 时按 scope 选根删除（不再写死 roots[0]）。`workspace` 语义同 list。
    scope: kcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type KCodeWorkflowsDeleteParams = z.infer<typeof kcodeWorkflowsDeleteParamsSchema>;
export const kcodeWorkflowsDeleteResultSchema = z.union([
  z.object({ ok: z.literal(true), path: nonEmptyString }).strict(),
  kcodeSavedWorkflowFailureSchema,
]);
export type KCodeWorkflowsDeleteResult = z.infer<typeof kcodeWorkflowsDeleteResultSchema>;

export const KCODE_WORKFLOWS_RUNS_MAX_LIMIT = 50;
export const kcodeWorkflowsRunsParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    /** 只要这个名字的 run（`dwf_run.name` 字面等值）；缺省即本项目全部 run。 */
    name: nonEmptyString.optional(),
    limit: z.number().int().min(1).max(KCODE_WORKFLOWS_RUNS_MAX_LIMIT),
    // 缺省 `project`：只查 `dwf_run.cwd === workspacePath` 的 run。`global` 时**不**按 cwd 过滤，
    // 跨所有项目取该名字的运行历史（全局工作流在任何项目里跑，历史因此跨 cwd）；结果行带 `cwd`
    // 供 GUI 标项目。`workspace` 语义同 list（全局档只当载体）。
    scope: kcodeSavedWorkflowScopeSchema.optional(),
  })
  .strict();
export type KCodeWorkflowsRunsParams = z.infer<typeof kcodeWorkflowsRunsParamsSchema>;
// 三终态词汇：errored = 脚本之错，stopped = 被停下（可恢复）。
export const kcodeSavedWorkflowRunStatusSchema = z.enum([
  "pending",
  "running",
  "completed",
  "errored",
  "stopped",
]);
export type KCodeSavedWorkflowRunStatus = z.infer<typeof kcodeSavedWorkflowRunStatusSchema>;
export const kcodeSavedWorkflowRunStopReasonSchema = z.enum([
  "user",
  "model",
  "provider",
  "interrupted",
  "superseded",
]);
export const kcodeSavedWorkflowRunSchema = z
  .object({
    runId: nonEmptyString,
    name: z.string().optional(),
    status: kcodeSavedWorkflowRunStatusSchema,
    // `status === "stopped"` 才在场。
    stopReason: kcodeSavedWorkflowRunStopReasonSchema.optional(),
    createdAt: z.number(),
    updatedAt: z.number(),
    spentTokens: z.number(),
    /** 发起它的会话与 CreateWorkflow 工具调用：有这两个才能从中枢打开实例详情。老行可缺。 */
    parentSessionId: z.string().optional(),
    toolCallId: z.string().optional(),
    args: z.record(z.string(), z.unknown()).optional(),
    // 实际运行的项目目录（`dwf_run.cwd`）。全局档的 `workflows/runs` 跨 cwd 查询，GUI 用它给
    // 每行标项目；项目档变体里它恒等于 workspacePath，GUI 可忽略。老行可缺。
    cwd: z.string().optional(),
    // 这次运行发布的**用户面产物**：中枢的运行历史行在
    // 状态词之后画一串 kind chips，详情页头部的「最近产物」条取最近一次 completed run 的这一份。
    // ⚠ 术语：这里的 artifact 是脚本经 `artifact.*` 发布给用户看的产出，不是脚本的顶层返回值。
    // 只带 chip 画得下的字段（≤ 8 件，取最新版的元数据）；字节与条目经 v4 查询按需读。
    // optional，照上面 `cwd` 的先例：老 CLI 不发，少一个键是退化不是错误。
    artifacts: z
      .array(
        z
          .object({
            id: nonEmptyString,
            kind: z.enum(["file", "markdown", "chart", "table", "metrics", "board"]),
            title: z.string().optional(),
            version: z.number(),
            contentType: z.string().optional(),
          })
          .strict(),
      )
      .max(8)
      .optional(),
  })
  .strict();
export type KCodeSavedWorkflowRun = z.infer<typeof kcodeSavedWorkflowRunSchema>;
export const kcodeWorkflowsRunsResultSchema = z
  .object({
    runs: z.array(kcodeSavedWorkflowRunSchema),
    /** 为真时才在场：还有更多 run 没进这一页（多取一条判定，不是 length === limit）。 */
    truncated: z.literal(true).optional(),
  })
  .strict();
export type KCodeWorkflowsRunsResult = z.infer<typeof kcodeWorkflowsRunsResultSchema>;

// workflows/move：把本机全局根的同名文件搬到 `workspace` 项目根。**只此一向**：项目→全局不是搬文件而是模型的概括（「提升为
// 全局」在该项目开新会话、经 SaveWorkflow 另存），所以没有 `to` 参数。同机同用户，rename 优先、EXDEV
// 回落 copy+unlink；逐字节搬，不改内容（frontmatter 不存 scope）；`move` 不覆盖——目标已存在即拒绝
// （覆盖是 SaveWorkflow 经确认窗才有的动作，不变式 7）。`workspace` 既是载体运行时也是目标项目。
export const kcodeWorkflowsMoveParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    name: nonEmptyString,
  })
  .strict();
export type KCodeWorkflowsMoveParams = z.infer<typeof kcodeWorkflowsMoveParamsSchema>;
export const kcodeWorkflowsMoveResultSchema = z.union([
  z
    .object({
      ok: z.literal(true),
      /** 源落点路径（全局根，搬走前）。 */
      from: nonEmptyString,
      /** 目标落点路径（项目根，搬到处）。 */
      to: nonEmptyString,
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      // target_exists：目标档已有同名（move 不覆盖）；not_found：源档没有这个名字；
      // read_error / write_error：搬运时的 I/O 失败；invalid_name：名字先验没过。
      reason: z.enum(["invalid_name", "not_found", "target_exists", "read_error", "write_error"]),
      path: z.string().optional(),
      detail: z.string().optional(),
    })
    .strict(),
]);
export type KCodeWorkflowsMoveResult = z.infer<typeof kcodeWorkflowsMoveResultSchema>;

// 推荐 Prompt 的可信插件解析：UI 不拆解 stableId，也不从旧目录快照推断可安装性。
export const kcodePluginSuggestedReferenceStatusSchema = z.enum([
  "ready",
  "disabled",
  "missing",
  "conflict",
  "unavailable",
]);
export type KCodePluginSuggestedReferenceStatus = z.infer<
  typeof kcodePluginSuggestedReferenceStatusSchema
>;
export const kcodePluginOperationStateSchema = z.enum([
  "checking",
  "refreshing",
  "installing",
  "enabling",
  "cancelling",
  "cancelled",
  "complete",
  "failed",
]);
export type KCodePluginOperationState = z.infer<typeof kcodePluginOperationStateSchema>;
export const kcodePluginOperationProgressNotificationSchema = z
  .object({
    operationId: nonEmptyString,
    state: z.literal("refreshing"),
  })
  .strict();
export type KCodePluginOperationProgressNotification = z.infer<
  typeof kcodePluginOperationProgressNotificationSchema
>;
export const kcodePluginsResolveSuggestedReferenceParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    stableId: nonEmptyString,
    operationId: nonEmptyString,
    clientMode: kcodeDeliveryKindSchema,
    deliveryKind: kcodeDeliveryKindSchema,
  })
  .strict();
export type KCodePluginsResolveSuggestedReferenceParams = z.infer<
  typeof kcodePluginsResolveSuggestedReferenceParamsSchema
>;
export const kcodePluginsSetEnabledParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    enabled: z.boolean(),
    operationId: nonEmptyString.optional(),
    scope: kcodePluginScopeSchema.optional(),
  })
  .strict();
export const kcodePluginsSetEnabledResultSchema = z
  .object({
    plugin: kcodePluginInfoSchema,
    enabled: z.boolean(),
  })
  .strict();
export type KCodePluginsSetEnabledResult = z.infer<typeof kcodePluginsSetEnabledResultSchema>;

// 商店信息（Store Listing）：目录条目携带的展示性元数据（显示名/icon/分类/作者/链接/hero/
// 示例提示词），全部可选，UI 缺失时按降级矩阵处理（字母头像/隐藏区块/省略信息行）。
// i18n 采用 `<字段>I18n` map，locale 解析复用 shared 的 plugin-display-name helper。
export const kcodePluginStoreListingSchema = z
  .object({
    displayName: z.string().optional(),
    displayNameI18n: z.record(z.string(), z.string()).optional(),
    descriptionI18n: z.record(z.string(), z.string()).optional(),
    icon: z.string().optional(),
    category: z.string().optional(),
    author: z.string().optional(),
    authorUrl: z.string().optional(),
    homepage: z.string().optional(),
    privacyPolicy: z.string().optional(),
    termsOfService: z.string().optional(),
    heroImage: z.string().optional(),
    examplePrompts: z.array(z.string()).optional(),
    examplePromptsI18n: z.record(z.string(), z.array(z.string())).optional(),
    /**
     * 需要付费套餐才好用的插件：市场目录条目声明 `requiresPaidPlan: true`，
     * UI 在标题右侧展示提示图标。描述的是「使用条件」而非「插件是收费商品」——
     * 不参与安装门禁与计费，命名也不绑定具体套餐商品名。
     */
    requiresPaidPlan: z.boolean().optional(),
  })
  .strict();
export type KCodePluginStoreListing = z.infer<typeof kcodePluginStoreListingSchema>;

export const kcodePluginsResolveSuggestedReferenceResultSchema = z
  .object({
    stableId: nonEmptyString,
    status: kcodePluginSuggestedReferenceStatusSchema,
    marketplace: nonEmptyString.optional(),
    pluginName: nonEmptyString.optional(),
    sourceTrust: z.literal("official").optional(),
    // 官方 Marketplace listing 的可选展示投影；不参与身份、安装或权限判断。
    icon: z.string().optional(),
    listing: kcodePluginStoreListingSchema.optional(),
    diagnostics: z.array(kcodePluginDiagnosticSchema),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.status !== "ready" && value.status !== "disabled" && value.status !== "missing") {
      return;
    }
    if (!value.marketplace || !value.pluginName || value.sourceTrust !== "official") {
      context.addIssue({
        code: "custom",
        message: "actionable suggested Plugin results require trusted install identity",
      });
    }
  });
export type KCodePluginsResolveSuggestedReferenceResult = z.infer<
  typeof kcodePluginsResolveSuggestedReferenceResultSchema
>;

export const kcodePluginMarketplaceSummarySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    source: jsonObjectSchema,
    description: z.string().optional(),
    lastUpdated: z.string().optional(),
    pluginCount: z.number().int().nonnegative(),
    isOfficial: z.boolean().optional(),
    // 目录顶层 featured 策展名单（商店「公开」分段 Featured 区）。
    featured: z.array(z.string()).optional(),
    refreshFailure: z
      .object({
        code: z.string(),
        failedAt: z.string(),
        message: z.string(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodePluginMarketplaceSummary = z.infer<typeof kcodePluginMarketplaceSummarySchema>;

export const kcodeAvailablePluginSummarySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    marketplace: nonEmptyString,
    description: z.string().optional(),
    version: z.string().optional(),
    installed: z.boolean(),
    componentTypes: z.array(z.string()).optional(),
    listing: kcodePluginStoreListingSchema.optional(),
  })
  .strict();
export type KCodeAvailablePluginSummary = z.infer<typeof kcodeAvailablePluginSummarySchema>;

export const kcodeInstalledPluginSummarySchema = z
  .object({
    id: nonEmptyString,
    name: nonEmptyString,
    marketplace: nonEmptyString,
    description: z.string().optional(),
    version: z.string().optional(),
    enabled: z.boolean(),
    scope: kcodePluginScopeSchema,
    installPath: z.string().optional(),
    installedAt: z.string().optional(),
    componentTypes: z.array(z.string()).optional(),
    hookDetails: z.array(kcodePluginHookDetailSchema).optional(),
    updateStatus: z.enum(["none", "update-available", "version-changed"]).optional(),
    latestVersion: z.string().optional(),
    listing: kcodePluginStoreListingSchema.optional(),
  })
  .strict();
export type KCodeInstalledPluginSummary = z.infer<typeof kcodeInstalledPluginSummarySchema>;

export const kcodePluginsOverviewParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    configScope: kcodePluginScopeSchema.optional(),
  })
  .strict();
export const kcodePluginsOverviewResultSchema = z
  .object({
    marketplaces: z.array(kcodePluginMarketplaceSummarySchema),
    availablePlugins: z.array(kcodeAvailablePluginSummarySchema),
    installedPlugins: z.array(kcodeInstalledPluginSummarySchema),
    restorableBuiltins: z.array(kcodeAvailablePluginSummarySchema),
    diagnostics: z.array(kcodePluginDiagnosticSchema),
    capability: z
      .object({
        supported: z.boolean(),
        reason: z.string().optional(),
      })
      .strict(),
  })
  .strict();
export type KCodePluginsOverviewResult = z.infer<typeof kcodePluginsOverviewResultSchema>;

export const kcodePluginsMarketplaceAddParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    source: nonEmptyString,
    dryRun: z.boolean().optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict();
export const kcodePluginsMarketplaceRemoveParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    marketplace: nonEmptyString,
  })
  .strict();
export const kcodePluginsMarketplaceUpdateParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    marketplace: nonEmptyString.optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict();
export const kcodePluginsMarketplaceMutationResultSchema = z
  .object({
    marketplace: kcodePluginMarketplaceSummarySchema.optional(),
    marketplaces: z.array(kcodePluginMarketplaceSummarySchema).optional(),
    diagnostics: z.array(kcodePluginDiagnosticSchema).optional(),
  })
  .strict();
export type KCodePluginsMarketplaceMutationResult = z.infer<
  typeof kcodePluginsMarketplaceMutationResultSchema
>;

export const kcodePluginsInstallParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginName: nonEmptyString,
    marketplace: nonEmptyString,
    scope: kcodePluginScopeSchema.optional(),
    dryRun: z.boolean().optional(),
    operationId: nonEmptyString.optional(),
  })
  .strict();
export const kcodePluginsCancelOperationParamsSchema = z
  .object({
    operationId: nonEmptyString,
  })
  .strict();
export type KCodePluginsCancelOperationParams = z.infer<
  typeof kcodePluginsCancelOperationParamsSchema
>;

export const kcodePluginsCancelOperationResultSchema = z
  .object({
    operationId: nonEmptyString,
    cancelled: z.boolean(),
  })
  .strict();
export type KCodePluginsCancelOperationResult = z.infer<
  typeof kcodePluginsCancelOperationResultSchema
>;
export const kcodePluginsUninstallParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString.optional(),
    pluginName: nonEmptyString.optional(),
    marketplace: nonEmptyString.optional(),
    removeCache: z.boolean().optional(),
  })
  .strict();
export const kcodePluginsInstallResultSchema = z
  .object({
    installedPlugins: z.array(kcodeInstalledPluginSummarySchema),
    dependencyClosure: z.array(z.string()),
    diagnostics: z.array(kcodePluginDiagnosticSchema),
  })
  .strict();
export type KCodePluginsInstallResult = z.infer<typeof kcodePluginsInstallResultSchema>;

export const kcodePluginsUninstallResultSchema = z
  .object({
    removedPlugin: kcodeInstalledPluginSummarySchema.optional(),
    diagnostics: z.array(kcodePluginDiagnosticSchema),
  })
  .strict();
export type KCodePluginsUninstallResult = z.infer<typeof kcodePluginsUninstallResultSchema>;

export const kcodePluginsUpdateParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString.optional(),
    marketplace: nonEmptyString.optional(),
  })
  .strict();
export const kcodePluginsRestoreBuiltinParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
  })
  .strict();
export const kcodePluginsRestoreBuiltinResultSchema = z
  .object({
    pluginId: nonEmptyString,
    diagnostics: z.array(kcodePluginDiagnosticSchema),
  })
  .strict();
export type KCodePluginsRestoreBuiltinResult = z.infer<
  typeof kcodePluginsRestoreBuiltinResultSchema
>;

export const kcodePluginsConfigureParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    options: jsonObjectSchema,
    clearOptionKeys: z.array(nonEmptyString).optional(),
    scope: kcodePluginScopeSchema.optional(),
    dryRun: z.boolean().optional(),
  })
  .strict();
export const kcodePluginsConfigureResultSchema = z
  .object({
    pluginId: nonEmptyString,
    diagnostics: z.array(kcodePluginDiagnosticSchema),
  })
  .strict();
export type KCodePluginsConfigureResult = z.infer<typeof kcodePluginsConfigureResultSchema>;

export const kcodePluginsResetConfigParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginId: nonEmptyString,
    scope: kcodePluginScopeSchema.optional(),
  })
  .strict();
export type KCodePluginsResetConfigParams = z.infer<typeof kcodePluginsResetConfigParamsSchema>;

export const kcodePluginsValidateParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginName: nonEmptyString.optional(),
    marketplace: nonEmptyString.optional(),
    source: nonEmptyString.optional(),
  })
  .strict();
export const kcodePluginsValidateResultSchema = z
  .object({
    ok: z.boolean(),
    diagnostics: z.array(kcodePluginDiagnosticSchema),
    compatibility: z
      .object({
        runnable: z.array(z.string()),
        diagnosticOnly: z.array(z.string()),
        unsupported: z.array(z.string()),
      })
      .strict(),
  })
  .strict();
export type KCodePluginsValidateResult = z.infer<typeof kcodePluginsValidateResultSchema>;

// plugins/describe：按需枚举单个插件的组件「名称 + 描述」。
// 已安装插件读本地缓存目录；未安装候选按需解析/临时 clone 源后枚举再清理。
export const kcodePluginsDescribeParamsSchema = z
  .object({
    workspace: kcodeWorkspaceRefSchema,
    pluginName: nonEmptyString,
    marketplace: nonEmptyString,
  })
  .strict();
export const kcodePluginsDescribeResultSchema = z
  .object({
    components: z.array(kcodePluginComponentGroupSchema),
    diagnostics: z.array(kcodePluginDiagnosticSchema).optional(),
    // 插件包内 plugin.json 的展示性回退字段；未安装候选详情页信息区在商店 listing 缺失时兜底。
    metadata: z
      .object({
        author: z.string().optional(),
        authorUrl: z.string().optional(),
        homepage: z.string().optional(),
        version: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();
export type KCodePluginsDescribeResult = z.infer<typeof kcodePluginsDescribeResultSchema>;

export const kcodeAutomationScheduleRuleSchema = z
  .object({
    unit: z.enum(["minute", "hourly", "daily", "weekly", "monthly", "yearly"]),
    interval: z.number().int().positive(),
    hour: z.number().int().min(0).max(23),
    minute: z.number().int().min(0).max(59),
    anchorAt: z.number().int(),
    weekdays: z.array(z.number().int().min(0).max(6)).optional(),
    monthDays: z.array(z.number().int().min(1).max(31)).optional(),
    /** yearly 用：1-12 人类月份。缺省回退 anchorAt 的月份（兼容未写该字段的旧记录）。 */
    months: z.array(z.number().int().min(1).max(12)).optional(),
    monthlyMode: z.enum(["date", "weekday"]).optional(),
  })
  .strict();
export type KCodeAutomationScheduleRuleProtocol = z.infer<typeof kcodeAutomationScheduleRuleSchema>;

/** 会话侧长间隔周期 carrier 的 unit 枚举（与 scheduleRule.unit 同集）。 */
export const kcodeAutomationIntervalUnitSchema = z.enum([
  "minute",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);

export const kcodeAutomationProtocolSchema = z
  .object({
    automationId: nonEmptyString,
    title: z.string(),
    cronExpr: nonEmptyString,
    prompt: nonEmptyString,
    modelSelection: modelSelectionSchema.optional(),
    mode: kcodeTaskModeSchema.optional(),
    targetTaskId: nonEmptyString.optional(),
    enabled: z.boolean(),
    lifecycleStatus: z.enum(["active", "completed", "failed", "paused"]),
    nextRunAt: timestampMsSchema.optional(),
    lastRunAt: timestampMsSchema.optional(),
    runCount: z.number().int().nonnegative(),
    recurring: z.boolean(),
    maxRuns: z.number().int().positive().optional(),
    // 自定义重复规则；缺省时调度回退到解析 cronExpr。会话卡片必须读到本字段才能展示
    // cron 无法表达的真实间隔（如每50小时、每40天，兼容 cronExpr 只是 0 * * * *）。
    scheduleRule: kcodeAutomationScheduleRuleSchema.optional(),
  })
  .strict();
export type KCodeAutomationProtocol = z.infer<typeof kcodeAutomationProtocolSchema>;

export const kcodeAutomationCreateParamsSchema = z
  .object({
    title: z.string().optional(),
    cronExpr: nonEmptyString,
    relativeDelayMinutes: z.number().int().positive().max(525_600).optional(),
    prompt: nonEmptyString,
    modelSelection: modelSelectionSchema.optional(),
    mode: kcodeTaskModeSchema.optional(),
    targetTaskId: nonEmptyString.optional(),
    botDeliveryTarget: kcodeAutomationBotDeliveryTargetSchema.optional(),
    recurring: z.boolean().optional(),
    maxRuns: z.number().int().positive().optional(),
    // 会话侧自定义重复 carrier：每 N 分钟/小时/天/周/月/年均通过此字段归一化为权威 scheduleRule，
    // cronExpr 仅作合法兼容展示。
    intervalUnit: kcodeAutomationIntervalUnitSchema.optional(),
    interval: z.number().int().min(1).max(200).optional(),
  })
  .strict()
  // intervalUnit 与 interval 必须配对提交（只传一个无法确定真实间隔）。
  .refine((input) => (input.intervalUnit === undefined) === (input.interval === undefined), {
    message: "intervalUnit and interval must be set together",
    path: ["interval"],
  })
  // 周期 carrier 与一次性相对延迟语义冲突，禁止同传。
  .refine((input) => input.intervalUnit === undefined || input.relativeDelayMinutes === undefined, {
    message: "intervalUnit cannot combine with a relative delayMinutes",
    path: ["intervalUnit"],
  })
  .refine((input) => input.intervalUnit === undefined || input.recurring !== false, {
    message: "intervalUnit is a recurring carrier and cannot combine with recurring=false",
    path: ["recurring"],
  })
  .refine((input) => input.intervalUnit === undefined || input.maxRuns === undefined, {
    message: "intervalUnit is a recurring carrier and cannot combine with maxRuns",
    path: ["maxRuns"],
  });
export type KCodeAutomationCreateProtocolParams = z.infer<typeof kcodeAutomationCreateParamsSchema>;

export const kcodeAutomationCreateResultSchema = z
  .object({ automation: kcodeAutomationProtocolSchema })
  .strict();
export type KCodeAutomationCreateProtocolResult = z.infer<typeof kcodeAutomationCreateResultSchema>;

export const kcodeAutomationUpdateParamsSchema = z
  .object({
    automationId: nonEmptyString,
    title: nonEmptyString.optional(),
    cronExpr: nonEmptyString.optional(),
    prompt: nonEmptyString.optional(),
    recurring: z.boolean().optional(),
    maxRuns: z.number().int().positive().nullable().optional(),
    // 会话侧自定义重复 carrier（同 create 侧语义）。
    intervalUnit: kcodeAutomationIntervalUnitSchema.optional(),
    interval: z.number().int().min(1).max(200).optional(),
  })
  .strict()
  .refine(
    (input) =>
      input.title !== undefined ||
      input.cronExpr !== undefined ||
      input.prompt !== undefined ||
      input.recurring !== undefined ||
      input.maxRuns !== undefined ||
      input.intervalUnit !== undefined,
    { message: "automation update requires at least one field" },
  )
  .refine((input) => input.maxRuns !== null || input.recurring === true, {
    message: "clearing maxRuns requires recurring=true",
    path: ["maxRuns"],
  })
  .refine((input) => input.recurring !== true || typeof input.maxRuns !== "number", {
    message: "recurring=true cannot be combined with a numeric maxRuns",
    path: ["maxRuns"],
  })
  // intervalUnit 与 interval 必须配对提交（同 create 侧语义）。
  .refine((input) => (input.intervalUnit === undefined) === (input.interval === undefined), {
    message: "intervalUnit and interval must be set together",
    path: ["interval"],
  })
  .refine((input) => input.intervalUnit === undefined || input.recurring !== false, {
    message: "intervalUnit is a recurring carrier and cannot combine with recurring=false",
    path: ["recurring"],
  })
  .refine(
    (input) =>
      input.intervalUnit === undefined ||
      input.maxRuns === undefined ||
      (input.maxRuns === null && input.recurring === true),
    {
      message:
        "intervalUnit is a recurring carrier and only allows maxRuns=null with recurring=true",
      path: ["maxRuns"],
    },
  );
export type KCodeAutomationUpdateProtocolParams = z.infer<typeof kcodeAutomationUpdateParamsSchema>;
export const kcodeAutomationUpdateResultSchema = z
  .object({ automation: kcodeAutomationProtocolSchema })
  .strict();
export type KCodeAutomationUpdateProtocolResult = z.infer<typeof kcodeAutomationUpdateResultSchema>;

export const kcodeAutomationListParamsSchema = z.object({}).strict();
export type KCodeAutomationListProtocolParams = z.infer<typeof kcodeAutomationListParamsSchema>;
export const kcodeAutomationListResultSchema = z
  .object({ automations: z.array(kcodeAutomationProtocolSchema) })
  .strict();
export type KCodeAutomationListProtocolResult = z.infer<typeof kcodeAutomationListResultSchema>;

export const kcodeAutomationCheckTaskBindingParamsSchema = z
  .object({ targetTaskId: nonEmptyString })
  .strict();
export type KCodeAutomationCheckTaskBindingProtocolParams = z.infer<
  typeof kcodeAutomationCheckTaskBindingParamsSchema
>;
export const kcodeAutomationCheckTaskBindingResultSchema = z
  .object({ bound: z.boolean() })
  .strict();
export type KCodeAutomationCheckTaskBindingProtocolResult = z.infer<
  typeof kcodeAutomationCheckTaskBindingResultSchema
>;

export const kcodeAutomationDeleteParamsSchema = z
  .object({ automationId: nonEmptyString })
  .strict();
export type KCodeAutomationDeleteProtocolParams = z.infer<typeof kcodeAutomationDeleteParamsSchema>;
export const kcodeAutomationDeleteResultSchema = z.object({ deleted: z.boolean() }).strict();
export type KCodeAutomationDeleteProtocolResult = z.infer<typeof kcodeAutomationDeleteResultSchema>;

// ---- Off-Peak（闲时任务）会话内创建协议----
// 与 automation 兄弟并列（独立域，禁止互相复用标记/表）。workspace 由 host 端从
// 当前 session 注入，不进协议参数（对称 automation/create）。permissionMode 只开放产品
// 四档词表；缺省解析在 host 端（yolo / allowed_models 末位 / 最高推理档）。
export const kcodeOffPeakPermissionModeSchema = z.enum(["build", "edit", "plan", "yolo"]);
export type KCodeOffPeakProtocolPermissionMode = z.infer<typeof kcodeOffPeakPermissionModeSchema>;

export const kcodeOffPeakCreateParamsSchema = z
  .object({
    title: nonEmptyString,
    prompt: nonEmptyString,
    permissionMode: kcodeOffPeakPermissionModeSchema.optional(),
    model: nonEmptyString.optional(),
    thoughtLevel: nonEmptyString.optional(),
    // 会话内创建绑定当前会话（对齐 automation/create 的 targetTaskId），由 CLI 端口填入。
    boundSessionId: nonEmptyString.optional(),
  })
  .strict();
export type KCodeOffPeakCreateProtocolParams = z.infer<typeof kcodeOffPeakCreateParamsSchema>;

// 协议侧任务快照：轮尾卡片与 OffPeakList 的最小字段面。
// 不暴露 serverTicketId（跨边界禁带）。
export const kcodeOffPeakTaskSnapshotSchema = z
  .object({
    offPeakTaskId: nonEmptyString,
    title: z.string(),
    status: z.enum(["queued", "paused", "running", "completed", "failed", "cancelled"]),
    queuePosition: z.number().int().positive().optional(),
    sessionId: nonEmptyString.optional(),
    createdAt: z.number().int().nonnegative(),
  })
  .strict();
export type KCodeOffPeakTaskProtocolSnapshot = z.infer<typeof kcodeOffPeakTaskSnapshotSchema>;

// 失败分类跨协议保真（镜像 shared OffPeakTaskCreateResult 的判别联合，错误不降级为字符串）。
// model 白名单预校失败复用 client_validation 分类 + errorCode "model_not_allowed"，不扩分类枚举。
export const kcodeOffPeakCreateResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), task: kcodeOffPeakTaskSnapshotSchema }).strict(),
  z
    .object({
      ok: z.literal(false),
      failureStage: z.enum(["client_validation", "ticket_request", "local_persist"]),
      errorCategory: z.enum([
        "client_validation",
        "eligibility_3101",
        "quota_3103",
        "network",
        "invalid_response",
        "local_persist",
        "unknown",
      ]),
      errorCode: z.string(),
    })
    .strict(),
]);
export type KCodeOffPeakCreateProtocolResult = z.infer<typeof kcodeOffPeakCreateResultSchema>;

export const kcodeOffPeakListParamsSchema = z.object({}).strict();
export type KCodeOffPeakListProtocolParams = z.infer<typeof kcodeOffPeakListParamsSchema>;
export const kcodeOffPeakListResultSchema = z
  .object({ tasks: z.array(kcodeOffPeakTaskSnapshotSchema) })
  .strict();
export type KCodeOffPeakListProtocolResult = z.infer<typeof kcodeOffPeakListResultSchema>;

export const kcodeProtocolMethods = {
  runtimeCapabilities: "runtime/capabilities",
  computerUseOperationEvent: "computer-use/operation-event",
  sessionCreate: "session/create",
  sessionResume: "session/resume",
  sessionList: "session/list",
  sessionSubagents: "session/subagents",
  sessionRequestRuntimePreferences: "session/requestRuntimePreferences",
  sessionRead: "session/read",
  sessionMessages: "session/messages",
  sessionEvents: "session/events",
  sessionDebug: "session/debug",
  sessionSubscribe: "session/subscribe",
  // @deprecated（部分）：send 主路径已收敛 v4 sendText；仅剩 adapter 附件
  // 回退分支消费（v4 attachmentRef 上传/寄存命令面未建模），待附件命令面落地后移除。
  sessionSend: "session/send",
  // @deprecated：host 客户端方法已删（stop 已收敛 v4 stop 命令）。
  // wire case 留兼容（transport bypass 名单仍引用），随旧词整体删除时一并移除。
  sessionStop: "session/stop",
  // @deprecated：host 客户端方法已删（已收敛 v4 cancelBackgroundWork 命令）。
  // wire case 留兼容，随旧词整体删除时一并移除。
  sessionCancelBackgroundTask: "session/cancelBackgroundTask",
  // @deprecated：host 客户端方法已删（v4 forkAssistant 原生 handler 经
  // forkSessionAtMessage 钩子直调 server-operations.forkSession op）。wire case 与
  // fork params/result schema 保留＝op 存活面；fork record 归 v4 原生重写。
  sessionFork: "session/fork",
  sessionCompact: "session/compact",
  sessionGoal: "session/goal",
  sessionClose: "session/close",
  // setModel 仍被 kcodeSessionService 的 desktop 旧链路消费；replayable
  // switchModelConfig 已直接由目标 Environment Registry 解析 Selection。
  sessionSetModel: "session/setModel",
  // replayable facade 的思考深度/模式已收敛 v4 switchModelConfig/
  // switchCollaborationMode；剩余消费 = kcodeSessionService（desktop 旧链路，随
  // 桌面 v4 UI 收口清零）与 setMode 的 auto 值残留（v4 值域刻意排除 auto）。
  sessionSetThoughtLevel: "session/setThoughtLevel",
  sessionSetMode: "session/setMode",
  workspaceReadPresentation: "workspace/readPresentation",
  workspaceHookTrustGrant: "workspace/hooks/trustGrant",
  // 进程级 Account Provider Config 与 workspace 运行目录分离。
  providerUpdateAccountConfig: "provider/updateAccountConfig",
  workspaceUpdateInteractionPreferences: "workspace/updateInteractionPreferences",
  workspaceUpdateModelIoPreferences: "workspace/updateModelIoPreferences",
  // Off-Peak 工具面门禁是 workspace 级事实（灰度 + 本地/远程），由 host 在 agent 就绪时同步；
  // CLI 对 legacy create/resume 与 v4 冷恢复统一读取。旧 CLI method-not-found → host 降级忽略。
  workspaceUpdateOffPeakToolPolicy: "workspace/updateOffPeakToolPolicy",
  // 动态工作流灰度门禁：同 Off-Peak 的同步模式。
  workspaceUpdateDynamicWorkflowPolicy: "workspace/updateDynamicWorkflowPolicy",
  // LLM 执行面在 CLI，直连不可行；消费仅 services 内部
  // （commit message），待 v4 workspace 查询/命令面覆盖后移除。
  workspaceGenerateText: "workspace/generateText",
  workspaceCancelGenerateText: "workspace/cancelGenerateText",
  providerTestModelConnectivity: "provider/testModelConnectivity",
  mcpList: "mcp/list",
  pluginsList: "plugins/list",
  pluginsReferenceCatalog: "plugins/referenceCatalog",
  pluginsReferenceCatalogWithCategory: "plugins/referenceCatalogWithCategory",
  skillsReferenceCatalog: "skills/referenceCatalog",
  // 已保存工作流的 GUI 中枢：workspace 级、无会话。
  workflowsList: "workflows/list",
  workflowsGet: "workflows/get",
  workflowsUpdateMeta: "workflows/updateMeta",
  workflowsDelete: "workflows/delete",
  workflowsRuns: "workflows/runs",
  // 在项目档 / 全局档之间移动同名文件。
  workflowsMove: "workflows/move",
  pluginsResolveSuggestedReference: "plugins/resolveSuggestedReference",
  pluginsSetEnabled: "plugins/setEnabled",
  pluginsOverview: "plugins/overview",
  pluginsMarketplaceAdd: "plugins/marketplace/add",
  pluginsMarketplaceRemove: "plugins/marketplace/remove",
  pluginsMarketplaceUpdate: "plugins/marketplace/update",
  pluginsInstall: "plugins/install",
  pluginsCancelOperation: "plugins/cancelOperation",
  pluginsUninstall: "plugins/uninstall",
  pluginsUpdate: "plugins/update",
  pluginsRestoreBuiltin: "plugins/restoreBuiltin",
  pluginsConfigure: "plugins/configure",
  pluginsResetConfig: "plugins/resetConfig",
  pluginsValidate: "plugins/validate",
  pluginsDescribe: "plugins/describe",
  automationCreate: "automation/create",
  automationUpdate: "automation/update",
  automationCheckTaskBinding: "automation/checkTaskBinding",
  automationList: "automation/list",
  automationDelete: "automation/delete",
  // Off-Peak 会话内创建：与 automation 兄弟并列的独立方法族。
  offPeakCreate: "offPeak/create",
  offPeakList: "offPeak/list",
  // @deprecated：host 消费已清零（kcodeAgentService 改走 v4/usage/stats）。
  // 仅剩 CLI server 的 wire 兼容 case；随旧词整体删除时一并移除。
  usageStats: "usage/stats",
  // KCode Protocol 对 agent 只暴露 session-first 方法；task 是 UI 投影概念，不能泄露进协议方法名。
  // @deprecated：host 已改走 v4/conversation/usage；后续与 usage/stats 一并移除。
  sessionUsage: "session/usage",
  // 资源管理器：CLI 回报其 MCP 子进程 pid 与插件归属（纯内存，无 I/O），采样在 Host 侧完成。
  processChildProcesses: "process/childProcesses",
  interactionRequestPermission: "interaction/requestPermission",
  interactionRequestUserInput: "interaction/requestUserInput",
  interactionRequestProviderRuntimeHeaders: "interaction/requestProviderRuntimeHeaders",
  interactionRequestOfficialMcpAuthHeaders: "interaction/requestOfficialMcpAuthHeaders",
  // browser-use 反向请求由 agent 发起，host 转给 main 中的 CDP executor。
  interactionBrowserList: "interaction/browserList",
  interactionBrowserExecute: "interaction/browserExecute",
} as const;

export type KCodeProtocolMethod = (typeof kcodeProtocolMethods)[keyof typeof kcodeProtocolMethods];

export const kcodeProtocolEmptyResultSchema = z.object({}).strict();

// 最新 V4 主链已不再依赖旧版全量方法表；这里仅保留仍被兼容测试和 browser broker
// 消费的最小契约集合，避免重新引入已移除的 legacy 方法。
export const kcodeProtocolSessionMethodContracts = {
  [kcodeProtocolMethods.workspaceHookTrustGrant]: {
    params: kcodeWorkspaceHookTrustGrantParamsSchema,
    result: kcodeWorkspaceHookTrustGrantResultSchema,
  },
  [kcodeProtocolMethods.mcpList]: {
    params: kcodeMcpListParamsSchema,
    result: kcodeMcpListResultSchema,
  },
  [kcodeProtocolMethods.interactionBrowserList]: {
    params: kcodeBrowserListParamsSchema,
    result: kcodeBrowserListResultSchema,
  },
  [kcodeProtocolMethods.interactionBrowserExecute]: {
    params: kcodeBrowserExecuteParamsSchema,
    result: kcodeBrowserExecuteResultSchema,
  },
} as const satisfies Partial<
  Record<KCodeProtocolMethod, { params: z.ZodTypeAny; result: z.ZodTypeAny }>
>;

export type KCodeProtocolSessionMethodContract =
  (typeof kcodeProtocolSessionMethodContracts)[keyof typeof kcodeProtocolSessionMethodContracts];

/** 仅存储准备子进程的私有控制帧，原始路径不进入业务事件或遥测。 */
export const kcodeStoragePreparationFrameSchema = z.discriminatedUnion("method", [
  z
    .object({
      method: z.literal("startup/storagePath"),
      params: z.object({ path: z.string().min(1).max(32768) }).strict(),
    })
    .strict(),
  z
    .object({ method: z.literal("startup/storagePrepared"), params: z.object({}).strict() })
    .strict(),
  z
    .object({ method: z.literal("startup/storageState"), params: kcodeStorageStartupStateSchema })
    .strict(),
]);
export const kcodeStoragePathReadySchema = z
  .object({ method: z.literal("startup/storagePathReady"), reuse: z.boolean().optional() })
  .strict();
export * from "../localTtft.js";

// 桌面本地 TTFT 的严格事实合同；检查点不能替代实际内容帧。
export { localTtftFactsSchema } from "../localTtft.js";
