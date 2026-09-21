import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

const execFileAsync = promisify(execFile);
const pluginRoot = dirname(fileURLToPath(import.meta.url));
const scriptsRoot = join(pluginRoot, "skills", "plugin-creator", "scripts");

const REQUIRED_SEED_PATHS = [
  "skills/plugin-creator/SKILL.md",
  "skills/plugin-creator/scripts/create-basic-plugin.mjs",
  "skills/plugin-creator/scripts/marketplace-files.mjs",
  "skills/plugin-creator/scripts/upsert-dev-marketplace.mjs",
  "skills/plugin-creator/scripts/scaffold-files.mjs",
  "skills/plugin-creator/scripts/validate-plugin.mjs",
  "skills/plugin-creator/references/plugin-json-spec.md",
  "skills/plugin-creator/references/installing-and-updating.md",
];

test("插件创建器带齐 seed 所需文件", () => {
  assert.equal(existsSync(join(pluginRoot, ".kcode-plugin", "plugin.json")), true);
  for (const relativePath of REQUIRED_SEED_PATHS) {
    assert.equal(existsSync(join(pluginRoot, ...relativePath.split("/"))), true, relativePath);
  }
});

test("create + validate + upsert-dev-marketplace 能在本地落地", async () => {
  const tempRoot = await mkdtemp(join(tmpdir(), "kcode-plugin-creator-"));
  try {
    const out = join(tempRoot, "plugins");
    await execFileAsync(process.execPath, [
      join(scriptsRoot, "create-basic-plugin.mjs"),
      "--name",
      "demo-plugin",
      "--out",
      out,
      "--description",
      "Demo plugin",
    ]);
    const created = join(out, "demo-plugin");
    await execFileAsync(process.execPath, [
      join(scriptsRoot, "validate-plugin.mjs"),
      "--plugin",
      created,
    ]);
    const marketplaceDir = join(tempRoot, "marketplace");
    const { stdout } = await execFileAsync(process.execPath, [
      join(scriptsRoot, "upsert-dev-marketplace.mjs"),
      "--marketplace-dir",
      marketplaceDir,
      "--plugin-name",
      "demo-plugin",
      "--plugin-path",
      created,
    ]);
    const result = JSON.parse(stdout);
    assert.equal(existsSync(result.marketplace), true);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
});
