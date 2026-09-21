/* oxlint-disable eslint(max-lines) -- Deep Link 路由必须在同一模块内保持协议校验和投递原子性。 */
import { statSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { app, BrowserWindow, dialog } from "electron";
import type { WebContents } from "electron";
import { type Locale, PlatformChannels } from "@kcode/shared";
import {
  extractWorkspaceOpenPath,
  extractShareImportCode,
  isWorkspaceOpenUrl,
  isShareImportUrl,
} from "./desktopDeepLinkUrl.js";
import { registerLinuxDeepLinkProtocol } from "./desktopLinuxDeepLinkRegistration.js";

interface DeepLinkWorkspaceGateOptions {
  canOpenWorkspace?: (workspacePath: string) => boolean;
  confirmationCopy?: ExternalWorkspaceOpenDialogCopy;
  onWorkspaceOpenBlocked?: (workspacePath: string) => void;
  /** 业务窗口解析器；必须排除 CUA indicator 等 Main 辅助窗口。 */
  resolveApplicationWindow?: () => BrowserWindow | null;
}

export interface ExternalWorkspaceOpenDialogCopy {
  buttons: [string, string];
  title: string;
  message: string;
  detail: (path: string) => string;
}

const rendererReadyWebContentsIds = new Set<number>();
let pendingOpenWorkspaceRequest: {
  path: string;
  targetWebContentsId?: number;
} | null = null;
const pendingShareImports: { shareCode: string; targetWebContentsId?: number }[] = [];
const MAX_PENDING_SHARE_IMPORTS = 8;

function enqueuePendingShareImport(
  payload: { shareCode: string },
  targetWebContentsId?: number,
): void {
  if (
    pendingShareImports.some(
      (item) =>
        item.shareCode === payload.shareCode && item.targetWebContentsId === targetWebContentsId,
    )
  ) {
    return;
  }
  pendingShareImports.push(
    targetWebContentsId === undefined ? { ...payload } : { ...payload, targetWebContentsId },
  );
  if (pendingShareImports.length > MAX_PENDING_SHARE_IMPORTS) {
    pendingShareImports.shift();
  }
}

function focusDeepLinkTargetWindow(targetWindow: BrowserWindow): void {
  // macOS 的 open-url 回调只会把 URL 投递给当前实例，不会自动把窗口带回前台。
  if (targetWindow.isMinimized()) {
    targetWindow.restore();
  }

  if (!targetWindow.isVisible()) {
    targetWindow.show();
  }

  if (process.platform === "darwin") {
    app.show();
  }

  targetWindow.focus();
}

export function isValidLocalWorkspaceDirectory(path: string): boolean {
  if (!path || path.includes("\0") || isNetworkWorkspacePath(path) || !isAbsolute(path)) {
    return false;
  }

  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export function isNetworkWorkspacePath(path: string): boolean {
  // 仅当原路径以 // 或 \\ 开头时规范化后才会以 \\ 开头；
  // 单 / 的 Unix 绝对路径不会被误判为 UNC 网络路径。
  const normalized = path.replace(/\//gu, "\\");
  return normalized.startsWith("\\\\") || /^\\\\\?\\UNC\\/iu.test(normalized);
}

export function resolveExternalWorkspaceOpenDialogCopy(
  locale: Locale,
): ExternalWorkspaceOpenDialogCopy {
  if (locale === "zh-CN") {
    return {
      buttons: ["打开文件夹", "取消"],
      title: "打开外部 KCode 链接？",
      message: "是否在 KCode 中打开此文件夹？",
      detail: (path) => `${path}\n\n只打开你信任来源的文件夹。项目设置可能影响 agent runtime。`,
    };
  }

  return {
    buttons: ["Open folder", "Cancel"],
    title: "Open external KCode link?",
    message: "Open this folder in KCode?",
    detail: (path) =>
      `${path}\n\nOnly open folders from sources you trust. Project settings may affect the agent runtime.`,
  };
}

export function confirmExternalWorkspaceOpen(
  path: string,
  logger: { warn: (...args: unknown[]) => void },
  parentWindow: BrowserWindow | null,
  copy: ExternalWorkspaceOpenDialogCopy = resolveExternalWorkspaceOpenDialogCopy("en-US"),
): boolean {
  const options = {
    type: "warning" as const,
    buttons: copy.buttons,
    defaultId: 1,
    cancelId: 1,
    title: copy.title,
    message: copy.message,
    detail: copy.detail(path),
    noLink: true,
  };
  const response = parentWindow
    ? dialog.showMessageBoxSync(parentWindow, options)
    : dialog.showMessageBoxSync(options);
  const confirmed = response === 0;
  if (!confirmed) {
    logger.warn("[deep-link] 用户取消打开外部链接工作区", { path });
  }
  return confirmed;
}

export function handleOpenWorkspacePath(
  path: string,
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void },
  options: {
    allowWithoutReadyWindow?: boolean;
    resolveApplicationWindow?: () => BrowserWindow | null;
  } = {},
): boolean {
  if (!isValidLocalWorkspaceDirectory(path)) {
    logger.warn("[deep-link] 打开工作区路径无效，已忽略", { path });
    return false;
  }

  const targetWindow = options.resolveApplicationWindow
    ? options.resolveApplicationWindow()
    : (BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null);
  if (targetWindow) {
    const targetWebContentsId = targetWindow.webContents.id;
    if (!rendererReadyWebContentsIds.has(targetWebContentsId)) {
      pendingOpenWorkspaceRequest = {
        path,
        targetWebContentsId,
      };
      focusDeepLinkTargetWindow(targetWindow);
      logger.warn("[deep-link] 工作区打开请求命中未就绪窗口，先缓存等待 renderer ready", {
        windowId: targetWebContentsId,
        path,
      });
      return true;
    }

    targetWindow.webContents.send(PlatformChannels.OpenWorkspacePath, path);
    focusDeepLinkTargetWindow(targetWindow);
    logger.info("[deep-link] 工作区打开请求路由成功", {
      windowId: targetWebContentsId,
      path,
    });
    return true;
  }

  if (!options.allowWithoutReadyWindow) {
    logger.warn("[deep-link] 工作区打开请求暂未命中窗口，已忽略", { path });
    return false;
  }

  pendingOpenWorkspaceRequest = { path };
  logger.warn("[deep-link] 工作区打开请求暂未命中窗口，先缓存等待 renderer ready", { path });
  return false;
}

export function handleDeepLink(
  url: string,
  logger: { info: (...args: unknown[]) => void; warn: (...args: unknown[]) => void },
  options: DeepLinkWorkspaceGateOptions = {},
): boolean {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    logger.warn("[deep-link] 无法解析 URL:", url);
    return false;
  }

  if (isWorkspaceOpenUrl(parsedUrl)) {
    const workspacePath = extractWorkspaceOpenPath(parsedUrl);
    if (!workspacePath) {
      logger.warn("[deep-link] 工作区打开请求缺少 path，已忽略", {
        host: parsedUrl.hostname,
        path: parsedUrl.pathname,
      });
      return false;
    }

    if (isNetworkWorkspacePath(workspacePath)) {
      logger.warn("[deep-link] 网络工作区路径已拒绝", { path: workspacePath });
      return false;
    }

    if (options.canOpenWorkspace && !options.canOpenWorkspace(workspacePath)) {
      logger.warn("[deep-link] 工作区打开请求被当前启动 gate 阻止", { path: workspacePath });
      options.onWorkspaceOpenBlocked?.(workspacePath);
      return true;
    }

    const targetWindow = options.resolveApplicationWindow
      ? options.resolveApplicationWindow()
      : (BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null);
    if (
      !confirmExternalWorkspaceOpen(workspacePath, logger, targetWindow, options.confirmationCopy)
    ) {
      return true;
    }

    return handleOpenWorkspacePath(workspacePath, logger, {
      allowWithoutReadyWindow: true,
      resolveApplicationWindow: options.resolveApplicationWindow,
    });
  }

  if (isShareImportUrl(parsedUrl)) {
    const shareCode = extractShareImportCode(parsedUrl);
    if (!shareCode) {
      logger.warn("[deep-link] share import code 无效，已忽略", {
        host: parsedUrl.hostname,
        path: parsedUrl.pathname,
      });
      return false;
    }
    const payload = { shareCode };
    const targetWindow = options.resolveApplicationWindow
      ? options.resolveApplicationWindow()
      : (BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0] ?? null);
    if (targetWindow) {
      if (!rendererReadyWebContentsIds.has(targetWindow.webContents.id)) {
        enqueuePendingShareImport(payload, targetWindow.webContents.id);
        focusDeepLinkTargetWindow(targetWindow);
        logger.info("[deep-link] share import 等待 renderer ready", {
          windowId: targetWindow.webContents.id,
        });
        return true;
      }
      targetWindow.webContents.send(PlatformChannels.ShareImport, payload);
      focusDeepLinkTargetWindow(targetWindow);
      logger.info("[deep-link] share import 路由成功", {
        windowId: targetWindow.webContents.id,
      });
      return true;
    }
    enqueuePendingShareImport(payload);
    logger.info("[deep-link] share import 等待主窗口");
    return false;
  }

  // 官方 OAuth / 支付 deep link 已下线；kcode://oauth 与 kcode://payment 不再投递。
  logger.warn("[deep-link] 未识别的 deep link，已忽略", {
    host: parsedUrl.hostname,
    path: parsedUrl.pathname,
  });
  return false;
}

export function registerDeepLinkProtocol(
  logger: {
    info: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
  },
  options: { iconPath?: string } = {},
) {
  const scheme = "kcode";

  if (process.defaultApp && process.argv.length >= 2) {
    const entry = resolve(process.argv[1]!);
    const ok = app.setAsDefaultProtocolClient(scheme, process.execPath, [entry]);
    if (!ok) {
      logger.warn("[deep-link] 注册协议失败（defaultApp）", {
        scheme,
        execPath: process.execPath,
        entry: process.argv[1],
      });
    } else {
      logger.info("[deep-link] 注册协议成功（defaultApp）", {
        scheme,
        execPath: process.execPath,
        entry: process.argv[1],
      });
    }
    return;
  }

  const ok = app.setAsDefaultProtocolClient(scheme);
  if (!ok) {
    logger.warn("[deep-link] 注册协议失败", { scheme });
  } else {
    logger.info("[deep-link] 注册协议成功", { scheme });
  }

  if (process.platform === "linux" && app.isPackaged) {
    registerLinuxDeepLinkProtocol({
      executablePath: process.execPath,
      homeDir: app.getPath("home"),
      productName: app.name,
      iconSourcePath: options.iconPath,
      env: process.env,
      argv: process.argv,
      logger,
    });
  }
}

export function deliverPendingDeepLink(webContents: WebContents): void {
  rendererReadyWebContentsIds.add(webContents.id);

  const undeliveredShareImports: typeof pendingShareImports = [];
  for (const pending of pendingShareImports.splice(0)) {
    if (pending.targetWebContentsId == null || pending.targetWebContentsId === webContents.id) {
      webContents.send(PlatformChannels.ShareImport, { shareCode: pending.shareCode });
    } else {
      undeliveredShareImports.push(pending);
    }
  }
  pendingShareImports.push(...undeliveredShareImports);
  if (
    pendingOpenWorkspaceRequest &&
    (pendingOpenWorkspaceRequest.targetWebContentsId == null ||
      pendingOpenWorkspaceRequest.targetWebContentsId === webContents.id)
  ) {
    webContents.send(PlatformChannels.OpenWorkspacePath, pendingOpenWorkspaceRequest.path);
    pendingOpenWorkspaceRequest = null;
  }
}

export function clearOAuthRoutesForWindow(windowId: number): void {
  rendererReadyWebContentsIds.delete(windowId);
  if (pendingOpenWorkspaceRequest?.targetWebContentsId === windowId) {
    pendingOpenWorkspaceRequest = null;
  }
  for (let index = pendingShareImports.length - 1; index >= 0; index -= 1) {
    if (pendingShareImports[index]!.targetWebContentsId === windowId) {
      pendingShareImports.splice(index, 1);
    }
  }
}
