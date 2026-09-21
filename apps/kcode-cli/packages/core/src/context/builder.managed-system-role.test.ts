import assert from "node:assert/strict";
import test from "node:test";
import { createContextBuilder } from "./builder.js";

const envInfo = {
  cwd: "/tmp/workspace",
  platform: "darwin",
  shell: "/bin/zsh",
  osVersion: "25.6.0",
  nodeVersion: "24.16.0",
};

test("自定义 system-role 时不再前置默认 You are KCode", () => {
  const result = createContextBuilder({
    workingDirectory: "/tmp/workspace",
    envInfo,
    customSystemPrompt: "You are the custom role.",
  }).build();

  const sources = result.sections.map((section) => section.source);
  const systemText = result.systemMessages
    .map((message) => (typeof message.content === "string" ? message.content : ""))
    .join("\n");

  assert.equal(sources.includes("cli_prefix"), false);
  assert.equal(sources.includes("identity"), false);
  assert.equal(sources.includes("custom_system_prompt"), true);
  assert.match(systemText, /You are the custom role/);
  assert.doesNotMatch(systemText, /You are KCode, an interactive coding agent/);
});
