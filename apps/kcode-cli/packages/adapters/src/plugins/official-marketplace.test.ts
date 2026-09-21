import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { KCODE_OFFICIAL_PLUGIN_MARKETPLACE } from "@kcode/contracts";
import { writeCdnOfficialMarketplacePartitionSync } from "./official-marketplace.js";

test("官方 CDN 分片把遗留 zcode 市场 id 写成规范 id", async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), "kcode-official-marketplace-"));
  const merged = writeCdnOfficialMarketplacePartitionSync({
    manifest: {
      name: "zcode-plugins-official",
      plugins: [{ name: "browser-use" }],
    },
    storageRoot,
  });

  assert.equal(merged.name, KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
  const persisted = JSON.parse(
    await readFile(
      join(storageRoot, "marketplaces", KCODE_OFFICIAL_PLUGIN_MARKETPLACE, "cdn-marketplace.json"),
      "utf8",
    ),
  ) as { name: string };
  assert.equal(persisted.name, KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
});
