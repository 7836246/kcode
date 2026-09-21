const KCODE_PROCESS_PREFIX = "kcode";
const MAX_PROCESS_NAME_SEGMENT_LENGTH = 24;

function sanitizeProcessNameSegment(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, MAX_PROCESS_NAME_SEGMENT_LENGTH);
}

function joinKCodeProcessName(...segments: Array<string | null | undefined>): string {
  const sanitizedSegments = segments
    .map((segment) => sanitizeProcessNameSegment(segment))
    .filter((segment): segment is string => Boolean(segment));
  return [KCODE_PROCESS_PREFIX, ...sanitizedSegments].join("-");
}

function pickWorkspaceTag(workspacePath: string | null | undefined): string | undefined {
  const trimmedPath = workspacePath?.trim();
  if (!trimmedPath) {
    return undefined;
  }

  const parts = trimmedPath.split(/[\\/]+/).filter(Boolean);
  return parts.at(-1) ?? trimmedPath;
}

export function formatKCodeMainProcessName(): string {
  return joinKCodeProcessName("main");
}

export function formatKCodeGpuProcessName(): string {
  return joinKCodeProcessName("gpu");
}

export function formatKCodeHostProcessName(label?: string): string {
  return joinKCodeProcessName("host", label);
}

export function formatKCodeRendererProcessName(windowTitle?: string): string {
  const normalizedTitle = windowTitle?.trim();
  if (!normalizedTitle || normalizedTitle === "KCode") {
    return joinKCodeProcessName("renderer", "main");
  }

  if (normalizedTitle === "Resource Manager") {
    return joinKCodeProcessName("renderer", "resource-manager");
  }

  const remoteWindowPrefix = "KCode - ";
  if (normalizedTitle.startsWith(remoteWindowPrefix)) {
    return joinKCodeProcessName(
      "renderer",
      "remote",
      normalizedTitle.slice(remoteWindowPrefix.length),
    );
  }

  return joinKCodeProcessName("renderer", normalizedTitle);
}

export function formatKCodeAgentProcessName(provider: string, workspacePath?: string): string {
  return joinKCodeProcessName("agent", provider, pickWorkspaceTag(workspacePath));
}

export function formatKCodeUtilityProcessName(name?: string, type = "utility"): string {
  return joinKCodeProcessName(type, name);
}
