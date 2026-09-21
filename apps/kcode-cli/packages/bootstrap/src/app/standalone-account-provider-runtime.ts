import type { SharedKCodeCredentialStore } from "@kcode/adapters/auth";
import type { ProviderRuntimeHeadersPort } from "@kcode/core";
import {
  createAccountProviderConfigSnapshot,
  ProviderConfigMap,
  type AccountProviderConfigSnapshot,
  type ProviderConfigLayerSnapshot,
} from "@kcode/provider";
import type { ProviderFamilyDomain } from "@kcode/shared";

interface StandaloneCodingPlanProvider {
  readonly family: ProviderFamilyDomain;
  readonly modelId: string;
  readonly providerId: string;
}

const OFFICIAL_ACCOUNT_UNSUPPORTED =
  "Official Z.ai / BigModel account access is no longer supported.";

export async function readStandaloneCodingPlanProviders(
  _env: Readonly<Record<string, string | undefined>>,
): Promise<readonly StandaloneCodingPlanProvider[]> {
  return [];
}

export function standaloneAccountIdentityCredentialKey(providerId: string): string {
  const normalized = providerId.trim();
  if (!normalized) throw new Error("Standalone Account Provider ID 不能为空");
  return `account-provider:${normalized}:identity`;
}

export function standaloneAccountProviderCredentialKey(input: {
  readonly providerId: string;
  readonly accountIdentity: string;
}): string {
  const providerId = input.providerId.trim();
  const accountIdentity = input.accountIdentity.trim();
  if (!providerId) throw new Error("Standalone Account Provider ID 不能为空");
  if (!accountIdentity) throw new Error("Standalone Account Identity 不能为空");
  return `account-provider:coding-plan:${providerId}:account:${encodeURIComponent(accountIdentity)}:api-key`;
}

export function createStandaloneAccountIdentityFromSecret(secret: string): string {
  const normalized = secret.trim();
  if (!normalized) throw new Error("Standalone Account Secret 不能为空");
  return `key-unsupported`;
}

export async function readStandaloneAccountProviderConfigSnapshot(
  _credentialStore: Pick<SharedKCodeCredentialStore, "loadMany">,
  _env: Readonly<Record<string, string | undefined>>,
  config?: Pick<ProviderConfigLayerSnapshot, "revision" | "providers">,
): Promise<AccountProviderConfigSnapshot> {
  // 官方 Coding Plan overlay 已下线：不再根据残留 oauth 凭据 entitlement 官方账号 provider。
  return createAccountProviderConfigSnapshot(config?.revision ?? "unsupported", new ProviderConfigMap([]));
}

export async function hasStandaloneCodingPlanAccess(
  _credentialStore: Pick<SharedKCodeCredentialStore, "loadMany">,
  _env: Readonly<Record<string, string | undefined>>,
): Promise<boolean> {
  return false;
}

export function createStandaloneProviderRuntimeHeadersPort(
  _credentialStore: Pick<SharedKCodeCredentialStore, "load" | "loadMany">,
  _env: Readonly<Record<string, string | undefined>>,
): ProviderRuntimeHeadersPort {
  return {
    shouldRefreshBeforeModelRequest() {
      return false;
    },
    async refreshBeforeModelRequest(input) {
      input.abortSignal?.throwIfAborted();
      throw new Error(`${OFFICIAL_ACCOUNT_UNSUPPORTED} provider=${input.providerId}`);
    },
  };
}
