import assert from "node:assert/strict";
import test from "node:test";
import { planReleaseSigning } from "./release-signing-plan.mjs";

const macEnv = {
  APPLE_SIGNING_IDENTITY: "Developer ID Application: KCode (TEAMID)",
  CSC_LINK: "Y2VydA==",
  CSC_KEY_PASSWORD: "secret",
  APPLE_ID: "dev@example.com",
  APPLE_APP_SPECIFIC_PASSWORD: "app-password",
  APPLE_TEAM_ID: "TEAMID",
};

const winEnv = {
  WIN_CSC_LINK: "Y2VydA==",
  WIN_CSC_KEY_PASSWORD: "secret",
};

test("没有证书时保持未签名", () => {
  assert.deepEqual(planReleaseSigning({}, "mac"), {
    macSign: false,
    winSign: false,
    warning: "",
  });
  assert.deepEqual(planReleaseSigning({}, "linux"), {
    macSign: false,
    winSign: false,
    warning: "",
  });
});

test("macOS 材料齐全才签名并公证", () => {
  assert.equal(planReleaseSigning(macEnv, "mac").macSign, true);
  assert.equal(planReleaseSigning(macEnv, "win").macSign, false);
});

test("macOS 只配了一部分时不签名并指出缺的名字", () => {
  const plan = planReleaseSigning({ APPLE_ID: "dev@example.com" }, "mac");
  assert.equal(plan.macSign, false);
  assert.match(plan.warning, /APPLE_SIGNING_IDENTITY/);
  assert.match(plan.warning, /CSC_LINK/);
});

test("Windows 材料齐全才签名", () => {
  assert.equal(planReleaseSigning(winEnv, "win").winSign, true);
  const partial = planReleaseSigning({ WIN_CSC_LINK: "Y2VydA==" }, "win");
  assert.equal(partial.winSign, false);
  assert.match(partial.warning, /WIN_CSC_KEY_PASSWORD/);
});
