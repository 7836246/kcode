import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { KCODE_OFFICIAL_PLUGIN_MARKETPLACE } from "@kcode/contracts";
import {
  clearCdnOfficialMarketplacePartitionSync,
  writeBundledOfficialMarketplacePartitionSync,
  writeCdnOfficialMarketplacePartitionSync,
} from "./official-marketplace.js";

test("官方 leftover CDN 分片把遗留 zcode 市场 id 写成规范 id，但不并入目录", async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), "kcode-official-marketplace-"));
  writeBundledOfficialMarketplacePartitionSync({
    manifest: {
      name: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
      plugins: [{ name: "browser-use" }],
    },
    storageRoot,
  });
  const merged = writeCdnOfficialMarketplacePartitionSync({
    manifest: {
      name: "zcode-plugins-official",
      plugins: [{ name: "wind" }],
    },
    storageRoot,
  });

  assert.equal(merged.name, KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
  assert.deepEqual(
    (merged.plugins as Array<{ name: string }>).map((plugin) => plugin.name),
    ["browser-use"],
  );
  const persisted = JSON.parse(
    await readFile(
      join(storageRoot, "marketplaces", KCODE_OFFICIAL_PLUGIN_MARKETPLACE, "cdn-marketplace.json"),
      "utf8",
    ),
  ) as { name: string };
  assert.equal(persisted.name, KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
});

test("清除 leftover CDN 分片后公开目录只剩内置插件", async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), "kcode-official-marketplace-"));
  writeBundledOfficialMarketplacePartitionSync({
    manifest: {
      name: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
      plugins: [{ name: "browser-use" }],
    },
    storageRoot,
  });
  writeCdnOfficialMarketplacePartitionSync({
    manifest: {
      name: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
      plugins: [{ name: "wind" }],
    },
    storageRoot,
  });

  const merged = clearCdnOfficialMarketplacePartitionSync(storageRoot);
  const cdnPath = join(
    storageRoot,
    "marketplaces",
    KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
    "cdn-marketplace.json",
  );
  assert.equal(existsSync(cdnPath), false);
  assert.deepEqual(
    (merged.plugins as Array<{ name: string }>).map((plugin) => plugin.name),
    ["browser-use"],
  );
});
