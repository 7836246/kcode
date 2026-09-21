# 桌面在线更新

## 行为

正式桌面包的产品版本来自仓库根与 `@kcode/desktop` 的 `package.json`，编译期打进 `__KCODE_VERSION__`。git tag 不是运行时版本源。

打包应用检查更新时只问 GitHub Releases：`7836246/kcode`。不再请求 `zcode.z.ai` 的 electron manifest，也不再走官方 CDN feed。

```text
设置 receivePreviewUpdates
        │
        ▼
applyDesktopUpdateFeed（唯一 feed 所有者）
        │
        ├─ 正式包：GitHub provider（owner/repo 固定）
        │     stable  → allowPrerelease=false，只看 latest release
        │     preview → allowPrerelease=true，可看 GitHub pre-release
        │
        └─ 未打包且提供 KCODE_UPDATE_FEED_URL / --kcode-update-feed-url
              → generic provider（本地联调）
        │
        ▼
electron-updater checkForUpdates / downloadUpdate
```

- 正式包忽略更新源覆盖，避免环境变量把更新请求改道
- `KCode Preview` 身份仍禁用自动更新；本规则只约束正式 `KCode` 包
- GitHub pre-release 约定：tag 含 `-`（如 `v0.0.2-preview.1`）时 Release 标为 prerelease
- 开发态 `dev-app-update.yml` 指向同一 GitHub 仓库，真实安装包 URL 仍由 GitHub Release 资产提供

## 所有者

`applyDesktopUpdateFeed` 是更新源的唯一写入点。`resolveDesktopUpdateFeed` 只做纯解析。菜单、IPC、下载状态仍由 `autoUpdater.ts` 持有。

## 验收

- 正式包 checkForUpdates 使用 GitHub provider，不访问 `/api/v1/releases/electron/manifest`
- 未开 preview 时 `allowPrerelease` 为 false；开启后为 true
- 正式包传入更新源覆盖时被忽略并打 warn
- 未打包开发构建可以使用 generic URL 覆盖
