import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  buildAgentsMdLead,
  parseManagedSystemRoleEnabledEnv,
  readManagedSystemRole,
  readManagedSystemRoleEnabled,
  resolveManagedSystemRolePath,
  stripChatMlSystemWrapper,
} from "./managed-system-role.js";

test("受管路径默认落在 ~/.kcode/system-role.md", () => {
  assert.equal(
    resolveManagedSystemRolePath({ HOME: "/tmp/kcode-home" }),
    "/tmp/kcode-home/.kcode/system-role.md",
  );
});

test("KCODE_SYSTEM_ROLE_FILE 覆盖默认路径", () => {
  assert.equal(
    resolveManagedSystemRolePath({
      HOME: "/tmp/kcode-home",
      KCODE_SYSTEM_ROLE_FILE: "/opt/role.md",
    }),
    "/opt/role.md",
  );
});

test("清洗 ChatML system 外壳", () => {
  assert.equal(
    stripChatMlSystemWrapper("<|im_start|>system\nYou are KCode.<|im_end|>"),
    "You are KCode.",
  );
});

test("自定义 system prompt 时 AGENTS.md 不再覆盖身份", () => {
  assert.match(buildAgentsMdLead(false), /OVERRIDE any default behavior/);
  assert.match(buildAgentsMdLead(true), /do not override the custom system prompt/);
});

test("开关默认关闭，环境变量可覆盖", () => {
  assert.equal(readManagedSystemRoleEnabled({ HOME: "/tmp/kcode-home" }), false);
  assert.equal(parseManagedSystemRoleEnabledEnv("true"), true);
  assert.equal(parseManagedSystemRoleEnabledEnv("off"), false);
  assert.equal(
    readManagedSystemRoleEnabled({
      HOME: "/tmp/kcode-home",
      KCODE_SYSTEM_ROLE_ENABLED: "1",
    }),
    true,
  );
  assert.equal(
    readManagedSystemRole({
      HOME: "/tmp/kcode-home",
      KCODE_SYSTEM_ROLE_ENABLED: "1",
    }),
    undefined,
  );
});

test("仅开关打开且正文非空时才注入", () => {
  const home = mkdtempSync(join(tmpdir(), "kcode-system-role-"));
  const dir = join(home, ".kcode");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "system-role.md"), "You are the custom role.\n", "utf8");
  writeFileSync(join(dir, "system-role.json"), `${JSON.stringify({ enabled: true })}\n`, "utf8");

  assert.equal(readManagedSystemRole({ HOME: home }), "You are the custom role.");
  assert.equal(readManagedSystemRole({ HOME: home, KCODE_SYSTEM_ROLE_ENABLED: "0" }), undefined);
});
