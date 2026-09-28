import type { BotConfig, BotProviderCallbackResult, BotsConfigFile } from "@kcode/shared";
import type { ICredentialService } from "../credential/credential.js";
import {
  acquireDingdingStreamLock,
  assertBotCallbackSucceeded,
  BOT_RUNTIME_LOCK_RETRY_MS,
  createBotConnectionFingerprint,
  createLatestRuntimeRefreshQueue,
  type BotRuntimeLogger,
  type BotRuntimeStatusSink,
  waitFor,
} from "./channelRuntime.js";
import { runDingdingStream } from "./providers/dingdingStream.js";

interface DingdingChannelRuntimeDeps {
  runBackgroundTasks?: boolean;
  credentialService: ICredentialService;
  logger: BotRuntimeLogger;
  statusSink: BotRuntimeStatusSink;
  ensureBotStorageMigrated(): Promise<void>;
  readConfig(): Promise<BotsConfigFile>;
  processProviderCallback(
    provider: "dingding",
    payload: unknown,
  ): Promise<BotProviderCallbackResult>;
}

export function createDingdingChannelRuntime(deps: DingdingChannelRuntimeDeps) {
  interface RuntimeEntry {
    controller: AbortController;
    fingerprint: string;
    done: Promise<void>;
  }

  const runtimes = new Map<string, RuntimeEntry>();
  const refreshQueue = createLatestRuntimeRefreshQueue();

  async function getConnectionFingerprint(bot: BotConfig): Promise<string> {
    const credential = bot.credentialRef
      ? await deps.credentialService.load(bot.credentialRef)
      : null;
    return createBotConnectionFingerprint([
      bot.provider,
      bot.dingdingAppKey ?? "",
      bot.credentialRef ?? "",
      credential ?? "",
    ]);
  }

  async function runBot(bot: BotConfig, signal: AbortSignal): Promise<void> {
    const secret = bot.credentialRef
      ? await deps.credentialService.load(bot.credentialRef)
      : null;
    if (!bot.dingdingAppKey?.trim() || !secret?.trim()) {
      deps.statusSink.setRuntimeStatus({
        botId: bot.id,
        provider: "dingding",
        status: "error",
        messageId: "bots.runtime.dingdingTokenMissing",
        message: "DingTalk AppKey or AppSecret is missing.",
      });
      return;
    }

    while (!signal.aborted) {
      let lock: Awaited<ReturnType<typeof acquireDingdingStreamLock>>;
      try {
        lock = await acquireDingdingStreamLock(bot.dingdingAppKey.trim(), bot.id);
      } catch (error) {
        if (signal.aborted) {
          return;
        }
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "dingding",
          status: "error",
          message: `DingTalk stream lock failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        await waitFor(5_000, signal);
        continue;
      }
      if (!lock) {
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "dingding",
          status: "idle",
          messageId: "bots.runtime.dingdingStreamHandledElsewhere",
          message: "DingTalk stream is handled by another KCode window.",
        });
        await waitFor(BOT_RUNTIME_LOCK_RETRY_MS, signal);
        continue;
      }
      try {
        await runDingdingStream(
          bot,
          { loadCredential: (key) => deps.credentialService.load(key) },
          signal,
          {
            onStatus(status, message) {
              deps.statusSink.setRuntimeStatus({
                botId: bot.id,
                provider: "dingding",
                status:
                  status === "connected" ? "connected" : status === "connecting" ? "polling" : "error",
                messageId:
                  status === "connected"
                    ? "bots.runtime.dingdingStreamRunning"
                    : status === "connecting"
                      ? "bots.runtime.dingdingStreamStarting"
                      : undefined,
                message,
              });
            },
            async onDispatch(dispatch) {
              const result = await deps.processProviderCallback("dingding", {
                botId: bot.id,
                dispatch,
              });
              assertBotCallbackSucceeded("dingding", result);
            },
          },
        );
      } catch (error) {
        if (signal.aborted) {
          return;
        }
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "dingding",
          status: "error",
          messageId: "bots.runtime.dingdingStreamFailedRetrying",
          message: error instanceof Error ? error.message : "DingTalk stream failed; retrying.",
        });
        await waitFor(5_000, signal);
      } finally {
        await lock.release().catch((error: unknown) => {
          deps.logger.debug(
            undefined,
            `release DingTalk stream lock failed bot=${bot.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
    }
  }

  async function stopStream(botId: string): Promise<void> {
    const runtime = runtimes.get(botId);
    runtime?.controller.abort();
    if (runtime) {
      await runtime.done;
      if (runtimes.get(botId) === runtime) {
        runtimes.delete(botId);
      }
    }
    const previous = deps.statusSink.getRuntimeStatus(botId);
    if (previous) {
      deps.statusSink.setRuntimeStatus({
        ...previous,
        status: "idle",
        messageId: "bots.runtime.dingdingStreamStopped",
        message: "DingTalk stream is stopped.",
      });
    }
  }

  function startStream(bot: BotConfig, fingerprint: string): void {
    if (runtimes.has(bot.id)) {
      return;
    }
    const controller = new AbortController();
    deps.statusSink.setRuntimeStatus({
      botId: bot.id,
      provider: "dingding",
      status: "polling",
      messageId: "bots.runtime.dingdingStreamStarting",
      message: "DingTalk stream is starting.",
    });
    const runtime: RuntimeEntry = {
      controller,
      fingerprint,
      done: Promise.resolve(),
    };
    runtime.done = runBot(bot, controller.signal)
      .catch((error: unknown) => {
        deps.logger.warn(
          undefined,
          `DingTalk stream stopped unexpectedly bot=${bot.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      })
      .finally(() => {
        if (runtimes.get(bot.id) === runtime) {
          runtimes.delete(bot.id);
        }
      });
    runtimes.set(bot.id, runtime);
  }

  async function reconcile(
    config: BotsConfigFile | undefined,
    isLatest: () => boolean,
  ): Promise<void> {
    await deps.ensureBotStorageMigrated();
    const currentConfig = config ?? (await deps.readConfig());
    if (!isLatest()) {
      return;
    }
    const activeIds = new Set(
      currentConfig.bots
        .filter(
          (bot) =>
            bot.provider === "dingding" && bot.enabled && bot.credentialRef && bot.dingdingAppKey,
        )
        .map((bot) => bot.id),
    );
    for (const botId of runtimes.keys()) {
      if (!activeIds.has(botId)) {
        await stopStream(botId);
        if (!isLatest()) {
          return;
        }
      }
    }
    for (const bot of currentConfig.bots) {
      if (bot.provider === "dingding" && bot.enabled && bot.credentialRef && bot.dingdingAppKey) {
        const fingerprint = await getConnectionFingerprint(bot);
        if (!isLatest()) {
          return;
        }
        const runtime = runtimes.get(bot.id);
        if (runtime && runtime.fingerprint !== fingerprint) {
          await stopStream(bot.id);
          if (!isLatest()) {
            return;
          }
        }
        startStream(bot, fingerprint);
      } else if (bot.provider === "dingding" && !bot.enabled) {
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "dingding",
          status: "disabled",
          messageId: "bots.runtime.botDisabled",
          message: "Bot is disabled.",
        });
      }
    }
  }

  function refresh(config?: BotsConfigFile): Promise<void> {
    return refreshQueue.enqueue((isLatest) => reconcile(config, isLatest));
  }

  function scheduleRefresh(config?: BotsConfigFile): void {
    if (deps.runBackgroundTasks === false) {
      return;
    }
    void refresh(config).catch((error: unknown) => {
      deps.logger.warn(
        undefined,
        `refresh DingTalk stream failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }

  async function dispose(): Promise<void> {
    refreshQueue.invalidate();
    const activeRuntimes = [...runtimes.values()];
    for (const runtime of activeRuntimes) {
      runtime.controller.abort();
    }
    await Promise.allSettled(activeRuntimes.map((runtime) => runtime.done));
    runtimes.clear();
  }

  return {
    refresh,
    scheduleRefresh,
    stopStream,
    dispose,
  };
}
