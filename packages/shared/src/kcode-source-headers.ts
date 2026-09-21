import { DEFAULT_KCODE_ENDPOINT_ORIGIN } from "./kcodeEndpoint.js";

export const KCODE_SOURCE_HEADERS = {
  "User-Agent": "KCode/unknown",
  "HTTP-Referer": DEFAULT_KCODE_ENDPOINT_ORIGIN,
  "X-Title": "Z Code@electron",
} as const;

export interface BuildKCodeSourceHeadersFromContextOptions {
  appVersion?: string;
  arch?: string;
  clientLanguage?: string;
  clientTimezone?: string;
  deviceMid?: string;
  endpointOrigin?: string;
  osVersion?: string;
  platform?: string;
  releaseChannel?: string;
  sourceTitle?: string;
}

export function normalizeKCodeSourceHeaderValue(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\x20-\x7e]+$/.test(trimmed)) {
    return undefined;
  }
  return trimmed;
}

export function buildKCodeSourceHeadersFromContext(
  options: BuildKCodeSourceHeadersFromContextOptions = {},
): Record<string, string> {
  const appVersion = normalizeKCodeSourceHeaderValue(options.appVersion);
  const arch = normalizeKCodeSourceHeaderValue(options.arch);
  const clientLanguage = normalizeKCodeSourceHeaderValue(options.clientLanguage) ?? "unknown";
  const clientTimezone = normalizeKCodeSourceHeaderValue(options.clientTimezone) ?? "unknown";
  const deviceMid = normalizeKCodeSourceHeaderValue(options.deviceMid);
  const endpointOrigin =
    normalizeKCodeSourceHeaderValue(options.endpointOrigin) ?? DEFAULT_KCODE_ENDPOINT_ORIGIN;
  const osVersion = normalizeKCodeSourceHeaderValue(options.osVersion);
  const platform = normalizeKCodeSourceHeaderValue(options.platform);
  const releaseChannel = normalizeKCodeSourceHeaderValue(options.releaseChannel);
  const sourceTitle = normalizeKCodeSourceHeaderValue(options.sourceTitle) ?? "electron";

  return {
    ...KCODE_SOURCE_HEADERS,
    "HTTP-Referer": endpointOrigin,
    "User-Agent": `KCode/${appVersion ?? "unknown"}`,
    ...(appVersion ? { "X-KCode-App-Version": appVersion } : {}),
    "X-Title": `Z Code@${sourceTitle}`,
    ...(platform && arch ? { "X-Platform": `${platform}-${arch}` } : {}),
    ...(releaseChannel ? { "X-Release-Channel": releaseChannel } : {}),
    "X-Client-Language": clientLanguage,
    "X-Client-Timezone": clientTimezone,
    ...(platform ? { "X-Os-Category": normalizeOsCategory(platform) } : {}),
    ...(osVersion ? { "X-Os-Version": osVersion } : {}),
    ...(deviceMid ? { "X-Device-Mid": deviceMid } : {}),
  };
}

function normalizeOsCategory(platform: string): string {
  switch (platform) {
    case "darwin":
      return "macos";
    case "win32":
      return "windows";
    default:
      return "linux";
  }
}
