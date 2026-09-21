import assert from "node:assert/strict";
import test from "node:test";
import {
  detectDownloadTarget,
  fetchLatestReleaseTag,
  latestReleaseTag,
  linuxFormatUrl,
  parseReleaseBody,
  resolveChangelog,
  resolveReleaseDownloads,
} from "./releaseDownloads.mjs";

test("有 tag 时资产指向 GitHub Release 文件名", () => {
  const downloads = resolveReleaseDownloads("v0.0.1");
  assert.equal(downloads.version, "0.0.1");
  assert.equal(
    downloads.assets["mac-arm64"],
    "https://github.com/7836246/kcode/releases/download/v0.0.1/KCode-0.0.1-mac-arm64.dmg",
  );
  assert.doesNotMatch(downloads.assets["win-x64"], /zcode\.z\.ai/);
});

test("没有 tag 时全部退回 latest 页面", () => {
  const downloads = resolveReleaseDownloads(null);
  assert.equal(downloads.version, null);
  assert.equal(downloads.assets["mac-arm64"], downloads.latestPage);
});

test("按 UA 选择主下载目标", () => {
  assert.equal(detectDownloadTarget("Macintosh; Intel Mac OS X", "MacIntel"), "mac-x64");
  assert.equal(detectDownloadTarget("Macintosh; ARM Mac OS X", "MacIntel"), "mac-arm64");
  assert.equal(detectDownloadTarget("Windows NT 10.0; Win64; x64", "Win32"), "win-x64");
  assert.equal(detectDownloadTarget("Linux aarch64", "Linux"), "linux-arm64");
});

test("Linux 格式链接与主 AppImage 使用同一版本", () => {
  const downloads = resolveReleaseDownloads("v0.0.1");
  assert.equal(
    linuxFormatUrl(downloads, "linux-x64", "deb"),
    "https://github.com/7836246/kcode/releases/download/v0.0.1/KCode-0.0.1-linux-x64.deb",
  );
});

test("latest tag 读取失败时保持空，不编造版本", async () => {
  const tag = await fetchLatestReleaseTag(async () => {
    throw new Error("offline");
  });
  assert.equal(tag, null);
});

test("changelog 从 GitHub Releases 投影，跳过 draft", () => {
  const entries = resolveChangelog([
    {
      tag_name: "v0.0.2",
      name: "v0.0.2",
      draft: false,
      published_at: "2026-09-21T09:05:10Z",
      html_url: "https://github.com/7836246/kcode/releases/tag/v0.0.2",
      body: "## 新功能\n- 官网增加更新日志\n\n## 问题修复\n- 浅色模式按钮对比度",
    },
    { tag_name: "v0.0.1-draft", draft: true, body: "- 不该出现" },
    { tag_name: "  " },
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].version, "0.0.2");
  assert.deepEqual(
    entries[0].sections.map((section) => section.title),
    ["新功能", "问题修复"],
  );
  assert.deepEqual(entries[0].sections[0].items, ["官网增加更新日志"]);
  assert.equal(latestReleaseTag([{ draft: true, tag_name: "v9" }, { tag_name: "v0.0.2" }]), "v0.0.2");
  assert.deepEqual(resolveChangelog(null), []);
});

test("release body 无标题时收成段落，不编造分组", () => {
  const sections = parseReleaseBody("**Full Changelog**: https://github.com/7836246/kcode/commits/v0.0.1");
  assert.equal(sections.length, 1);
  assert.equal(sections[0].title, null);
  assert.deepEqual(sections[0].paragraphs, ["Full Changelog: https://github.com/7836246/kcode/commits/v0.0.1"]);
});
