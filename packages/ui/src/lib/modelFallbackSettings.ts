import {
  normalizeModelFallbackChain,
  type AppSettings,
  type ModelFallbackRef,
} from "@kcode/shared";

export function workspaceModelFallbackKey(
  workspaceIdentity: string | undefined,
  workspacePath: string,
): string {
  return workspaceIdentity?.trim() || workspacePath;
}

export function readWorkspaceModelFallbackChain(
  settings: AppSettings | null | undefined,
  workspaceKey: string,
): ModelFallbackRef[] {
  if (!workspaceKey) return [];
  return normalizeModelFallbackChain(settings?.modelFallbackByWorkspace?.[workspaceKey] ?? []);
}
