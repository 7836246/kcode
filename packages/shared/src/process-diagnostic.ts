import { z } from "zod";

// 启动早期或协议故障时 stdout 尚不可用，进程诊断使用独立的 stderr 单行契约。
export const KCODE_PROCESS_DIAGNOSTIC_PREFIX = "[kcode-process-exception] ";
export const KCODE_PROCESS_DIAGNOSTIC_NAME_MAX_CHARS = 128;
export const KCODE_PROCESS_DIAGNOSTIC_MESSAGE_MAX_CHARS = 4_000;
export const KCODE_PROCESS_DIAGNOSTIC_STACK_MAX_CHARS = 16_000;
export const KCODE_PROCESS_DIAGNOSTIC_MAX_LINE_CHARS = 128 * 1024;
export const KCODE_AGENT_LIFECYCLE_LOG_MARKER = "[kcode-agent-lifecycle-reported]";

const processErrorKindSchema = z.enum(["uncaughtException", "unhandledRejection"]);
export const kcodeProcessDiagnosticSchema = z
  .object({
    version: z.literal(1),
    errorId: z.uuid(),
    kind: processErrorKindSchema,
    origin: processErrorKindSchema,
    name: z.string().min(1).max(KCODE_PROCESS_DIAGNOSTIC_NAME_MAX_CHARS),
    message: z.string().max(KCODE_PROCESS_DIAGNOSTIC_MESSAGE_MAX_CHARS),
    stack: z.string().max(KCODE_PROCESS_DIAGNOSTIC_STACK_MAX_CHARS).optional(),
    occurredAt: z.number().int().nonnegative(),
  })
  .strict();
export type KCodeProcessDiagnostic = z.infer<typeof kcodeProcessDiagnosticSchema>;

export function parseKCodeProcessDiagnostic(line: string): KCodeProcessDiagnostic | undefined {
  if (
    !line.startsWith(KCODE_PROCESS_DIAGNOSTIC_PREFIX) ||
    line.length > KCODE_PROCESS_DIAGNOSTIC_MAX_LINE_CHARS
  ) {
    return undefined;
  }
  try {
    const result = kcodeProcessDiagnosticSchema.safeParse(
      JSON.parse(line.slice(KCODE_PROCESS_DIAGNOSTIC_PREFIX.length)),
    );
    return result.success ? result.data : undefined;
  } catch {
    // 诊断旁路不得因损坏帧中断业务协议或退出处理。
    return undefined;
  }
}
