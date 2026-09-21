import assert from "node:assert/strict";
import test from "node:test";
import { readStoredTheme, resolveTheme } from "./theme.mjs";

test("只接受 light / dark 作为已存主题", () => {
  assert.equal(readStoredTheme("dark"), "dark");
  assert.equal(readStoredTheme("light"), "light");
  assert.equal(readStoredTheme("system"), null);
  assert.equal(readStoredTheme(null), null);
});

test("无记录时默认夜间", () => {
  assert.equal(resolveTheme(null), "dark");
  assert.equal(resolveTheme("system"), "dark");
  assert.equal(resolveTheme("light"), "light");
});
