#!/usr/bin/env node
import { resolve } from "node:path";
import {
  assertPluginName,
  fail,
  parseArgs,
  requiredFlag,
  writeJson,
} from "./lib.mjs";

function usage() {
  return [
    "Usage:",
    "  node marketplace-files.mjs --name <marketplace-id> --plugin-name <name> --plugin-path <path> --out <marketplace.json>",
    "",
    "Writes a local marketplace.json that points at one directory plugin.",
  ].join("\n");
}

try {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(usage());
    process.exit(0);
  }
  const name = requiredFlag(flags, "name");
  const pluginName = requiredFlag(flags, "plugin-name");
  const pluginPath = requiredFlag(flags, "plugin-path");
  const out = resolve(requiredFlag(flags, "out"));
  assertPluginName(name);
  assertPluginName(pluginName);

  const manifest = {
    name,
    description: `Local KCode marketplace ${name}`,
    plugins: [
      {
        name: pluginName,
        source: { source: "directory", path: pluginPath },
      },
    ],
  };
  writeJson(out, manifest);
  console.log(JSON.stringify({ marketplace: out, name, pluginName }, null, 2));
} catch (error) {
  fail(error);
}
