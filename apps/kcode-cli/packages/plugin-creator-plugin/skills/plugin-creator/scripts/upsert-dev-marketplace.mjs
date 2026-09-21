#!/usr/bin/env node
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertPluginName,
  fail,
  parseArgs,
  readJson,
  requiredFlag,
  writeJson,
} from "./lib.mjs";

function usage() {
  return [
    "Usage:",
    "  node upsert-dev-marketplace.mjs --marketplace-dir <dir> --plugin-name <name> --plugin-path <path> [--marketplace-name <id>]",
    "",
    "Creates or updates marketplace.json in --marketplace-dir so the plugin can be added as a personal source.",
  ].join("\n");
}

try {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help) {
    console.log(usage());
    process.exit(0);
  }
  const marketplaceDir = resolve(requiredFlag(flags, "marketplace-dir"));
  const pluginName = requiredFlag(flags, "plugin-name");
  const pluginPath = requiredFlag(flags, "plugin-path");
  const marketplaceName =
    typeof flags["marketplace-name"] === "string" && flags["marketplace-name"].trim()
      ? flags["marketplace-name"].trim()
      : "kcode-dev-plugins";
  assertPluginName(pluginName);
  assertPluginName(marketplaceName);

  const manifestPath = resolve(marketplaceDir, "marketplace.json");
  const existing = existsSync(manifestPath) ? readJson(manifestPath) : null;
  const plugins = Array.isArray(existing?.plugins) ? [...existing.plugins] : [];
  const nextEntry = {
    name: pluginName,
    source: { source: "directory", path: pluginPath },
  };
  const index = plugins.findIndex((entry) => entry && entry.name === pluginName);
  if (index >= 0) plugins[index] = nextEntry;
  else plugins.push(nextEntry);

  writeJson(manifestPath, {
    name: typeof existing?.name === "string" ? existing.name : marketplaceName,
    description:
      typeof existing?.description === "string"
        ? existing.description
        : `Local KCode marketplace ${marketplaceName}`,
    plugins,
  });

  console.log(
    JSON.stringify(
      {
        marketplace: manifestPath,
        pluginName,
        addAsPersonalSource: manifestPath,
      },
      null,
      2,
    ),
  );
} catch (error) {
  fail(error);
}
