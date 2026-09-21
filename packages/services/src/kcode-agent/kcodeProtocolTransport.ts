import type { Event, IDisposable } from "@kcode/rpc";
import type { KCodeProtocolMessage } from "@kcode/shared";

export type KCodeProtocolTransportKind = "stdio" | "websocket" | "memory";

export interface KCodeProtocolTransportClosedEvent {
  code?: number | null;
  signal?: NodeJS.Signals | null;
  reason?: string;
}

export interface KCodeProtocolTransport extends IDisposable {
  readonly kind: KCodeProtocolTransportKind;
  readonly onMessage: Event<KCodeProtocolMessage>;
  readonly onClose: Event<KCodeProtocolTransportClosedEvent>;
  send(message: KCodeProtocolMessage): Promise<void>;
  disposeAndWait?(): Promise<void>;
}
