import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  providerProvisioningEnvelopeSchema,
  type ProviderProvisioningCredentialEntry,
  type ProviderProvisioningEnvelope,
} from "@kcode/shared";
import type {
  PersonalProviderConfigRepository,
  ProviderConfigLayerSnapshot,
} from "@kcode/provider";
import { decodeProviderConfigFile, encodeProviderConfigFile } from "@kcode/provider-node";
import {
  createCredentialCipherProvider,
  type CredentialCipherProvider,
} from "../credential/providers/credentialCipherProvider.js";
import type { ISettingService } from "../setting/setting.js";

const CREDENTIAL_FILE_NAME = "credentials.json";
/** 官方账号凭据不再跨环境同步；allowlist 为空，残留 oauth:* 不会被读取。 */
export const PROVIDER_PROVISIONING_OAUTH_CREDENTIAL_KEYS = [] as const;

export interface ProviderProvisioningSource {
  read(syncId: string): Promise<ProviderProvisioningEnvelope>;
}

export interface ProviderProvisioningSourceOptions {
  readonly personalRepository: PersonalProviderConfigRepository;
  readonly settingService: ISettingService;
  readonly credentialFilePath: string;
  readonly personalConfigFilePath: string;
  readonly cipherProvider?: CredentialCipherProvider;
}

/** 从 Local Environment 读取可 Provision 的事实；不会读取或导出完整 Registry Snapshot。 */
export function createProviderProvisioningSource(
  options: ProviderProvisioningSourceOptions,
): ProviderProvisioningSource {
  return {
    async read(syncId: string): Promise<ProviderProvisioningEnvelope> {
      const [personal, settings, credentials] = await Promise.all([
        readProvisionablePersonalConfig(options.personalRepository, options.personalConfigFilePath),
        options.settingService.get(),
        readProvisioningCredentials(options.credentialFilePath, options.cipherProvider),
      ]);
      // 默认与规则来自同一份持锁读取，不能把两次读取的值拼成不存在的配置版本。
      const personalConfig = encodeProviderConfigFile(personal).config;
      const accountSettings = {
        providerFamilyDomain: settings.providerFamilyDomain ?? null,
        providerFamilyConnectionSelections: settings.providerFamilyConnectionSelections ?? {},
      };
      return providerProvisioningEnvelopeSchema.parse({
        schemaVersion: 1,
        syncId,
        personalConfig,
        accountSettings,
        credentials,
      });
    },
  };
}

/** 分发读取不能把坏文件的内存降级当成权威；Source 与 Target 使用同一完整读取约束。 */
export async function readProvisionablePersonalConfig(
  repository: PersonalProviderConfigRepository,
  filePath: string,
): Promise<ProviderConfigLayerSnapshot> {
  const personal = await repository.read();
  let raw: string;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (isFileNotFound(error)) {
      const rules = personal.models.toPersonalJSON();
      // 首次尚无 Personal 文件是合法空配置；已有内容后文件消失不能继续导出旧快照。
      if (
        personal.providers.keys().length === 0 &&
        rules.providerModelRules.length === 0 &&
        rules.manualProviderModelRules.length === 0 &&
        !personal.providerOrder?.length &&
        personal.defaultModelSelection === undefined
      )
        return personal;
    }
    throw new Error(`本地 Personal Provider Config 无法同步: ${filePath}`, { cause: error });
  }
  try {
    const decoded = decodeProviderConfigFile(JSON.parse(raw) as unknown);
    const actualRevision = createHash("sha256")
      .update(JSON.stringify(encodeProviderConfigFile(decoded)))
      .digest("hex");
    if (actualRevision !== personal.revision) {
      throw new Error("Personal Provider Config 在读取期间发生变化");
    }
    return personal;
  } catch (error) {
    throw new Error(`本地 Personal Provider Config 无法同步: ${filePath}`, { cause: error });
  }
}

async function readProvisioningCredentials(
  credentialFilePath: string,
  cipherProvider?: CredentialCipherProvider,
): Promise<ProviderProvisioningCredentialEntry[]> {
  let raw: string;
  try {
    raw = await readFile(credentialFilePath, "utf8");
  } catch (error) {
    if (isFileNotFound(error)) return [];
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) {
    throw new Error("Credential Store 必须是 JSON 对象");
  }
  const cipher = cipherProvider ?? createCredentialCipherProvider();
  const allowedKeys = new Set<string>(PROVIDER_PROVISIONING_OAUTH_CREDENTIAL_KEYS);
  const entries: ProviderProvisioningCredentialEntry[] = [];
  // 官方 oauth / account-provider 残留不得进入同步信封。
  for (const [key, encrypted] of Object.entries(parsed)) {
    const scope = allowedKeys.has(key) ? ("oauth-session" as const) : undefined;
    if (!scope) continue;
    if (typeof encrypted !== "string") {
      throw new Error(`Credential allowlist value must be a string: ${key}`);
    }
    const value = cipher.decrypt(encrypted);
    if (!value.trim()) continue;
    entries.push({ scope, key, value });
  }
  return entries;
}

function isRecord(input: unknown): input is Record<string, unknown> {
  return typeof input === "object" && input !== null && !Array.isArray(input);
}

function isFileNotFound(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "ENOENT"
  );
}

export function resolveCredentialFilePath(appConfigDir: string): string {
  return join(appConfigDir, CREDENTIAL_FILE_NAME);
}

/** 只枚举 Provisioning allowlist 的物理 key，供目标端实现 replace-allowlist 删除语义。 */
export async function listProviderProvisioningCredentialKeys(
  credentialFilePath: string,
): Promise<readonly string[]> {
  let raw: string;
  try {
    raw = await readFile(credentialFilePath, "utf8");
  } catch (error) {
    if (isFileNotFound(error)) return [];
    throw error;
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!isRecord(parsed)) throw new Error("Credential Store 必须是 JSON 对象");
  const oauthKeys = new Set<string>(PROVIDER_PROVISIONING_OAUTH_CREDENTIAL_KEYS);
  return Object.keys(parsed).filter((key) => oauthKeys.has(key));
}
