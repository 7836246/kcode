#!/usr/bin/env node

import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const UPDATE_MANIFEST_NAMES = new Set(["latest.yml", "latest-mac.yml", "latest-linux.yml"]);

function unquoteYamlScalar(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseYamlScalar(value) {
  const raw = unquoteYamlScalar(value);
  if (raw !== "" && /^-?\d+$/.test(raw)) {
    return Number(raw);
  }
  return raw;
}

export function parseElectronUpdateManifest(text) {
  const result = {
    files: [],
  };
  let currentFile = null;

  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.trim() === "" || rawLine.trim().startsWith("#")) {
      continue;
    }

    const fileItem = rawLine.match(/^\s+-\s+url:\s*(.+)$/);
    if (fileItem?.[1]) {
      currentFile = { url: String(parseYamlScalar(fileItem[1])) };
      result.files.push(currentFile);
      continue;
    }

    const fileField = rawLine.match(/^\s+(sha512|sha2|size):\s*(.+)$/);
    if (fileField?.[1] && fileField[2] && currentFile) {
      currentFile[fileField[1]] = parseYamlScalar(fileField[2]);
      continue;
    }

    const top = rawLine.match(/^(version|path|sha512|releaseDate):\s*(.+)$/);
    if (top?.[1] && top[2]) {
      currentFile = null;
      result[top[1]] = parseYamlScalar(top[2]);
      continue;
    }
  }

  if (typeof result.version !== "string" || result.version.trim() === "") {
    throw new Error("invalid electron update manifest: missing version");
  }

  if (result.files.length === 0 && typeof result.path === "string") {
    result.files.push({
      url: result.path,
      ...(typeof result.sha512 === "string" ? { sha512: result.sha512 } : {}),
    });
  }

  return {
    ...result,
    version: result.version.trim(),
  };
}

export function stringifyElectronUpdateManifest(manifest) {
  const lines = [`version: ${manifest.version}`, "files:"];
  for (const file of manifest.files) {
    lines.push(`  - url: ${file.url}`);
    if (typeof file.sha512 === "string") {
      lines.push(`    sha512: ${file.sha512}`);
    }
    if (typeof file.sha2 === "string") {
      lines.push(`    sha2: ${file.sha2}`);
    }
    if (typeof file.size === "number") {
      lines.push(`    size: ${file.size}`);
    }
  }
  if (typeof manifest.path === "string") {
    lines.push(`path: ${manifest.path}`);
  }
  if (typeof manifest.sha512 === "string") {
    lines.push(`sha512: ${manifest.sha512}`);
  }
  if (typeof manifest.releaseDate === "string") {
    lines.push(`releaseDate: '${manifest.releaseDate}'`);
  }
  return `${lines.join("\n")}\n`;
}

function listFilesRecursive(rootDir) {
  const files = [];
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        queue.push(fullPath);
        continue;
      }
      if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }
  return files;
}

function readUpdateManifest(filePath) {
  try {
    return parseElectronUpdateManifest(readFileSync(filePath, "utf8"));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`invalid electron update manifest: ${filePath}: ${message}`);
  }
}

function pickPrimaryUpdatePath(files, currentPath) {
  const urls = files.map((file) => file.url);
  return (
    urls.find((url) => url.endsWith(".zip")) ??
    urls.find((url) => url.endsWith(".exe")) ??
    urls.find((url) => url.endsWith(".AppImage")) ??
    currentPath ??
    urls[0]
  );
}

export function mergeElectronUpdateManifests(manifests) {
  if (manifests.length === 0) {
    throw new Error("no electron update manifests to merge");
  }

  const version = manifests[0]?.version;
  if (!version) {
    throw new Error("no electron update manifests to merge");
  }
  const filesByUrl = new Map();
  let releaseDate = manifests[0].releaseDate;

  for (const manifest of manifests) {
    if (manifest.version !== version) {
      throw new Error(`cannot merge update manifests ${manifest.version} and ${version}`);
    }
    if (typeof manifest.releaseDate === "string" && manifest.releaseDate > (releaseDate ?? "")) {
      releaseDate = manifest.releaseDate;
    }
    for (const file of manifest.files) {
      filesByUrl.set(file.url, file);
    }
  }

  const files = [...filesByUrl.values()];
  if (files.length === 0) {
    throw new Error(`merged update manifest ${version} has no files`);
  }

  const path = pickPrimaryUpdatePath(files, manifests[0].path);
  const primary = files.find((file) => file.url === path);

  return {
    version,
    files,
    path,
    ...(typeof primary?.sha512 === "string" ? { sha512: primary.sha512 } : {}),
    ...(typeof releaseDate === "string" ? { releaseDate } : {}),
  };
}

export function collectGitHubReleaseAssets(sourceRoot, outputRoot) {
  const resolvedSource = resolve(sourceRoot);
  const resolvedOutput = resolve(outputRoot);
  mkdirSync(resolvedOutput, { recursive: true });

  const manifestsByName = new Map();
  const copied = [];

  for (const filePath of listFilesRecursive(resolvedSource)) {
    const name = basename(filePath);
    if (UPDATE_MANIFEST_NAMES.has(name)) {
      const bucket = manifestsByName.get(name) ?? [];
      bucket.push(readUpdateManifest(filePath));
      manifestsByName.set(name, bucket);
      continue;
    }

    copyFileSync(filePath, join(resolvedOutput, name));
    copied.push(name);
  }

  const mergedNames = [];
  for (const [name, manifests] of manifestsByName) {
    writeFileSync(
      join(resolvedOutput, name),
      stringifyElectronUpdateManifest(mergeElectronUpdateManifests(manifests)),
    );
    mergedNames.push(name);
  }

  return {
    copied,
    merged: mergedNames,
  };
}

const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entryHref === import.meta.url) {
  try {
    const sourceRoot = process.argv[2];
    const outputRoot = process.argv[3];
    if (!sourceRoot || !outputRoot) {
      throw new Error("usage: collect-github-release-assets.mjs <artifact-root> <output-dir>");
    }
    const result = collectGitHubReleaseAssets(sourceRoot, outputRoot);
    console.log(
      `[release-assets] copied=${result.copied.length} merged=${result.merged.join(",") || "none"}`,
    );
  } catch (error) {
    console.error(`[release-assets] ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
