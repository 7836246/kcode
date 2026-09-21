import type {
  KCodeAgentMcpServer,
  KCodeAutomationScheduleRule,
  KCodeMcpListMode,
  ModelSelection,
} from "@kcode/shared";

export interface KCodeAgentWorkspaceTarget {
  workspacePath: string;
  workspaceIdentity?: string;
  /** 远程 workspace 的运行时会话身份；只用于隔离/路由，不能替代 workspacePath。 */
  remoteSessionId?: string;
}

export interface KCodeAgentPluginViewParams extends KCodeAgentWorkspaceTarget {
  configScope?: "user" | "workspace";
}

export interface KCodeAgentListMcpServerStatusesParams extends KCodeAgentWorkspaceTarget {
  mcpServers?: KCodeAgentMcpServer[];
  mode?: KCodeMcpListMode;
}

export interface KCodeAgentAddPluginMarketplaceParams extends KCodeAgentWorkspaceTarget {
  dryRun?: boolean;
  operationId?: string;
  source: string;
}

export interface KCodeAgentRemovePluginMarketplaceParams extends KCodeAgentWorkspaceTarget {
  marketplace: string;
}

export interface KCodeAgentUpdatePluginMarketplaceParams extends KCodeAgentWorkspaceTarget {
  marketplace?: string;
  operationId?: string;
}

export interface KCodeAgentInstallPluginParams extends KCodeAgentWorkspaceTarget {
  dryRun?: boolean;
  marketplace: string;
  operationId?: string;
  pluginName: string;
  scope?: "user" | "workspace";
}

export interface KCodeAgentCancelPluginOperationParams {
  operationId: string;
}

export interface KCodeAgentUninstallPluginParams extends KCodeAgentWorkspaceTarget {
  marketplace?: string;
  pluginId?: string;
  pluginName?: string;
  removeCache?: boolean;
}

export interface KCodeAgentUpdatePluginParams extends KCodeAgentWorkspaceTarget {
  pluginId?: string;
  marketplace?: string;
}

export interface KCodeAgentRestoreBuiltinPluginParams extends KCodeAgentWorkspaceTarget {
  pluginId: string;
}

export interface KCodeAgentConfigurePluginParams extends KCodeAgentWorkspaceTarget {
  clearOptionKeys?: string[];
  dryRun?: boolean;
  options: Record<string, unknown>;
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface KCodeAgentResetPluginConfigParams extends KCodeAgentWorkspaceTarget {
  pluginId: string;
  scope?: "user" | "workspace";
}

export interface KCodeAgentValidatePluginParams extends KCodeAgentWorkspaceTarget {
  marketplace?: string;
  pluginName?: string;
  source?: string;
}

export interface KCodeAgentDescribePluginParams extends KCodeAgentWorkspaceTarget {
  marketplace: string;
  pluginName: string;
}

export interface KCodeAgentSetPluginEnabledParams extends KCodeAgentWorkspaceTarget {
  enabled: boolean;
  operationId?: string;
  pluginId: string;
  scope?: "user" | "workspace";
}

// Plugin 对话引用 catalog：
// 带 sessionId → session-owned 冻结 catalog（必须路由到持有该 session 的 workspace client）；
// 不带 → workspace 当前 catalog（新建草稿 Picker）。
export interface KCodeAgentPluginReferenceCatalogParams extends KCodeAgentWorkspaceTarget {
  sessionId?: string;
}

// Composer Skill catalog：与 Plugin 引用相同，以 sessionId 区分 workspace 当前目录和
// resident Session runtime 快照；不参与 Settings 管理目录。
export interface KCodeAgentSkillReferenceCatalogParams extends KCodeAgentWorkspaceTarget {
  sessionId?: string;
}
export interface KCodeAgentResolveSuggestedPluginReferenceParams extends KCodeAgentWorkspaceTarget {
  stableId: string;
  operationId: string;
  clientMode: "desktop-continuous" | "web-remote-replayable";
  deliveryKind: "desktop-continuous" | "web-remote-replayable";
}

// ---- 定时任务(automation)管理参数 ----

export interface KCodeAgentCreateAutomationParams extends KCodeAgentWorkspaceTarget {
  title: string;
  cronExpr: string;
  relativeDelayMinutes?: number;
  prompt: string;
  modelSelection?: ModelSelection;
  mode?: string;
  recurring?: boolean;
  maxRuns?: number;
  endAt?: number;
  scheduleRule?: KCodeAutomationScheduleRule;
}

export interface KCodeAgentUpdateAutomationParams extends KCodeAgentWorkspaceTarget {
  automationId: string;
  title?: string;
  cronExpr?: string;
  prompt?: string;
  modelSelection?: ModelSelection | null;
  mode?: string | null;
  recurring?: boolean;
  maxRuns?: number | null;
  endAt?: number | null;
  scheduleRule?: KCodeAutomationScheduleRule | null;
  scheduleEditedByUser?: boolean;
}

export interface KCodeAgentAutomationIdParams extends KCodeAgentWorkspaceTarget {
  automationId: string;
}

export interface KCodeAgentSetAutomationEnabledParams extends KCodeAgentWorkspaceTarget {
  automationId: string;
  enabled: boolean;
}

export interface KCodeAgentDeleteAutomationRunParams extends KCodeAgentWorkspaceTarget {
  runId: string;
}
