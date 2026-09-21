import assert from "node:assert/strict";
import test from "node:test";
import { KCODE_OFFICIAL_PLUGIN_MARKETPLACE } from "@kcode/contracts";
import { parseMarketplaceManifest } from "./marketplace.js";

test("解析上游 CDN 目录时把 zcode 官方 id 改成规范 id", () => {
  const parsed = parseMarketplaceManifest({
    name: "zcode-plugins-official",
    plugins: [{ name: "browser-use", description: "Browser automation" }],
  });
  assert.ok(parsed);
  assert.equal(parsed.name, KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
  assert.equal(parsed.raw.name, KCODE_OFFICIAL_PLUGIN_MARKETPLACE);
  assert.equal(parsed.plugins[0]?.name, "browser-use");
});
