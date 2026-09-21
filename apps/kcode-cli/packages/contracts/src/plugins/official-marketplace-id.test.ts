import assert from "node:assert/strict";
import test from "node:test";
import {
  isOfficialMarketplaceId,
  KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  LEGACY_KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  normalizeOfficialMarketplaceId,
} from "./index.js";

test("遗留官方市场 id 改写成规范 id", () => {
  assert.equal(
    normalizeOfficialMarketplaceId(LEGACY_KCODE_OFFICIAL_PLUGIN_MARKETPLACE),
    KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  );
  assert.equal(
    normalizeOfficialMarketplaceId(KCODE_OFFICIAL_PLUGIN_MARKETPLACE),
    KCODE_OFFICIAL_PLUGIN_MARKETPLACE,
  );
  assert.equal(normalizeOfficialMarketplaceId("my-plugins"), "my-plugins");
});

test("规范 id 与遗留别名都视为官方市场", () => {
  assert.equal(isOfficialMarketplaceId(KCODE_OFFICIAL_PLUGIN_MARKETPLACE), true);
  assert.equal(isOfficialMarketplaceId(LEGACY_KCODE_OFFICIAL_PLUGIN_MARKETPLACE), true);
  assert.equal(isOfficialMarketplaceId("inline"), false);
  assert.equal(isOfficialMarketplaceId("community-plugins"), false);
});
