import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  collectGitHubReleaseAssets,
  mergeElectronUpdateManifests,
  parseElectronUpdateManifest,
} from "./collect-github-release-assets.mjs";

test("合并同版本不同 arch 的 latest-mac.yml", () => {
  const merged = mergeElectronUpdateManifests([
    {
      version: "0.0.1",
      path: "KCode-0.0.1-mac-arm64.zip",
      sha512: "arm",
      releaseDate: "2026-01-01T00:00:00.000Z",
      files: [
        { url: "KCode-0.0.1-mac-arm64.zip", sha512: "arm", size: 10 },
        { url: "KCode-0.0.1-mac-arm64.dmg", sha512: "arm-dmg", size: 11 },
      ],
    },
    {
      version: "0.0.1",
      path: "KCode-0.0.1-mac-x64.zip",
      sha512: "x64",
      releaseDate: "2026-01-02T00:00:00.000Z",
      files: [{ url: "KCode-0.0.1-mac-x64.zip", sha512: "x64", size: 12 }],
    },
  ]);

  assert.equal(merged.version, "0.0.1");
  assert.equal(merged.path, "KCode-0.0.1-mac-arm64.zip");
  assert.equal(merged.sha512, "arm");
  assert.equal(merged.releaseDate, "2026-01-02T00:00:00.000Z");
  assert.equal(merged.files.length, 3);
});

test("版本不一致的 manifest 不能合并", () => {
  assert.throws(
    () =>
      mergeElectronUpdateManifests([
        { version: "0.0.1", files: [{ url: "a.zip" }] },
        { version: "0.0.2", files: [{ url: "b.zip" }] },
      ]),
    /cannot merge update manifests/,
  );
});

test("Linux arm64 清单单独保留，不并进 latest-linux.yml", async () => {
  const root = join(tmpdir(), `kcode-release-linux-manifest-${Date.now()}`);
  const linuxX64 = join(root, "in", "kcode-linux-x64");
  const linuxArm = join(root, "in", "kcode-linux-arm64");
  const out = join(root, "out");
  await mkdir(linuxX64, { recursive: true });
  await mkdir(linuxArm, { recursive: true });
  await writeFile(
    join(linuxX64, "latest-linux.yml"),
    "version: 0.0.2\npath: KCode-0.0.2-linux-x86_64.AppImage\nfiles:\n  - url: KCode-0.0.2-linux-x86_64.AppImage\n    sha512: x64\n",
  );
  await writeFile(
    join(linuxArm, "latest-linux-arm64.yml"),
    "version: 0.0.2\npath: KCode-0.0.2-linux-arm64.AppImage\nfiles:\n  - url: KCode-0.0.2-linux-arm64.AppImage\n    sha512: arm\n",
  );

  const result = collectGitHubReleaseAssets(join(root, "in"), out);
  assert.equal(result.merged.includes("latest-linux.yml"), true);
  assert.equal(result.merged.includes("latest-linux-arm64.yml"), true);
  const x64 = parseElectronUpdateManifest(await readFile(join(out, "latest-linux.yml"), "utf8"));
  const arm = parseElectronUpdateManifest(await readFile(join(out, "latest-linux-arm64.yml"), "utf8"));
  assert.equal(x64.files.length, 1);
  assert.equal(x64.files[0].url, "KCode-0.0.2-linux-x86_64.AppImage");
  assert.equal(arm.files.length, 1);
  assert.equal(arm.files[0].url, "KCode-0.0.2-linux-arm64.AppImage");
});

test("收集分目录产物并写出合并后的 latest.yml", async () => {
  const root = join(tmpdir(), `kcode-release-assets-${Date.now()}`);
  const winX64 = join(root, "in", "kcode-win-x64");
  const winArm = join(root, "in", "kcode-win-arm64");
  const out = join(root, "out");
  await mkdir(winX64, { recursive: true });
  await mkdir(winArm, { recursive: true });
  await writeFile(join(winX64, "KCode-0.0.1-win-x64.exe"), "x64");
  await writeFile(join(winArm, "KCode-0.0.1-win-arm64.exe"), "arm");
  await writeFile(
    join(winX64, "latest.yml"),
    "version: 0.0.1\npath: KCode-0.0.1-win-x64.exe\nfiles:\n  - url: KCode-0.0.1-win-x64.exe\n    sha512: x64\n",
  );
  await writeFile(
    join(winArm, "latest.yml"),
    "version: 0.0.1\npath: KCode-0.0.1-win-arm64.exe\nfiles:\n  - url: KCode-0.0.1-win-arm64.exe\n    sha512: arm\n",
  );

  const result = collectGitHubReleaseAssets(join(root, "in"), out);
  assert.deepEqual(result.merged, ["latest.yml"]);
  const merged = parseElectronUpdateManifest(await readFile(join(out, "latest.yml"), "utf8"));
  assert.equal(merged.files.length, 2);
  assert.equal(await readFile(join(out, "KCode-0.0.1-win-x64.exe"), "utf8"), "x64");
  assert.equal(await readFile(join(out, "KCode-0.0.1-win-arm64.exe"), "utf8"), "arm");
});
