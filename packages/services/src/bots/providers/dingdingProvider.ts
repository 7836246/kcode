import type { BotConfig, BotInboundMessage, BotOutboundMessage } from "@kcode/shared";
import type { BotProviderAdapter } from "./types.js";
import { fetchBotProviderJson } from "#src/bots/providers/providerRequest.js";

const DINGDING_API_BASE = "https://api.dingtalk.com";
const DINGDING_TEXT_LIMIT = 2000;
const TOKEN_REFRESH_SKEW_MS = 120_000;

interface DingdingProviderDeps {
  loadCredential(key: string): Promise<string | null>;
}

interface DingdingTokenResponse {
  accessToken?: string;
  expireIn?: number;
  code?: string;
  message?: string;
}

interface DingdingSendResponse {
  processQueryKey?: string;
  code?: string;
  message?: string;
}

const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function dingdingHeaders(accessToken?: string): Record<string, string> {
  return {
    "content-type": "application/json",
    ...(accessToken ? { "x-acs-dingtalk-access-token": accessToken } : {}),
  };
}

function splitDingdingText(text: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += DINGDING_TEXT_LIMIT) {
    chunks.push(text.slice(index, index + DINGDING_TEXT_LIMIT));
  }
  return chunks.length > 0 ? chunks : [text];
}

async function loadAppSecret(bot: BotConfig, deps: DingdingProviderDeps): Promise<string | null> {
  return bot.credentialRef ? deps.loadCredential(bot.credentialRef) : null;
}

export async function getDingdingAccessToken(
  bot: BotConfig,
  deps: DingdingProviderDeps,
): Promise<string> {
  const appKey = bot.dingdingAppKey?.trim() ?? "";
  const secret = await loadAppSecret(bot, deps);
  if (!appKey || !secret?.trim()) {
    throw new Error("DingTalk AppKey or AppSecret is missing.");
  }
  const cached = accessTokenCache.get(bot.id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }
  const result = await fetchBotProviderJson<DingdingTokenResponse>(
    `${DINGDING_API_BASE}/v1.0/oauth2/accessToken`,
    {
      method: "POST",
      headers: dingdingHeaders(),
      body: JSON.stringify({ appKey, appSecret: secret.trim() }),
    },
  );
  const token = result.payload?.accessToken?.trim();
  if (!token) {
    throw new Error(result.payload?.message ?? "DingTalk accessToken request failed.");
  }
  const expireInMs = Math.max(60, result.payload?.expireIn ?? 7200) * 1000;
  accessTokenCache.set(bot.id, {
    token,
    expiresAt: Date.now() + expireInMs - TOKEN_REFRESH_SKEW_MS,
  });
  return token;
}

function isDingdingGroupConversationId(value: string): boolean {
  return value.startsWith("cid");
}

export function parseDingdingCallback(botId: string, payload: unknown): BotInboundMessage[] {
  const record = isRecord(payload) ? payload : {};
  let data: unknown = payload;
  if (isRecord(record.data)) {
    data = record.data;
  } else if (typeof record.data === "string") {
    try {
      data = JSON.parse(record.data) as unknown;
    } catch {
      return [];
    }
  }
  if (!isRecord(data)) {
    return [];
  }
  const textRecord = isRecord(data.text) ? data.text : null;
  const text =
    typeof textRecord?.content === "string"
      ? textRecord.content.trim()
      : typeof data.content === "string"
        ? data.content.trim()
        : "";
  const staffId =
    (typeof data.senderStaffId === "string" ? data.senderStaffId : "") ||
    (typeof data.senderId === "string" ? data.senderId : "");
  const conversationId = typeof data.conversationId === "string" ? data.conversationId : "";
  const conversationType = String(data.conversationType ?? "");
  const msgId = typeof data.msgId === "string" ? data.msgId : "";
  const nick = typeof data.senderNick === "string" ? data.senderNick : undefined;
  if (!text || !staffId) {
    return [];
  }
  const isGroup = conversationType === "2";
  return [
    {
      botId,
      text,
      actor: {
        provider: "dingding",
        botId,
        providerUserId: staffId,
        displayName: nick,
        chatType: isGroup ? "group" : "private",
        chatId: isGroup ? conversationId || undefined : undefined,
        providerMessageId: msgId || undefined,
      },
    },
  ];
}

export function createDingdingBotProvider(deps: DingdingProviderDeps): BotProviderAdapter {
  return {
    async test(bot) {
      try {
        await getDingdingAccessToken(bot, deps);
        return { ok: true, message: "DingTalk access token is valid." };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },

    async resolveName(bot) {
      return bot.dingdingAppKey?.trim() || null;
    },

    async send(bot, message: BotOutboundMessage) {
      const accessToken = await getDingdingAccessToken(bot, deps);
      const robotCode = bot.dingdingAppKey?.trim() ?? "";
      const target = message.providerUserId.trim();
      if (!robotCode || !target) {
        return;
      }
      for (const content of splitDingdingText(message.text)) {
        const group = isDingdingGroupConversationId(target);
        const url = group
          ? `${DINGDING_API_BASE}/v1.0/robot/groupMessages/send`
          : `${DINGDING_API_BASE}/v1.0/robot/oToMessages/batchSend`;
        const body = group
          ? {
              robotCode,
              openConversationId: target,
              msgKey: "sampleText",
              msgParam: JSON.stringify({ content }),
            }
          : {
              robotCode,
              userIds: [target],
              msgKey: "sampleText",
              msgParam: JSON.stringify({ content }),
            };
        const result = await fetchBotProviderJson<DingdingSendResponse>(url, {
          method: "POST",
          headers: dingdingHeaders(accessToken),
          body: JSON.stringify(body),
        });
        if (!result.ok || result.payload?.code) {
          throw new Error(result.payload?.message ?? `DingTalk send failed (HTTP ${result.status}).`);
        }
      }
    },

    parseCallback(payload: unknown): BotInboundMessage[] {
      if (!isRecord(payload)) {
        return [];
      }
      const botId = typeof payload.botId === "string" ? payload.botId : "";
      if (!botId) {
        return [];
      }
      return parseDingdingCallback(botId, payload.dispatch ?? payload);
    },
  };
}
