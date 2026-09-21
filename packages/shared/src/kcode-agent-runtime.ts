export type KCodeAgentBinaryKind = "native-binary";

export interface KCodeAgentRuntimeDescriptor {
  binaryKind: KCodeAgentBinaryKind;
  binaryEnvVar: string;
  bundledResourceDir: string;
  version: string;
  spawnArgs: string[];
  nativeConfigDir: string;
  nativeConfigFileName: string;
  missingBinaryMessage: string;
  resolveEntrySegments(platform: string): string[];
  /**
   * 桌面端把 agent 的 JS bundle（kcode.cjs）打进 resources/glm，由 app 内置的 Electron Node runtime
   * （ELECTRON_RUN_AS_NODE）直接执行，避免再随包内置一份独立 Node 二进制。
   * 这里只放纯 JS 入口文件名，平台无关（与 resolveEntrySegments 的原生二进制路径平行）。
   */
  nodeBundleEntryFile: string;
  resolveNodeBundleSegments(): string[];
}

export function resolvePlatformBinaryName(binaryName: string, platform: string): string {
  return platform === "win32" ? `${binaryName}.exe` : binaryName;
}

export const KCODE_AGENT_RUNTIME: KCodeAgentRuntimeDescriptor = {
  binaryKind: "native-binary",
  binaryEnvVar: "GLM_BINARY_PATH",
  bundledResourceDir: "glm",
  version: "0.13.3",
  spawnArgs: ["app-server", "--stdio"],
  nativeConfigDir: ".kcode/cli",
  nativeConfigFileName: "config.json",
  missingBinaryMessage:
    "[KCode Agent] glm binary 未找到，请设置 GLM_BINARY_PATH 或先准备 GLM 运行时资源",
  resolveEntrySegments: (platform) => [resolvePlatformBinaryName("kcode-agent", platform)],
  nodeBundleEntryFile: "kcode.cjs",
  resolveNodeBundleSegments() {
    return [this.nodeBundleEntryFile];
  },
};

export function getKCodeAgentRuntime(): KCodeAgentRuntimeDescriptor {
  return KCODE_AGENT_RUNTIME;
}
