import { materializeKCodeBuiltinProviderConfig } from "@kcode/services/node";

declare const __KCODE_BUILTIN_PROVIDER_CONFIG_JSON__: string | undefined;

interface MaterializeBundledKCodeBuiltinProviderConfigOptions {
  readonly environmentConfigRoot: string;
  readonly content: string;
}

/** 返回构建时嵌入远端 Server 的 KCode Built-in Provider Config。 */
export function readBundledKCodeBuiltinProviderConfig(): string {
  if (typeof __KCODE_BUILTIN_PROVIDER_CONFIG_JSON__ !== "string") {
    throw new Error("当前构建未嵌入 KCode Built-in Provider Config");
  }
  return __KCODE_BUILTIN_PROVIDER_CONFIG_JSON__;
}

/**
 * 将 KCode Built-in Config 原子物化到所属环境的固定资源副本。
 * 升级前退出旧进程；不保留按内容 hash 增长的历史文件。
 */
export async function materializeBundledKCodeBuiltinProviderConfig(
  options: MaterializeBundledKCodeBuiltinProviderConfigOptions,
): Promise<string> {
  return materializeKCodeBuiltinProviderConfig(options);
}
