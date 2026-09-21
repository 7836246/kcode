# 参与贡献

KCode 用 Node 24 和 pnpm。版本以仓库根目录的 `mise.toml` 为准，当前是 Node 24.14.0、pnpm 10.33.2。

## 环境

```bash
mise install
pnpm install
```

常用命令都从仓库根目录执行：

| 用途 | 命令 |
| --- | --- |
| 桌面开发 | `pnpm dev:desktop` |
| Web 开发 | `pnpm dev:web` |
| 官网 | `pnpm dev:website` |
| 类型检查 | `pnpm typecheck` |
| Lint | `pnpm lint` |
| 架构检查 | `pnpm architecture:check` |

CLI 在 `apps/kcode-cli`。改 CLI 时再跑 `pnpm --dir apps/kcode-cli typecheck` 和 `pnpm --dir apps/kcode-cli lint`。

## 改代码

- 改行为前先改对应 spec，写清规则、状态所有者和验收场景。
- 提交作者只用 `KCode <go7836246@gmail.com>`。不要加入 Cursor 或其他共同作者署名。
- 不要提交 API Key、Cookie、真实用户数据或内部地址。

## 发布签名

桌面发布在 tag `v*` 时跑 `.github/workflows/release-desktop.yml`。签名材料没配齐时仍发布未签名包。macOS 要六个 secret 同时存在才会签名并公证；Windows 要两个同时存在才会签名。Linux 安装包保持未签名。只配一部分时，这次发布仍是未签名，日志里会写出缺了哪些名字。

| Secret | 用途 |
| --- | --- |
| `APPLE_SIGNING_IDENTITY` | `Developer ID Application: 名称 (TEAMID)` |
| `CSC_LINK` | Developer ID 的 `.p12`，base64 |
| `CSC_KEY_PASSWORD` | `.p12` 密码 |
| `APPLE_ID` | 公证用的 Apple ID |
| `APPLE_APP_SPECIFIC_PASSWORD` | Apple 专用密码 |
| `APPLE_TEAM_ID` | Team ID |
| `WIN_CSC_LINK` | Windows 代码签名证书，base64 `.pfx` |
| `WIN_CSC_KEY_PASSWORD` | Windows 证书密码 |

这些值只放在 GitHub Actions secrets 里，不要写进仓库。
