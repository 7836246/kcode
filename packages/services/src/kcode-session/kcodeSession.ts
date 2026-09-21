import { ServiceChannels } from "@kcode/shared";
import type {
  TraceId,
  KCodeAgentMcpServer,
  KCodeDeliveryKind,
  KCodeMessageWithParts,
  ModelSelection,
  KCodePermissionRequestParams,
  KCodeUserInputRequestParams,
  KCodeUserInputResponse,
  KCodeSessionInfo,
  KCodeSessionImportHistory,
  KCodeSessionEvent,
  KCodeSessionMode,
  KCodeSessionPersistence,
  KCodeSessionStateSnapshot,
  KCodeStateUpdatedNotification,
  KCodeWorkspacePresentation,
} from "@kcode/shared";
import { createServiceDescriptor } from "#src/descriptors.js";

export interface KCodeSessionWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  remoteSessionId?: string;
}

export type KCodeSessionReadWorkspacePresentationParams = KCodeSessionWorkspaceTarget;

export interface KCodeTaskTarget extends KCodeSessionWorkspaceTarget {
  sessionId: string;
}

export interface KCodeSessionCreateParams extends KCodeSessionWorkspaceTarget {
  /** 仅导入事务使用的预分配 ID；普通新会话继续由 Agent 分配。 */
  sessionId?: string;
  sessionTraceId?: TraceId;
  parentSessionId?: string;
  mode?: KCodeSessionMode;
  model?: ModelSelection;
  persistence?: KCodeSessionPersistence;
  thoughtLevel?: string;
  mcpServers?: KCodeAgentMcpServer[];
  importedHistory?: KCodeSessionImportHistory;
}

export interface KCodeSessionResumeParams extends KCodeTaskTarget {
  model?: ModelSelection;
  thoughtLevel?: string;
  mcpServers?: KCodeAgentMcpServer[];
  /**
   * 默认广播 resume 得到的历史快照，并让 shadow 订阅请求初始 snapshot。
   * 续聊发送前的 runtime 预恢复会关闭它，避免旧终态快照覆盖本地已开始的新输入运行态。
   */
  broadcastSnapshot?: boolean;
}

export interface KCodeSessionListParams extends KCodeSessionWorkspaceTarget {
  includeArchived?: boolean;
  limit?: number;
}

export interface KCodeSessionReadParams extends KCodeTaskTarget {
  deliveryKind?: KCodeDeliveryKind;
  messageLimit?: number;
  afterSeq?: number;
}

export interface KCodeSessionMessagesParams extends KCodeTaskTarget {
  afterMessageId?: string;
  limit?: number;
}

export interface KCodeSessionEventsParams extends KCodeTaskTarget {
  afterSeq?: number;
  limit?: number;
}

export interface KCodeSessionSetModelParams extends KCodeTaskTarget {
  model: ModelSelection;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface KCodeSessionSetThoughtLevelParams extends KCodeTaskTarget {
  thoughtLevel?: string;
  expectedRevision?: number;
  persistAsWorkspaceLastUsed?: boolean;
}

export interface KCodeSessionSetModeParams extends KCodeTaskTarget {
  mode: KCodeSessionMode;
  expectedRevision?: number;
}

export interface KCodeSessionSubscribeParams extends KCodeTaskTarget {
  deliveryKind: KCodeDeliveryKind;
  afterSeq?: number;
  includeSnapshot?: boolean;
  eventCoalescing?: {
    mode: "background-summary";
    intervalMs?: number;
  };
}

export type KCodeSessionServiceEvent =
  | { type: "session.event"; event: KCodeSessionEvent }
  | { type: "state.updated"; notification: KCodeStateUpdatedNotification }
  | { type: "permission.request"; request: KCodePermissionRequestParams }
  | { type: "userInput.request"; request: KCodeUserInputRequestParams }
  | {
      type: "userInput.response";
      requestId: string;
      response: KCodeUserInputResponse;
    }
  | { type: "snapshot"; snapshot: KCodeSessionStateSnapshot };

export interface KCodeSessionInitializeResult {
  available: boolean;
  workspaceKey: string;
  protocolName?: string;
  protocolVersion?: number;
  transportKind?: "stdio" | "websocket";
  reason?: string;
  reasonCode?: "provider_not_ready";
}

export interface KCodeSessionWorkspaceRuntimeIdentity {
  generation: number;
  identity: string;
  processId?: number;
  workspaceKey: string;
}

export interface IKCodeSessionService {
  initializeWorkspace(params: KCodeSessionWorkspaceTarget): Promise<KCodeSessionInitializeResult>;
  getWorkspaceRuntimeIdentity(
    params: KCodeSessionWorkspaceTarget,
  ): Promise<KCodeSessionWorkspaceRuntimeIdentity>;
  readWorkspacePresentation(
    params: KCodeSessionReadWorkspacePresentationParams,
  ): Promise<KCodeWorkspacePresentation>;
  createSession(params: KCodeSessionCreateParams): Promise<KCodeSessionStateSnapshot>;
  resumeSession(params: KCodeSessionResumeParams): Promise<KCodeSessionStateSnapshot>;
  listSessions(params: KCodeSessionListParams): Promise<KCodeSessionInfo[]>;
  readSession(params: KCodeSessionReadParams): Promise<KCodeSessionStateSnapshot>;
  readSessionMessages(params: KCodeSessionMessagesParams): Promise<KCodeMessageWithParts[]>;
  readSessionEvents(params: KCodeSessionEventsParams): Promise<KCodeSessionEvent[]>;
  promoteDeferredDraftSession(params: KCodeTaskTarget): Promise<void>;
  closeSession(params: KCodeTaskTarget): Promise<void>;
  closeDeferredDraftSession(params: KCodeTaskTarget): Promise<boolean>;
  setModel(params: KCodeSessionSetModelParams): Promise<KCodeSessionStateSnapshot>;
  setThoughtLevel(params: KCodeSessionSetThoughtLevelParams): Promise<KCodeSessionStateSnapshot>;
  setMode(params: KCodeSessionSetModeParams): Promise<KCodeSessionStateSnapshot>;
  // renderer 订阅面走 agentService 的 conversation/sessions-index 帧通道。
}

export const IKCodeSessionService = createServiceDescriptor<IKCodeSessionService>(
  ServiceChannels.KCodeSession,
);
