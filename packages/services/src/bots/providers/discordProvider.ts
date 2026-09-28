import type { BotConfig, BotInboundMessage, BotOutboundMessage } from "@kcode/shared";
import type { BotProviderAdapter } from "./types.js";
import { fetchBotProviderJson } from "#src/bots/providers/providerRequest.js";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_TEXT_LIMIT = 1900;

interface DiscordProviderDeps {
  loadCredential(key: string): Promise<string | null>;
}

interface DiscordUser {
  id?: string;
  username?: string;
  bot?: boolean;
}

interface DiscordChannel {
  id?: string;
  type?: number;
}

interface DiscordMessage {
  id?: string;
  content?: string;
  author?: DiscordUser;
  channel_id?: string;
  channel?: DiscordChannel;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function discordHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bot ${token}`,
    "content-type": "application/json",
    "user-agent": "KCode (https://github.com/7836246/kcode, discord-bot)",
  };
}

async function loadToken(bot: BotConfig, deps: DiscordProviderDeps): Promise<string | null> {
  return bot.credentialRef ? deps.loadCredential(bot.credentialRef) : null;
}

function splitDiscordText(text: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += DISCORD_TEXT_LIMIT) {
    chunks.push(text.slice(index, index + DISCORD_TEXT_LIMIT));
  }
  return chunks.length > 0 ? chunks : [text];
}

export function parseDiscordDispatch(
  botId: string,
  payload: unknown,
  botUserId?: string,
): BotInboundMessage[] {
  if (!isRecord(payload) || payload.t !== "MESSAGE_CREATE" || !isRecord(payload.d)) {
    return [];
  }
  const message = payload.d as DiscordMessage;
  const author = message.author;
  const authorId = author?.id?.trim() ?? "";
  const content = message.content?.trim() ?? "";
  const channelId = message.channel_id?.trim() ?? "";
  if (!authorId || !content || !channelId) {
    return [];
  }
  if (author?.bot === true || (botUserId && authorId === botUserId)) {
    return [];
  }
  const channelType = message.channel?.type;
  return [
    {
      botId,
      text: content,
      actor: {
        provider: "discord",
        botId,
        providerUserId: authorId,
        displayName: author?.username,
        chatType: channelType === 1 ? "private" : "group",
        chatId: channelId,
        providerMessageId: message.id,
      },
    },
  ];
}

export function createDiscordBotProvider(deps: DiscordProviderDeps): BotProviderAdapter {
  return {
    async test(bot) {
      const token = await loadToken(bot, deps);
      if (!token?.trim()) {
        return { ok: false, message: "Discord bot token is missing." };
      }
      const result = await fetchBotProviderJson<{ id?: string; username?: string; message?: string }>(
        `${DISCORD_API_BASE}/users/@me`,
        { headers: discordHeaders(token) },
      );
      if (!result.ok || !result.payload?.id) {
        return {
          ok: false,
          message: result.payload?.message ?? `Discord token check failed (HTTP ${result.status}).`,
        };
      }
      return {
        ok: true,
        message: result.payload.username
          ? `Connected as ${result.payload.username}`
          : "Discord token is valid.",
      };
    },

    async resolveName(bot) {
      const token = await loadToken(bot, deps);
      if (!token?.trim()) {
        return null;
      }
      const result = await fetchBotProviderJson<{ username?: string }>(`${DISCORD_API_BASE}/users/@me`, {
        headers: discordHeaders(token),
      });
      return result.payload?.username?.trim() || null;
    },

    async send(bot, message: BotOutboundMessage) {
      const token = await loadToken(bot, deps);
      if (!token?.trim()) {
        return;
      }
      const channelId = message.providerUserId.trim();
      if (!channelId) {
        return;
      }
      for (const content of splitDiscordText(message.text)) {
        const result = await fetchBotProviderJson<{ message?: string }>(
          `${DISCORD_API_BASE}/channels/${encodeURIComponent(channelId)}/messages`,
          {
            method: "POST",
            headers: discordHeaders(token),
            body: JSON.stringify({ content }),
          },
        );
        if (!result.ok) {
          throw new Error(result.payload?.message ?? `Discord send failed (HTTP ${result.status}).`);
        }
      }
    },

    parseCallback(payload: unknown): BotInboundMessage[] {
      if (!isRecord(payload)) {
        return [];
      }
      const botId = typeof payload.botId === "string" ? payload.botId : "";
      const botUserId = typeof payload.botUserId === "string" ? payload.botUserId : undefined;
      if (!botId) {
        return [];
      }
      return parseDiscordDispatch(botId, payload.dispatch ?? payload, botUserId);
    },
  };
}
