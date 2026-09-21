# About 窗口产品身份

## 行为

关于窗口展示 KCode 品牌标和产品版本，不展示 Electron 运行时版本。

- Logo：与登录页相同的 K 标
- 版本：仓库根 `package.json` 的产品版本，当前为 `0.0.2`。发版 tag `v*` 去掉 `v` 后必须与该版本及 `@kcode/desktop` 的 `package.json` 一致。
- 开发态不能使用 `app.getVersion()`，unpackaged Electron 会回落到 Electron 版本（如 41.0.3）

## 所有者

`createAboutSnapshot` 是 About 展示版本的唯一投影。来源顺序：调用方显式版本 → 打包 `build-meta.json` → `@kcode/desktop` 的 `package.json` → 编译期 `KCODE_VERSION`。

原生帮助菜单不再提供「问题上报」。该入口与帮助下拉里的官方反馈通道一并隐藏。
