import type { KCodeRuntimeEnv } from "./runtimeEnv.js";

export type KCodeEnv = "test" | "production";
/** 安装包身份：决定应用名、app id、Electron 数据目录与更新策略；与后端环境 `KCodeEnv` 是两个轴。 */
export type KCodeProductFlavor = "production" | "preview";
export type ArmsRumEnv = "local" | "prod";

// 非构建环境（如 e2e 测试的 mocha）下 define 不存在，用 typeof 检查 + fallback 避免 ReferenceError
declare const __KCODE_ENV__: string;
declare const __KCODE_PRODUCT_FLAVOR__: string;

export function normalizeKCodeEnv(value: string | undefined): KCodeEnv {
  return value?.trim().toLowerCase() === "production" ? "production" : "test";
}

export const KCODE_ENV = normalizeKCodeEnv(
  typeof __KCODE_ENV__ !== "undefined" ? __KCODE_ENV__ : undefined,
);

/**
 * 身份缺省跟随后端环境（test → preview，production → production）。
 * 桌面构建通过 `KCODE_PREVIEW_IDENTITY=1` 显式注入 preview，得到连接生产后端的 Preview 包；
 * 未注入 define 的 bundle（web、CLI、测试）沿用旧的单轴语义。
 */
export function normalizeKCodeProductFlavor(
  value: string | undefined,
  kcodeEnv: KCodeEnv,
): KCodeProductFlavor {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "production" || normalized === "preview") {
    return normalized;
  }
  return kcodeEnv === "production" ? "production" : "preview";
}

export const KCODE_PRODUCT_FLAVOR = normalizeKCodeProductFlavor(
  typeof __KCODE_PRODUCT_FLAVOR__ !== "undefined" ? __KCODE_PRODUCT_FLAVOR__ : undefined,
  KCODE_ENV,
);
export const KCODE_APP_VERSION_ENV = "KCODE_APP_VERSION" as const;
export const KCODE_BUILD_COMMIT_ID_ENV = "KCODE_BUILD_COMMIT_ID" as const;

// ── 运行时环境变量（不经过编译打包，启动时从 process.env 读取） ──
// 启用调试模式，值为 inspect-brk 的端口号，如 KCODE_DEBUG=9230
export const RUNTIME_KCODE_DEBUG =
  typeof process !== "undefined" ? process.env.KCODE_DEBUG : undefined;

// 恢复原因：写死 false 会让运行时已配置的数仓/ARMS 永远空转。
// 功能保持可用；实际出网由各出口的运行时端点检查决定，未配置不上报。
export const KCODE_TELEMETRY_ENABLED: boolean = true;

/** 数仓事件上报端点：由运行时环境变量提供，未配置即停用，构建产物不内嵌。 */
export const KCODE_TELEMETRY_REPORT_ENDPOINT =
  typeof process !== "undefined" ? (process.env.KCODE_TELEMETRY_REPORT_ENDPOINT ?? "") : "";

/** ARMS RUM 接入端点：由运行时环境变量提供，未配置即停用，构建产物不内嵌。 */
export const KCODE_ARMS_RUM_ENDPOINT =
  typeof process !== "undefined" ? (process.env.KCODE_ARMS_RUM_ENDPOINT ?? "") : "";

/** 将本地运行态与编译期 KCODE_ENV 映射为 ARMS 控制台识别的上报环境标签 */
export function mapKCodeEnvToArmsRumEnv(runtimeEnv: KCodeRuntimeEnv): ArmsRumEnv {
  return runtimeEnv !== "development" && KCODE_ENV === "production" ? "prod" : "local";
}
