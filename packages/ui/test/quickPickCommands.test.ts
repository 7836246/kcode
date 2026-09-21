import assert from "node:assert/strict";
import test from "node:test";
import { createQuickPickCommands } from "../src/quickpick/quickPickCommands.js";

function createHandlers() {
  return {
    createTask: () => undefined,
    openWorkspace: () => undefined,
    openSettings: () => undefined,
    openSkillsSettings: () => undefined,
    openMcpSettings: () => undefined,
    switchTheme: () => undefined,
    logout: () => undefined,
    toggleSidebar: () => undefined,
    toggleTerminal: () => undefined,
    togglePreview: () => undefined,
    openTerminalTab: () => undefined,
    openBrowserTab: () => undefined,
    openReviewTab: () => undefined,
  };
}

test("命令面板不再提供登录或官方文档/社群/反馈入口", () => {
  const commands = createQuickPickCommands({
    allowOpenWorkspace: true,
    isSidebarVisible: true,
    isLoggedIn: false,
    themeTarget: "dark",
    shortcuts: {
      newTask: "",
      openWorkspace: "",
      toggleSidebar: "",
      toggleTerminal: "",
    },
    handlers: createHandlers(),
  });

  const ids = commands.map((command) => command.id);
  assert.equal(ids.includes("login"), false);
  assert.equal(ids.includes("feedback"), false);
  assert.equal(ids.includes("community"), false);
  assert.equal(ids.includes("product-docs"), false);
  assert.equal(ids.includes("logout"), false);
});
