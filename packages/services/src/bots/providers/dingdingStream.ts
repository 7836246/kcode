import { fetchBotProviderJson } from "#src/bots/providers/providerRequest.js";
import { waitFor } from "../channelRuntime.js";
import { getDingdingAccessToken } from "./dingdingProvider.js";
import type { BotConfig } from "@kcode/shared";

const DINGDING_API_BASE = "https://api.dingtalk.com";
const ROBOT_TOPIC = "/v1.0/im/bot/messages/get";

interface DingdingStreamEndpoint {
  endpoint?: string;
  ticket?: string;
  message?: string;
}

export interface DingdingStreamHandlers {
  onDispatch(payload: unknown): Promise<void>;
  onStatus(status: "connecting" | "connected" | "error", message: string): void;
}

interface DingdingStreamDeps {
  loadCredential(key: string): Promise<string | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function ackPayload(messageId: string): string {
  return JSON.stringify({
    code: 200,
    headers: {
      messageId,
      contentType: "application/json",
    },
    message: "OK",
    data: "",
  });
}

async function openStreamEndpoint(
  bot: BotConfig,
  deps: DingdingStreamDeps,
): Promise<{ url: string }> {
  const appKey = bot.dingdingAppKey?.trim() ?? "";
  const secret = bot.credentialRef ? await deps.loadCredential(bot.credentialRef) : null;
  if (!appKey || !secret?.trim()) {
    throw new Error("DingTalk AppKey or AppSecret is missing.");
  }
  const accessToken = await getDingdingAccessToken(bot, deps);
  const result = await fetchBotProviderJson<DingdingStreamEndpoint>(
    `${DINGDING_API_BASE}/v1.0/gateway/connections/open`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-acs-dingtalk-access-token": accessToken,
      },
      body: JSON.stringify({
        clientId: appKey,
        clientSecret: secret.trim(),
        subscriptions: [{ type: "CALLBACK", topic: ROBOT_TOPIC }],
        ua: "KCode/dingding-stream",
        localIp: "127.0.0.1",
      }),
    },
  );
  const endpoint = result.payload?.endpoint?.trim();
  const ticket = result.payload?.ticket?.trim();
  if (!endpoint || !ticket) {
    throw new Error(result.payload?.message ?? "DingTalk stream endpoint is unavailable.");
  }
  const separator = endpoint.includes("?") ? "&" : "?";
  return { url: `${endpoint}${separator}ticket=${encodeURIComponent(ticket)}` };
}

export async function runDingdingStream(
  bot: BotConfig,
  deps: DingdingStreamDeps,
  signal: AbortSignal,
  handlers: DingdingStreamHandlers,
): Promise<void> {
  while (!signal.aborted) {
    handlers.onStatus("connecting", "DingTalk stream is connecting.");
    let socket: WebSocket | null = null;
    try {
      const { url } = await openStreamEndpoint(bot, deps);
      if (signal.aborted) {
        return;
      }
      socket = new WebSocket(url);
      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          socket?.close();
          reject(new Error("aborted"));
        };
        if (signal.aborted) {
          onAbort();
          return;
        }
        signal.addEventListener("abort", onAbort, { once: true });
        socket?.addEventListener("open", () => {
          signal.removeEventListener("abort", onAbort);
          handlers.onStatus("connected", "DingTalk stream is connected.");
          resolve();
        });
        socket?.addEventListener("error", () => {
          signal.removeEventListener("abort", onAbort);
          reject(new Error("DingTalk stream socket error"));
        });
      });

      await new Promise<void>((resolve, reject) => {
        const onAbort = () => {
          socket?.close();
          resolve();
        };
        signal.addEventListener("abort", onAbort, { once: true });
        socket?.addEventListener("close", () => {
          signal.removeEventListener("abort", onAbort);
          resolve();
        });
        socket?.addEventListener("error", () => {
          signal.removeEventListener("abort", onAbort);
          reject(new Error("DingTalk stream socket error"));
        });
        socket?.addEventListener("message", (event) => {
          void (async () => {
            let packet: unknown;
            try {
              packet = JSON.parse(String(event.data)) as unknown;
            } catch {
              return;
            }
            if (!isRecord(packet)) {
              return;
            }
            const headers = isRecord(packet.headers) ? packet.headers : {};
            const messageId = typeof headers.messageId === "string" ? headers.messageId : "";
            const topic = typeof headers.topic === "string" ? headers.topic : "";
            const type = typeof packet.type === "string" ? packet.type : "";
            if (messageId && socket?.readyState === WebSocket.OPEN) {
              socket.send(ackPayload(messageId));
            }
            if (type === "CALLBACK" && (topic === ROBOT_TOPIC || topic === "*")) {
              await handlers.onDispatch(packet);
            }
          })().catch((error: unknown) => {
            handlers.onStatus("error", error instanceof Error ? error.message : String(error));
          });
        });
      });
    } catch (error) {
      if (!signal.aborted) {
        handlers.onStatus("error", error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
    }
    if (!signal.aborted) {
      await waitFor(5_000, signal);
    }
  }
}
