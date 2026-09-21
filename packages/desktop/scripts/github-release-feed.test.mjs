import assert from "node:assert/strict";
import test from "node:test";
import {
  buildElectronBuilderPublish,
  parseReleaseTag,
  resolveDesktopUpdateFeed,
  toElectronUpdaterFeedURL,
} from "./github-release-feed.mjs";

test("正式包默认走 GitHub Releases，preview 只打开 prerelease", () => {
  assert.deepEqual(resolveDesktopUpdateFeed({ isPackaged: true, receivePreviewUpdates: false }), {
    provider: "github",
    owner: "7836246",
    repo: "kcode",
    allowPrerelease: false,
  });
  assert.equal(
    resolveDesktopUpdateFeed({ isPackaged: true, receivePreviewUpdates: true }).allowPrerelease,
    true,
  );
});

test("正式包忽略更新源覆盖", () => {
  assert.equal(
    resolveDesktopUpdateFeed({
      isPackaged: true,
      receivePreviewUpdates: false,
      overrideUrl: "http://127.0.0.1:8081",
    }).provider,
    "github",
  );
});

test("未打包开发构建可以使用 generic URL", () => {
  assert.deepEqual(
    resolveDesktopUpdateFeed({
      isPackaged: false,
      receivePreviewUpdates: false,
      overrideUrl: "http://127.0.0.1:8081",
    }),
    {
      provider: "generic",
      url: "http://127.0.0.1:8081",
      allowPrerelease: false,
    },
  );
});

test("electron-builder publish 与运行时 GitHub feed 指向同一仓库", () => {
  assert.deepEqual(buildElectronBuilderPublish(), {
    provider: "github",
    owner: "7836246",
    repo: "kcode",
    releaseType: "release",
    vPrefixedTagName: true,
  });
  assert.deepEqual(
    toElectronUpdaterFeedURL({
      provider: "github",
      owner: "7836246",
      repo: "kcode",
      allowPrerelease: false,
    }),
    {
      provider: "github",
      owner: "7836246",
      repo: "kcode",
    },
  );
});

test("含连字符的 tag 视为 preview release", () => {
  assert.equal(parseReleaseTag("v0.0.2-preview.1").prerelease, true);
  assert.equal(parseReleaseTag("v0.0.2").prerelease, false);
});
