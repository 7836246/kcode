import assert from "node:assert/strict";
import test from "node:test";
import {
  WORKSPACE_SHELL_PANEL_RADIUS_PX,
  resolveWorkspaceShellPanelRadiusPx,
  resolveWorkspaceShellResizeHandleInsetPx,
  resolveWorkspaceShellWindowChromeClass,
} from "../src/app-shell/workspaceShellWindowChrome.js";

test("桌面内容卡半径各平台统一为 16px", () => {
  assert.equal(WORKSPACE_SHELL_PANEL_RADIUS_PX, 16);
  assert.equal(resolveWorkspaceShellPanelRadiusPx({ isWindowsDesktop: true }), 16);
  assert.equal(
    resolveWorkspaceShellPanelRadiusPx({ isMacDesktop: true, macOSMajorVersion: 15 }),
    16,
  );
  assert.equal(
    resolveWorkspaceShellPanelRadiusPx({ isMacDesktop: true, macOSMajorVersion: 26 }),
    16,
  );
  assert.equal(resolveWorkspaceShellPanelRadiusPx({ isLinuxDesktop: true }), 16);
  assert.equal(resolveWorkspaceShellResizeHandleInsetPx({ isWindowsDesktop: true }), 20);
});

test("桌面内容卡 class 使用 2xl 完整四角", () => {
  const chromeClass = resolveWorkspaceShellWindowChromeClass({
    isWindowsDesktop: true,
    isWindowsMaximized: true,
    supportsNativeRoundedCorners: false,
  });
  assert.equal(chromeClass.includes("rounded-2xl"), true);
  assert.equal(chromeClass.includes("rounded-l-"), false);
  assert.equal(chromeClass.includes("rounded-[5px]"), false);
});
