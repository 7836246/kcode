# KCode

<div align="center">
  <img src="public/logo/kcode-app-icon.png" alt="KCode" width="128" height="128" />
</div>
<p align="center">
  <a href="README.md">简体中文</a> | English
</p>

**KCode** is an open-source AI coding workspace with desktop, browser, and terminal Agent interfaces. Configure your own model providers; you do not need a Zhipu or Z.ai account.

This repository is based on [ZCode](https://github.com/zai-org/ZCode) and is renamed to distinguish it from the official product. It is **not affiliated with Z.ai**. Upstream copyright belongs to Z.AI Co., Ltd under [Apache-2.0](LICENSE). Keep `LICENSE`, `NOTICE.md`, and the third-party notices when you redistribute.

| Interface | Purpose | Development command |
| --- | --- | --- |
| Desktop | Electron desktop app | `pnpm dev:desktop` |
| Web | Browser workspace and local backend | `pnpm dev:web` |
| Agent CLI | Terminal `kcode`, also the Agent runtime for Desktop and Web | `pnpm --filter @kcode/cli dev` |

## Current Scope

- Product name, packages, commands, icons, and environment variables are unified as KCode.
- Model calls go to providers you configure. There is no Zhipu login page or plan-upgrade entry.
- The official plugin marketplace `kcode-plugins-official` uses the bundled catalog only and does not fetch the Z.ai CDN. Add a self-hosted catalog later as a personal source (git / URL / local directory).
- Store → Create Plugin uses the bundled `plugin-creator` skill.
- Settings → Memory can enable a custom system role. The default file is `~/.kcode/system-role.md`. See [apps/kcode-cli/examples/system-role.md](apps/kcode-cli/examples/system-role.md).
- Upstream OAuth and business-API placeholders may still exist in the source. You do not need them for open-source use.

## Setup

Install Git, Node.js **24.14.0**, and pnpm **10.33.2**. [mise.toml](mise.toml) is the source of truth. Run commands from the repository root.

```bash
pnpm bootstrap
```

This installs workspace dependencies, prepares local desktop runtime assets, and runs `build:bootstrap`. Agent source lives in [apps/kcode-cli/](apps/kcode-cli/) and is cloned with the repo. There is no submodule.

| Command | Purpose |
| --- | --- |
| `pnpm install` | Install dependencies only |
| `pnpm prepare:desktop-runtime` | Prepare desktop runtime assets (includes remote assets by default) |
| `pnpm prepare:remote-assets` | Prepare remote runtime assets separately |
| `pnpm bootstrap:with-remote` | Set up dependencies plus local and remote assets, then build; skip the desktop bundle |
| `pnpm build` | Recursively build workspace packages |

Default `bootstrap` skips remote asset preparation and is enough for local desktop work. Run the remote commands when you use SSH / WSL workspaces.

## Development

### Desktop

```bash
pnpm dev:desktop

# Test environment with a separate data directory (macOS / Linux)
KCODE_DATA_BASE_DIR="$HOME/.kcode-dev-home" pnpm dev:desktop:test
```

`pnpm dev:desktop` defaults to `pnpm dev:desktop:prod`. The startup script prepares local assets, builds the desktop Agent, then starts Electron.

For remote workspaces, run `pnpm bootstrap:with-remote` first, then `pnpm dev:desktop`. Dev assets come from `packages/desktop/mock-cdn` and local build outputs and are uploaded over SFTP. They do not use a CDN.

### Web

```bash
pnpm dev:web

KCODE_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

This starts the Web dev server (default `http://localhost:5173`) and the backend (default `http://localhost:3030`). Open the former in a browser. After Agent source changes, run `pnpm --filter @kcode/cli... build` and restart the service.

### CLI

The distribution uses one `kcode` command: no args start the TUI, `--web` starts the browser UI, and other args go to the Agent CLI. Both modes run locally without Electron.

```bash
kcode
kcode --web --workspace /path/to/project --port 3030 --no-open
kcode --help
```

Web mode uses the current directory, listens on `127.0.0.1`, and picks a free port. Use `--host 0.0.0.0` for LAN access; a non-local listen address generates an access token by default. You can also set `KCODE_SERVER_AUTH_TOKEN` or the programmatic `authToken` option.

`pnpm build:kcode` only builds the distribution. It does not replace an existing `kcode` on `PATH`. Check the real entry with `command -v kcode` (or `where.exe kcode` on Windows).

Developing the TUI or Agent from source:

```bash
pnpm --filter @kcode/cli... build
node apps/kcode-cli/packages/cli/dist/kcode.cjs --help
pnpm --filter @kcode/cli dev
```

This entry does not handle the distribution `--web` switch. To test the unified command, use the extracted `bin/kcode.mjs` below.

## Checks

```bash
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
pnpm verify:pre-push
```

Run at least `pnpm verify:pre-push` before a commit. Tests follow each package's `package.json` and its test files. There is no single repo-wide test command.

## Configuration

Root [.env.example](.env.example) has service-URL and build placeholders. Copy it to `.env` if needed and put local overrides in `.env.local`. These are the variables you will use most:

| Setting | Purpose |
| --- | --- |
| `KCODE_DATA_BASE_DIR` | Application data root; files go under `.kcode/` |
| `KCODE_SERVER_WORKSPACE` | Workspace path for the Web backend |
| `KCODE_BUILTIN_PROVIDER_CONFIG_FILE` | Local provider config; built-in config is used when unset |
| `KCODE_DIST_BASE_URL` | Download base URL for the CLI installer |
| `KCODE_SYSTEM_ROLE_FILE` | Custom system-role file path |
| `KCODE_SYSTEM_ROLE_ENABLED` | Override the system-role switch |

See [config/README.md](config/README.md) for the default client configuration.

## Packaging

See [third-party/README.md](third-party/README.md) for notices and distribution checks.

### Desktop

```bash
pnpm bundle:desktop
pnpm bundle:desktop -- --os win --arch x64
pnpm bundle:desktop -- --help
```

Default target is macOS arm64. Output goes to `packages/desktop/dist/`. `--os`: `mac` / `win` / `linux`. `--arch`: `x64` / `arm64`. Signing needs the tools for that platform.

If a local unsigned macOS build is blocked:

```bash
sudo xattr -rd com.apple.quarantine /Applications/KCode.app
```

### CLI distribution

`pnpm build:kcode` builds the CLI / TUI, backend, and Web client, then assembles the distribution. Running it still needs Node.js at the version in `mise.toml`. Set `KCODE_DIST_BASE_URL` first, or pass `--base-url`:

```bash
pnpm build:kcode --base-url https://downloads.example.com/kcode/
pnpm build:kcode --skip-build
pnpm build:kcode --help
```

Output is under `dist/kcode/`:

- `releases/<version>/kcode-<version>.tar.gz`
- `releases/<version>/sha256.txt`
- `latest.json` and `install.sh`

The installer defaults to `~/.kcode/runtime` and creates `kcode` in `~/.local/bin`. Override those with `KCODE_DIST_HOME` and `KCODE_DIST_BIN_DIR`.

Extract and run locally without uploading:

```bash
kcode_version=$(node -p "require('./dist/kcode/latest.json').version")
mkdir -p dist/kcode/debug
tar -xzf "dist/kcode/releases/$kcode_version/kcode-$kcode_version.tar.gz" \
  -C dist/kcode/debug
node dist/kcode/debug/kcode/bin/kcode.mjs
node dist/kcode/debug/kcode/bin/kcode.mjs --web --workspace "$PWD" --port 3030 --no-open
```

Open `http://127.0.0.1:3030`. If `pnpm dev:web` already uses 3030, pick another `--port`.

## Repository Structure

| Directory | Responsibility |
| --- | --- |
| `packages/desktop` | Electron Main, Host, Renderer, and desktop packaging |
| `packages/web` | Web client |
| `packages/server` | HTTP / WebSocket services and remote connections |
| `packages/kcode-server-cli` | Standalone server startup and process management |
| `packages/ui` | Shared React components, hooks, and Zustand state |
| `packages/services` | Business services and persistence |
| `packages/shared`, `packages/rpc`, `packages/client` | Protocols, RPC, and the Agent client SDK |
| `packages/provider`, `packages/provider-node` | Shared provider APIs and Node implementations |
| `apps/kcode-cli` | Agent CLI, TUI, runtime; bundled plugins live in `packages/*-plugin` |
| `scripts`, `config`, `third-party` | Build scripts, built-in config, and third-party notices |

## License

Apache-2.0. See [NOTICE.md](NOTICE.md) for feature boundaries, execution risk, data handling, and third-party copyright.
