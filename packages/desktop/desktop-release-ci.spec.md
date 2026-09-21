# 桌面多平台发布

## 行为

打 `v*` 标签或手动触发 GitHub Actions `release-desktop` 后，CI 在对应系统上跑现有 `pnpm bundle:desktop`，把未签名正式包上传到同一 GitHub Release。

| 平台 | 产物 |
| --- | --- |
| macOS Apple Silicon | `.dmg` |
| macOS Intel | `.dmg` |
| Windows x64 | NSIS `.exe` |
| Windows ARM64 | NSIS `.exe` |
| Linux x64 / ARM64 | `.deb`、`.rpm`、`.AppImage` |

- `KCODE_ENV=production`，产物文件名不带 `_TEST`
- 不启用 Apple / Windows 签名和公证；本机打开 macOS 包仍按 README 去掉隔离属性
- 不另写打包实现，只调度 `packages/desktop/scripts/bundle.mjs`
- Linux 仍会多打 `.pkg.tar.zst`（electron-builder 现有 pacman target），Release 一并挂上。CI 必须安装 `libarchive-tools`（`bsdtar`），否则 fpm 打 pacman 会以 127 退出，deb/rpm/AppImage 也一起失败。
- macOS Intel 在 `macos-15` 上交叉打 x64。不要用已排队枯竭的 `macos-13` Intel runner。

## 所有者

`release-desktop` workflow 是发布编排的唯一入口。每个 job 只打本机 `os/arch`，互不改写对方产物。`softprops/action-gh-release` 按 tag 汇总资产。

## 验收

- 推送 `v0.0.1` 或在 Actions 里选该 tag 重跑，Release 上出现上表全部安装包
- 资产名符合 `KCode-<version>-<mac|win|linux>-<arch>.<ext>`
- 失败的平台不阻塞其他平台上传；缺包时 Release 保持已成功资产
- Linux job 因缺少 `bsdtar` 失败时，视为 CI 编排缺陷，不是打包脚本缺陷
- mac x64 job 必须能在 `macos-15` 上结束，不能无限排队 `macos-13`
