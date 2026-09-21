import { createHash } from "node:crypto";
import { join } from "node:path";

export function resolveKCodeBuiltinClientPlatform(): string {
  const target = process.platform === "win32" ? "windows" : process.platform;
  const arch =
    process.arch === "arm64" ? "aarch64" : process.arch === "x64" ? "x86_64" : process.arch;
  return `${target}-${arch}`;
}

export interface KCodeBuiltinCachePathOptions {
  readonly environmentConfigRoot: string;
  readonly platform: string;
  readonly appVersion: string;
  readonly kcodeEndpointOrigin: string;
}

export interface KCodeBuiltinCachePaths {
  readonly activeFilePath: string;
  readonly controlFilePath: string;
}

/** 按平台与 App 版本隔离 Active/LKG；路径本身就是兼容范围。 */
export function resolveKCodeBuiltinCachePaths(
  options: KCodeBuiltinCachePathOptions,
): KCodeBuiltinCachePaths {
  const platform = normalizeSegment(options.platform, "platform");
  const appVersion = normalizeSegment(options.appVersion, "appVersion");
  const endpointKey = createKCodeBuiltinEndpointKey(options.kcodeEndpointOrigin);
  const directory = join(
    options.environmentConfigRoot,
    "runtime",
    "provider",
    platform,
    appVersion,
    endpointKey,
  );
  return {
    activeFilePath: join(directory, "kcode-builtin.json"),
    controlFilePath: join(directory, "kcode-builtin-refresh.json"),
  };
}

/** 将 KCode 控制面 Origin 规范化后映射为安全、稳定且碰撞风险可忽略的缓存路径段。 */
export function createKCodeBuiltinEndpointKey(kcodeEndpointOrigin: string): string {
  const normalized = normalizeKCodeBuiltinEndpointOrigin(kcodeEndpointOrigin);
  const digest = createHash("sha256").update(normalized).digest("hex").slice(0, 32);
  return `endpoint-${digest}`;
}

export function normalizeKCodeBuiltinEndpointOrigin(value: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error("KCode Built-in Endpoint Origin 不能为空");
  const url = new URL(normalized);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("KCode Built-in Endpoint Origin 只支持 HTTP(S)");
  }
  return url.origin;
}

function normalizeSegment(value: string, name: string): string {
  const normalized = value.trim();
  if (!normalized || normalized === "." || normalized === ".." || /[\\/]/u.test(normalized)) {
    throw new Error(`KCode Built-in ${name} 不是合法路径段`);
  }
  return normalized;
}
