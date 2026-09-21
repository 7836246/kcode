import assert from "node:assert/strict";
import test from "node:test";
import { readStoredTheme, resolveTheme } from "./theme.mjs";

test("只接受 light / dark 作为已存主题", () => {
  assert.equal(readStoredTheme("dark"), "dark");
  assert.equal(readStoredTheme("light"), "light");
  assert.equal(readStoredTheme("system"), null);
  assert.equal(readStoredTheme(null), null);
});

test("无记录时跟随系统", () => {
  assert.equal(resolveTheme(null, true), "dark");
  assert.equal(resolveTheme(null, false), "light");
  assert.equal(resolveTheme("light", true), "light");
});
