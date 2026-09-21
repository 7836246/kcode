import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

export const PLUGIN_NAME_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/;

export function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return flags;
}

export function requiredFlag(flags, name) {
  const value = typeof flags[name] === "string" ? flags[name].trim() : "";
  if (!value) throw new Error(`Missing required --${name}`);
  return value;
}

export function assertPluginName(name) {
  if (!PLUGIN_NAME_PATTERN.test(name)) {
    throw new Error(
      `Invalid plugin or marketplace name "${name}". Use lowercase kebab-case, starting with a letter or digit.`,
    );
  }
}

export function writeTextFile(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents, "utf8");
}

export function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function writeJson(path, value) {
  writeTextFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function pluginManifestPath(pluginRoot) {
  return resolve(pluginRoot, ".kcode-plugin", "plugin.json");
}

export function fail(error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exitCode = 1;
}
