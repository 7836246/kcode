#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertPluginName,
  fail,
  parseArgs,
  pluginManifestPath,
  requiredFlag,
  writeJson,
  writeTextFile,
} from "./lib.mjs";

function usage() {
  return [
    "Usage:",
    "  node create-basic-plugin.mjs --name <plugin-name> --out <parent-dir> [--description <text>]",
    "",
    "Creates <parent-dir>/<plugin-name> with .kcode-plugin/plugin.json and a starter skill.",
  ].join("\n");
}

try {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(usage());
    process.exit(0);
  }
  const name = requiredFlag(flags, "name");
  const out = requiredFlag(flags, "out");
  const description =
    typeof flags.description === "string" && flags.description.trim()
      ? flags.description.trim()
      : `Local KCode plugin ${name}.`;
  assertPluginName(name);

  const pluginRoot = resolve(out, name);
  if (existsSync(pluginManifestPath(pluginRoot))) {
    throw new Error(`Plugin already exists: ${pluginRoot}`);
  }

  writeJson(pluginManifestPath(pluginRoot), {
    name,
    version: "0.1.0",
    description,
    author: { name: "local" },
    license: "MIT",
    skills: "skills",
  });
  writeTextFile(
    resolve(pluginRoot, "skills", name, "SKILL.md"),
    [
      "---",
      `name: ${name}`,
      `description: ${description} Use when the user asks about this plugin's workflow.`,
      "---",
      "",
      `# ${name}`,
      "",
      "Describe the workflow the agent should follow when this skill is loaded.",
      "",
    ].join("\n"),
  );
  writeTextFile(
    resolve(pluginRoot, "README.md"),
    `# ${name}\n\n${description}\n`,
  );

  console.log(
    JSON.stringify(
      {
        pluginRoot,
        name,
        manifest: pluginManifestPath(pluginRoot),
      },
      null,
      2,
    ),
  );
} catch (error) {
  fail(error);
}
