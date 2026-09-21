// 平台能力面收敛：设置页「插件管理」的薄服务接口。
//
// 背景：pluginManagementStore / usePluginUninstall 过去直接注入 IKCodeAgentService，
// UI 层因此散布 13 个 plugins/* 旧协议词的消费点。收敛为独立薄 service 后，UI 只依赖
// 本接口；plugins/* 词表的 host 侧消费点收拢到 pluginManagementService 一处（插件的
// 事实源在 kcode-cli 进程，服务实现仍经 agent 协议往返——plugins 词表的收口归属
// 插件能力面自身的协议演进，不在会话 v4 词表范围内）。
// 注意与既有 IPluginsService（已 retired 的 marketplace pluginStore 通道）区分：
// 那套接口按 pluginName+marketplace 寻址且方法语义过时，不复用避免签名冲突。
import type { Event } from "@kcode/rpc";
import type {
  KCodePluginOperationProgressNotification,
  KCodePluginsConfigureResult,
  KCodePluginsCancelOperationResult,
  KCodePluginsDescribeResult,
  KCodePluginsInstallResult,
  KCodePluginsListResult,
  KCodePluginsMarketplaceMutationResult,
  KCodePluginsOverviewResult,
  KCodePluginsReferenceCatalogResult,
  KCodePluginsRestoreBuiltinResult,
  KCodePluginsSetEnabledResult,
  KCodePluginsUninstallResult,
  KCodePluginsValidateResult,
} from "@kcode/shared";
import { ServiceChannels } from "@kcode/shared";
import { createServiceDescriptor } from "../descriptors.js";
import type {
  KCodeAgentAddPluginMarketplaceParams,
  KCodeAgentConfigurePluginParams,
  KCodeAgentCancelPluginOperationParams,
  KCodeAgentDescribePluginParams,
  KCodeAgentInstallPluginParams,
  KCodeAgentPluginReferenceCatalogParams,
  KCodeAgentResolveSuggestedPluginReferenceParams,
  KCodeAgentResetPluginConfigParams,
  KCodeAgentPluginViewParams,
  KCodeAgentRemovePluginMarketplaceParams,
  KCodeAgentRestoreBuiltinPluginParams,
  KCodeAgentSetPluginEnabledParams,
  KCodeAgentUninstallPluginParams,
  KCodeAgentUpdatePluginMarketplaceParams,
  KCodeAgentUpdatePluginParams,
  KCodeAgentValidatePluginParams,
} from "../kcode-agent/kcodeAgentPluginParams.js";

export interface IPluginManagementService {
  listPlugins(params: KCodeAgentPluginViewParams): Promise<KCodePluginsListResult>;
  /**
   * Plugin 对话引用 catalog：
   * 带 sessionId → session-owned 冻结 catalog；不带 → workspace 当前 catalog。
   * 实现路由到 workspace 级 agent client，不走插件管理独立进程。
   */
  getPluginReferenceCatalog(
    params: KCodeAgentPluginReferenceCatalogParams,
  ): Promise<KCodePluginsReferenceCatalogResult>;
  resolveSuggestedPluginReference(
    params: KCodeAgentResolveSuggestedPluginReferenceParams,
  ): Promise<import("@kcode/shared").KCodePluginsResolveSuggestedReferenceResult>;
  onDynamicPluginOperationProgress(
    operationId: string,
  ): Event<KCodePluginOperationProgressNotification>;
  getPluginsOverview(params: KCodeAgentPluginViewParams): Promise<KCodePluginsOverviewResult>;
  addPluginMarketplace(
    params: KCodeAgentAddPluginMarketplaceParams,
  ): Promise<KCodePluginsMarketplaceMutationResult>;
  removePluginMarketplace(
    params: KCodeAgentRemovePluginMarketplaceParams,
  ): Promise<KCodePluginsMarketplaceMutationResult>;
  updatePluginMarketplace(
    params: KCodeAgentUpdatePluginMarketplaceParams,
  ): Promise<KCodePluginsMarketplaceMutationResult>;
  installPlugin(params: KCodeAgentInstallPluginParams): Promise<KCodePluginsInstallResult>;
  cancelPluginOperation(
    params: KCodeAgentCancelPluginOperationParams,
  ): Promise<KCodePluginsCancelOperationResult>;
  uninstallPlugin(params: KCodeAgentUninstallPluginParams): Promise<KCodePluginsUninstallResult>;
  updatePlugin(params: KCodeAgentUpdatePluginParams): Promise<KCodePluginsInstallResult>;
  restoreBuiltinPlugin(
    params: KCodeAgentRestoreBuiltinPluginParams,
  ): Promise<KCodePluginsRestoreBuiltinResult>;
  configurePlugin(params: KCodeAgentConfigurePluginParams): Promise<KCodePluginsConfigureResult>;
  resetPluginConfig(
    params: KCodeAgentResetPluginConfigParams,
  ): Promise<KCodePluginsConfigureResult>;
  validatePlugin(params: KCodeAgentValidatePluginParams): Promise<KCodePluginsValidateResult>;
  describePlugin(params: KCodeAgentDescribePluginParams): Promise<KCodePluginsDescribeResult>;
  setPluginEnabled(params: KCodeAgentSetPluginEnabledParams): Promise<KCodePluginsSetEnabledResult>;
}

export const IPluginManagementService = createServiceDescriptor<IPluginManagementService>(
  ServiceChannels.PluginManagement,
);
