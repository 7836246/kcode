# KCode

<div align="center">
  <img src="public/logo/kcode-app-icon.png" alt="KCode" width="128" height="128" />
</div>
<p align="center">
  <a href="README.md">简体中文</a> | English
</p>

**KCode** is an independent project based on [ZCode](https://github.com/zai-org/ZCode). It is renamed to distinguish it from the official product and is **not affiliated with Z.ai**.

Upstream copyright belongs to Z.AI Co., Ltd under [Apache-2.0](LICENSE). This repository keeps the original `LICENSE`, `NOTICE.md`, and third-party notices; keep them when you redistribute.

KCode is an AI coding workspace with desktop, browser, and terminal interfaces. This repository contains the clients, backend services, shared UI, and Agent CLI and runtime source code. Product name, packages, commands, icons, and environment variables are unified as KCode. Official API hosts and OAuth app IDs still point at the upstream services.

| Interface                    | Purpose                                                                                   | Development command            |
| ---------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------ |
| Desktop                      | Electron desktop application                                                              | `pnpm dev:desktop`             |
| Web / KCode CLI distribution | Terminal and browser workspace; packages the TUI, Web client, backend, and Agent together | `pnpm dev:web`                 |
| Agent CLI                    | The `kcode` terminal interface, which also provides the Agent runtime for Desktop and Web | `pnpm --filter @kcode/cli dev` |

## Setup

Install Git, Node.js **24.14.0**, and pnpm **10.33.2**. [mise.toml](mise.toml) is the source of truth for tool versions. Run all development and packaging commands below from the repository root.

```bash
pnpm bootstrap
```

`pnpm bootstrap` installs workspace dependencies, prepares local desktop runtime assets, and runs `build:bootstrap`.

The Agent CLI and runtime source code lives in [apps/kcode-cli/](apps/kcode-cli/) as a regular directory included when you clone this repository. No separate checkout or Git submodule initialization is required.

Additional setup and build commands:

| Command                        | Purpose                                                                                                                             |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install`                 | Install dependencies                                                                                                                |
| `pnpm prepare:desktop-runtime` | Prepare desktop runtime assets, including remote assets by default                                                                  |
| `pnpm prepare:remote-assets`   | Prepare remote runtime assets separately                                                                                            |
| `pnpm bootstrap:with-remote`   | Set up dependencies and local and remote assets, then build the relevant packages sequentially; skip the desktop application bundle |
| `pnpm build`                   | Recursively run each workspace package's build script, including its asset preparation steps                                        |

The default `bootstrap` skips remote asset preparation and is suitable for local desktop development. Run the corresponding preparation command when working with remote workspaces or validating remote distribution assets.

## Development and Usage

### Desktop

```bash
pnpm dev:desktop

# Use the test environment
pnpm dev:desktop:test
```

`pnpm dev:desktop` defaults to `pnpm dev:desktop:prod` and uses production service configuration. The startup script prepares local runtime assets, builds the desktop Agent, then starts Electron and source watchers.

Set `KCODE_DATA_BASE_DIR` to use a separate development data directory. For example, on macOS / Linux:

```bash
KCODE_DATA_BASE_DIR="$HOME/.kcode-dev-home" pnpm dev:desktop:test
```

### Web Development

Use development mode when editing Web or backend source code:

```bash
pnpm dev:web

# Set the backend workspace (macOS / Linux)
KCODE_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

This starts both the Web development server (default: `http://localhost:5173`) and the backend (default: `http://localhost:3030`). Open the Web development server in your browser. `/ws` and general `/api` requests are proxied to the local backend; `/api/v1/oauth/token` is proxied separately to the configured product service.

After changing Agent source code, run `pnpm --filter @kcode/cli... build` and restart the service. To validate the complete distribution, extract and run it as described under Packaging → KCode CLI distribution below.

### KCode CLI distribution

The command-line distribution includes the TUI, Web client, and Agent behind one `kcode` command. With no arguments it starts the TUI; a leading `--web` starts Web mode; all other arguments go to the existing Agent CLI. Both modes run locally without Electron.

```bash
# Start the terminal UI by default
kcode

# Start the Web interface
kcode --web

# Set the project and port without opening a browser automatically
kcode --web --workspace /path/to/project --port 3030 --no-open

# Show CLI or Web options
kcode --help
kcode --web --help
```

In Web mode, it uses the current directory as the workspace, listens on `127.0.0.1` without token authentication by default, selects an available port, and opens a browser. Use the URL printed in the terminal and press `Ctrl+C` to stop the service. For LAN access, use `--host 0.0.0.0`; listening on a non-local address generates an access token by default. Use the token-bearing URL printed in the terminal. Set a token with `--token`, or disable token authentication with `--no-token`.

When starting the general Web service's HTTP entry directly, configure API/WebSocket authentication with `KCODE_SERVER_AUTH_TOKEN`. When creating the service programmatically, use the `authToken` option.

See Packaging below for build instructions. `pnpm build:kcode` only creates the distribution; it does not replace an existing `kcode` on `PATH`. If the command still points to an older installation or another checkout, check it with `command -v kcode` on macOS / Linux or `where.exe kcode` on Windows.

### CLI Source Development

Use the source entry when developing the TUI or Agent:

```bash
pnpm --filter @kcode/cli dev --help
pnpm --filter @kcode/cli dev

# Build the CLI and its workspace dependencies
pnpm --filter @kcode/cli... build
node apps/kcode-cli/packages/cli/dist/kcode.cjs --help
```

This entry runs the Agent CLI directly and does not handle the distribution's `--web` switch. Use `pnpm dev:web` for Web development, or the extracted `bin/kcode.mjs` shown below to test the unified command.

## Configuration

The root [.env.example](.env.example) provides sample service URLs and build configuration. Copy it to `.env` as needed and place local overrides in `.env.local`. Select the Desktop development environment with `dev:desktop:test` or `dev:desktop:prod`.

| Setting                              | Purpose                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| `KCODE_DATA_BASE_DIR`                | Base directory for application data, stored under its `.kcode/` subdirectory            |
| `KCODE_SERVER_WORKSPACE`             | Workspace path for the Web backend                                                      |
| `KCODE_BUILTIN_PROVIDER_CONFIG_FILE` | Path to a local provider configuration file; uses the built-in configuration when unset |
| `KCODE_DIST_BASE_URL`                | Download base URL used by the CLI distribution installer                                |

Runtime variables can be set explicitly in the environment of the startup command. See [config/README.md](config/README.md) for the default configuration shipped with the client.

## Packaging

See [third-party/README.md](third-party/README.md) for notice generation, distribution checks, and where the notices are included in each distribution.

### Desktop

```bash
pnpm bundle:desktop

# Set the target platform and CPU architecture
pnpm bundle:desktop -- --os win --arch x64

pnpm bundle:desktop -- --help
```

The default target is macOS arm64, and the default output directory is `packages/desktop/dist/`. `--os` accepts `mac`, `win`, or `linux`; `--arch` accepts `x64` or `arm64`. Packaging and signing require the tools and configuration for the target platform.

### KCode CLI distribution

Run `pnpm build:kcode` to build the CLI/TUI, backend, and Web client, collect the TUI native libraries, workers, and runtime dependencies, then assemble the distribution. Running the distribution still requires Node.js; use the version specified in `mise.toml`.

Before packaging, set the download base URL with `KCODE_DIST_BASE_URL` in `.env`, `.env.local`, or the process environment, or pass it through `--base-url`. The URL below is a placeholder; replace it with your hosting URL when publishing:

```bash
pnpm build:kcode --base-url https://downloads.example.com/kcode/

# When KCODE_DIST_BASE_URL is already configured
pnpm build:kcode

# Repackage existing Agent, backend, and Web build outputs
pnpm build:kcode --skip-build

# Show options for the version, output directory, and more
pnpm build:kcode --help
```

The version defaults to the root `package.json` version. Output is written to `dist/kcode/`:

- `releases/<version>/kcode-<version>.tar.gz`: runtime package.
- `releases/<version>/sha256.txt`: checksum file.
- `latest.json` and `install.sh`: version index and installer.

Upload the entire directory to the configured download base URL. The installer downloads the runtime package from that URL, installs it to `~/.kcode/runtime` by default, and creates the `kcode` command in `~/.local/bin`. Override these directories with `KCODE_DIST_HOME` and `KCODE_DIST_BIN_DIR`, respectively.

Existing Lite users should switch to the new build command, environment variables, and installer. Installation does not remove old Lite directories or migrate/delete session data.

To test a packaged build locally, extract and run it directly without uploading or installing it:

```bash
kcode_version=$(node -p "require('./dist/kcode/latest.json').version")
mkdir -p dist/kcode/debug
tar -xzf "dist/kcode/releases/$kcode_version/kcode-$kcode_version.tar.gz" \
  -C dist/kcode/debug
# Start the TUI by default
node dist/kcode/debug/kcode/bin/kcode.mjs

# Start Web mode
node dist/kcode/debug/kcode/bin/kcode.mjs --web \
  --workspace "$PWD" --port 3030 --no-open
```

Open `http://127.0.0.1:3030` to validate the complete flow, with one backend serving the Web pages and running the Agent. The port must be available; if `pnpm dev:web` is already running, choose another `--port`.

## Repository Structure

| Directory                                            | Responsibility                                                                          |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/desktop`                                   | Electron Main, Host, Renderer, and desktop packaging                                    |
| `packages/web`                                       | Web client                                                                              |
| `packages/server`                                    | HTTP / WebSocket services and remote connections                                        |
| `packages/kcode-server-cli`                          | Standalone server startup and process management                                        |
| `packages/ui`                                        | Shared React components, hooks, and Zustand state                                       |
| `packages/services`                                  | Business services and persistence                                                       |
| `packages/shared`, `packages/rpc`, `packages/client` | Shared protocols and types, RPC framework, and Agent client SDK                         |
| `packages/provider`, `packages/provider-node`        | Common provider capabilities and Node implementations                                   |
| `apps/kcode-cli`                                     | Agent CLI, TUI, runtime, and tools                                                      |
| `scripts`, `config`, `third-party`                   | Build and maintenance scripts, built-in configuration, and third-party notice materials |

## Project Notice

See [NOTICE.md](NOTICE.md) for feature and promotion scope, maintenance policy, execution and data risks, licensing, and third-party copyright information.
