import {
  ChannelClient,
  MessagePortProtocol,
  ProxyChannel,
  type MessagePortLike,
  type MessagePortPayload,
} from "@kcode/rpc";
import {
  IKCodeTaskService,
  type IKCodeTaskService as IKCodeTaskServiceShape,
} from "#src/session/kcodeTaskService.js";
import {
  IKCodeAgentService,
  type IKCodeAgentService as IKCodeAgentServiceShape,
} from "#src/kcode-agent/kcodeAgent.js";
import {
  IKCodeSessionService,
  type IKCodeSessionService as IKCodeSessionServiceShape,
} from "#src/kcode-session/kcodeSession.js";
import {
  IModelSelectionService,
  type IModelSelectionService as IModelSelectionServiceShape,
} from "#src/model-provider/providerFacadeServices.js";

interface PortLike {
  on?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  off?(event: "message", listener: (event: { data: MessagePortPayload }) => void): void;
  addEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  removeEventListener?(
    event: "message",
    listener: (event: { data: MessagePortPayload }) => void,
  ): void;
  postMessage(message: MessagePortPayload): void;
  start?(): void;
  close?(): void;
}

function toMessagePortLike(port: PortLike): MessagePortLike {
  return {
    addEventListener(type, listener) {
      if (port.addEventListener) {
        port.addEventListener(type, listener);
        return;
      }
      port.on?.(type, listener);
    },
    removeEventListener(type, listener) {
      if (port.removeEventListener) {
        port.removeEventListener(type, listener);
        return;
      }
      port.off?.(type, listener);
    },
    postMessage(data) {
      port.postMessage(data);
    },
    start() {
      port.start?.();
    },
    close() {
      port.close?.();
    },
  };
}

export interface RemoteBotWorkspaceRuntimeServices {
  kcodeAgentService: IKCodeAgentServiceShape;
  kcodeTaskService: IKCodeTaskServiceShape;
  kcodeSessionService: IKCodeSessionServiceShape;
  modelSelectionService: IModelSelectionServiceShape;
}

export function createRemoteRuntimeServicesFromPort(
  port: unknown,
): RemoteBotWorkspaceRuntimeServices {
  const protocol = new MessagePortProtocol(toMessagePortLike(port as PortLike));
  const client = new ChannelClient(protocol);
  return {
    kcodeAgentService: ProxyChannel.toService<IKCodeAgentServiceShape>(
      client.getChannel(IKCodeAgentService.channelName),
    ),
    kcodeTaskService: ProxyChannel.toService<IKCodeTaskServiceShape>(
      client.getChannel(IKCodeTaskService.channelName),
    ),
    kcodeSessionService: ProxyChannel.toService<IKCodeSessionServiceShape>(
      client.getChannel(IKCodeSessionService.channelName),
    ),
    modelSelectionService: ProxyChannel.toService<IModelSelectionServiceShape>(
      client.getChannel(IModelSelectionService.channelName),
    ),
  };
}
