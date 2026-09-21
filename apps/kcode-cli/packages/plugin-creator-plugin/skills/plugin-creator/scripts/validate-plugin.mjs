#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PLUGIN_NAME_PATTERN,
  fail,
  parseArgs,
  pluginManifestPath,
  requiredFlag,
} from "./lib.mjs";

function usage() {
  return [
    "Usage:",
    "  node validate-plugin.mjs --plugin <plugin-root>",
    "",
    "Checks .kcode-plugin/plugin.json and that declared skills/commands exist.",
  ].join("\n");
}

function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

try {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(usage());
    process.exit(0);
  }
  const pluginRoot = resolve(requiredFlag(flags, "plugin"));
  const manifestFile = pluginManifestPath(pluginRoot);
  if (!existsSync(manifestFile)) {
    throw new Error(`Missing manifest: ${manifestFile}`);
  }
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  if (!isRecord(manifest)) throw new Error("plugin.json must be an object");
  if (typeof manifest.name !== "string" || !PLUGIN_NAME_PATTERN.test(manifest.name)) {
    throw new Error("plugin.json name is missing or invalid");
  }
  if (typeof manifest.version !== "string" || manifest.version.trim().length === 0) {
    throw new Error("plugin.json version is required");
  }

  const errors = [];
  if (manifest.skills === "skills") {
    const skillsRoot = resolve(pluginRoot, "skills");
    if (!existsSync(skillsRoot)) {
      errors.push("skills: \"skills\" is declared but skills/ is missing");
    } else {
      for (const entry of readdirSync(skillsRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const skillFile = resolve(skillsRoot, entry.name, "SKILL.md");
        if (!existsSync(skillFile)) {
          errors.push(`skills/${entry.name}/SKILL.md is missing`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("\n"));
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        name: manifest.name,
        version: manifest.version,
        manifest: manifestFile,
      },
      null,
      2,
    ),
  );
} catch (error) {
  fail(error);
}
