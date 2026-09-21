import { createSharedKCodeCredentialStore, SHARED_KCODE_CREDENTIAL_KEYS } from "@kcode/adapters";
import type { EnvRecord } from "@kcode/adapters/model";
import type { SharedKCodeCredentialStore } from "@kcode/adapters";

export type CodingPlanProviderId = "bigmodel" | "zai";

const OFFICIAL_LOGIN_UNSUPPORTED =
  "Official Z.ai / BigModel login is no longer supported. Configure a generic API-key provider instead.";

export interface LoginKCodeCliOptions {
  providerId?: CodingPlanProviderId;
  abortSignal?: AbortSignal;
  baseUrl?: string;
  credentialStore?: SharedKCodeCredentialStore;
  env?: EnvRecord;
  noBrowser?: boolean;
  now?: () => number;
  onAuthorizeUrl?: (data: { authorize_url: string }) => void | Promise<void>;
  onBrowserOpen?: (result: { opened: boolean; reason?: string }) => void | Promise<void>;
  onPollStatus?: (data: unknown) => void | Promise<void>;
  openBrowser?: (url: string) => Promise<{ opened: boolean; reason?: string }>;
  pollToken?: string;
  sleep?: (ms: number) => Promise<void>;
  timeoutMs?: number;
  personalProviderConfigPath?: string;
}

export interface LoginKCodeCliResult {
  browser?: { opened: boolean; reason?: string };
  configPath: string;
  credentialsPath: string;
  model: string;
  providerId: CodingPlanProviderId;
  user: { user_id: string; email?: string; name?: string; avatar?: string };
}

export type LoginBigmodelCodingPlanOptions = Omit<LoginKCodeCliOptions, "providerId">;
export type LoginBigmodelCodingPlanResult = LoginKCodeCliResult & { providerId: "bigmodel" };

export interface ConfigureCodingPlanApiKeyOptions {
  apiKey: string;
  credentialStore?: SharedKCodeCredentialStore;
  env?: EnvRecord;
  personalProviderConfigPath?: string;
  providerId: CodingPlanProviderId;
}

export interface ConfigureCodingPlanApiKeyResult {
  configPath: string;
  model: string;
  providerId: CodingPlanProviderId;
}

export interface LogoutKCodeCliOptions {
  credentialStore?: SharedKCodeCredentialStore;
  env?: EnvRecord;
}

export interface LogoutKCodeCliResult {
  credentialsPath: string;
}

export async function hasConfiguredStandaloneCodingPlan(
  _options: {
    credentialStore?: SharedKCodeCredentialStore;
    env?: EnvRecord;
  } = {},
): Promise<boolean> {
  return false;
}

export class KCodeCliLoginError extends Error {
  readonly code:
    | "auth_failed"
    | "auth_timeout"
    | "config_update_failed"
    | "credential_write_failed"
    | "unsupported";

  constructor(
    code: KCodeCliLoginError["code"],
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, options);
    this.name = "KCodeCliLoginError";
    this.code = code;
  }
}

export async function loginKCodeCli(_options: LoginKCodeCliOptions = {}): Promise<LoginKCodeCliResult> {
  throw new KCodeCliLoginError("unsupported", OFFICIAL_LOGIN_UNSUPPORTED);
}

export async function loginBigmodelCodingPlan(
  _options: LoginBigmodelCodingPlanOptions = {},
): Promise<LoginBigmodelCodingPlanResult> {
  throw new KCodeCliLoginError("unsupported", OFFICIAL_LOGIN_UNSUPPORTED);
}

export async function configureCodingPlanApiKey(
  _options: ConfigureCodingPlanApiKeyOptions,
): Promise<ConfigureCodingPlanApiKeyResult> {
  throw new KCodeCliLoginError("unsupported", OFFICIAL_LOGIN_UNSUPPORTED);
}

export async function logoutKCodeCli(
  options: LogoutKCodeCliOptions = {},
): Promise<LogoutKCodeCliResult> {
  const credentialStore =
    options.credentialStore ?? createSharedKCodeCredentialStore({ env: options.env });
  const keys = Object.values(SHARED_KCODE_CREDENTIAL_KEYS);
  const current = await credentialStore.loadMany(keys);
  await credentialStore.deleteIfValues(
    Object.fromEntries(
      Object.entries(current).flatMap(([key, value]) => (value === null ? [] : [[key, value]])),
    ),
  );
  return {
    credentialsPath: credentialStore.filePath,
  };
}
