import type { IPlatformService } from "@kcode/shared";

type DesktopBrowserPlatformBridge = Pick<
  IPlatformService,
  | "onBrowserViewReady"
  | "onBrowserViewOperation"
  | "onBrowserViewViewportChanged"
  | "onBrowserViewVisibility"
  | "onBrowserViewCloseTab"
  | "onBrowserViewSuspend"
  | "onBrowserViewRestore"
  | "browserViewAttachGuest"
  | "browserViewDetachGuest"
  | "browserViewCloseTab"
  | "browserViewReportResidency"
  | "browserViewSuspendReady"
  | "browserViewEnsureResident"
  | "browserViewRestoreTabs"
  | "browserViewUpdateViewport"
  | "importChromeBrowserData"
  | "clearEmbeddedBrowserData"
  | "getPathForFile"
  | "saveFile"
  | "printPageToPdf"
>;

// Rebase 集成：browser bridge 若继续内联在 renderer 入口，会让入口越过 max-lines 门禁。
// 独立对象只做 preload 委托与旧 bridge 兼容兜底，不持有 Browser 业务状态。
export const desktopBrowserPlatformBridge = {
  getPathForFile: (file) => window.kcode.getPathForFile?.(file) ?? null,
  saveFile: (payload) =>
    window.kcode.saveFile?.(payload) ?? Promise.resolve({ success: false, error: "not_supported" }),
  // 条件定义而非兜底返回失败：UI 靠方法是否存在做能力检测，旧 preload 下必须保持 undefined
  printPageToPdf: window.kcode.printPageToPdf ? () => window.kcode.printPageToPdf!() : undefined,
  onBrowserViewReady: (handler) => window.kcode.onBrowserViewReady?.(handler) ?? (() => {}),
  onBrowserViewOperation: (handler) => window.kcode.onBrowserViewOperation?.(handler) ?? (() => {}),
  onBrowserViewViewportChanged: (handler) =>
    window.kcode.onBrowserViewViewportChanged?.(handler) ?? (() => {}),
  onBrowserViewVisibility: (handler) =>
    window.kcode.onBrowserViewVisibility?.(handler) ?? (() => {}),
  onBrowserViewCloseTab: (handler) => window.kcode.onBrowserViewCloseTab?.(handler) ?? (() => {}),
  onBrowserViewSuspend: (handler) => window.kcode.onBrowserViewSuspend?.(handler) ?? (() => {}),
  onBrowserViewRestore: (handler) => window.kcode.onBrowserViewRestore?.(handler) ?? (() => {}),
  browserViewAttachGuest: (payload) =>
    window.kcode.browserViewAttachGuest?.(payload) ??
    Promise.resolve({ ok: false, reason: "not-found", recoveryRequested: false }),
  browserViewDetachGuest: (payload) =>
    window.kcode.browserViewDetachGuest?.(payload) ?? Promise.resolve(false),
  browserViewCloseTab: (payload) =>
    window.kcode.browserViewCloseTab?.(payload) ?? Promise.resolve(),
  browserViewReportResidency: (payload) =>
    window.kcode.browserViewReportResidency?.(payload) ?? Promise.resolve(),
  browserViewSuspendReady: (payload) =>
    window.kcode.browserViewSuspendReady?.(payload) ?? Promise.resolve(),
  browserViewEnsureResident: (payload) =>
    window.kcode.browserViewEnsureResident?.(payload) ?? Promise.resolve(),
  browserViewRestoreTabs: (payload) =>
    window.kcode.browserViewRestoreTabs?.(payload) ?? Promise.resolve([]),
  browserViewUpdateViewport: (payload) =>
    window.kcode.browserViewUpdateViewport?.(payload) ?? Promise.resolve(),
  importChromeBrowserData: (options) =>
    window.kcode.importChromeBrowserData?.(options) ??
    Promise.resolve({
      success: false,
      cookies: { imported: 0, skipped: 0, failed: 0 },
      localStorage: {
        originsImported: 0,
        entriesImported: 0,
        originsSkipped: 0,
        originsFailed: 0,
      },
      error: "unsupported",
    }),
  clearEmbeddedBrowserData: (mode) =>
    window.kcode.clearEmbeddedBrowserData?.(mode) ??
    Promise.resolve({ success: false, error: "unsupported" }),
} satisfies DesktopBrowserPlatformBridge;
