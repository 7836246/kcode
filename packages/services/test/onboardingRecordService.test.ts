import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { createOnboardingRecordService } from "../src/onboarding/onboardingRecordService.js";
import { getAppConfigDir, setDataBaseDir } from "../src/paths.js";

async function setup(options?: { hasStoredOccupation?: boolean; userId?: string | null }) {
  const dir = await mkdtemp(join(tmpdir(), "kcode-onboarding-record-"));
  setDataBaseDir(dir);
  await mkdir(getAppConfigDir(), { recursive: true });
  const service = createOnboardingRecordService({
    loadUserId: async () => options?.userId ?? null,
    loadHasStoredOccupation: async () => options?.hasStoredOccupation === true,
  });
  return { dir, service };
}

test("无记录且 settings 无职业时自动弹出", async () => {
  const { service } = await setup();
  assert.equal(await service.shouldOnboard(), true);
});

test("settings 已有职业的老用户不自动弹出", async () => {
  const { service } = await setup({ hasStoredOccupation: true });
  assert.equal(await service.shouldOnboard(), false);
});

test("当前身份已有记录不自动弹出", async () => {
  const { service } = await setup();
  await service.appendRecord("device-1", {
    occupation: "developer",
    interfaceMode: "coding",
    memoryEnabled: false,
    proactiveSuggestionsEnabled: false,
    completedAt: "2026-09-21T00:00:00.000Z",
  });
  assert.equal(await service.shouldOnboard(), false);
});

test("关闭自动引导后写入记录，重启不再弹出，且不覆盖已有作答", async () => {
  const { service } = await setup();
  await service.dismissAutoOnboarding("device-1");
  assert.equal(await service.shouldOnboard(), false);
  const dismissed = await service.getLatestEntry();
  assert.equal(dismissed?.occupation, null);
  assert.equal(dismissed?.interfaceMode, null);

  await service.appendRecord("device-1", {
    occupation: "developer",
    interfaceMode: "coding",
    memoryEnabled: true,
    proactiveSuggestionsEnabled: false,
    completedAt: "2026-09-21T01:00:00.000Z",
  });
  await service.dismissAutoOnboarding("device-1");
  const kept = await service.getLatestEntry();
  assert.equal(kept?.occupation, "developer");
  assert.equal(kept?.interfaceMode, "coding");
});
