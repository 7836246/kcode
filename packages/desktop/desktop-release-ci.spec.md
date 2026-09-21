# 桌面多平台发布

## 行为

打 `v*` 标签或手动触发 GitHub Actions `release-desktop` 后，CI 先校验 tag 与产品版本一致，再在对应系统上跑现有 `pnpm bundle:desktop`，把未签名正式包和 electron-updater manifest 上传到同一 GitHub Release。

产品版本只写在仓库根 `package.json` 与 `packages/desktop/package.json`。tag 去掉前缀 `v` 必须等于这两个 version。运行时版本仍来自编译期注入，不读 git。

| 平台 | 安装包 | 更新资产 |
| --- | --- | --- |
| macOS Apple Silicon / Intel | `.dmg` | `.zip`、`.blockmap`、合并后的 `latest-mac.yml` |
| Windows x64 / ARM64 | NSIS `.exe` | `.blockmap`、合并后的 `latest.yml` |
| Linux x64 | `.deb`、`.rpm`、`.AppImage` | `.blockmap`、`latest-linux.yml` |
| Linux ARM64 | `.deb`、`.rpm`、`.AppImage` | `.blockmap`、`latest-linux-arm64.yml` |

- `KCODE_ENV=production`，产物文件名不带 `_TEST`
- 不启用 Apple / Windows 签名和公证；本机打开 macOS 包仍按 README 去掉隔离属性
- 不另写打包实现，只调度 `packages/desktop/scripts/bundle.mjs`；打包必须带 `--publish never`，避免矩阵 job 各自往 GitHub 发 Release
- Linux 仍会多打 `.pkg.tar.zst`（electron-builder 现有 pacman target），Release 一并挂上。CI 必须安装 `libarchive-tools`（`bsdtar`），否则 fpm 打 pacman 会以 127 退出，deb/rpm/AppImage 也一起失败。
- macOS Intel 在 `macos-15` 上交叉打 x64。不要用已排队枯竭的 `macos-13` Intel runner。
- mac / Windows 同名 `latest-*.yml` 在 publish job 合并；Linux 按 electron-builder 约定分文件：x64 是 `latest-linux.yml`，arm64 是 `latest-linux-arm64.yml`，不得把 ARM 清单改名或并进 x64 文件。同名安装包不得互相覆盖
- tag 含 `-`（如 `v0.0.2-preview.1`）时 Release 标为 prerelease，供正式包的 preview 开关消费

## 所有者

`release-desktop` workflow 是发布编排的唯一入口。`scripts/check-release-tag-version.mjs` 是 tag 与 package.json 对齐的唯一校验。每个 bundle job 只打本机 `os/arch`。`collect-github-release-assets.mjs` 汇总资产并合并 manifest。`softprops/action-gh-release` 按 tag 上传。

## 验收

- tag `v0.0.1` 而 package.json 仍是 `0.0.2` 时，CI 在打包前失败
- 根目录与 `@kcode/desktop` 的 version 不一致时，CI 在打包前失败
- 推送匹配的 `v*` tag 或在 Actions 里选该 tag 重跑，Release 上出现上表安装包、zip/blockmap 与对应 `latest*.yml`
- Linux ARM64 job 必须接受 `latest-linux-arm64.yml`；只认 `latest-linux.yml` 视为编排缺陷，安装包即使打完也不能当成功
- 资产名符合 `KCode-<version>-<mac|win|linux>-<arch>.<ext>`
- 失败的平台不阻塞其他平台上传；缺包时 Release 保持已成功资产
- Linux job 因缺少 `bsdtar` 失败时，视为 CI 编排缺陷，不是打包脚本缺陷
- mac x64 job 必须能在 `macos-15` 上结束，不能无限排队 `macos-13`
