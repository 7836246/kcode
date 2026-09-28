import { fetchBotProviderJson } from "#src/bots/providers/providerRequest.js";
import { waitFor } from "../channelRuntime.js";

const DISCORD_API_BASE = "https://discord.com/api/v10";
const DISCORD_GATEWAY_INTENTS = 1 | (1 << 9) | (1 << 12) | (1 << 15);
const IDENTIFY_OP = 2;
const HEARTBEAT_OP = 1;
const HELLO_OP = 10;
const HEARTBEAT_ACK_OP = 11;
const RECONNECT_OP = 7;
const INVALID_SESSION_OP = 9;
const DISPATCH_OP = 0;

export interface DiscordGatewayHandlers {
  onDispatch(payload: unknown): Promise<void>;
  onReady(botUserId: string): void;
  onStatus(status: "connecting" | "connected" | "error", message: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readGatewayUrl(token: string): Promise<string> {
  const result = await fetchBotProviderJson<{ url?: string; message?: string }>(
    `${DISCORD_API_BASE}/gateway`,
    {
      headers: {
        authorization: `Bot ${token}`,
        "user-agent": "KCode (https://github.com/7836246/kcode, discord-bot)",
      },
    },
  );
  const url = result.payload?.url?.trim();
  if (!url) {
    throw new Error(result.payload?.message ?? "Discord gateway URL is unavailable.");
  }
  return `${url}?v=10&encoding=json`;
}

export async function runDiscordGateway(
  token: string,
  signal: AbortSignal,
  handlers: DiscordGatewayHandlers,
): Promise<void> {
  while (!signal.aborted) {
    handlers.onStatus("connecting", "Discord gateway is connecting.");
    let socket: WebSocket | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let lastSequence: number | null = null;
    let heartbeatAcked = true;
    try {
      const gatewayUrl = await readGatewayUrl(token);
      if (signal.aborted) {
        return;
      }
      socket = new WebSocket(gatewayUrl);
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
          resolve();
        });
        socket?.addEventListener("error", () => {
          signal.removeEventListener("abort", onAbort);
          reject(new Error("Discord gateway socket error"));
        });
      });

      const send = (payload: unknown) => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify(payload));
        }
      };

      const startHeartbeat = (intervalMs: number) => {
        heartbeatTimer = setInterval(() => {
          if (!heartbeatAcked) {
            socket?.close(4000, "heartbeat ack missed");
            return;
          }
          heartbeatAcked = false;
          send({ op: HEARTBEAT_OP, d: lastSequence });
        }, intervalMs);
      };

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
          reject(new Error("Discord gateway socket error"));
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
            if (typeof packet.s === "number") {
              lastSequence = packet.s;
            }
            if (packet.op === HELLO_OP && isRecord(packet.d)) {
              const interval = typeof packet.d.heartbeat_interval === "number"
                ? packet.d.heartbeat_interval
                : 41250;
              heartbeatAcked = true;
              startHeartbeat(interval);
              send({
                op: IDENTIFY_OP,
                d: {
                  token,
                  intents: DISCORD_GATEWAY_INTENTS,
                  properties: {
                    os: process.platform,
                    browser: "KCode",
                    device: "KCode",
                  },
                },
              });
              return;
            }
            if (packet.op === HEARTBEAT_ACK_OP) {
              heartbeatAcked = true;
              return;
            }
            if (packet.op === HEARTBEAT_OP) {
              send({ op: HEARTBEAT_OP, d: lastSequence });
              return;
            }
            if (packet.op === RECONNECT_OP || packet.op === INVALID_SESSION_OP) {
              socket?.close();
              return;
            }
            if (packet.op === DISPATCH_OP && packet.t === "READY" && isRecord(packet.d)) {
              const user = isRecord(packet.d.user) ? packet.d.user : null;
              const botUserId = typeof user?.id === "string" ? user.id : "";
              if (botUserId) {
                handlers.onReady(botUserId);
              }
              handlers.onStatus("connected", "Discord gateway is connected.");
              return;
            }
            if (packet.op === DISPATCH_OP) {
              await handlers.onDispatch(packet);
            }
          })().catch((error: unknown) => {
            handlers.onStatus(
              "error",
              error instanceof Error ? error.message : String(error),
            );
          });
        });
      });
    } catch (error) {
      if (!signal.aborted) {
        handlers.onStatus("error", error instanceof Error ? error.message : String(error));
      }
    } finally {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer);
      }
      if (socket && socket.readyState < WebSocket.CLOSING) {
        socket.close();
      }
    }
    if (!signal.aborted) {
      await waitFor(5_000, signal);
    }
  }
}
