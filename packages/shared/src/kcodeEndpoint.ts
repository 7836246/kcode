import type { KCodeEnv } from "./env.js";

export const DEFAULT_KCODE_ENDPOINT_ORIGIN = "https://zcode.z.ai";
export const DEFAULT_BIGMODEL_API_ORIGIN = "https://bigmodel.cn";
export const DEFAULT_ZAI_OAUTH_ORIGIN = "https://chat.z.ai";
export const DEFAULT_ZAI_BUSINESS_BASE_URL = "https://api.z.ai";
export const DEFAULT_ZAI_OAUTH_CLIENT_ID = "client_P8X5CMWmlaRO9gyO-KSqtg";

// 构建仅注入公开链接；Node 调用方仍可显式传 env，避免读取另一进程的配置。
declare const __KCODE_ENDPOINT_ENV__: Record<string, string | undefined> | undefined;
export function pickProductEndpointEnv(
  env: Record<string, string | undefined>,
): Record<string, string> {
  const keys = [
    "KCODE_BASE_URL",
    "KCODE_ENDPOINT_ORIGIN",
    "BIGMODEL_API_BASE_URL",
    "ZAI_OAUTH_ORIGIN",
    "ZAI_BUSINESS_BASE_URL",
    "ZAI_OAUTH_CLIENT_ID",
    "ZAI_OAUTH_APP_ID",
  ];
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
  kcodePlanOpenAiBaseUrl: string;
  kcodePlanAnthropicBaseUrl: string;
  kcodePlanBillingCurrentUrl: string;
  kcodePlanBillingBalanceUrl: string;
}

export interface RuntimeKCodeEndpointEnv {
  [key: string]: string | undefined;
  KCODE_ENV?: string;
  KCODE_BASE_URL?: string;
  KCODE_ENDPOINT_ORIGIN?: string;
}

export interface RuntimeBigModelApiEnv {
  [key: string]: string | undefined;
  KCODE_ENV?: string;
  BIGMODEL_API_BASE_URL?: string;
}

export interface RuntimeZaiEndpointEnv {
  [key: string]: string | undefined;
  KCODE_ENV?: string;
  ZAI_OAUTH_ORIGIN?: string;
  ZAI_BUSINESS_BASE_URL?: string;
  ZAI_OAUTH_CLIENT_ID?: string;
  ZAI_OAUTH_APP_ID?: string;
}

export interface RuntimeProductEndpointEnv
  extends RuntimeKCodeEndpointEnv, RuntimeBigModelApiEnv, RuntimeZaiEndpointEnv {}

export interface RuntimeProductEndpointConfig {
  kcodeEnv: KCodeEnv;
  kcodeEndpointOrigin: string;
  kcodeEndpointUrls: KCodeEndpointUrls;
  zaiOAuthOrigin: string;
  zaiBusinessBaseUrl: string;
  zaiOAuthClientId: string;
  bigModelApiOrigin: string;
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

function isLoopbackHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isTrustedCodingPlanWebviewOrigin(
  value: string | null | undefined,
  options?: {
    e2eStoreBridgeEnabled?: boolean;
  },
): boolean {
  if (!value) return false;
  try {
    const origin = normalizeKCodeEndpointOrigin(value);
    if (
      origin === DEFAULT_KCODE_ENDPOINT_ORIGIN ||
      origin === resolveRuntimeKCodeEndpointOrigin()
    ) {
      return true;
    }
    const parsed = new URL(origin);
    return options?.e2eStoreBridgeEnabled === true && isLoopbackHostname(parsed.hostname);
  } catch {
    return false;
  }
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

export function resolveBigModelApiOrigin(
  env: RuntimeBigModelApiEnv = readProductEndpointEnv(),
): string {
  return normalizeKCodeEndpointOrigin(
    readRuntimeEnvValue(env, "BIGMODEL_API_BASE_URL") ?? DEFAULT_BIGMODEL_API_ORIGIN,
  );
}

export function buildBigModelApiUrl(
  env: RuntimeBigModelApiEnv = readProductEndpointEnv(),
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveBigModelApiOrigin(env)}${normalizedPath}`;
}

export function buildBigModelCodingPlanPersonalManageUrl(
  env: RuntimeBigModelApiEnv = readProductEndpointEnv(),
): string {
  // 管理页与业务 API 共用显式 origin，避免把已登录账号带到另一个部署。
  return buildBigModelApiUrl(env, "/coding-plan/personal/overview");
}

export function buildBigModelCodingPlanTeamManageUrl(
  env: RuntimeBigModelApiEnv = readProductEndpointEnv(),
): string {
  return buildBigModelApiUrl(env, "/coding-plan/team/plans");
}

export function resolveZaiOAuthOrigin(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
): string {
  return normalizeKCodeEndpointOrigin(
    readRuntimeEnvValue(env, "ZAI_OAUTH_ORIGIN") ?? DEFAULT_ZAI_OAUTH_ORIGIN,
  );
}

export function resolveZaiBusinessBaseUrl(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
): string {
  return normalizeKCodeEndpointOrigin(
    readRuntimeEnvValue(env, "ZAI_BUSINESS_BASE_URL") ?? DEFAULT_ZAI_BUSINESS_BASE_URL,
  );
}

export function resolveZaiOAuthClientId(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
): string {
  return (
    readRuntimeEnvValue(env, "ZAI_OAUTH_CLIENT_ID") ??
    readRuntimeEnvValue(env, "ZAI_OAUTH_APP_ID") ??
    DEFAULT_ZAI_OAUTH_CLIENT_ID
  );
}

export function buildZaiOAuthUrl(origin: string, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${normalizeKCodeEndpointOrigin(origin)}${normalizedPath}`;
}

export function buildRuntimeZaiOAuthUrl(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
  path: string,
): string {
  return buildZaiOAuthUrl(resolveZaiOAuthOrigin(env), path);
}

export function buildRuntimeZaiBusinessUrl(
  env: RuntimeZaiEndpointEnv = readProductEndpointEnv(),
  path: string,
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${resolveZaiBusinessBaseUrl(env)}${normalizedPath}`;
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
    zaiOAuthOrigin: resolveZaiOAuthOrigin(env),
    zaiBusinessBaseUrl: resolveZaiBusinessBaseUrl(env),
    zaiOAuthClientId: resolveZaiOAuthClientId(env),
    bigModelApiOrigin: resolveBigModelApiOrigin(env),
  };
}

export function buildKCodeEndpointUrls(origin: string): KCodeEndpointUrls {
  const normalizedOrigin = normalizeKCodeEndpointOrigin(origin);
  return {
    origin: normalizedOrigin,
    apiBaseUrl: `${normalizedOrigin}/api/v1`,
    webShareCallbackUrl: `${normalizedOrigin}/cn/share/callback`,
    kcodePlanOpenAiBaseUrl: `${normalizedOrigin}/api/v1/zcode-plan`,
    kcodePlanAnthropicBaseUrl: `${normalizedOrigin}/api/v1/zcode-plan/anthropic`,
    kcodePlanBillingCurrentUrl: `${normalizedOrigin}/api/v1/zcode-plan/billing/current`,
    kcodePlanBillingBalanceUrl: `${normalizedOrigin}/api/v1/zcode-plan/billing/balance`,
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
