#!/usr/bin/env node
// 编译 macOS 窗口 bounds 辅助程序（CUA 权限浮窗的吸附数据源）。
//
// 非 darwin 直接跳过：这个二进制只服务 macOS 的 TCC 授权引导，其他平台没有对应流程。
// 缺少 swiftc（未装 Xcode CLT）时也只警告不失败 —— 吸附是观感增强，拿不到 bounds 时浮窗
// 会 fail-open 到屏幕底部照样可用，不该因此让整个 desktop 构建挂掉。

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(packageRoot, "native", "macos-window-bounds", "main.swift");
const outputDir = join(packageRoot, "resources", "macos-window-bounds");
const outputPath = join(outputDir, "kcode-window-bounds");

if (process.platform !== "darwin") {
  console.log("[window-bounds] 跳过：仅 macOS 需要");
  process.exit(0);
}

if (!existsSync(sourcePath)) {
  console.error(`[window-bounds] 源文件缺失：${sourcePath}`);
  process.exit(1);
}

function hasSwiftc() {
  try {
    execFileSync("xcrun", ["--find", "swiftc"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasSwiftc()) {
  console.warn("[window-bounds] 未找到 swiftc（需 Xcode Command Line Tools）；跳过构建。");
  console.warn("[window-bounds] 权限浮窗仍可用，但不会吸附到系统设置窗口。");
  process.exit(0);
}

mkdirSync(outputDir, { recursive: true });

// 逐片构建再 lipo 合并，而不是一次失败就整体放弃。
// 交叉编译到 x86_64 需要 toolchain 自带的 Swift 向后兼容库（libswiftCompatibility*.a）；只装了
// Command Line Tools 的机器上这些 .a 可能仅有 arm64，链接必然失败（ld: fat file missing arch
// 'x86_64'），这不是本仓库能修的问题。此时退化成宿主架构单架构二进制：产物路径仍然存在，
// dev 链路（ensure-local-runtime-assets）不再每次启动重跑本脚本，本机吸附能力也不会丢。
const SLICES = [
  { name: "arm64", target: "arm64-apple-macos11" },
  { name: "x86_64", target: "x86_64-apple-macos11" },
];
const slicePath = (name) => `${outputPath}-${name}`;

const builtSlices = [];
const failures = [];

for (const slice of SLICES) {
  try {
    execFileSync(
      "xcrun",
      ["swiftc", "-O", "-target", slice.target, sourcePath, "-o", slicePath(slice.name)],
      { stdio: "inherit" },
    );
    builtSlices.push(slice);
  } catch (error) {
    failures.push({ slice, error });
  }
}

function warnFailures() {
  for (const { slice, error } of failures) {
    console.warn(
      `[window-bounds] ${slice.name} 构建失败（${slice.target}）：`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

try {
  if (builtSlices.length === SLICES.length) {
    // 同时产出 arm64 与 x86_64 的 universal 二进制，避免发布包在另一架构上无法执行。
    execFileSync(
      "lipo",
      ["-create", ...SLICES.map((slice) => slicePath(slice.name)), "-output", outputPath],
      { stdio: "inherit" },
    );
    console.log(`[window-bounds] 已构建 universal 二进制：${outputPath}`);
  } else if (builtSlices.length === 1) {
    renameSync(slicePath(builtSlices[0].name), outputPath);
    console.warn(
      `[window-bounds] 仅构建出 ${builtSlices[0].name} 单架构二进制：${outputPath}；`,
      "发布包若需覆盖另一架构，请在完整 Xcode（含双架构 Swift 兼容库）下重新构建。",
    );
    warnFailures();
  } else {
    console.warn("[window-bounds] 构建失败；权限浮窗仍可用但不会吸附。");
    warnFailures();
  }
} finally {
  // 中间 slice 不进 Git 也不该留在 resources 里（失败路径曾把 -arm64 残片留在原地）。
  for (const slice of SLICES) {
    rmSync(slicePath(slice.name), { force: true });
  }
}
process.exit(0);
