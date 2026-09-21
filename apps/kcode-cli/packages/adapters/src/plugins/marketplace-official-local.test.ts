import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { KCODE_OFFICIAL_PLUGIN_MARKETPLACE } from "@kcode/contracts";
import {
  createOfficialBundledMarketplaceSource,
  RETIRED_OFFICIAL_PLUGIN_MARKETPLACE_URL,
  isRetiredOfficialPluginMarketplaceUrl,
} from "@kcode/shared";
import {
  ensureDefaultPluginMarketplaces,
  loadKnownMarketplacesSync,
  updateMarketplace,
} from "./marketplace.js";

test("退役官方 CDN URL 识别只覆盖 Z.ai 官方目录", () => {
  assert.equal(isRetiredOfficialPluginMarketplaceUrl(RETIRED_OFFICIAL_PLUGIN_MARKETPLACE_URL), true);
  assert.equal(
    isRetiredOfficialPluginMarketplaceUrl(
      "https://cdn-zcode.z.ai/zcode/official-plugin/marketplace.json?cache=1",
    ),
    true,
  );
  assert.equal(isRetiredOfficialPluginMarketplaceUrl("https://example.com/marketplace.json"), false);
});

test("ensureDefault 登记官方市场为 bundled，并把退役 CDN source 改掉", async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), "kcode-official-local-"));
  mkdirSync(storageRoot, { recursive: true });
  writeFileSync(
    join(storageRoot, "known_marketplaces.json"),
    `${JSON.stringify({
      version: 1,
      marketplaces: [
        {
          id: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
          name: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
          source: { source: "url", url: RETIRED_OFFICIAL_PLUGIN_MARKETPLACE_URL },
          addedAt: "2026-01-01T00:00:00.000Z",
          pluginCount: 12,
          lastRefreshFailure: {
            code: "marketplace_source_unavailable",
            failedAt: "2026-01-01T00:00:00.000Z",
            message: "Failed to fetch marketplace",
          },
        },
      ],
    })}\n`,
  );

  const known = ensureDefaultPluginMarketplaces(storageRoot);
  const official = known.find((record) => record.id === KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
  assert.ok(official);
  assert.deepEqual(official.source, createOfficialBundledMarketplaceSource());
  assert.equal(official.lastRefreshFailure, undefined);

  const persisted = loadKnownMarketplacesSync(storageRoot);
  assert.deepEqual(
    persisted.find((record) => record.id === KCODE_OFFICIAL_PLUGIN_MARKETPLACE)?.source,
    createOfficialBundledMarketplaceSource(),
  );
});

test("updateMarketplace 跳过官方市场，不把 bundled 改回远端", async () => {
  const storageRoot = await mkdtemp(join(tmpdir(), "kcode-official-skip-"));
  ensureDefaultPluginMarketplaces(storageRoot);
  const updated = await updateMarketplace({
    marketplace: KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
    storageRoot,
  });
  assert.deepEqual(updated, []);
  const official = loadKnownMarketplacesSync(storageRoot).find(
    (record) => record.id === KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  );
  assert.deepEqual(official?.source, createOfficialBundledMarketplaceSource());
});
