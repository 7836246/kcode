import { readFile } from "node:fs/promises";
import {
  CONFIG_BACKUP_DEFAULT_FILENAME,
  CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE,
  CONFIG_BACKUP_LOCAL_ONLY_ERROR_CODE,
  CONFIG_BACKUP_PAYLOAD_KIND,
  appSettingsPatchSchema,
  type AppSettings,
  type ConfigBackupImportResult,
} from "@kcode/shared";
import type { PersonalProviderConfigRepository } from "@kcode/provider";
import { decodeProviderConfigFile, encodeProviderConfigFile } from "@kcode/provider-node";
import type { ISettingService } from "../setting/setting.js";
import type { IConfigBackupService } from "./configBackup.js";
import {
  decryptConfigBackupPayload,
  encryptConfigBackupPayload,
  parseConfigBackupEnvelope,
} from "./configBackupCipher.js";
import { pickPortableSettings } from "./portableSettings.js";
import {
  createConfigBackupWebdavClient,
  type ConfigBackupFetch,
} from "./configBackupWebdav.js";
import { createServiceLogger } from "../logger/serviceLogger.js";

const log = createServiceLogger("config-backup");

interface ConfigBackupPayload {
  kind: typeof CONFIG_BACKUP_PAYLOAD_KIND;
  exportedAt: string;
  settings: Partial<AppSettings>;
  providerConfig: ReturnType<typeof encodeProviderConfigFile> | null;
}

function codedError(code: string, message: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, "base64"));
}

function defaultFetch(): ConfigBackupFetch {
  return async (url, init) => {
    const response = await fetch(url, {
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
    const buffer = new Uint8Array(await response.arrayBuffer());
    return { status: response.status, ok: response.ok, body: buffer };
  };
}

export interface CreateConfigBackupServiceOptions {
  settingService: ISettingService;
  personalRepository: PersonalProviderConfigRepository;
  fetchImpl?: ConfigBackupFetch;
}

export function createConfigBackupService(
  options: CreateConfigBackupServiceOptions,
): IConfigBackupService {
  const webdav = createConfigBackupWebdavClient(options.fetchImpl ?? defaultFetch());

  const buildEncryptedBytes = async (passphrase: string): Promise<Uint8Array> => {
    const settings = await options.settingService.get();
    const providerSnapshot = await options.personalRepository.read();
    const payload: ConfigBackupPayload = {
      kind: CONFIG_BACKUP_PAYLOAD_KIND,
      exportedAt: new Date().toISOString(),
      settings: pickPortableSettings(settings),
      providerConfig: encodeProviderConfigFile({
        providers: providerSnapshot.providers,
        models: providerSnapshot.models,
        providerOrder: providerSnapshot.providerOrder,
        defaultModelSelection: providerSnapshot.defaultModelSelection,
      }),
    };
    const envelope = await encryptConfigBackupPayload(passphrase, JSON.stringify(payload));
    return new TextEncoder().encode(`${JSON.stringify(envelope, null, 2)}\n`);
  };

  const importBytes = async (
    passphrase: string,
    bytes: Uint8Array,
  ): Promise<ConfigBackupImportResult> => {
    const envelope = parseConfigBackupEnvelope(new TextDecoder().decode(bytes));
    const plaintext = await decryptConfigBackupPayload(passphrase, envelope);
    let payload: ConfigBackupPayload;
    try {
      payload = JSON.parse(plaintext) as ConfigBackupPayload;
    } catch {
      throw codedError(CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE, "Backup payload is not valid JSON");
    }
    if (payload.kind !== CONFIG_BACKUP_PAYLOAD_KIND || typeof payload.exportedAt !== "string") {
      throw codedError(CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE, "Backup payload kind is unknown");
    }

    const parsedPatch = appSettingsPatchSchema.parse(
      pickPortableSettings(payload.settings as AppSettings),
    );
    const { providerFamilyDomain, ...restPatch } = parsedPatch;
    // ISettingService.update 的公开类型是 Partial<AppSettings>，实现侧仍按 patch schema 浅合并。
    await options.settingService.update({
      ...restPatch,
      ...(providerFamilyDomain ? { providerFamilyDomain } : {}),
    } as Partial<AppSettings>);

    let restoredProviders = false;
    if (payload.providerConfig) {
      const decoded = decodeProviderConfigFile(payload.providerConfig);
      await options.personalRepository.update(() => decoded);
      restoredProviders = true;
    }

    log.info("imported config backup", {
      exportedAt: payload.exportedAt,
      restoredProviders,
    });
    return {
      restoredSettings: true,
      restoredProviders,
      exportedAt: payload.exportedAt,
    };
  };

  return {
    async exportEncryptedBackup(passphrase) {
      const bytes = await buildEncryptedBytes(passphrase);
      return {
        bytesBase64: bytesToBase64(bytes),
        suggestedName: CONFIG_BACKUP_DEFAULT_FILENAME,
      };
    },

    async importEncryptedBackup(passphrase, bytesBase64) {
      return importBytes(passphrase, base64ToBytes(bytesBase64));
    },

    async importFromLocalPath(passphrase, path) {
      const bytes = await readFile(path);
      return importBytes(passphrase, bytes);
    },

    async testWebdav(connection) {
      return webdav.test(connection);
    },

    async uploadToWebdav(passphrase, connection, overwrite) {
      const bytes = await buildEncryptedBytes(passphrase);
      const remoteUrl = await webdav.upload(connection, bytes, overwrite);
      return { remoteUrl };
    },

    async downloadFromWebdav(passphrase, connection) {
      const bytes = await webdav.download(connection);
      return importBytes(passphrase, bytes);
    },
  };
}

export function createUnsupportedConfigBackupService(): IConfigBackupService {
  const fail = async (): Promise<never> => {
    throw codedError(
      CONFIG_BACKUP_LOCAL_ONLY_ERROR_CODE,
      "Config backup is only available on the local host",
    );
  };
  return {
    exportEncryptedBackup: fail,
    importEncryptedBackup: fail,
    importFromLocalPath: fail,
    testWebdav: fail,
    uploadToWebdav: fail,
    downloadFromWebdav: fail,
  };
}
