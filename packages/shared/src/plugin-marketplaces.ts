export interface DefaultPluginMarketplace {
  id: string;
  /** 省略表示本地 bundled，不登记远端 source。 */
  source?: string;
  name: string;
  description: string;
  pluginCount: number;
  lastUpdated?: string;
}

export const KCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID = "kcode-plugins-official";

export const OFFICIAL_PLUGIN_MARKETPLACE_SOURCE_KIND = "bundled" as const;

/** 旧版官方市场默认 source；ensure 时改写成 bundled，不再拉取。 */
export const RETIRED_OFFICIAL_PLUGIN_MARKETPLACE_URL =
  "https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json";

export function createOfficialBundledMarketplaceSource(): {
  source: typeof OFFICIAL_PLUGIN_MARKETPLACE_SOURCE_KIND;
} {
  return { source: OFFICIAL_PLUGIN_MARKETPLACE_SOURCE_KIND };
}

export function isRetiredOfficialPluginMarketplaceUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed === RETIRED_OFFICIAL_PLUGIN_MARKETPLACE_URL) return true;
  try {
    const parsed = new URL(trimmed);
    return (
      parsed.hostname === "cdn-zcode.z.ai" &&
      parsed.pathname.includes("/official-plugin/marketplace.json")
    );
  } catch {
    return false;
  }
}

/** Settings 三类资源发现共用；Bootstrap 单测与官方 definition 的 defaultEnabled 机械对照。 */
export const DEFAULT_ENABLED_OFFICIAL_PLUGIN_IDS: ReadonlySet<string> = new Set([
  "browser-use@kcode-plugins-official",
  "image-search@kcode-plugins-official",
  "documents@kcode-plugins-official",
  "pdf@kcode-plugins-official",
  "presentations@kcode-plugins-official",
  "spreadsheets@kcode-plugins-official",
  // node_repl 宿主：不进市场、不对用户露出，也不贡献任何 skill/command/subagent，但必须
  // 始终可用 —— node_repl 的注册门禁是「Browser Use 或 Computer Use 任一启用」，宿主自己
  // 不参与那个判断。Browser Use 默认开着，宿主若默认关就等于它上来就没有宿主。
  "node-repl-host@kcode-plugins-official",
  "skill-creator@kcode-plugins-official",
  "plugin-creator@kcode-plugins-official",
  "kcode-guide@kcode-plugins-official",
  // 电脑控制回退为默认关闭，故 computer-use 不在此名单内。
  // 该集合必须与 official-plugin-definitions.ts 里标了 defaultEnabled 的插件逐一对应，
  // bootstrap 的「Settings 默认启用集合与 CLI 的官方插件声明一致」单测机械对照两者。
]);

export const DEFAULT_PLUGIN_MARKETPLACES: DefaultPluginMarketplace[] = [
  {
    // KCode 官方唯一市场：只合并本地 seed 分片。不再登记远端 CDN source。
    id: KCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID,
    name: KCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID,
    description: "Official KCode plugins marketplace: built-in plugins bundled with KCode.",
    pluginCount: 0,
  },
];

// 商店「公开」分段只有一个 KCode 官方市场 id，只展示内置插件。
export const PUBLIC_STORE_MARKETPLACE_IDS = [KCODE_OFFICIAL_PLUGIN_MARKETPLACE_ID] as const;

export function isPublicStoreMarketplaceId(id: string): boolean {
  return (PUBLIC_STORE_MARKETPLACE_IDS as readonly string[]).includes(id);
}
