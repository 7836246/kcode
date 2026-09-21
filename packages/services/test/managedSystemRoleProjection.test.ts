import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  createManagedSystemRolePreset,
  deleteManagedSystemRolePreset,
  DEFAULT_MANAGED_SYSTEM_ROLE,
  listManagedSystemRolePresets,
  loadManagedSystemRoleEditorContent,
  persistManagedSystemRoleProjection,
  readManagedSystemRoleContent,
  resolveSelectedPresetId,
  UNRESTRICTED_MANAGED_SYSTEM_ROLE,
  UNRESTRICTED_MANAGED_SYSTEM_ROLE_PRESET_ID,
  updateManagedSystemRolePreset,
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

    const listed = await listManagedSystemRolePresets();
    assert.equal(listed[0]?.id, "default");
    assert.equal(listed[0]?.content, DEFAULT_MANAGED_SYSTEM_ROLE);
    assert.equal(listed[1]?.id, UNRESTRICTED_MANAGED_SYSTEM_ROLE_PRESET_ID);
    assert.equal(listed[1]?.content, UNRESTRICTED_MANAGED_SYSTEM_ROLE);

    const created = await createManagedSystemRolePreset({
      name: "夜间重构",
      content: "You are a night shift role.\n",
    });
    assert.equal(created.kind, "custom");
    const afterCreate = await listManagedSystemRolePresets();
    assert.equal(afterCreate.some((preset) => preset.id === created.id), true);
    await deleteManagedSystemRolePreset(created.id);
    const afterDelete = await listManagedSystemRolePresets();
    assert.equal(afterDelete.some((preset) => preset.id === created.id), false);
    await assert.rejects(() => deleteManagedSystemRolePreset("default"));

    const snapshot = await loadManagedSystemRoleEditorContent();
    assert.equal(snapshot.unrestrictedTemplate, UNRESTRICTED_MANAGED_SYSTEM_ROLE);
    assert.ok(snapshot.presets.length >= 2);

    const sameContentCustom = await createManagedSystemRolePreset({
      name: "默认副本",
      content: DEFAULT_MANAGED_SYSTEM_ROLE,
    });
    const presets = await listManagedSystemRolePresets();
    assert.equal(
      resolveSelectedPresetId(presets, DEFAULT_MANAGED_SYSTEM_ROLE),
      null,
    );
    assert.equal(
      resolveSelectedPresetId(presets, DEFAULT_MANAGED_SYSTEM_ROLE, sameContentCustom.id),
      sameContentCustom.id,
    );
    await writeManagedSystemRoleContent(DEFAULT_MANAGED_SYSTEM_ROLE, {
      presetId: sameContentCustom.id,
    });
    await persistManagedSystemRoleProjection(true);
    const afterToggle = await loadManagedSystemRoleEditorContent();
    assert.equal(afterToggle.presetId, sameContentCustom.id);
    const keptSelection = JSON.parse(
      await readFile(join(home, ".kcode", "system-role.json"), "utf8"),
    ) as { enabled?: boolean; presetId?: string };
    assert.equal(keptSelection.enabled, true);
    assert.equal(keptSelection.presetId, sameContentCustom.id);
    const updated = await updateManagedSystemRolePreset({
      id: sameContentCustom.id,
      content: "You are an updated custom role.\n",
    });
    assert.equal(updated.content, "You are an updated custom role.\n");
    const listedUpdated = await listManagedSystemRolePresets();
    assert.equal(
      listedUpdated.find((preset) => preset.id === sameContentCustom.id)?.content,
      "You are an updated custom role.\n",
    );
    await assert.rejects(() =>
      updateManagedSystemRolePreset({ id: "default", content: "nope\n" }),
    );
  } finally {
    if (previousHome === undefined) {
      delete process.env.KCODE_DESKTOP_HOME_DIR;
    } else {
      process.env.KCODE_DESKTOP_HOME_DIR = previousHome;
    }
  }
});
