import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createProviderConfigRuntime } from "../src/model-provider/providerConfigRuntime.js";
import { readLegacyKCodeConfigProviders } from "../src/model-provider/legacyKCodeConfigProviderReader.js";
import { getAppConfigDir, setDataBaseDir } from "../src/paths.js";

const legacyConfig = {
  provider: {
    "custom-example": {
      name: "Example provider",
      npm: "@ai-sdk/openai-compatible",
      enabled: false,
      options: {
        baseURL: "https://provider.example/v1",
        apiKey: "test-only-key",
        headers: { "X-Example": "test" },
      },
      models: {
        "model-b": { limit: { context: 64000 } },
        "model-a": { limit: { context: 32000 } },
        "removed-model": { deleted: true },
      },
    },
  },
};

async function setup() {
  const dir = await mkdtemp(join(tmpdir(), "kcode-provider-migration-"));
  setDataBaseDir(dir);
  const configDir = getAppConfigDir();
  await mkdir(configDir, { recursive: true });
  const legacyPath = join(configDir, "config.json");
  const personalPath = join(configDir, "personal.json");
  const legacyContent = JSON.stringify(legacyConfig);
  await writeFile(legacyPath, legacyContent);
  let reads = 0;
  const recoveries: unknown[] = [];
  const runtime = createProviderConfigRuntime({
    kcodeBuiltinFilePath: fileURLToPath(
      new URL("../../../config/provider/kcode-builtin.json", import.meta.url),
    ),
    personalFilePath: personalPath,
    personalPollingIntervalMs: false,
    watch: false,
    readLegacyProviders: async () => {
      reads += 1;
      return readLegacyKCodeConfigProviders();
    },
    onPersonalConfigRecovery: (event) => recoveries.push(event.error),
  });
  return {
    runtime,
    legacyPath,
    legacyContent,
    personalPath,
    recoveries,
    readCount: () => reads,
    async dispose() {
      runtime.dispose();
      setDataBaseDir(null);
      await rm(dir, { recursive: true, force: true });
    },
  };
}

test("startup migrates published KCode config into personal config without changing the source", async () => {
  const fixture = await setup();
  try {
    await fixture.runtime.start();
    const config = await fixture.runtime.configService.read();
    assert.equal(fixture.readCount(), 1);
    assert.deepEqual(fixture.recoveries, []);
    const rule = config.personalProviders.getRule("custom-example");
    assert.ok(rule);
    assert.equal(rule.providerName, "Example provider");
    assert.equal(rule.enabled, false);
    assert.equal(rule.config.access?.toJSON().apiKey, "test-only-key");
    assert.equal(rule.config.api?.baseUrl, "https://provider.example/v1");
    assert.deepEqual(rule.config.api?.headers, { "X-Example": "test" });
    assert.deepEqual(rule.config.personalModelIds, ["model-b", "model-a"]);
    assert.deepEqual(rule.config.modelOrder, ["model-b", "model-a"]);
    assert.equal(
      config.personalModels.getExact("custom-example", "model-b")?.properties?.contextWindow,
      64000,
    );
    assert.equal(await readFile(fixture.legacyPath, "utf8"), fixture.legacyContent);
    const persisted = JSON.parse(await readFile(fixture.personalPath, "utf8"));
    assert.equal(persisted.schemaVersion, 1);
    assert.equal(
      persisted.config.providerConfigRules.providerRules[0].providerId,
      "custom-example",
    );
  } finally {
    await fixture.dispose();
  }
});

test("startup preserves an existing personal config and never consults the legacy file", async () => {
  const fixture = await setup();
  const current = JSON.stringify({
    schemaVersion: 1,
    config: {
      providerConfigRules: { providerRules: [] },
      modelConfigRules: { providerModelRules: [], manualProviderModelRules: [] },
    },
  });
  try {
    await writeFile(fixture.personalPath, current);
    await fixture.runtime.start();
    const config = await fixture.runtime.configService.read();
    assert.deepEqual(fixture.recoveries, []);
    assert.equal(fixture.readCount(), 0);
    assert.deepEqual(config.personalProviders.toJSON(), []);
    assert.equal(await readFile(fixture.personalPath, "utf8"), current);
  } finally {
    await fixture.dispose();
  }
});

test("leftover official zhipu-account and official template ids are skipped without crashing", async () => {
  const fixture = await setup();
  const leftover = JSON.stringify({
    schemaVersion: 1,
    config: {
      providerConfigRules: {
        providerRules: [
          {
            providerId: "leftover-zhipu-account",
            providerName: "Leftover Zhipu",
            config: {
              group: "standard-personal",
              access: {
                type: "zhipu-account",
                accountType: "zai",
                mode: "individual-coding-plan",
                entitled: true,
              },
              api: {
                type: "openai-chat-completions",
                baseUrl: "https://api.z.ai/api/coding/paas/v4",
              },
            },
          },
          {
            providerId: "leftover-official-template",
            templateId: "zai-api",
            providerName: "Leftover Official Template",
            config: {
              group: "standard-personal",
              access: { type: "api-key", apiKey: "leftover-key" },
              api: {
                type: "openai-chat-completions",
                baseUrl: "https://api.z.ai/api/coding/paas/v4",
              },
            },
          },
          {
            providerId: "account:zai-individual-coding-plan",
            config: { group: "standard-personal" },
          },
          {
            providerId: "keep-custom",
            providerName: "Keep Custom",
            config: {
              group: "standard-personal",
              access: { type: "api-key", apiKey: "keep-key" },
              api: {
                type: "openai-chat-completions",
                baseUrl: "https://api.example.com/v1",
              },
            },
          },
        ],
      },
      modelConfigRules: { providerModelRules: [], manualProviderModelRules: [] },
    },
  });
  try {
    await writeFile(fixture.personalPath, leftover);
    await fixture.runtime.start();
    const config = await fixture.runtime.configService.read();
    assert.deepEqual(fixture.recoveries, []);
    assert.equal(config.personalProviders.has("leftover-zhipu-account"), false);
    assert.equal(config.personalProviders.has("leftover-official-template"), false);
    assert.equal(config.personalProviders.has("account:zai-individual-coding-plan"), false);
    assert.equal(config.kcodeBuiltinProviders.has("zai-api"), false);
    assert.equal(config.kcodeBuiltinProviderTemplates.has("zai-api"), false);
    const keep = config.personalProviders.getRule("keep-custom");
    assert.ok(keep);
    assert.equal(keep.config.access?.toJSON().apiKey, "keep-key");
    assert.equal(await readFile(fixture.personalPath, "utf8"), leftover);
  } finally {
    await fixture.dispose();
  }
});

test("invalid legacy config is preserved and does not commit an empty personal config", async () => {
  const fixture = await setup();
  try {
    const invalidContent = '{"provider":';
    await writeFile(fixture.legacyPath, invalidContent);
    await fixture.runtime.start();
    assert.ok(fixture.recoveries.length > 0);
    assert.match(String(fixture.recoveries[0]), /stage=json/);
    assert.equal(await readFile(fixture.legacyPath, "utf8"), invalidContent);
    await assert.rejects(readFile(fixture.personalPath), { code: "ENOENT" });
  } finally {
    await fixture.dispose();
  }
});
