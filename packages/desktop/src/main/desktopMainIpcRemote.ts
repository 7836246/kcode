/* eslint-disable max-lines -- 远程连接、遥测和通知 IPC 共用窗口级上下文，集中注册避免跨文件状态漂移。 */
import { app, BrowserWindow, ipcMain, shell } from "electron";
import armsRum from "@arms/rum-electron";
import {
  armsCustomEventPayloadSchema,
  buildRemoteWorkspaceConnectResultTelemetry,
  classifyRemoteUsageError,
  formatZodError,
  normalizeUnknownError,
  InternalChannels,
  PlatformChannels,
  remoteTargetSchema,
  rendererTelemetryEventPayloadSchema,
  type ArmsRumEnv,
  type RemoteTarget,
  type TelemetryEventPayload,
} from "@kcode/shared";
import { dispatchTaskNotification } from "./desktopNotifications.js";
import { clearOAuthRoutesForWindow, deliverPendingDeepLink } from "./desktopOAuthDeepLink.js";
import {
  dispatchFinalArmsCustomEvent,
  enableSharedFinalArmsCustomEventE2EController,
} from "./desktopArmsCustomEvent.js";
import {
  configureRemoteUsageArmsTelemetry,
  reportRemoteConnectResultToArms,
  type RemoteConnectionStats,
} from "./desktopRemoteUsageArmsTelemetry.js";
import { openPathInDefaultApp } from "./desktopMainIpcHelpers.js";

function isAllowedExternalOpenUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "file:";
  } catch {
    return false;
  }
}

interface OpenExternalRequest {
  sourceUrl?: string;
  url: string;
}

function parseOpenExternalRequest(payload: unknown): OpenExternalRequest | null {
  if (typeof payload === "string") {
    return { url: payload };
  }
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.url !== "string") {
    return null;
  }
  return {
    sourceUrl: typeof record.sourceUrl === "string" ? record.sourceUrl : undefined,
    url: record.url,
  };
}

export function registerRemoteIpcHandlers(options: {
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
  };
  appTelemetryRuntime: {
    onRendererReady(payload: { rendererId: number }): void;
    syncRendererContext(payload: { rendererId: number; context: unknown }): void;
  };
  appTelemetryCore: {
    reportEvent(payload: unknown): Promise<void>;
  };
  reportRemoteUsageEvent: (rendererId: number, event: TelemetryEventPayload) => void;
  armsCustomContext: {
    deviceMid: string;
    platform: NodeJS.Platform;
    appVersion: string;
    armsEnv: ArmsRumEnv;
  };
  /** 仅由 VITE_KCODE_E2E_STORE_BRIDGE + test runner 双门禁打开。 */
  finalArmsCustomEventE2EEnabled?: boolean;
  createRemoteWorkspaceSession: (
    win: BrowserWindow,
    target: RemoteTarget,
    requestId?: string,
    context?: { workspacePath: string; workspaceIdentity?: string },
    lifecycle?: { remoteUsageTelemetryEligible?: boolean },
  ) => Promise<string>;
  getRemoteConnectionStats: () => RemoteConnectionStats;
  disposeRemoteWorkspaceSession: (
    sessionId: string,
    reason: string,
    signalGracePeriodMs?: number,
  ) => void;
  cancelPendingRemoteWorkspaceSessionsForWindow: (
    wcId: number,
    reason: string,
    requestId?: string,
  ) => void;
  bindRemoteWorkspaceSessionContext: (
    sessionId: string,
    context: { workspacePath: string; workspaceIdentity?: string },
    expectedWebContentsId?: number,
  ) => Promise<void>;
  confirmRendererAttachmentReady: (
    webContentsId: number,
    payload: { sessionId: string; attachmentId: string },
  ) => void;
  isDockerDaemonAvailable: () => Promise<boolean>;
  listAvailableWSLDistros: () => Promise<unknown[]>;
  listAvailableDockerContainers: () => Promise<unknown[]>;
  listSSHConfigAliases: () => Promise<unknown[]>;
}) {
  function reportRemoteUsageEvent(rendererId: number, event: TelemetryEventPayload): void {
    try {
      options.reportRemoteUsageEvent(rendererId, event);
    } catch (error) {
      // 埋点是旁路能力，不能把已成功的远程连接改写成业务失败。
      options.logger.warn("[remote-usage-telemetry] dispatch failed", {
        elementName: event.elementName,
        error,
      });
    }
  }

  const finalArmsCustomEventE2E = options.finalArmsCustomEventE2EEnabled
    ? enableSharedFinalArmsCustomEventE2EController()
    : null;

  configureRemoteUsageArmsTelemetry({
    armsCustomContext: options.armsCustomContext,
    getRemoteConnectionStats: options.getRemoteConnectionStats,
    sendCustom: (payload) =>
      armsRum.sendCustom(payload as Parameters<typeof armsRum.sendCustom>[0]),
    e2eController: finalArmsCustomEventE2E,
    logger: options.logger,
  });

  function reportRemoteConnectResultToArmsSafely(
    params: Parameters<typeof reportRemoteConnectResultToArms>[0],
  ): void {
    try {
      reportRemoteConnectResultToArms(params);
    } catch (error) {
      options.logger.warn("[remote-usage-arms] connect result reporter failed", { error });
    }
  }

  ipcMain.on(InternalChannels.ScopedServicePortReady, (event, rawPayload: unknown) => {
    if (!rawPayload || typeof rawPayload !== "object") return;
    const payload = rawPayload as { sessionId?: unknown; attachmentId?: unknown };
    const sessionId = typeof payload.sessionId === "string" ? payload.sessionId.trim() : "";
    const attachmentId =
      typeof payload.attachmentId === "string" ? payload.attachmentId.trim() : "";
    if (!sessionId || !attachmentId) return;
    options.confirmRendererAttachmentReady(event.sender.id, { sessionId, attachmentId });
  });
  if (finalArmsCustomEventE2E) {
    ipcMain.handle(PlatformChannels.ReadFinalArmsCustomEventsE2E, () =>
      finalArmsCustomEventE2E.read(),
    );
    ipcMain.handle(PlatformChannels.ClearFinalArmsCustomEventsE2E, () => {
      finalArmsCustomEventE2E.clear();
    });
    ipcMain.handle(
      PlatformChannels.ConfigureFinalArmsCustomEventsE2E,
      (_event, request: unknown) => {
        finalArmsCustomEventE2E.configure(
          request as Parameters<typeof finalArmsCustomEventE2E.configure>[0],
        );
      },
    );
  }

  ipcMain.on(PlatformChannels.OpenExternal, (_event, payload: unknown) => {
    const request = parseOpenExternalRequest(payload);
    if (!request) {
      options.logger.warn("[open-external] blocked unsupported request", payload);
      return;
    }
    const { url } = request;
    if (!isAllowedExternalOpenUrl(url)) {
      options.logger.warn("[open-external] blocked unsupported url", url);
      return;
    }
    void Promise.resolve(shell.openExternal(url)).catch((error: unknown) => {
      options.logger.warn("[open-external] 外部 URL 打开失败", {
        url,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  });

  ipcMain.handle(PlatformChannels.OpenExternalFile, async (_event, rawPath: string) =>
    openPathInDefaultApp(rawPath, options.logger),
  );

  ipcMain.on(PlatformChannels.RendererReady, (event) => {
    deliverPendingDeepLink(event.sender);
    options.appTelemetryRuntime.onRendererReady({
      rendererId: event.sender.id,
    });
  });

  ipcMain.on(PlatformChannels.SyncTelemetryContext, (event, context) => {
    options.appTelemetryRuntime.syncRendererContext({
      rendererId: event.sender.id,
      context,
    });
  });

  ipcMain.handle(PlatformChannels.ReportTelemetryEvent, async (_event, payload: unknown) => {
    const result = rendererTelemetryEventPayloadSchema.safeParse(payload);
    if (!result.success) {
      options.logger.warn(
        "[report-telemetry-event] invalid payload:",
        formatZodError(result.error),
      );
      return;
    }

    await options.appTelemetryCore.reportEvent(result.data);
  });

  ipcMain.handle(PlatformChannels.ReportArmsCustomEvent, async (event, payload: unknown) => {
    const result = armsCustomEventPayloadSchema.safeParse(payload);
    if (!result.success) {
      options.logger.warn(
        "[report-arms-custom-event] invalid payload:",
        formatZodError(result.error),
      );
      return;
    }

    try {
      dispatchFinalArmsCustomEvent({
        payload: result.data,
        context: {
          ...options.armsCustomContext,
          rendererId: event.sender.id,
        },
        e2eController: finalArmsCustomEventE2E,
        // FinalArmsCustomEventPayload 是 SDK RumCustomEvent 的收窄子集；SDK 额外要求
        // BaseObject 索引签名，但这里不会动态追加未声明字段。
        sendCustom: (payload) =>
          armsRum.sendCustom(payload as Parameters<typeof armsRum.sendCustom>[0]),
      });
    } catch (error) {
      options.logger.warn(
        "[report-arms-custom-event] sendCustom failed:",
        normalizeUnknownError(error).message,
      );
    }
  });

  ipcMain.on(PlatformChannels.ShowTaskNotification, (event, payload: unknown) => {
    dispatchTaskNotification({ event, payload, logger: options.logger });
  });
  ipcMain.handle(PlatformChannels.ShowTaskNotification, (event, payload: unknown) =>
    dispatchTaskNotification({ event, payload, logger: options.logger }),
  );

  app.on("browser-window-created", (_, win) => {
    const windowWebContentsId = win.webContents.id;
    win.on("closed", () => {
      // BrowserWindow 的 closed 阶段里 webContents 可能已被 Electron 释放。
      // 之前这里直接读取 win.webContents.id，会把正常关窗流程变成主进程未捕获异常。
      // 提前缓存 id 后再做清理，避免访问已经销毁的对象。
      clearOAuthRoutesForWindow(windowWebContentsId);
    });
  });

  ipcMain.handle(PlatformChannels.ConnectRemote, async (event, rawPayload: unknown) => {
    const wrappedPayload: {
      target: unknown;
      requestId?: unknown;
      workspacePath?: unknown;
      workspaceIdentity?: unknown;
      connectTrigger?: unknown;
    } =
      rawPayload && typeof rawPayload === "object" && "target" in rawPayload
        ? (rawPayload as {
            target: unknown;
            requestId?: unknown;
            workspacePath?: unknown;
            workspaceIdentity?: unknown;
            connectTrigger?: unknown;
          })
        : { target: rawPayload, requestId: undefined };
    const result = remoteTargetSchema.safeParse(wrappedPayload.target);
    if (!result.success) {
      const error = `Invalid connect-remote payload: ${formatZodError(result.error)}`;
      options.logger.warn("[connect-remote]", error);
      return { success: false, error };
    }
    const requestId =
      typeof wrappedPayload.requestId === "string" && wrappedPayload.requestId.trim().length > 0
        ? wrappedPayload.requestId.trim()
        : undefined;
    const workspacePath =
      typeof wrappedPayload.workspacePath === "string" &&
      wrappedPayload.workspacePath.trim().length > 0
        ? wrappedPayload.workspacePath
        : undefined;
    const workspaceIdentity =
      typeof wrappedPayload.workspaceIdentity === "string" &&
      wrappedPayload.workspaceIdentity.trim().length > 0
        ? wrappedPayload.workspaceIdentity
        : undefined;
    const connectTriggerValue = wrappedPayload.connectTrigger;
    const connectTrigger =
      connectTriggerValue === "reconnect" || connectTriggerValue === "restore"
        ? connectTriggerValue
        : "new";

    try {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (!win) {
        throw new Error("未找到当前窗口，无法创建远程 session");
      }

      const sessionId = await options.createRemoteWorkspaceSession(
        win,
        result.data,
        requestId,
        workspacePath ? { workspacePath, workspaceIdentity } : undefined,
        { remoteUsageTelemetryEligible: true },
      );
      reportRemoteUsageEvent(
        event.sender.id,
        buildRemoteWorkspaceConnectResultTelemetry({
          result: "success",
          remoteKind: result.data.kind,
          connectTrigger,
        }),
      );
      reportRemoteConnectResultToArmsSafely({
        rendererId: event.sender.id,
        result: "success",
        remoteKind: result.data.kind,
        connectTrigger,
      });
      return { success: true, sessionId };
    } catch (error) {
      const normalizedError = normalizeUnknownError(error);
      const errorCategory = classifyRemoteUsageError(error);
      // 这里之前直接把 Error 对象交给 logger，落盘时会被 JSON.stringify 压成 `{}`。
      // 改成显式展开 message/code/stack，保证远程建连失败时主进程日志里能看到真实上下文。
      options.logger.error("[connect-remote] caught error:", {
        message: normalizedError.message,
        code: normalizedError.code,
        stack: error instanceof Error ? error.stack : undefined,
      });
      reportRemoteUsageEvent(
        event.sender.id,
        buildRemoteWorkspaceConnectResultTelemetry({
          result: "failure",
          remoteKind: result.data.kind,
          connectTrigger,
          errorCategory,
        }),
      );
      reportRemoteConnectResultToArmsSafely({
        rendererId: event.sender.id,
        result: "failure",
        remoteKind: result.data.kind,
        connectTrigger,
        errorCategory,
      });
      return { success: false, error: normalizedError.message };
    }
  });

  ipcMain.handle(
    PlatformChannels.CancelPendingRemoteConnection,
    async (event, rawPayload: unknown) => {
      const payload =
        rawPayload && typeof rawPayload === "object" ? (rawPayload as { requestId?: unknown }) : {};
      const requestId =
        typeof payload.requestId === "string" && payload.requestId.trim().length > 0
          ? payload.requestId.trim()
          : undefined;
      // 连接建立前没有 sessionId，renderer 之前无法精准通知 main 取消正在进行的连接。
      // 现在优先按 requestId 精确取消当前弹窗发起的连接，避免误伤同窗口其他并发连接。
      // 若 requestId 缺失则回退到按窗口取消，兼容旧调用端。
      options.cancelPendingRemoteWorkspaceSessionsForWindow(
        event.sender.id,
        `cancel-pending-remote-connection:${event.sender.id}`,
        requestId,
      );
    },
  );

  ipcMain.handle(
    PlatformChannels.BindRemoteWorkspaceSessionContext,
    async (event, rawPayload: unknown) => {
      if (!rawPayload || typeof rawPayload !== "object") {
        throw new Error("远程 workspace context payload 无效");
      }
      const payload = rawPayload as {
        remoteSessionId?: unknown;
        workspacePath?: unknown;
        workspaceIdentity?: unknown;
      };
      const remoteSessionId =
        typeof payload.remoteSessionId === "string" ? payload.remoteSessionId.trim() : "";
      const workspacePath = typeof payload.workspacePath === "string" ? payload.workspacePath : "";
      const workspaceIdentity =
        typeof payload.workspaceIdentity === "string" ? payload.workspaceIdentity.trim() : "";
      if (!remoteSessionId || !workspacePath.trim()) {
        throw new Error("远程 workspace context 缺少 sessionId 或 workspacePath");
      }
      await options.bindRemoteWorkspaceSessionContext(
        remoteSessionId,
        {
          workspacePath,
          ...(workspaceIdentity ? { workspaceIdentity } : {}),
        },
        event.sender.id,
      );
    },
  );

  ipcMain.handle(PlatformChannels.DisposeRemoteSession, async (_event, sessionId: string) => {
    options.disposeRemoteWorkspaceSession(sessionId, `dispose-remote-session:${sessionId}`, 150);
  });

  ipcMain.handle(PlatformChannels.IsDockerAvailable, async () => {
    try {
      return await options.isDockerDaemonAvailable();
    } catch (error) {
      options.logger.warn("[is-docker-available] detect failed:", error);
      return false;
    }
  });

  ipcMain.handle(PlatformChannels.ListWSLDistros, async () => {
    try {
      return await options.listAvailableWSLDistros();
    } catch (error) {
      options.logger.warn("[list-wsl-distros] detect failed:", error);
      return [];
    }
  });

  ipcMain.handle(PlatformChannels.ListDockerContainers, async () => {
    try {
      return await options.listAvailableDockerContainers();
    } catch (error) {
      options.logger.warn("[list-docker-containers] detect failed:", error);
      return [];
    }
  });

  ipcMain.handle(PlatformChannels.ListSSHConfigAliases, async () => {
    try {
      return await options.listSSHConfigAliases();
    } catch (error) {
      const normalizedError = normalizeUnknownError(error);
      // Error 对象直接落盘会被序列化成 `{}`，SSH config 解析失败时无法定位具体 pattern。
      // 显式展开错误字段，保留 UI 返回空列表的兼容行为，同时让日志能看到根因。
      options.logger.warn("[list-ssh-config-aliases] detect failed:", {
        message: normalizedError.message,
        code: normalizedError.code,
        name: error instanceof Error ? error.name : undefined,
        stack: error instanceof Error ? error.stack : undefined,
      });
      return [];
    }
  });
}
