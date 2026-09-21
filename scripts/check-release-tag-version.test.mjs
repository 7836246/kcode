import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  assertReleaseTagMatchesPackageVersions,
  checkReleaseTagVersion,
} from "./check-release-tag-version.mjs";

test("tag 去掉 v 后必须等于根目录和 desktop 的 version", () => {
  assert.deepEqual(
    assertReleaseTagMatchesPackageVersions({
      tag: "v0.0.1",
      rootVersion: "0.0.1",
      desktopVersion: "0.0.1",
    }),
    undefined,
  );
});

test("tag 与 package.json 不一致时失败", () => {
  assert.throws(
    () =>
      assertReleaseTagMatchesPackageVersions({
        tag: "v0.0.2",
        rootVersion: "0.0.1",
        desktopVersion: "0.0.1",
      }),
    /tag v0.0.2 != package.json version 0.0.1/,
  );
});

test("根目录与 desktop version 不一致时失败", () => {
  assert.throws(
    () =>
      assertReleaseTagMatchesPackageVersions({
        tag: "v0.0.1",
        rootVersion: "0.0.1",
        desktopVersion: "0.0.2",
      }),
    /root package.json version 0.0.1 != @kcode\/desktop 0.0.2/,
  );
});

test("分支名不能当发版 tag", () => {
  assert.throws(
    () =>
      assertReleaseTagMatchesPackageVersions({
        tag: "main",
        rootVersion: "0.0.1",
        desktopVersion: "0.0.1",
      }),
    /release tag must look like v0.0.1/,
  );
});

test("读取真实 package.json 并接受当前仓库版本", async () => {
  const root = join(tmpdir(), `kcode-release-tag-${Date.now()}`);
  await mkdir(join(root, "packages/desktop"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ version: "1.2.3" }));
  await writeFile(
    join(root, "packages/desktop/package.json"),
    JSON.stringify({ version: "1.2.3" }),
  );
  assert.deepEqual(checkReleaseTagVersion("v1.2.3", root), {
    tag: "v1.2.3",
    version: "1.2.3",
    prerelease: false,
  });
});

test("带连字符的 tag 在 version 对齐时标为 prerelease", async () => {
  const root = join(tmpdir(), `kcode-release-tag-pre-${Date.now()}`);
  await mkdir(join(root, "packages/desktop"), { recursive: true });
  await writeFile(join(root, "package.json"), JSON.stringify({ version: "1.2.3-preview.1" }));
  await writeFile(
    join(root, "packages/desktop/package.json"),
    JSON.stringify({ version: "1.2.3-preview.1" }),
  );
  assert.deepEqual(checkReleaseTagVersion("v1.2.3-preview.1", root), {
    tag: "v1.2.3-preview.1",
    version: "1.2.3-preview.1",
    prerelease: true,
  });
});
