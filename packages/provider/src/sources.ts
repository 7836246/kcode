import {
  ProviderConfig,
  ProviderConfigMap,
  ProviderTemplateMap,
  ZhipuAccountAccessConfig,
  type ModelConfigRules,
} from "./config/index.js";
import type { AccountProviderStates } from "./account-provider-state.js";

export interface ProviderSource<TSnapshot> {
  read(): Promise<TSnapshot>;
  onDidChange(listener: (reason: string) => void): () => void;
}

export interface ProviderConfigSnapshot {
  readonly revision: string;
  readonly kcodeBuiltinRevision: string;
  readonly personalRevision: string;
  readonly kcodeBuiltinProviders: ProviderConfigMap;
  readonly kcodeBuiltinProviderTemplates: ProviderTemplateMap;
  readonly personalProviders: ProviderConfigMap;
  readonly kcodeBuiltinModelRules: ModelConfigRules;
  readonly personalModels: ModelConfigRules;
  readonly personalProviderOrder?: readonly string[];
}

export interface AccountProviderConfigSnapshot {
  readonly revision: string;
  readonly basedOnKCodeBuiltinRevision: string;
  readonly providers: ProviderConfigMap;
  readonly states?: AccountProviderStates;
}

/** 首次 Account 事实尚未到达时，基于当前 Built-in 生成可发布的 fail-closed Overlay。 */
export function createFailClosedAccountProviderConfigSnapshot(
  config: ProviderConfigSnapshot,
): AccountProviderConfigSnapshot {
  const unentitledProviders = new ProviderConfigMap(
    config.kcodeBuiltinProviders.entries().flatMap(([providerId, provider]) =>
      provider.access?.type === "zhipu-account"
        ? ([
            [
              providerId,
              new ProviderConfig({
                access: new ZhipuAccountAccessConfig({ entitled: false }),
              }),
            ],
          ] as const)
        : [],
    ),
  );
  return createAccountProviderConfigSnapshot(config.kcodeBuiltinRevision, unentitledProviders);
}

export function createAccountProviderConfigSnapshot(
  basedOnKCodeBuiltinRevision: string,
  providers: ProviderConfigMap,
  states?: AccountProviderStates,
): AccountProviderConfigSnapshot {
  return Object.freeze({
    revision: `account:${JSON.stringify([basedOnKCodeBuiltinRevision, providers.toJSON(), states])}`,
    basedOnKCodeBuiltinRevision,
    providers,
    ...(states ? { states } : {}),
  });
}

const EMPTY_ACCOUNT_PROVIDER_CONFIG_SNAPSHOT: AccountProviderConfigSnapshot = Object.freeze({
  revision: "empty-account-config-v1",
  basedOnKCodeBuiltinRevision: "uninitialized",
  providers: ProviderConfigMap.empty(),
});

/**
 * 由进程外围适配器更新的账号 Provider 可用范围。
 *
 * Source 只保存账号状态投影出的第三层 Provider Config Overlay。
 * models 是账号权益约束；Token、API Key、Header 与账号身份不得写入 Config。
 */
export class MutableAccountProviderConfigSource implements ProviderSource<AccountProviderConfigSnapshot> {
  readonly #listeners = new Set<(reason: string) => void>();
  #snapshot: AccountProviderConfigSnapshot = EMPTY_ACCOUNT_PROVIDER_CONFIG_SNAPSHOT;

  async read(): Promise<AccountProviderConfigSnapshot> {
    return this.#snapshot;
  }

  onDidChange(listener: (reason: string) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  replace(snapshot: AccountProviderConfigSnapshot, reason = "replace"): boolean {
    if (snapshot.revision === this.#snapshot.revision) return false;
    this.#snapshot = freezeAccountProviderConfigSnapshot(snapshot);
    for (const listener of this.#listeners) listener(reason);
    return true;
  }
}

function freezeAccountProviderConfigSnapshot(
  snapshot: AccountProviderConfigSnapshot,
): AccountProviderConfigSnapshot {
  return Object.freeze({
    revision: snapshot.revision,
    basedOnKCodeBuiltinRevision: snapshot.basedOnKCodeBuiltinRevision,
    providers: snapshot.providers,
    ...(snapshot.states ? { states: snapshot.states } : {}),
  });
}
