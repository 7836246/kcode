import type { KCodeStreamingToolInputState } from "./streaming-tool-input-preview.js";

export interface KCodeToolProjectionMemory {
  completeToolInputById?: Map<string, unknown>;
  streamingToolInputById?: Map<string, KCodeStreamingToolInputState>;
  toolNameById?: Map<string, string>;
}

export interface KCodeToolProjectionMetadata {
  hasInput: boolean;
  input?: unknown;
  toolName?: string;
}

export function createKCodeToolProjectionMemory(): KCodeToolProjectionMemory {
  return {
    completeToolInputById: new Map<string, unknown>(),
    streamingToolInputById: new Map<string, KCodeStreamingToolInputState>(),
    toolNameById: new Map<string, string>(),
  };
}

export function ensureKCodeToolProjectionMemory(
  memory: KCodeToolProjectionMemory,
): KCodeToolProjectionMemory {
  memory.completeToolInputById ??= new Map<string, unknown>();
  memory.streamingToolInputById ??= new Map<string, KCodeStreamingToolInputState>();
  memory.toolNameById ??= new Map<string, string>();
  return memory;
}

export function resolveKCodeToolProjectionMetadata(
  payload: Record<string, unknown>,
  toolId: string,
  memory: KCodeToolProjectionMemory,
): KCodeToolProjectionMetadata {
  const toolName = readNonEmptyString(payload.toolName) ?? memory.toolNameById?.get(toolId);
  if (toolName) {
    memory.toolNameById?.set(toolId, toolName);
  }

  if ("input" in payload) {
    return {
      hasInput: payload.input !== undefined,
      input: payload.input,
      toolName,
    };
  }

  if (memory.completeToolInputById?.has(toolId)) {
    return {
      hasInput: true,
      input: memory.completeToolInputById.get(toolId),
      toolName,
    };
  }

  return {
    hasInput: false,
    toolName,
  };
}

export function finalizeKCodeToolProjectionInput(
  toolId: string,
  input: unknown,
  memory: KCodeToolProjectionMemory,
): void {
  memory.completeToolInputById ??= new Map<string, unknown>();
  memory.completeToolInputById.set(toolId, input);
  const streamingState = memory.streamingToolInputById?.get(toolId);
  if (streamingState) {
    streamingState.lastPreviewRawInputLength = streamingState.rawInput.length;
    streamingState.rawInput = "";
  }
}

export function forgetKCodeToolProjectionMetadata(
  toolId: string,
  memory: KCodeToolProjectionMemory,
): void {
  memory.completeToolInputById?.delete(toolId);
  memory.streamingToolInputById?.delete(toolId);
  memory.toolNameById?.delete(toolId);
}

function readNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
