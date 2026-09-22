// Descriptors & collection (browser-safe)
export { type ServiceDescriptor, createServiceDescriptor } from "./descriptors.js";
export { ServiceCollection } from "./collection.js";
export {
  IModelSelectionService,
  IProviderSettingsService,
  type ModelSelectionView,
  type ModelSelectionViewInput,
  type ProviderSettingsProviderView,
  type ProviderSettingsRemoteModelsListResult,
  type ProviderSettingsRemoteModelsResult,
  type ProviderSettingsView,
} from "./model-provider/providerFacadeServices.js";
export {
  createAccountRequestAuthService,
  type IAccountRequestAuthService,
  type AccountRequestAuthInput,
  type AccountRequestAuthMaterial,
  type AccountRequestAuthResolver,
} from "./model-provider/accountRequestAuthService.js";
export { IProviderProvisioningTargetService } from "./model-provider/providerProvisioning.js";
export {
  collectServiceMemoryDiagnostics,
  memoryDiagnosticsRegistry,
  registerMemoryDiagnosticsProvider,
} from "./memoryDiagnostics.js";

// Accessor
export type { IServiceAccessor } from "./accessor.js";
export {
  ConversationShareServiceError,
  createUnsupportedConversationShareService,
  IConversationShareService,
} from "./conversation-share/conversationShare.js";
export type {
  ConversationShareSelection,
  ConversationSharePublishProgress,
  ConversationShareImportProgress,
  ImportConversationShareInput,
  ImportConversationShareResult,
  ImportedConversationShare,
  ConversationShareServiceErrorKind,
  ConversationShareFailureIssue,
  ConversationShareFailureIssueCode,
  ConversationSharePreflightInput,
  ConversationSharePreflightResult,
  ConversationShareAllowedArtifact,
  ConversationShareTurnPreflightResult,
  PublishTextConversationInput,
} from "./conversation-share/conversationShare.js";
// Conversation share 的具体实现依赖 Node 文件系统，只能从 @kcode/services/node 引入；
// 根入口必须保持 browser-safe，避免 renderer 解析到 node:* 模块。
export {
  createConversationTelemetryService,
  type ConversationTelemetryWorkspaceTarget,
  type IConversationTelemetryService,
} from "./conversation-telemetry/conversationTelemetry.js";

// File service — IFileService is both a type (interface) and value (descriptor)
export { IFileService } from "./file/file.js";
export { IMediaPreviewService } from "./media-preview/mediaPreview.js";
export type { MediaPreviewPreparation } from "./media-preview/mediaPreview.js";

// Git service — IGitService is both a type (interface) and value (descriptor)
export { IGitService } from "./git/git.js";
export { IGitCheckpointService } from "./git/gitCheckpoint.js";

// System service — ISystemService is both a type (interface) and value (descriptor)
export { ISystemService } from "./system/system.js";

// Terminal service — ITerminalService is both a type (interface) and value (descriptor)
export { ITerminalService } from "./terminal/terminal.js";

// Setting service — ISettingService is both a type (interface) and value (descriptor)
export {
  ISettingService,
  type ManagedSystemRoleEditorSnapshot,
  type ManagedSystemRolePreset,
} from "./setting/setting.js";

// Credential service — ICredentialService is both a type (interface) and value (descriptor)
export { ICredentialService } from "./credential/credential.js";

// Broadcast service — IBroadcastService is both a type (interface) and value (descriptor)
export { IBroadcastService } from "./broadcast/broadcast.js";

// Onboarding 完成记录服务（本地持久化，后续上传服务器）
export { IOnboardingRecordService } from "./onboarding/onboardingRecord.js";
export type {
  CreateOnboardingRecordServiceOptions,
  OnboardingRecordServiceFactory,
} from "./onboarding/onboardingRecord.js";
// 这里只能导出 descriptor 和类型。根 index 会被 renderer 经 value import 拉进浏览器包，
// 若 value 导出 createOnboardingRecordService，会连带 fs/atomicFileUtils → @kcode/shared/node →
// node:timers/promises 整条 Node 链进浏览器，模块加载直接抛错导致整个应用黑屏。
// 工厂函数由 host 侧（node.ts）与测试从实现文件路径直接导入，与 createSettingService 同惯例。
export type {
  BroadcastClaimAcquireResult,
  BroadcastClaimLease,
  BroadcastMessage,
} from "./broadcast/broadcast.js";

// KCode task wrapper service — task 列表/置顶/归档等 app 侧包装状态入口。
export { IKCodeTaskService } from "./session/kcodeTaskService.js";
export type {
  KCodeArchivedTaskDeletionResult,
  KCodeModelTrajectory,
  KCodeModelTrajectoryCallSource,
  KCodeModelTrajectoryCallSourceKind,
  KCodeModelTrajectoryContentPart,
  KCodeModelTrajectoryMessage,
  KCodeModelTrajectoryRecord,
  KCodeModelTrajectoryUsage,
  KCodeTaskListKind,
  KCodeTaskListQuery,
  KCodeTaskListResult,
  KCodeTaskListSortBy,
  KCodeTaskListWorkspaceScope,
  KCodeTaskReadyOutcome,
  KCodeGroupedTaskRef,
  KCodeGroupedTaskView,
  KCodeGroupedTaskViewNode,
  KCodeGroupedTaskViewOrderInput,
  KCodeGroupedTaskViewQuery,
  KCodeGroupedTaskViewStructure,
  KCodeGroupedTaskViewStructureMember,
  KCodeGroupedTaskViewStructureTopOrder,
  KCodeGroupedTaskViewTopLevelNodeRef,
  KCodeTaskGroup,
  KCodeTaskGroupColor,
} from "./session/kcodeTaskService.js";
export type { KCodeTaskListItem } from "./session/kcodeTaskListTypes.js";

export { IWindowControllerService } from "./window-controller/windowController.js";
export type {
  WindowHostControllerFrame,
  WindowHostControllerMutation,
  WindowHostControllerTaskListItem,
  WindowHostControllerTaskListResult,
} from "./window-controller/windowController.js";

// KCode agent service — IKCodeAgentService is both a type (interface) and value (descriptor)
export {
  IKCodeAgentService,
  type KCodeAgentLocalRuntimeChildProcesses,
  KCODE_AGENT_RUNTIME_UNAVAILABLE_CODE,
} from "./kcode-agent/kcodeAgent.js";
export {
  isKCodeAgentMcpStatusModeUnsupportedError,
  KCODE_AGENT_MCP_STATUS_MODE_UNSUPPORTED_ERROR_CODE,
  KCodeAgentMcpStatusModeUnsupportedError,
} from "./kcode-agent/kcodeAgentErrors.js";
export {
  createKCodeAgentConnectionScope,
  readTrustedKCodeAgentV4Connection,
} from "./kcode-agent/kcodeAgentConnectionScope.js";
export type {
  KCodeAgentConnectionScope,
  KCodeAgentV4ClientMode,
  KCodeAgentV4ConnectionContext,
} from "./kcode-agent/kcodeAgentConnectionScope.js";
export type {
  KCodeAgentAttachmentBeginParams,
  KCodeAgentAttachmentChunkParams,
  KCodeAgentAttachmentTerminalParams,
  KCodeAgentCreateSessionParams,
  KCodeAgentCuaPermissionObservation,
  KCodeAgentInitializeResult,
  KCodeAgentStorageStartupSnapshot,
  KCodeAgentRuntimeLifecycleEvent,
  KCodeAgentRuntimePolicy,
  KCodeAgentReadSessionParams,
  KCodeAgentResumeSessionParams,
  KCodeAgentRunAutomationNowResult,
  KCodeAgentSavedWorkflowTarget,
  KCodeAgentSendPromptParams,
  KCodeAgentServiceEvent,
  KCodeAgentSessionSubscribeParams,
  KCodeAgentSessionTarget,
  KCodeAgentSetModeParams,
  KCodeAgentSetModelParams,
  KCodeAgentSetThoughtLevelParams,
  KCodeAgentWorkspaceTarget,
} from "./kcode-agent/kcodeAgent.js";

// KCode session service — app-facing session facade without KCode Agent naming.
export { IKCodeSessionService } from "./kcode-session/kcodeSession.js";
export type {
  KCodeSessionCreateParams,
  KCodeSessionEventsParams,
  KCodeSessionInitializeResult,
  KCodeSessionListParams,
  KCodeSessionMessagesParams,
  KCodeSessionReadParams,
  KCodeSessionResumeParams,
  KCodeSessionServiceEvent,
  KCodeSessionSetModeParams,
  KCodeSessionSetModelParams,
  KCodeSessionSetThoughtLevelParams,
  KCodeSessionSubscribeParams,
  KCodeTaskTarget,
  KCodeSessionWorkspaceTarget,
} from "./kcode-session/kcodeSession.js";

// Hooks service — IHooksService is both a type (interface) and value (descriptor).
export { IHooksService } from "./hooks/hooks.js";

// Memory service — IMemoryService is both a type (interface) and value (descriptor).
export {
  IMemoryService,
  PROJECT_MEMORY_FILE_CHANGED_ERROR_CODE,
  PROJECT_MEMORY_PREVIEW_LIMIT_EXCEEDED_ERROR_CODE,
} from "./memory/memory.js";
export type { ProjectMemoryFileSummary, ProjectMemoryWorkspaceSummary } from "./memory/memory.js";

export type { SessionRealtimePort } from "./session/sessionRealtimePort.js";

// FileWatcher service — IFileWatcherService is both a type (interface) and value (descriptor)
export { IFileWatcherService } from "./fileWatcher/fileWatcher.js";

// UsageStats service — IUsageStatsService is both a type (interface) and value (descriptor)
export { IUsageStatsService } from "./usage-stats/usageStats.js";

// Storage（资源管理器「存储」tab）：数据类型在 @kcode/shared；这里只导出服务接口与卷分组纯函数
export type { IStorageService } from "./storage/contract.js";

export {
  IClientScenesService,
  type ClientSceneConfig,
  type ClientSceneItem,
  type ClientSceneOption,
  type ClientSceneResponseBody,
  type ClientScenesResponse,
} from "./client-scenes/clientScenes.js";
export { isValidCronExpr } from "./session/automationCronValidation.js";
// 闲时任务管理服务（与 automation 服务面独立）；接口/描述符 browser-safe。
export { IOffPeakTaskService } from "./session/offPeakTask.js";
export type { OffPeakClientConfig, OffPeakUpdateTaskParams } from "./session/offPeakTask.js";

// Skills service — ISkillsService is both a type (interface) and value (descriptor)
export { ISkillsService } from "./skills/skills.js";
export { ISkillSyncService } from "./skill-sync/skillSync.js";
export { IMcpSyncService } from "./mcp-sync/mcpSync.js";
export { IPluginSyncService } from "./plugin-sync/pluginSync.js";
export {
  ICuaPermissionService,
  type CuaPermissionState,
  type CuaPermissionRestartOptions,
  type CuaPermissionStatus,
  type CuaPermissionStatusQueryOptions,
  type CuaPermissionStatusResult,
  type CuaPermissionStatusUnavailable,
  isCuaPermissionStatusAvailable,
} from "./cua-permission-broker/cuaPermissionService.js";
export {
  ICuaPipSessionService,
  type CuaPipSessionService,
} from "./cua-permission-broker/cuaPipSession.js";

// Plugins service — IPluginsService is both a type (interface) and value (descriptor)
export { IPluginsService } from "./plugins/plugins.js";
// 设置页插件管理薄服务（UI 平台能力面不再直触 kcodeAgentService）
export { IPluginManagementService } from "./plugins/pluginManagement.js";

// Subagents service — ISubagentsService is both a type (interface) and value (descriptor)
export { ISubagentsService } from "./subagents/subagents.js";

// Commands service — ICommandsService is both a type (interface) and value (descriptor)
export { ICommandsService } from "./commands/commands.js";

export { ISettingsSyncService } from "./settings-sync/settingsSync.js";

export { IPromptAttachmentTransferService } from "./prompt-attachment-transfer/promptAttachmentTransfer.js";
export type {
  PromptAttachmentStageParams,
  PromptAttachmentStageResult,
  PromptAttachmentTransferPhase,
  PromptAttachmentTransferProgress,
} from "./prompt-attachment-transfer/promptAttachmentTransfer.js";
export { IClientConfigService } from "./client-config/clientConfig.js";
