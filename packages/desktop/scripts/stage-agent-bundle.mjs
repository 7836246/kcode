// Agent bundle 的暂存动作：把 apps/kcode-cli/packages/cli/dist/kcode.cjs 放进
// bundled-agents/<平台>/glm，并写 meta。
//
// dev 与打包**必须**用同一份暂存实现。
// 只有打包链（prepare-agent-node-bundle.mjs）会暂存是不够的，dev 链
// （scripts/build-desktop-agent-cli.mjs）不会；而 dev 未打包时的 agent 二进制由
// desktopRuntimeEnv.ts 的 resolveBundledKCodeAgentBinaryPath() 解析，候选**只有**
// bundled-agents/，没有 cli/dist/。于是 dev 一直跑着上一次打包时留下的那份 ——
// 实测陈旧 3 天，任何 agent CLI 侧改动在 dev 里静默不生效，排查时会把「改动没生效」
// 误判成「代码没起作用」。两边共用这一份，dev 与打包不可能再各自漂移。
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";

export const AGENT_BUNDLE_SOURCE_RELATIVE = "apps/kcode-cli/packages/cli/dist/kcode.cjs";

export function resolveAgentBundlePaths({ repoRoot, platformKey }) {
  const glmDir = resolve(repoRoot, "packages", "desktop", "bundled-agents", platformKey, "glm");
  return {
    cliBundlePath: resolve(repoRoot, AGENT_BUNDLE_SOURCE_RELATIVE),
    glmDir,
    stagedBundlePath: resolve(glmDir, "kcode.cjs"),
    stagedMetaPath: resolve(glmDir, ".node-bundle-meta.json"),
  };
}

/**
 * 干净重建 glm 目录再拷贝。清空是刻意的：electron-builder 整目录拷贝
 * bundled-agents/<平台>/glm → resources/glm，本地工作树里上一次构建残留的原生二进制
 * （kcode-agent / kcode-acp 等）和旧 meta 会被一并打进安装包（CI 干净检出不会有，本地会）。
 */
export function stageAgentBundle({ repoRoot, platformKey, log = console.log }) {
  const { cliBundlePath, glmDir, stagedBundlePath, stagedMetaPath } = resolveAgentBundlePaths({
    repoRoot,
    platformKey,
  });
  if (!existsSync(cliBundlePath)) {
    throw new Error(`[stage:agent-bundle] agent bundle 源产物不存在：${cliBundlePath}`);
  }
  rmSync(glmDir, { recursive: true, force: true });
  mkdirSync(glmDir, { recursive: true });
  copyFileSync(cliBundlePath, stagedBundlePath);
  stageOfficialContentPlugins({ glmDir, repoRoot, log });
  const meta = {
    runtime: "electron-node",
    entry: "kcode.cjs",
    platform: platformKey,
    source: AGENT_BUNDLE_SOURCE_RELATIVE,
  };
  writeFileSync(stagedMetaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
  log(`[stage:agent-bundle] staged ${stagedBundlePath}`);
  return { stagedBundlePath, stagedMetaPath };
}

const OFFICIAL_CONTENT_PLUGIN_PACKAGES = [
  {
    relativePath: "apps/kcode-cli/packages/plugin-creator-plugin",
    stagedPath: "packages/plugin-creator-plugin",
    requiredSeedPaths: [
      ".kcode-plugin/plugin.json",
      "skills/plugin-creator/SKILL.md",
      "skills/plugin-creator/scripts/create-basic-plugin.mjs",
      "skills/plugin-creator/scripts/marketplace-files.mjs",
      "skills/plugin-creator/scripts/upsert-dev-marketplace.mjs",
      "skills/plugin-creator/scripts/scaffold-files.mjs",
      "skills/plugin-creator/scripts/validate-plugin.mjs",
      "skills/plugin-creator/references/plugin-json-spec.md",
      "skills/plugin-creator/references/installing-and-updating.md",
    ],
  },
];

const OFFICIAL_CONTENT_PLUGIN_TOP_LEVELS = new Set([
  ".kcode-plugin",
  "README.md",
  "agents",
  "commands",
  "docs",
  "hooks",
  "references",
  "scripts",
  "skills",
  "templates",
]);

function stageOfficialContentPlugins({ glmDir, repoRoot, log }) {
  for (const plugin of OFFICIAL_CONTENT_PLUGIN_PACKAGES) {
    const sourceRoot = resolve(repoRoot, plugin.relativePath);
    const targetRoot = resolve(glmDir, plugin.stagedPath);
    if (!existsSync(resolve(sourceRoot, ".kcode-plugin", "plugin.json"))) {
      throw new Error(`[stage:agent-bundle] missing official content plugin: ${sourceRoot}`);
    }
    mkdirSync(targetRoot, { recursive: true });
    for (const entryName of OFFICIAL_CONTENT_PLUGIN_TOP_LEVELS) {
      const sourcePath = resolve(sourceRoot, entryName);
      if (!existsSync(sourcePath)) continue;
      cpSync(sourcePath, resolve(targetRoot, entryName), {
        recursive: true,
        filter: (path) => basename(path) !== ".DS_Store",
      });
    }
    for (const relativePath of plugin.requiredSeedPaths) {
      const stagedPath = resolve(targetRoot, ...relativePath.split("/"));
      if (!existsSync(stagedPath)) {
        throw new Error(`[stage:agent-bundle] missing staged plugin file: ${stagedPath}`);
      }
    }
    log(`[stage:agent-bundle] staged ${plugin.stagedPath}`);
  }
}
