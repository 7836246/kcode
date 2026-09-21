# KCode

<div align="center">
  <img src="public/logo/kcode-app-icon.png" alt="KCode" width="128" height="128" />
</div>
<p align="center">
  简体中文 | <a href="README.en.md">English</a>
</p>

**KCode** 是开源 AI 编程工作台，提供桌面应用、浏览器界面和终端 Agent。自行配置模型供应商即可使用，不必登录智谱或 Z.ai 账号。

本仓库基于 [ZCode](https://github.com/zai-org/ZCode) 修改，用于和官方产品区分，**与 Z.ai / 智谱无官方关联**。上游版权归 Z.AI Co., Ltd，协议为 [Apache-2.0](LICENSE)。再分发时请保留 `LICENSE`、`NOTICE.md` 和第三方声明。

| 入口 | 用途 | 开发命令 |
| --- | --- | --- |
| Desktop | Electron 桌面应用 | `pnpm dev:desktop` |
| Web | 浏览器工作台与本地后端 | `pnpm dev:web` |
| Agent CLI | 终端里的 `kcode`，同时给 Desktop / Web 提供运行时 | `pnpm --filter @kcode/cli dev` |

## 当前范围

- 产品名、包名、命令、图标和环境变量已统一为 KCode。
- 模型请求走你配置的供应商，不依赖智谱登录页或套餐升级入口。
- 官方插件市场 `kcode-plugins-official` 只使用仓库内置目录，不再拉取 Z.ai CDN。后续自建市场用设置里的个人来源（git / URL / 本地目录）接入。
- 商店「创建插件」使用内置 `plugin-creator` 技能。
- 设置 → 记忆里可打开「自定义系统角色」，正文默认在 `~/.kcode/system-role.md`。示例见 [apps/kcode-cli/examples/system-role.md](apps/kcode-cli/examples/system-role.md)。
- 源码里仍可能出现上游 OAuth / 业务接口占位，开源使用不必填写。

## 初始化

需要 Git、Node.js **24.14.0** 和 pnpm **10.33.2**，以 [mise.toml](mise.toml) 为准。命令都在仓库根目录执行。

```bash
pnpm bootstrap
```

该命令安装 workspace 依赖、准备桌面本地运行资源，并执行 `build:bootstrap`。Agent 源码在 [apps/kcode-cli/](apps/kcode-cli/)，随仓库一起克隆，没有 submodule。

| 命令 | 用途 |
| --- | --- |
| `pnpm install` | 只装依赖 |
| `pnpm prepare:desktop-runtime` | 准备桌面运行资源（默认含远程资源） |
| `pnpm prepare:remote-assets` | 单独准备远程运行资源 |
| `pnpm bootstrap:with-remote` | 初始化依赖、本地与远程资源并串行构建；跳过桌面 bundle |
| `pnpm build` | 递归构建各 workspace 包 |

默认 `bootstrap` 跳过远程资源准备，适合本机桌面开发。要用 SSH / WSL 远程工作区时，再跑对应准备命令。

## 开发

### 桌面

```bash
pnpm dev:desktop

# 测试环境 + 独立数据目录（macOS / Linux 示例）
KCODE_DATA_BASE_DIR="$HOME/.kcode-dev-home" pnpm dev:desktop:test
```

`pnpm dev:desktop` 默认等于 `pnpm dev:desktop:prod`。启动脚本会准备本地资源、构建桌面 Agent，再启动 Electron。

远程工作区：先 `pnpm bootstrap:with-remote`，再 `pnpm dev:desktop`。开发态资源来自 `packages/desktop/mock-cdn` 和本地构建产物，经 SFTP 上传，不访问 CDN。

### Web

```bash
pnpm dev:web

KCODE_SERVER_WORKSPACE=/path/to/project pnpm dev:web
```

同时启动 Web（默认 `http://localhost:5173`）和后端（默认 `http://localhost:3030`），浏览器打开前者。改了 Agent 源码后执行 `pnpm --filter @kcode/cli... build` 并重启服务。

### 命令行

发行包用同一个 `kcode`：无参数进 TUI，`--web` 开浏览器界面，其余参数交给 Agent CLI。两种模式都在本机跑，不需要 Electron。

```bash
kcode
kcode --web --workspace /path/to/project --port 3030 --no-open
kcode --help
```

Web 模式默认工作目录为当前目录，监听 `127.0.0.1`，自动选空闲端口。局域网可用 `--host 0.0.0.0`；监听非本机地址时默认生成访问令牌。也可用 `KCODE_SERVER_AUTH_TOKEN` 或程序接口的 `authToken`。

`pnpm build:kcode` 只生成发行包，不会替换 `PATH` 里已有的 `kcode`。用 `command -v kcode`（Windows 用 `where.exe kcode`）确认实际入口。

开发 TUI / Agent 源码：

```bash
pnpm --filter @kcode/cli... build
node apps/kcode-cli/packages/cli/dist/kcode.cjs --help
pnpm --filter @kcode/cli dev
```

这个入口不处理发行包的 `--web` 分流。验证完整 `kcode` 命令时，用下方解压后的 `bin/kcode.mjs`。

## 检查

```bash
pnpm typecheck
pnpm lint
pnpm architecture:check --changed
pnpm verify:pre-push
```

提交前至少跑 `pnpm verify:pre-push`。测试命令以各包 `package.json` 和实际测试文件为准，仓库没有统一的全量单测入口。

## 配置

根目录 [.env.example](.env.example) 是服务地址与构建占位，可复制为 `.env`，本地覆盖放 `.env.local`。日常开发更常用下面这些：

| 配置 | 用途 |
| --- | --- |
| `KCODE_DATA_BASE_DIR` | 应用数据基目录，数据写在其下的 `.kcode/` |
| `KCODE_SERVER_WORKSPACE` | Web 后端工作区路径 |
| `KCODE_BUILTIN_PROVIDER_CONFIG_FILE` | 本地 Provider 配置；未设置时用内置配置 |
| `KCODE_DIST_BASE_URL` | 命令行安装脚本的下载根地址 |
| `KCODE_SYSTEM_ROLE_FILE` | 自定义系统角色正文路径 |
| `KCODE_SYSTEM_ROLE_ENABLED` | 覆盖系统角色开关 |

客户端默认配置见 [config/README.md](config/README.md)。

## 打包

第三方声明和发行校验见 [third-party/README.md](third-party/README.md)。

### 桌面

```bash
pnpm bundle:desktop
pnpm bundle:desktop -- --os win --arch x64
pnpm bundle:desktop -- --help
```

默认目标 macOS arm64，输出 `packages/desktop/dist/`。`--os`：`mac` / `win` / `linux`；`--arch`：`x64` / `arm64`。签名需要对应平台工具。

本地未签名的 macOS 包若被拦截：

```bash
sudo xattr -rd com.apple.quarantine /Applications/KCode.app
```

### 命令行发行包

`pnpm build:kcode` 会构建 CLI / TUI、后端和 Web，再组装发行包。运行仍需要 Node.js，版本以 `mise.toml` 为准。打包前设置 `KCODE_DIST_BASE_URL`，或传入 `--base-url`：

```bash
pnpm build:kcode --base-url https://downloads.example.com/kcode/
pnpm build:kcode --skip-build
pnpm build:kcode --help
```

输出在 `dist/kcode/`：

- `releases/<version>/kcode-<version>.tar.gz`
- `releases/<version>/sha256.txt`
- `latest.json`、`install.sh`

安装脚本默认装到 `~/.kcode/runtime`，并在 `~/.local/bin` 建立 `kcode`。可用 `KCODE_DIST_HOME`、`KCODE_DIST_BIN_DIR` 改目录。

本地解开即可试跑：

```bash
kcode_version=$(node -p "require('./dist/kcode/latest.json').version")
mkdir -p dist/kcode/debug
tar -xzf "dist/kcode/releases/$kcode_version/kcode-$kcode_version.tar.gz" \
  -C dist/kcode/debug
node dist/kcode/debug/kcode/bin/kcode.mjs
node dist/kcode/debug/kcode/bin/kcode.mjs --web --workspace "$PWD" --port 3030 --no-open
```

浏览器打开 `http://127.0.0.1:3030`。若 `pnpm dev:web` 已占用 3030，换一个 `--port`。

## 仓库结构

| 目录 | 职责 |
| --- | --- |
| `packages/desktop` | Electron Main、Host、Renderer 与桌面打包 |
| `packages/web` | Web 客户端 |
| `packages/server` | HTTP / WebSocket 服务与远程连接 |
| `packages/kcode-server-cli` | 独立 Server 启动与进程管理 |
| `packages/ui` | 共享 React 组件、hooks 与 Zustand 状态 |
| `packages/services` | 业务服务与持久化 |
| `packages/shared`、`packages/rpc`、`packages/client` | 协议、RPC、Agent 客户端 SDK |
| `packages/provider`、`packages/provider-node` | Provider 公共能力与 Node 实现 |
| `apps/kcode-cli` | Agent CLI、TUI、运行时；内置插件在 `packages/*-plugin` |
| `scripts`、`config`、`third-party` | 构建脚本、内置配置与第三方声明 |

## 许可

Apache-2.0。功能边界、执行风险、数据与第三方版权见 [NOTICE.md](NOTICE.md)。
