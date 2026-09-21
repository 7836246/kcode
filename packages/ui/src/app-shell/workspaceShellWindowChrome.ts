interface WorkspaceShellWindowChromeOptions {
  isMacDesktop?: boolean;
  isWindowsDesktop?: boolean;
  isLinuxDesktop?: boolean;
  macOSMajorVersion?: number | null;
  isWindowsMaximized: boolean;
  supportsNativeRoundedCorners: boolean | null;
}

type WorkspaceShellPlatformRadiusOptions = Pick<
  WorkspaceShellWindowChromeOptions,
  "isMacDesktop" | "isWindowsDesktop" | "isLinuxDesktop" | "macOSMajorVersion"
>;

/** 桌面内容卡半径：ChatGPT 那种悬浮白卡，各平台统一 16px。 */
export const WORKSPACE_SHELL_PANEL_RADIUS_PX = 16;

export function resolveWorkspaceShellPanelRadiusPx(
  _options?: WorkspaceShellPlatformRadiusOptions,
): number {
  return WORKSPACE_SHELL_PANEL_RADIUS_PX;
}

export function resolveWorkspaceShellResizeHandleInsetPx(
  options?: WorkspaceShellPlatformRadiusOptions,
): number {
  return resolveWorkspaceShellPanelRadiusPx(options) + 4;
}

export function resolveWorkspaceShellWindowChromeClass(
  _options?: WorkspaceShellWindowChromeOptions,
): string {
  // 卡已内缩 4px，不再承担系统窗口外沿；Windows 10 也画完整四角。
  return "rounded-2xl border border-border";
}
