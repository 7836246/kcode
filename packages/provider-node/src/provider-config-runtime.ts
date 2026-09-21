import {
  ProviderConfigService,
  type ProviderConfigLayerSnapshot,
  type ProviderConfigLayerUpdate,
} from "@kcode/provider";
import { NodeKCodeBuiltinProviderConfigSource } from "./kcode-builtin-provider-config-source.js";
import {
  EndpointScopedKCodeBuiltinSource,
  type EndpointScopedKCodeBuiltinSourceOptions,
} from "./endpoint-scoped-kcode-builtin-source.js";
import {
  KCodeBuiltinRemoteSynchronizer,
  type KCodeBuiltinRemoteSynchronizerOptions,
  type KCodeBuiltinRefreshResult,
} from "./kcode-builtin-remote-synchronizer.js";
import {
  NodePersonalProviderConfigRepository,
  type PersonalProviderConfigRecoveryEvent,
} from "./personal-provider-config-repository.js";

export interface NodeProviderConfigRuntimeOptions {
  readonly kcodeBuiltinFilePath: string;
  readonly kcodeBuiltinActiveFilePath?: string;
  readonly kcodeBuiltinRemote?: Omit<KCodeBuiltinRemoteSynchronizerOptions, "source">;
  readonly kcodeBuiltinEnvironment?: Omit<
    EndpointScopedKCodeBuiltinSourceOptions,
    "bundledFilePath"
  >;
  readonly onKCodeBuiltinRefreshError?: (error: unknown) => void;
  readonly onPersonalConfigRecovery?: (event: PersonalProviderConfigRecoveryEvent) => void;
  readonly onPersonalConfigPollingError?: (error: unknown) => void;
  readonly personalFilePath: string;
  readonly personalPollingIntervalMs?: number | false;
  readonly importLegacy?: (
    kcodeBuiltin: ProviderConfigLayerSnapshot,
  ) => Promise<ProviderConfigLayerUpdate | null>;
  readonly watch?: boolean;
}

/** 组装一个 Node.js 进程内共享的 KCode Built-in/Personal Config 运行边界。 */
export class NodeProviderConfigRuntime {
  readonly configService: ProviderConfigService;
  readonly #kcodeBuiltinSource:
    | NodeKCodeBuiltinProviderConfigSource
    | EndpointScopedKCodeBuiltinSource;
  readonly #personalRepository: NodePersonalProviderConfigRepository;
  readonly #remoteSynchronizer?: KCodeBuiltinRemoteSynchronizer;
  readonly #onRemoteRefreshError?: (error: unknown) => void;
  #startPromise: Promise<void> | null = null;
  #disposed = false;
  readonly #checkListeners = new Set<() => Promise<void>>();
  #checkTimer: ReturnType<typeof setInterval> | null = null;
  #checkInFlight: Promise<void> | null = null;

  constructor(options: NodeProviderConfigRuntimeOptions) {
    this.#kcodeBuiltinSource = options.kcodeBuiltinEnvironment
      ? new EndpointScopedKCodeBuiltinSource({
          bundledFilePath: options.kcodeBuiltinFilePath,
          ...options.kcodeBuiltinEnvironment,
        })
      : new NodeKCodeBuiltinProviderConfigSource({
          bundledFilePath: options.kcodeBuiltinFilePath,
          activeFilePath: options.kcodeBuiltinActiveFilePath,
          watch: options.watch,
        });
    this.#remoteSynchronizer =
      options.kcodeBuiltinRemote &&
      this.#kcodeBuiltinSource instanceof NodeKCodeBuiltinProviderConfigSource
        ? new KCodeBuiltinRemoteSynchronizer({
            source: this.#kcodeBuiltinSource,
            ...options.kcodeBuiltinRemote,
          })
        : undefined;
    this.#onRemoteRefreshError = options.onKCodeBuiltinRefreshError;
    this.#personalRepository = new NodePersonalProviderConfigRepository({
      filePath: options.personalFilePath,
      onRecovery: options.onPersonalConfigRecovery,
      onPollingError: options.onPersonalConfigPollingError,
      pollingIntervalMs: options.personalPollingIntervalMs,
      ...(options.importLegacy
        ? {
            importLegacy: async () => options.importLegacy!(await this.#kcodeBuiltinSource.read()),
          }
        : {}),
    });
    this.configService = new ProviderConfigService({
      kcodeBuiltinSource: this.#kcodeBuiltinSource,
      personalRepository: this.#personalRepository,
    });
  }

  resolveKCodeBuiltinActiveFilePath(): Promise<string> {
    return this.#kcodeBuiltinSource instanceof NodeKCodeBuiltinProviderConfigSource
      ? Promise.resolve(this.#kcodeBuiltinSource.activeFilePath)
      : this.#kcodeBuiltinSource.resolveActiveFilePath();
  }

  get personalRepository(): import("@kcode/provider").PersonalProviderConfigRepository {
    return this.#personalRepository;
  }

  /** Environment 同一周期检查中恢复未对齐依赖，不被下载 TTL 或失败挡住。 */
  onDidCheckKCodeBuiltin(listener: () => Promise<void>): () => void {
    this.#checkListeners.add(listener);
    return () => this.#checkListeners.delete(listener);
  }

  start(): Promise<void> {
    if (this.#disposed) throw new Error("NodeProviderConfigRuntime 已 dispose");
    if (this.#startPromise) return this.#startPromise;
    const startPromise = this.configService.read().then(() => {
      if (this.#disposed) return;
      void this.#checkBackground();
      // Managed Worker 无下载配置也无恢复 owner，不建立周期任务。
      if (
        this.#remoteSynchronizer ||
        this.#kcodeBuiltinSource instanceof EndpointScopedKCodeBuiltinSource ||
        this.#checkListeners.size > 0
      ) {
        this.#checkTimer = setInterval(() => {
          void this.#checkBackground();
        }, 60_000);
        this.#checkTimer.unref?.();
      }
    });
    this.#startPromise = startPromise;
    void startPromise.catch(() => {
      if (this.#startPromise === startPromise) this.#startPromise = null;
    });
    return startPromise;
  }

  refreshKCodeBuiltin(options?: { readonly force?: boolean }): Promise<KCodeBuiltinRefreshResult> {
    if (this.#disposed) return Promise.resolve("disposed");
    if (this.#kcodeBuiltinSource instanceof EndpointScopedKCodeBuiltinSource) {
      return this.#kcodeBuiltinSource.refresh(options);
    }
    return this.#remoteSynchronizer?.refresh(options) ?? Promise.resolve("skipped");
  }

  #checkBackground(): Promise<void> {
    if (this.#disposed) return Promise.resolve();
    if (this.#checkInFlight) return this.#checkInFlight;
    const check = Promise.allSettled([
      this.refreshKCodeBuiltin(),
      ...[...this.#checkListeners].map((listener) => Promise.resolve().then(listener)),
    ])
      .then((results) => {
        if (this.#disposed) return;
        for (const result of results)
          if (result.status === "rejected") this.#onRemoteRefreshError?.(result.reason);
      })
      .finally(() => {
        if (this.#checkInFlight === check) this.#checkInFlight = null;
      });
    this.#checkInFlight = check;
    return check;
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#checkTimer) clearInterval(this.#checkTimer);
    this.#checkTimer = null;
    this.#checkListeners.clear();
    this.#remoteSynchronizer?.dispose();
    this.configService.dispose();
    this.#personalRepository.dispose();
    this.#kcodeBuiltinSource.dispose();
  }
}

export function createNodeProviderConfigRuntime(
  options: NodeProviderConfigRuntimeOptions,
): NodeProviderConfigRuntime {
  return new NodeProviderConfigRuntime(options);
}
