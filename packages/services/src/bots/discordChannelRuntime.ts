import type { BotConfig, BotProviderCallbackResult, BotsConfigFile } from "@kcode/shared";
import type { ICredentialService } from "../credential/credential.js";
import {
  acquireDiscordGatewayLock,
  assertBotCallbackSucceeded,
  BOT_RUNTIME_LOCK_RETRY_MS,
  createBotConnectionFingerprint,
  createLatestRuntimeRefreshQueue,
  type BotRuntimeLogger,
  type BotRuntimeStatusSink,
  waitFor,
} from "./channelRuntime.js";
import { runDiscordGateway } from "./providers/discordGateway.js";

interface DiscordChannelRuntimeDeps {
  runBackgroundTasks?: boolean;
  credentialService: ICredentialService;
  logger: BotRuntimeLogger;
  statusSink: BotRuntimeStatusSink;
  ensureBotStorageMigrated(): Promise<void>;
  readConfig(): Promise<BotsConfigFile>;
  processProviderCallback(
    provider: "discord",
    payload: unknown,
  ): Promise<BotProviderCallbackResult>;
}

export function createDiscordChannelRuntime(deps: DiscordChannelRuntimeDeps) {
  interface RuntimeEntry {
    controller: AbortController;
    fingerprint: string;
    done: Promise<void>;
  }

  const runtimes = new Map<string, RuntimeEntry>();
  const refreshQueue = createLatestRuntimeRefreshQueue();
  const botUserIds = new Map<string, string>();

  async function getConnectionFingerprint(bot: BotConfig): Promise<string> {
    const credential = bot.credentialRef
      ? await deps.credentialService.load(bot.credentialRef)
      : null;
    return createBotConnectionFingerprint([
      bot.provider,
      bot.credentialRef ?? "",
      credential ?? "",
    ]);
  }

  async function runBot(bot: BotConfig, signal: AbortSignal): Promise<void> {
    const token = bot.credentialRef
      ? await deps.credentialService.load(bot.credentialRef)
      : null;
    if (!token?.trim()) {
      deps.statusSink.setRuntimeStatus({
        botId: bot.id,
        provider: "discord",
        status: "error",
        messageId: "bots.runtime.discordTokenMissing",
        message: "Discord bot token is missing.",
      });
      return;
    }

    while (!signal.aborted) {
      let lock: Awaited<ReturnType<typeof acquireDiscordGatewayLock>>;
      try {
        lock = await acquireDiscordGatewayLock(token, bot.id);
      } catch (error) {
        if (signal.aborted) {
          return;
        }
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "discord",
          status: "error",
          message: `Discord gateway lock failed: ${error instanceof Error ? error.message : String(error)}`,
        });
        await waitFor(5_000, signal);
        continue;
      }
      if (!lock) {
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "discord",
          status: "idle",
          messageId: "bots.runtime.discordGatewayHandledElsewhere",
          message: "Discord gateway is handled by another KCode window.",
        });
        await waitFor(BOT_RUNTIME_LOCK_RETRY_MS, signal);
        continue;
      }
      try {
        await runDiscordGateway(token, signal, {
          onReady(botUserId) {
            botUserIds.set(bot.id, botUserId);
          },
          onStatus(status, message) {
            deps.statusSink.setRuntimeStatus({
              botId: bot.id,
              provider: "discord",
              status: status === "connected" ? "connected" : status === "connecting" ? "polling" : "error",
              messageId:
                status === "connected"
                  ? "bots.runtime.discordGatewayRunning"
                  : status === "connecting"
                    ? "bots.runtime.discordGatewayStarting"
                    : undefined,
              message,
            });
          },
          async onDispatch(dispatch) {
            const result = await deps.processProviderCallback("discord", {
              botId: bot.id,
              botUserId: botUserIds.get(bot.id),
              dispatch,
            });
            assertBotCallbackSucceeded("discord", result);
          },
        });
      } catch (error) {
        if (signal.aborted) {
          return;
        }
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "discord",
          status: "error",
          messageId: "bots.runtime.discordGatewayFailedRetrying",
          message: error instanceof Error ? error.message : "Discord gateway failed; retrying.",
        });
        await waitFor(5_000, signal);
      } finally {
        await lock.release().catch((error: unknown) => {
          deps.logger.debug(
            undefined,
            `release Discord gateway lock failed bot=${bot.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
    }
  }

  async function stopGateway(botId: string): Promise<void> {
    const runtime = runtimes.get(botId);
    runtime?.controller.abort();
    if (runtime) {
      await runtime.done;
      if (runtimes.get(botId) === runtime) {
        runtimes.delete(botId);
      }
    }
    botUserIds.delete(botId);
    const previous = deps.statusSink.getRuntimeStatus(botId);
    if (previous) {
      deps.statusSink.setRuntimeStatus({
        ...previous,
        status: "idle",
        messageId: "bots.runtime.discordGatewayStopped",
        message: "Discord gateway is stopped.",
      });
    }
  }

  function startGateway(bot: BotConfig, fingerprint: string): void {
    if (runtimes.has(bot.id)) {
      return;
    }
    const controller = new AbortController();
    deps.statusSink.setRuntimeStatus({
      botId: bot.id,
      provider: "discord",
      status: "polling",
      messageId: "bots.runtime.discordGatewayStarting",
      message: "Discord gateway is starting.",
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
          `Discord gateway stopped unexpectedly bot=${bot.id}: ${error instanceof Error ? error.message : String(error)}`,
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
        .filter((bot) => bot.provider === "discord" && bot.enabled && bot.credentialRef)
        .map((bot) => bot.id),
    );
    for (const botId of runtimes.keys()) {
      if (!activeIds.has(botId)) {
        await stopGateway(botId);
        if (!isLatest()) {
          return;
        }
      }
    }
    for (const bot of currentConfig.bots) {
      if (bot.provider === "discord" && bot.enabled && bot.credentialRef) {
        const fingerprint = await getConnectionFingerprint(bot);
        if (!isLatest()) {
          return;
        }
        const runtime = runtimes.get(bot.id);
        if (runtime && runtime.fingerprint !== fingerprint) {
          await stopGateway(bot.id);
          if (!isLatest()) {
            return;
          }
        }
        startGateway(bot, fingerprint);
      } else if (bot.provider === "discord" && !bot.enabled) {
        deps.statusSink.setRuntimeStatus({
          botId: bot.id,
          provider: "discord",
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
        `refresh Discord gateway failed: ${error instanceof Error ? error.message : String(error)}`,
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
    botUserIds.clear();
  }

  return {
    refresh,
    scheduleRefresh,
    stopGateway,
    dispose,
  };
}
