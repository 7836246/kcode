import { recordArmsCustomEventForE2E } from "@kcode/ui";
import { DesktopCommandIds, buildLocalMediaPreviewUrl, type IPlatformService } from "@kcode/shared";

import { desktopBrowserPlatformBridge } from "./desktopBrowserPlatformBridge.js";

export function createDesktopPlatform(options: {
  isLocalDevelopmentRuntime: boolean;
}): IPlatformService {
  return {
    canSelectFilePath: true,
    createLocalMediaPreviewUrl: buildLocalMediaPreviewUrl,
    isLocalDevelopmentRuntime: options.isLocalDevelopmentRuntime,
    selectDirectory: () => window.kcode.selectDirectory(),
    selectFile: () => window.kcode.selectFile(),
    selectFiles: () => window.kcode.selectFiles?.() ?? Promise.resolve([]),
    createTempTextAttachment: (payload) => window.kcode.createTempTextAttachment(payload),
    onRemoteConnectionLog: (handler) => window.kcode.onRemoteConnectionLog(handler),
    onRemoteSessionClosed: (handler) => window.kcode.onRemoteSessionClosed(handler),
    activateOrSetWorkspace: (path) =>
      window.kcode.activateOrSetWorkspace?.(path) ?? Promise.resolve({ activated: false }),
    connectRemote: (remoteOptions, requestId, context) =>
      window.kcode.connectRemote(remoteOptions, requestId, context),
    cancelPendingRemoteConnection: (requestId) =>
      window.kcode.cancelPendingRemoteConnection?.(requestId) ?? Promise.resolve(),
    bindRemoteWorkspaceSessionContext: (context) =>
      window.kcode.bindRemoteWorkspaceSessionContext?.(context) ?? Promise.resolve(),
    disposeRemoteSession: (sessionId) => window.kcode.disposeRemoteSession(sessionId),
    isDockerAvailable: () => window.kcode.isDockerAvailable(),
    listWSLDistros: () => window.kcode.listWSLDistros(),
    listDockerContainers: () => window.kcode.listDockerContainers(),
    listSSHConfigAliases: () => window.kcode.listSSHConfigAliases(),
    loadMcpFromUserDirectory: (payload) => window.kcode.loadMcpFromUserDirectory(payload),
    saveMcpToUserDirectory: (payload) => window.kcode.saveMcpToUserDirectory(payload),
    migrateLegacyCommonMcp: (payload) => window.kcode.migrateLegacyCommonMcp(payload),
    openExternal: (url) => window.kcode.openExternal(url),
    openFeedback: () => window.kcode.executeDesktopCommand(DesktopCommandIds.OpenFeedback),
    openCommunity: () => window.kcode.executeDesktopCommand(DesktopCommandIds.OpenCommunity),
    canOpenCommunity: (locale) => window.kcode.canOpenCommunity(locale),
    openInFileManager: (path) => window.kcode.openInFileManager(path),
    openExternalFile: (path) => window.kcode.openExternalFile(path),
    openCuaPermissionOnboarding: window.kcode.openCuaPermissionOnboarding
      ? (permissionOptions) =>
          window.kcode.openCuaPermissionOnboarding?.(permissionOptions) ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    prepareCuaHelperPermissionDrag: window.kcode.prepareCuaHelperPermissionDrag
      ? () =>
          window.kcode.prepareCuaHelperPermissionDrag?.() ??
          Promise.resolve({ success: false, error: "not_supported" })
      : undefined,
    startCuaHelperPermissionDrag: window.kcode.startCuaHelperPermissionDrag
      ? () => window.kcode.startCuaHelperPermissionDrag?.()
      : undefined,
    onShareImport: (callback) => window.kcode.onShareImport?.(callback) ?? (() => {}),
    notifyRendererReady: () => window.kcode.notifyRendererReady(),
    reportTelemetryEvent: (payload) => window.kcode.reportTelemetryEvent(payload),
    reportArmsCustomEvent: (payload) => {
      recordArmsCustomEventForE2E(payload);
      return window.kcode.reportArmsCustomEvent(payload);
    },
    getRendererActionTraceConfig: window.kcode.getRendererActionTraceConfig
      ? () => window.kcode.getRendererActionTraceConfig!()
      : undefined,
    onRendererActionTraceConfigChanged: window.kcode.onRendererActionTraceConfigChanged
      ? (callback) => window.kcode.onRendererActionTraceConfigChanged!(callback)
      : undefined,
    reportLocalTtftBatch: (batch) => window.kcode.reportLocalTtftBatch(batch),
    reportRendererActionTraceBatch: window.kcode.reportRendererActionTraceBatch
      ? (batch) => window.kcode.reportRendererActionTraceBatch!(batch)
      : undefined,
    reportRendererHeapSample: window.kcode.reportRendererHeapSample
      ? (sample) => window.kcode.reportRendererHeapSample!(sample)
      : undefined,
    showTaskNotification: (payload) => window.kcode.showTaskNotification(payload),
    syncWindowTabs: (paths) => window.kcode.syncWindowTabs(paths),
    syncWindowUnreadCount: (count) => window.kcode.syncWindowUnreadCount(count),
    syncActiveTaskSession: (sessionId) => window.kcode.syncActiveTaskSession(sessionId),
    syncAppSettings: (patch) => window.kcode.syncAppSettings?.(patch),
    setShortcutRecordingActive: (active) => window.kcode.setShortcutRecordingActive?.(active),
    onFocusTab: (handler) => window.kcode.onFocusTab(handler),
    onNewTab: (handler) => window.kcode.onNewTab(handler),
    onCloseActiveContextRequest: (handler) =>
      window.kcode.onCloseActiveContextRequest?.(handler) ?? (() => {}),
    onOpenBrowserUrl: (handler) => window.kcode.onOpenBrowserUrl?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfacePrepare: (handler) =>
      window.kcode.onBrowserViewScreenshotSurfacePrepare?.(handler) ?? (() => {}),
    onBrowserViewScreenshotSurfaceRelease: (handler) =>
      window.kcode.onBrowserViewScreenshotSurfaceRelease?.(handler) ?? (() => {}),
    browserViewScreenshotSurfaceReady: (payload) =>
      window.kcode.browserViewScreenshotSurfaceReady?.(payload),
    ...desktopBrowserPlatformBridge,
    onNewTask: (handler) => window.kcode.onNewTask(handler),
    onOpenWorkspace: (handler) => {
      // 开发态或升级后的旧窗口可能仍运行未暴露 onOpenWorkspace 的 preload，
      // renderer 直接调用会在启动时崩溃。这里和 activateOrSetWorkspace 一样做兼容兜底，
      // 缺少该 bridge 时只禁用原生菜单回调，不影响应用继续打开。
      return window.kcode.onOpenWorkspace?.(handler) ?? (() => {});
    },
    onOpenWorkspacePath: (handler) => window.kcode.onOpenWorkspacePath?.(handler) ?? (() => {}),
    onWindowFullscreenChanged: (handler) => window.kcode.onWindowFullscreenChanged(handler),
    getDesktopWindowChromeState: window.kcode.getDesktopWindowChromeState
      ? () => window.kcode.getDesktopWindowChromeState!()
      : undefined,
    onDesktopWindowChromeStateChanged: window.kcode.onDesktopWindowChromeStateChanged
      ? (handler) => window.kcode.onDesktopWindowChromeStateChanged!(handler)
      : undefined,
    getWindowControlsOverlayMetrics: () => window.kcode.getWindowControlsOverlayMetrics?.() ?? null,
    onWindowControlsOverlayChanged: (handler) =>
      window.kcode.onWindowControlsOverlayChanged?.(handler) ?? (() => {}),
    getDesktopZoomLevel: () =>
      window.kcode.getDesktopZoomLevel?.() ?? Promise.resolve({ zoomLevel: 0 }),
    onDesktopZoomLevelChanged: (handler) =>
      window.kcode.onDesktopZoomLevelChanged?.(handler) ?? (() => {}),
    onTaskNotificationClick: (handler) => window.kcode.onTaskNotificationClick(handler),
    exportLogs: () => window.kcode.exportLogs(),
    captureWindowScreenshot: () =>
      window.kcode.captureWindowScreenshot?.() ?? Promise.resolve(null),
    onUpdateReady: (callback) => window.kcode.onUpdateReady(callback),
    onUpdateCheckResult: (callback) => window.kcode.onUpdateCheckResult(callback),
    onUpdateStateChanged: (callback) => window.kcode.onUpdateStateChanged?.(callback) ?? (() => {}),
    getUpdateState: () =>
      window.kcode.getUpdateState?.() ?? Promise.resolve({ kind: "idle", enabled: true }),
    downloadUpdate: () => window.kcode.downloadUpdate?.() ?? Promise.resolve(),
    cancelUpdateDownload: () => window.kcode.cancelUpdateDownload?.() ?? Promise.resolve(),
    openUpdateStatusWindow: () => window.kcode.openUpdateStatusWindow?.() ?? Promise.resolve(),
    getAutoUpdatePreferences: () =>
      window.kcode.getAutoUpdatePreferences?.() ??
      Promise.resolve({ autoDownloadAndInstallUpdates: false }),
    setAutoDownloadAndInstallUpdates: (enabled) =>
      window.kcode.setAutoDownloadAndInstallUpdates?.(enabled) ?? Promise.resolve(),
    getDesktopSessionActivity: () =>
      window.kcode.getDesktopSessionActivity?.() ??
      Promise.resolve({ runningAgentSessionCount: 0 }),
    getKCodeStdioTapDevState: () =>
      window.kcode.getKCodeStdioTapDevState?.() ??
      Promise.resolve({ enabled: false, visible: false, logDir: "", statePath: "" }),
    onSettingsChanged: (callback) => window.kcode.onSettingsChanged?.(callback) ?? (() => {}),
    onApplicationLocaleChanged: (callback) =>
      window.kcode.onApplicationLocaleChanged?.(callback) ?? (() => {}),
    onPostUpdateReleaseNotes: (callback) => window.kcode.onPostUpdateReleaseNotes(callback),
    acknowledgePostUpdateReleaseNotes: (version) =>
      window.kcode.acknowledgePostUpdateReleaseNotes(version),
    skipUpdateVersion: (version) => window.kcode.skipUpdateVersion?.(version) ?? Promise.resolve(),
    quitAndInstallUpdate: () => window.kcode.quitAndInstallUpdate(),
    getInstalledEditors: () => window.kcode.getInstalledEditors(),
    getApplicationIcon: (bundleId) =>
      window.kcode.getApplicationIcon?.(bundleId) ?? Promise.resolve(null),
    openInEditor: (editorId, path, editorOptions) =>
      window.kcode.openInEditor(editorId, path, editorOptions),
    executeDesktopCommand: (command) => window.kcode.executeDesktopCommand(command),
    setApplicationLocale: (locale) => window.kcode.setApplicationLocale(locale),
    getSystemLocale: () =>
      window.kcode.getSystemLocale?.() ??
      Promise.resolve(navigator.language.toLowerCase().startsWith("zh") ? "zh-CN" : "en-US"),
    setTitleBarTheme: (theme) => window.kcode.setTitleBarTheme(theme),
    getDeviceId: () =>
      (window as Window & { __KCODE_DEVICE_ID__?: string }).__KCODE_DEVICE_ID__ ?? "",
  };
}
