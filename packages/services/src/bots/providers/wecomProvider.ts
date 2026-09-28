import type {
  BotConfig,
  BotInboundMessage,
  BotOutboundMessage,
} from "@kcode/shared";
import type { BotProviderAdapter } from "./types.js";
import { fetchBotProviderJson } from "#src/bots/providers/providerRequest.js";
import {
  computeWecomSignature,
  decryptWecomCiphertext,
  encryptWecomPlaintext,
  readWecomXmlCdata,
  WecomCryptoError,
} from "./wecomCrypto.js";

const WECOM_API_BASE = "https://qyapi.weixin.qq.com";
const WECOM_TEXT_LIMIT = 2048;
const TOKEN_REFRESH_SKEW_MS = 120_000;

interface WecomProviderDeps {
  loadCredential(key: string): Promise<string | null>;
}

interface WecomTokenResponse {
  errcode?: number;
  errmsg?: string;
  access_token?: string;
  expires_in?: number;
}

interface WecomSendResponse {
  errcode?: number;
  errmsg?: string;
}

interface WecomAgentResponse {
  errcode?: number;
  errmsg?: string;
  name?: string;
}

interface WecomCallbackPayload {
  botId?: string;
  method?: string;
  msg_signature?: string;
  timestamp?: string;
  nonce?: string;
  echostr?: string;
  rawBody?: string;
  plainXml?: string;
}

const accessTokenCache = new Map<string, { token: string; expiresAt: number }>();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asCallback(payload: unknown): WecomCallbackPayload {
  return isRecord(payload) ? (payload as WecomCallbackPayload) : {};
}

function splitWecomText(text: string): string[] {
  const chunks: string[] = [];
  for (let index = 0; index < text.length; index += WECOM_TEXT_LIMIT) {
    chunks.push(text.slice(index, index + WECOM_TEXT_LIMIT));
  }
  return chunks.length > 0 ? chunks : [text];
}

async function loadSecret(bot: BotConfig, deps: WecomProviderDeps): Promise<string> {
  const secret = bot.credentialRef ? await deps.loadCredential(bot.credentialRef) : null;
  if (!secret?.trim()) {
    throw new Error("WeCom secret is missing.");
  }
  return secret.trim();
}

async function loadEncodingAesKey(bot: BotConfig, deps: WecomProviderDeps): Promise<string> {
  const key = bot.webhookSecretRef ? await deps.loadCredential(bot.webhookSecretRef) : null;
  if (!key?.trim()) {
    throw new Error("WeCom EncodingAESKey is missing.");
  }
  return key.trim();
}

function requireWecomFields(bot: BotConfig): {
  corpId: string;
  agentId: number;
  token: string;
} {
  const corpId = bot.wecomCorpId?.trim() ?? "";
  const agentId = Number(bot.wecomAgentId?.trim() ?? "");
  const token = bot.wecomCallbackToken?.trim() ?? "";
  if (!corpId || !Number.isInteger(agentId) || agentId <= 0 || !token) {
    throw new Error("WeCom Corp ID, Agent ID and callback token are required.");
  }
  return { corpId, agentId, token };
}

async function getAccessToken(bot: BotConfig, deps: WecomProviderDeps): Promise<string> {
  const { corpId } = requireWecomFields(bot);
  const cacheKey = bot.id;
  const cached = accessTokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.token;
  }
  const secret = await loadSecret(bot, deps);
  const url = `${WECOM_API_BASE}/cgi-bin/gettoken?corpid=${encodeURIComponent(corpId)}&corpsecret=${encodeURIComponent(secret)}`;
  const result = await fetchBotProviderJson<WecomTokenResponse>(url);
  if (!result.payload?.access_token || result.payload.errcode) {
    throw new Error(result.payload?.errmsg ?? "WeCom gettoken failed.");
  }
  const expiresInMs = Math.max(60, result.payload.expires_in ?? 7200) * 1000;
  accessTokenCache.set(cacheKey, {
    token: result.payload.access_token,
    expiresAt: Date.now() + expiresInMs - TOKEN_REFRESH_SKEW_MS,
  });
  return result.payload.access_token;
}

function verifySignature(
  token: string,
  timestamp: string,
  nonce: string,
  encrypt: string,
  signature: string,
): void {
  const expected = computeWecomSignature(token, timestamp, nonce, encrypt);
  if (expected !== signature) {
    throw new WecomCryptoError("WeCom callback signature mismatch");
  }
}

export function createWecomBotProvider(deps: WecomProviderDeps): BotProviderAdapter {
  return {
    async test(bot) {
      if (!bot.enabled) {
        return { ok: false, message: "WeCom bot is disabled." };
      }
      try {
        await getAccessToken(bot, deps);
        return { ok: true, message: "WeCom access token is valid." };
      } catch (error) {
        return {
          ok: false,
          message: error instanceof Error ? error.message : String(error),
        };
      }
    },

    async resolveName(bot) {
      const { agentId } = requireWecomFields(bot);
      const accessToken = await getAccessToken(bot, deps);
      const result = await fetchBotProviderJson<WecomAgentResponse>(
        `${WECOM_API_BASE}/cgi-bin/agent/get?access_token=${encodeURIComponent(accessToken)}&agentid=${agentId}`,
      );
      const name = result.payload?.name?.trim();
      return name || null;
    },

    async send(bot, message: BotOutboundMessage) {
      const { agentId } = requireWecomFields(bot);
      const accessToken = await getAccessToken(bot, deps);
      const chunks = splitWecomText(message.text);
      for (const content of chunks) {
        const body = {
          touser: message.providerUserId,
          msgtype: "text",
          agentid: agentId,
          text: { content },
          safe: 0,
        };
        const result = await fetchBotProviderJson<WecomSendResponse>(
          `${WECOM_API_BASE}/cgi-bin/message/send?access_token=${encodeURIComponent(accessToken)}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(body),
          },
        );
        if (result.payload?.errcode) {
          throw new Error(result.payload.errmsg ?? "WeCom message/send failed.");
        }
      }
    },

    async handleCallbackResponse(bot, payload) {
      const callback = asCallback(payload);
      if (callback.method !== "GET") {
        return null;
      }
      const { corpId, token } = requireWecomFields(bot);
      const encodingAesKey = await loadEncodingAesKey(bot, deps);
      const signature = callback.msg_signature?.trim() ?? "";
      const timestamp = callback.timestamp?.trim() ?? "";
      const nonce = callback.nonce?.trim() ?? "";
      const echostr = callback.echostr?.trim() ?? "";
      verifySignature(token, timestamp, nonce, echostr, signature);
      const plain = decryptWecomCiphertext(encodingAesKey, corpId, echostr);
      return { responseBody: plain, status: 200 };
    },

    parseCallback(payload: unknown): BotInboundMessage[] {
      const callback = asCallback(payload);
      if (callback.method === "GET") {
        return [];
      }
      const botId = typeof callback.botId === "string" ? callback.botId : "";
      const xml = typeof callback.plainXml === "string" ? callback.plainXml : "";
      if (!botId || !xml) {
        return [];
      }
      const msgType = readWecomXmlCdata(xml, "MsgType");
      if (msgType !== "text") {
        return [];
      }
      const text = readWecomXmlCdata(xml, "Content");
      const userId = readWecomXmlCdata(xml, "FromUserName");
      const msgId = readWecomXmlCdata(xml, "MsgId");
      if (!text || !userId) {
        return [];
      }
      return [
        {
          botId,
          text,
          actor: {
            provider: "wecom",
            botId,
            providerUserId: userId,
            chatType: "private",
            providerMessageId: msgId || undefined,
          },
        },
      ];
    },

    async prepareCallbackPayload(bot, payload) {
      const callback = asCallback(payload);
      if (callback.method === "GET") {
        return payload;
      }
      const { corpId, token } = requireWecomFields(bot);
      const encodingAesKey = await loadEncodingAesKey(bot, deps);
      const rawBody = callback.rawBody?.trim() ?? "";
      const encrypt = readWecomXmlCdata(rawBody, "Encrypt");
      const signature = callback.msg_signature?.trim() ?? "";
      const timestamp = callback.timestamp?.trim() ?? "";
      const nonce = callback.nonce?.trim() ?? "";
      verifySignature(token, timestamp, nonce, encrypt, signature);
      const plainXml = decryptWecomCiphertext(encodingAesKey, corpId, encrypt);
      return { ...callback, plainXml };
    },
  };
}

export function encryptWecomCallbackForTests(
  encodingAesKey: string,
  corpId: string,
  plaintext: string,
): string {
  return encryptWecomPlaintext(encodingAesKey, corpId, plaintext);
}
