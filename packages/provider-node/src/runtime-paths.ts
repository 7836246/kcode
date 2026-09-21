export const KCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV = "KCODE_BUILTIN_PROVIDER_CONFIG_FILE";
export const KCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE_ENV =
  "KCODE_BUILTIN_PROVIDER_BUNDLED_CONFIG_FILE";
export const KCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV = "KCODE_PERSONAL_PROVIDER_CONFIG_FILE";
export const PERSONAL_PROVIDER_CONFIG_FILE_NAME = "provider_config.json";

export interface NodeProviderRuntimePaths {
  readonly kcodeBuiltinFilePath: string;
  readonly personalFilePath: string;
}

export function createNodeProviderRuntimePathEnv(
  paths: NodeProviderRuntimePaths,
): Record<string, string> {
  return {
    [KCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]: paths.kcodeBuiltinFilePath,
    [KCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]: paths.personalFilePath,
  };
}

export function resolveNodeProviderRuntimePaths(
  env: Readonly<Record<string, string | undefined>>,
): NodeProviderRuntimePaths | null {
  const kcodeBuiltinFilePath = env[KCODE_BUILTIN_PROVIDER_CONFIG_FILE_ENV]?.trim();
  const personalFilePath = env[KCODE_PERSONAL_PROVIDER_CONFIG_FILE_ENV]?.trim();
  if (!kcodeBuiltinFilePath && !personalFilePath) return null;
  if (!kcodeBuiltinFilePath || !personalFilePath) {
    throw new Error("KCode Built-in 与 Personal Provider Config 路径必须同时提供");
  }
  return Object.freeze({ kcodeBuiltinFilePath, personalFilePath });
}
