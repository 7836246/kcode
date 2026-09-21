import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  persistManagedSystemRoleProjection,
  readManagedSystemRoleContent,
  writeManagedSystemRoleContent,
} from "../src/setting/managedSystemRoleProjection.js";

test("开启开关时写入投影，并在正文缺失时补默认模板", async () => {
  const home = await mkdtemp(join(tmpdir(), "kcode-system-role-proj-"));
  const previousHome = process.env.KCODE_DESKTOP_HOME_DIR;
  process.env.KCODE_DESKTOP_HOME_DIR = home;
  try {
    await persistManagedSystemRoleProjection(true);
    const state = JSON.parse(
      await readFile(join(home, ".kcode", "system-role.json"), "utf8"),
    ) as { enabled?: boolean };
    const role = await readFile(join(home, ".kcode", "system-role.md"), "utf8");
    assert.equal(state.enabled, true);
    assert.match(role, /You are KCode, the coding agent on this machine/);

    await persistManagedSystemRoleProjection(false);
    const disabled = JSON.parse(
      await readFile(join(home, ".kcode", "system-role.json"), "utf8"),
    ) as { enabled?: boolean };
    const kept = await readFile(join(home, ".kcode", "system-role.md"), "utf8");
    assert.equal(disabled.enabled, false);
    assert.equal(kept, role);

    await writeManagedSystemRoleContent("You are a custom preview role.\n");
    assert.equal(await readManagedSystemRoleContent(), "You are a custom preview role.\n");
  } finally {
    if (previousHome === undefined) {
      delete process.env.KCODE_DESKTOP_HOME_DIR;
    } else {
      process.env.KCODE_DESKTOP_HOME_DIR = previousHome;
    }
  }
});
