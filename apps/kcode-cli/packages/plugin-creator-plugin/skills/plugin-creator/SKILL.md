---
name: plugin-creator
description: Create and validate KCode plugins, write .kcode-plugin/plugin.json, scaffold skills/commands, and register a local personal marketplace. Use when the user wants to create a plugin, scaffold plugin files, or install a plugin they are developing.
---

# Plugin Creator

Help the user create a real KCode plugin on disk, validate it, and install it from a personal marketplace. Do not try to publish into `kcode-plugins-official`.

Scripts live next to this file under `scripts/`. Prefer running them instead of inventing a different layout.

## Capture intent

Ask only for missing facts:

1. Plugin `name` (lowercase kebab-case)
2. One-sentence `description`
3. Output directory (default: `<workspace>/.kcode-dev-plugins/<name>` unless the user already chose a path)
4. Whether they need a skill, a slash command, or both

## Create

From this skill directory:

```bash
node scripts/create-basic-plugin.mjs --name <name> --out <parent-dir> --description "<text>"
```

Add extras without rewriting the manifest:

```bash
node scripts/scaffold-files.mjs --plugin <plugin-root> --skill <skill-name>
node scripts/scaffold-files.mjs --plugin <plugin-root> --command <command-name>
```

Read `references/plugin-json-spec.md` before adding manifest fields.

## Validate

```bash
node scripts/validate-plugin.mjs --plugin <plugin-root>
```

Fix every error before offering install.

## Local install

Create or update a personal marketplace file (never use the official marketplace id):

```bash
node scripts/upsert-dev-marketplace.mjs --marketplace-dir <dir> --plugin-name <name> --plugin-path <plugin-root>
```

Then tell the user to add that `marketplace.json` as a Personal Source in the plugin store and install the plugin. Read `references/installing-and-updating.md` for the update loop.

## Rules

- Manifest path is `.kcode-plugin/plugin.json`, not `.zcode-plugin`.
- Plugin and marketplace names must match `^[a-z0-9][a-z0-9._-]{0,127}$`.
- Do not overwrite an existing plugin directory. Edit in place or pick a new name.
- After creating files, summarize the paths and the next install step. Do not claim the plugin is installed until the user added the personal source.
