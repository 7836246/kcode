import type { KCodeMessageWithParts } from "./kcode-protocol-legacy-types.js";
import { textFromKCodeMessageParts } from "./kcode-protocol-legacy-types.js";
import type { KCodeStreamEvent } from "./kcode-task-types-core.js";

export interface KCodeBackgroundTaskNotificationInfo {
  error?: string;
  outputFile?: string;
  result?: string;
  status?: string;
  summary?: string;
  taskId?: string;
}

export function parseKCodeBackgroundTaskNotificationText(
  text: string | undefined,
): { notification: KCodeBackgroundTaskNotificationInfo; toolUseId: string } | null {
  const trimmed = text?.trim();
  if (!trimmed?.startsWith("<task-notification>")) {
    return null;
  }
  const toolUseId = readTaskNotificationTag(trimmed, "tool-use-id");
  if (!toolUseId) {
    return null;
  }
  return {
    toolUseId,
    notification: {
      error: readTaskNotificationTag(trimmed, "error"),
      outputFile: readTaskNotificationTag(trimmed, "output-file"),
      result: readTaskNotificationTag(trimmed, "result"),
      status: readTaskNotificationTag(trimmed, "status"),
      summary: readTaskNotificationTag(trimmed, "summary"),
      taskId: readTaskNotificationTag(trimmed, "task-id"),
    },
  };
}

export function collectKCodeBackgroundTaskNotificationsByToolUseId(
  messages: readonly KCodeMessageWithParts[],
): Map<string, KCodeBackgroundTaskNotificationInfo> {
  const notifications = new Map<string, KCodeBackgroundTaskNotificationInfo>();
  for (const message of messages) {
    if (message.info.role !== "user") {
      continue;
    }
    const parsed = parseKCodeBackgroundTaskNotificationText(
      textFromKCodeMessageParts(message.parts),
    );
    if (!parsed) {
      continue;
    }
    notifications.set(parsed.toolUseId, parsed.notification);
  }
  return notifications;
}

export function kcodeBackgroundTaskNotificationToolUpdateStatus(
  status: string | undefined,
): Extract<
  Extract<KCodeStreamEvent, { type: "tool_call_update" }>["status"],
  "completed" | "failed" | "stopped"
> {
  if (status === "failed" || status === "lost") {
    return "failed";
  }
  // task-notification 的 killed/stopped 都表示被停止，不能折成 completed。
  if (status === "stopped" || status === "killed") {
    return "stopped";
  }
  return "completed";
}

export function attachKCodeBackgroundTaskNotificationToRaw(
  raw: unknown,
  notification: KCodeBackgroundTaskNotificationInfo | undefined,
): unknown {
  if (!notification) {
    return raw;
  }
  const record = asPlainRecord(raw);
  const meta = asPlainRecord(record._meta);
  const kcode = asPlainRecord(meta.kcode);
  return {
    ...record,
    _meta: {
      ...meta,
      kcode: {
        ...kcode,
        taskNotification: notification,
      },
    },
  };
}

function readTaskNotificationTag(text: string, tag: string): string | undefined {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "u"));
  const value = match?.[1]?.trim();
  return value ? decodeTaskNotificationXmlText(value) : undefined;
}

function decodeTaskNotificationXmlText(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function asPlainRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
