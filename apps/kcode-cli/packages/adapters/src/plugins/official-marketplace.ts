import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import {
  KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  normalizeOfficialMarketplaceId,
} from "@kcode/contracts";

const BUNDLED_PARTITION_FILE = "bundled-marketplace.json";
const CDN_PARTITION_FILE = "cdn-marketplace.json";
const MERGED_MARKETPLACE_FILE = "marketplace.json";

interface BundledMarketplacePartition {
  manifest: Record<string, unknown>;
  version: 1;
}

export function writeBundledOfficialMarketplacePartitionSync(input: {
  manifest: Record<string, unknown>;
  storageRoot: string;
}): Record<string, unknown> {
  assertOfficialManifest(input.manifest);
  writeJsonFileSync(partitionPath(input.storageRoot, BUNDLED_PARTITION_FILE), {
    manifest: input.manifest,
    version: 1,
  } satisfies BundledMarketplacePartition);
  return rebuildOfficialMarketplaceSync(input.storageRoot);
}

export function writeCdnOfficialMarketplacePartitionSync(input: {
  manifest: Record<string, unknown>;
  storageRoot: string;
}): Record<string, unknown> {
  assertOfficialManifest(input.manifest);
  writeJsonFileSync(partitionPath(input.storageRoot, CDN_PARTITION_FILE), input.manifest);
  return rebuildOfficialMarketplaceSync(input.storageRoot);
}

/** 官方市场改为本地 bundled 后，删除 leftover CDN 分片再按内置目录重建。 */
export function clearCdnOfficialMarketplacePartitionSync(
  storageRoot: string,
): Record<string, unknown> | undefined {
  const cdnPath = partitionPath(storageRoot, CDN_PARTITION_FILE);
  if (!existsSync(cdnPath)) return undefined;
  unlinkSync(cdnPath);
  return rebuildOfficialMarketplaceSync(storageRoot);
}

export function loadBundledOfficialPluginRootsSync(
  storageRoot: string,
): string[] | undefined {
  const bundledPartition = readBundledPartition(storageRoot);
  if (!bundledPartition) return undefined;

  const officialCacheRoot = resolve(
    storageRoot,
    "cache",
    KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  );
  return readPluginEntries(bundledPartition.manifest).flatMap((plugin) => {
    const name = readPluginName(plugin);
    const cachePath = typeof plugin.cachePath === "string" ? plugin.cachePath : undefined;
    if (!name || !cachePath) return [];

    const pluginCacheRoot = resolve(officialCacheRoot, name);
    const resolvedCachePath = resolve(cachePath);
    if (
      !isStrictDescendant(officialCacheRoot, pluginCacheRoot) ||
      !isStrictDescendant(pluginCacheRoot, resolvedCachePath)
    ) {
      return [];
    }
    return [resolvedCachePath];
  });
}

export function rebuildOfficialMarketplaceSync(storageRoot: string): Record<string, unknown> {
  const bundledPartition = readBundledPartition(storageRoot);
  const bundledManifest = bundledPartition?.manifest;
  const bundledPlugins = readPluginEntries(bundledManifest);

  // 官方市场不再合并 CDN 分片。 leftover cdn-marketplace.json 即使还在磁盘上，
  // 也不能再进入公开目录，否则商店会继续展示 Z.ai 远程清单。
  const merged = {
    ...(bundledManifest ?? {}),
    name: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
    plugins: bundledPlugins,
  };
  writeJsonFileSync(partitionPath(storageRoot, MERGED_MARKETPLACE_FILE), merged);
  return merged;
}

function readBundledPartition(storageRoot: string): BundledMarketplacePartition | undefined {
  const value = readJsonRecord(partitionPath(storageRoot, BUNDLED_PARTITION_FILE));
  if (!value || value.version !== 1 || !isRecord(value.manifest)) return undefined;
  return {
    manifest: value.manifest,
    version: 1,
  };
}

function readPluginEntries(
  manifest: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  return Array.isArray(manifest?.plugins) ? manifest.plugins.filter(isRecord) : [];
}

function readPluginName(plugin: Record<string, unknown>): string | undefined {
  return typeof plugin.name === "string" && plugin.name.length > 0 ? plugin.name : undefined;
}

function isStrictDescendant(parentPath: string, childPath: string): boolean {
  const relativePath = relative(parentPath, childPath);
  return (
    relativePath.length > 0 &&
    !isAbsolute(relativePath) &&
    relativePath !== ".." &&
    !relativePath.startsWith(`..${sep}`)
  );
}

function assertOfficialManifest(manifest: Record<string, unknown>): void {
  const name =
    typeof manifest.name === "string"
      ? normalizeOfficialMarketplaceId(manifest.name.trim())
      : "";
  if (name !== KCODE_OFFICIAL_PLUGIN_MARKETPLACE) {
    throw new Error(
      `Official marketplace manifest must be named ${KCODE_OFFICIAL_PLUGIN_MARKETPLACE}`,
    );
  }
  // 上游 CDN 仍可能带 zcode-plugins-official；分片落盘前改成规范 id。
  if (manifest.name !== name) {
    manifest.name = name;
  }
}

function partitionPath(storageRoot: string, fileName: string): string {
  return join(storageRoot, "marketplaces", KCODE_OFFICIAL_PLUGIN_MARKETPLACE, fileName);
}

function readJsonRecord(path: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(readFileSync(path, "utf8")) as unknown;
    return isRecord(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

function writeJsonFileSync(path: string, value: unknown): void {
  const contents = `${JSON.stringify(value, null, 2)}\n`;
  mkdirSync(dirname(path), { recursive: true });
  try {
    // 官方目录在每次启动都会重建；同内容反复写盘会增加 Windows 上
    // marketplace 文件被杀毒/索引器占用的概率。只跳过字节完全相同的单文件写入，
    // 读取失败或内容变化仍执行写入并保留原有失败语义。
    if (readFileSync(path, "utf8") === contents) return;
  } catch {
    // 文件不存在或暂时不可读时继续写，让真实更新失败继续向调用方暴露。
  }
  writeFileSync(path, contents, "utf8");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
