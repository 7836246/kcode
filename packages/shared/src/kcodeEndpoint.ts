import type { KCodeEnv } from "./env.js";

export const DEFAULT_KCODE_ENDPOINT_ORIGIN = "https://zcode.z.ai";

// 构建仅注入公开链接；Node 调用方仍可显式传 env，避免读取另一进程的配置。
declare const __KCODE_ENDPOINT_ENV__: Record<string, string | undefined> | undefined;
export function pickProductEndpointEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const keys = ["KCODE_BASE_URL", "KCODE_ENDPOINT_ORIGIN"];
  return Object.fromEntries(
    keys.flatMap((key) => (env[key]?.trim() ? [[key, env[key]!.trim()]] : [])),
  );
}
export function readProductEndpointEnv(): Record<string, string | undefined> {
  return {
    ...(typeof __KCODE_ENDPOINT_ENV__ === "undefined" ? {} : __KCODE_ENDPOINT_ENV__),
    ...pickProductEndpointEnv(typeof process === "undefined" ? {} : process.env),
  };
}

export interface KCodeEndpointUrls {
  origin: string;
  apiBaseUrl: string;
  webShareCallbackUrl: string;
}

export interface RuntimeKCodeEndpointEnv {
  [key: string]: string | undefined;
  KCODE_ENV?: string;
  KCODE_BASE_URL?: string;
  KCODE_ENDPOINT_ORIGIN?: string;
}

export interface RuntimeProductEndpointEnv extends RuntimeKCodeEndpointEnv {}

export interface RuntimeProductEndpointConfig {
  kcodeEnv: KCodeEnv;
  kcodeEndpointOrigin: string;
  kcodeEndpointUrls: KCodeEndpointUrls;
}

function readRuntimeEnvValue(
  env: Record<string, string | undefined>,
  key: string,
): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

export function normalizeKCodeEndpointOrigin(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("KCode endpoint origin is empty");
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("KCode endpoint origin must use http or https");
  }
  return parsed.origin;
}

export function resolveKCodeEndpointOrigin(options?: {
  env?: KCodeEnv;
  envBaseOrigin?: string | null;
  overrideOrigin?: string | null;
}): string {
  const origin = options?.overrideOrigin?.trim() || options?.envBaseOrigin?.trim();
  return origin ? normalizeKCodeEndpointOrigin(origin) : DEFAULT_KCODE_ENDPOINT_ORIGIN;
}

export function resolveRuntimeKCodeEnv(
  env: RuntimeKCodeEndpointEnv = readProductEndpointEnv(),
): KCodeEnv {
  // 产品身份仅用于既有展示与安装标识，不参与地址解析。
  return env.KCODE_ENV?.trim().toLowerCase() === "test" ? "test" : "production";
}

export function resolveRuntimeKCodeEndpointOrigin(
  env: RuntimeKCodeEndpointEnv = readProductEndpointEnv(),
  options?: { overrideOrigin?: string | null },
): string {
  return resolveKCodeEndpointOrigin({
    envBaseOrigin:
      readRuntimeEnvValue(env, "KCODE_BASE_URL") ??
      readRuntimeEnvValue(env, "KCODE_ENDPOINT_ORIGIN"),
    overrideOrigin: options?.overrideOrigin,
  });
}

export function buildRuntimeKCodeEndpointUrls(
  env: RuntimeKCodeEndpointEnv = readProductEndpointEnv(),
): KCodeEndpointUrls {
  return buildKCodeEndpointUrls(resolveRuntimeKCodeEndpointOrigin(env));
}

export function buildRuntimeKCodeApiUrl(
  env: RuntimeKCodeEndpointEnv = readProductEndpointEnv(),
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveRuntimeKCodeEndpointOrigin(env)}${normalizedPath}`;
}

export function resolveRuntimeProductEndpointConfig(
  env: RuntimeProductEndpointEnv = readProductEndpointEnv(),
): RuntimeProductEndpointConfig {
  const kcodeEnv = resolveRuntimeKCodeEnv(env);
  const kcodeEndpointOrigin = resolveRuntimeKCodeEndpointOrigin(env);

  return {
    kcodeEnv,
    kcodeEndpointOrigin,
    kcodeEndpointUrls: buildKCodeEndpointUrls(kcodeEndpointOrigin),
  };
}

export function buildKCodeEndpointUrls(origin: string): KCodeEndpointUrls {
  const normalizedOrigin = normalizeKCodeEndpointOrigin(origin);
  return {
    origin: normalizedOrigin,
    apiBaseUrl: `${normalizedOrigin}/api/v1`,
    webShareCallbackUrl: `${normalizedOrigin}/cn/share/callback`,
  };
}

export function rewriteKCodeEndpointUrl(input: string | URL, endpointOrigin: string): string | URL {
  const originalUrl = typeof input === "string" ? input : input.toString();
  let parsed: URL;
  try {
    parsed = new URL(originalUrl);
  } catch {
    return input;
  }
  const sourceOrigin = DEFAULT_KCODE_ENDPOINT_ORIGIN;
  if (parsed.origin !== sourceOrigin) {
    return input;
  }

  const targetOrigin = normalizeKCodeEndpointOrigin(endpointOrigin);
  if (targetOrigin === sourceOrigin) {
    return input;
  }

  const target = new URL(targetOrigin);
  target.pathname = parsed.pathname;
  target.search = parsed.search;
  target.hash = parsed.hash;
  return target.toString();
}
