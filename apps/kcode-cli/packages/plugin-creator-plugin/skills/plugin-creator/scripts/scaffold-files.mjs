#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertPluginName,
  fail,
  parseArgs,
  pluginManifestPath,
  requiredFlag,
  writeTextFile,
} from "./lib.mjs";

function usage() {
  return [
    "Usage:",
    "  node scaffold-files.mjs --plugin <plugin-root> [--skill <name>] [--command <name>]",
    "",
    "Adds a skill and/or slash command to an existing plugin without rewriting the manifest.",
  ].join("\n");
}

try {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(usage());
    process.exit(0);
  }
  const pluginRoot = resolve(requiredFlag(flags, "plugin"));
  if (!existsSync(pluginManifestPath(pluginRoot))) {
    throw new Error(`Not a KCode plugin root (missing .kcode-plugin/plugin.json): ${pluginRoot}`);
  }

  const created = [];
  const skillName = typeof flags.skill === "string" ? flags.skill.trim() : "";
  const commandName = typeof flags.command === "string" ? flags.command.trim() : "";
  if (!skillName && !commandName) {
    throw new Error("Provide --skill and/or --command");
  }

  if (skillName) {
    assertPluginName(skillName);
    const skillPath = resolve(pluginRoot, "skills", skillName, "SKILL.md");
    if (existsSync(skillPath)) throw new Error(`Skill already exists: ${skillPath}`);
    writeTextFile(
      skillPath,
      [
        "---",
        `name: ${skillName}`,
        `description: Use when the user asks to run the ${skillName} workflow.`,
        "---",
        "",
        `# ${skillName}`,
        "",
        "Write the steps the agent should follow.",
        "",
      ].join("\n"),
    );
    created.push(skillPath);
  }

  if (commandName) {
    assertPluginName(commandName);
    const commandPath = resolve(pluginRoot, "commands", `${commandName}.md`);
    if (existsSync(commandPath)) throw new Error(`Command already exists: ${commandPath}`);
    writeTextFile(
      commandPath,
      [
        "---",
        `name: ${commandName}`,
        `description: Slash command for ${commandName}.`,
        "---",
        "",
        "Describe what this command does. Use `$ARGUMENTS` for user input.",
        "",
      ].join("\n"),
    );
    created.push(commandPath);
  }

  console.log(JSON.stringify({ pluginRoot, created }, null, 2));
} catch (error) {
  fail(error);
}
