import assert from "node:assert/strict";
import test from "node:test";
import { ModelConfigRules, ProviderConfigMap } from "@kcode/provider";
import { appSettingsSchema, CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE } from "@kcode/shared";
import type { PersonalProviderConfigRepository } from "@kcode/provider-node";
import type { ProviderConfigLayerSnapshot } from "@kcode/provider";
import type { ISettingService } from "../src/setting/setting.js";
import { createConfigBackupService } from "../src/config-backup/configBackupService.js";
import { pickPortableSettings } from "../src/config-backup/portableSettings.js";
import {
  decryptConfigBackupPayload,
  encryptConfigBackupPayload,
  parseConfigBackupEnvelope,
} from "../src/config-backup/configBackupCipher.js";

function createSnapshot(): ProviderConfigLayerSnapshot {
  return {
    revision: "1",
    providers: ProviderConfigMap.empty(),
    models: ModelConfigRules.empty(),
  };
}

function createSettingStub(initial: Record<string, unknown>) {
  let current = appSettingsSchema.parse(initial);
  const service = {
    async get() {
      return current;
    },
    async update(patch: Record<string, unknown>) {
      current = appSettingsSchema.parse({ ...current, ...patch });
    },
  } as unknown as ISettingService;
  return {
    service,
    get current() {
      return current;
    },
  };
}

function createRepositoryStub() {
  let snapshot = createSnapshot();
  const repository = {
    async read() {
      return snapshot;
    },
    async update(transform: (current: ProviderConfigLayerSnapshot) => ProviderConfigLayerSnapshot) {
      snapshot = {
        ...transform(snapshot),
        revision: String(Number(snapshot.revision) + 1),
      };
      return snapshot;
    },
  } as unknown as PersonalProviderConfigRepository;
  return {
    repository,
    get snapshot() {
      return snapshot;
    },
  };
}

test("可迁移字段不含本机路径和会话", () => {
  const portable = pickPortableSettings(
    appSettingsSchema.parse({
      locale: "en-US",
      memoryEnabled: true,
      dataBaseDir: "/Users/me",
      recentProjects: ["/tmp/project"],
      lastWorkspaceSession: [],
    }),
  );
  assert.equal(portable.locale, "en-US");
  assert.equal(portable.memoryEnabled, true);
  assert.equal("dataBaseDir" in portable, false);
  assert.equal("recentProjects" in portable, false);
  assert.equal("lastWorkspaceSession" in portable, false);
});

test("加密包用同一口令可解密", async () => {
  const envelope = await encryptConfigBackupPayload("secret-pass", "{\"ok\":true}");
  const plaintext = await decryptConfigBackupPayload("secret-pass", envelope);
  assert.equal(plaintext, "{\"ok\":true}");
});

test("错误口令不能解密", async () => {
  const envelope = await encryptConfigBackupPayload("secret-pass", "{\"ok\":true}");
  await assert.rejects(() => decryptConfigBackupPayload("wrong-pass", envelope));
});

test("导出再导入恢复可迁移设置并保留本机路径", async () => {
  const sourceSettings = createSettingStub({
    locale: "en-US",
    memoryEnabled: true,
    dataBaseDir: "/source-home",
  });
  const source = createConfigBackupService({
    settingService: sourceSettings.service,
    personalRepository: createRepositoryStub().repository,
  });
  const exported = await source.exportEncryptedBackup("secret-pass");

  const targetSettings = createSettingStub({
    locale: "zh-CN",
    memoryEnabled: false,
    dataBaseDir: "/target-home",
  });
  const targetRepo = createRepositoryStub();
  const target = createConfigBackupService({
    settingService: targetSettings.service,
    personalRepository: targetRepo.repository,
  });
  const imported = await target.importEncryptedBackup("secret-pass", exported.bytesBase64);
  assert.equal(imported.restoredSettings, true);
  assert.equal(imported.restoredProviders, true);
  assert.equal(targetSettings.current.locale, "en-US");
  assert.equal(targetSettings.current.memoryEnabled, true);
  assert.equal(targetSettings.current.dataBaseDir, "/target-home");
});

test("WebDAV 未确认覆盖时拒绝已有文件", async () => {
  const settings = createSettingStub({});
  const service = createConfigBackupService({
    settingService: settings.service,
    personalRepository: createRepositoryStub().repository,
    fetchImpl: async (_url, init) => {
      if (init.method === "HEAD") {
        return { status: 200, ok: true, body: new Uint8Array() };
      }
      return { status: 204, ok: true, body: new Uint8Array() };
    },
  });
  await assert.rejects(
    () =>
      service.uploadToWebdav(
        "secret-pass",
        { url: "https://dav.example.com/backup/", username: "u", password: "p" },
        false,
      ),
    (error: unknown) =>
      error instanceof Error &&
      (error as Error & { code?: string }).code === CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE,
  );
});

test("解析未知格式备份包失败", () => {
  assert.throws(() => parseConfigBackupEnvelope("{}"));
});
