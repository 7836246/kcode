# plugin.json

KCode 插件清单位于 `.kcode-plugin/plugin.json`。

Required:

- `name` — lowercase kebab-case, must match the plugin directory name when installed from a marketplace
- `version` — semver-like string, for example `0.1.0`

Common optional fields:

- `description`
- `author` — `{ "name": "…", "url": "…" }`
- `license`
- `skills` — `"skills"` when skill folders live under `skills/<name>/SKILL.md`
- `commands` — `"commands"` when slash commands live under `commands/*.md`
- `agents` — `"agents"` when subagents live under `agents/*.md`
- `hooks` — path to `hooks/hooks.json`
- `mcpServers` or a root `.mcp.json`

Do not invent unsupported top-level fields such as `channels`, `lspServers`, `outputStyles`, or `settings`.
