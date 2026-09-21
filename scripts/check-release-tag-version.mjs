#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseReleaseTag } from "../packages/desktop/scripts/github-release-feed.mjs";

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export function readPackageVersion(packageJsonPath) {
  const parsed = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  if (typeof parsed.version !== "string" || parsed.version.trim() === "") {
    throw new Error(`missing version in ${packageJsonPath}`);
  }
  return parsed.version.trim();
}

export function assertReleaseTagMatchesPackageVersions(options) {
  const expected = parseReleaseTag(options.tag).version;
  if (options.rootVersion !== options.desktopVersion) {
    throw new Error(
      `root package.json version ${options.rootVersion} != @kcode/desktop ${options.desktopVersion}`,
    );
  }
  if (options.rootVersion !== expected) {
    throw new Error(`tag ${options.tag} != package.json version ${options.rootVersion}`);
  }
}

export function checkReleaseTagVersion(tag, root = workspaceRoot) {
  const rootVersion = readPackageVersion(resolve(root, "package.json"));
  const desktopVersion = readPackageVersion(resolve(root, "packages/desktop/package.json"));
  assertReleaseTagMatchesPackageVersions({
    tag,
    rootVersion,
    desktopVersion,
  });
  const parsed = parseReleaseTag(tag);
  return {
    tag: parsed.tag,
    version: rootVersion,
    prerelease: parsed.prerelease,
  };
}

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryHref === import.meta.url) {
  try {
    const result = checkReleaseTagVersion(process.argv[2]);
    console.log(
      `[release-version] tag=${result.tag} version=${result.version} prerelease=${result.prerelease}`,
    );
  } catch (error) {
    console.error(`[release-version] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
