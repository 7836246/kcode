import assert from "node:assert/strict";
import test from "node:test";
import { docsPath, parseSitePath } from "./siteRoute.mjs";

test("首页与文档路径", () => {
  assert.deepEqual(parseSitePath("/"), { page: "home" });
  assert.deepEqual(parseSitePath("/docs"), { page: "docs", slug: "welcome" });
  assert.deepEqual(parseSitePath("/docs/install/"), { page: "docs", slug: "install" });
  assert.deepEqual(parseSitePath("/changelog"), { page: "changelog" });
  assert.deepEqual(parseSitePath("/unknown"), { page: "home" });
});

test("welcome 用短路径", () => {
  assert.equal(docsPath("welcome"), "/docs");
  assert.equal(docsPath("install"), "/docs/install");
});
