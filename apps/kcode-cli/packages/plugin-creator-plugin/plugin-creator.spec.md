# 插件创建器

## 行为

「创建插件」入口只信任官方技能 `plugin-creator@kcode-plugins-official`。该技能由内置包 `apps/kcode-cli/packages/plugin-creator-plugin` filesystem seed，不依赖远端市场。

- 包内必须带齐 official-plugin-definitions 声明的 requiredSeedPaths
- 桌面 Agent 暂存后，glm 旁要有 `packages/plugin-creator-plugin`，否则 Electron 入口目录找不到 seed
- 技能默认启用；创建入口在 skills.list 里找不到该官方技能时提示暂不可用，不静默成功

## 所有者

seed 所有者是 `resolveOfficialPluginRoots` / bundled filesystem seed。创建入口只读 skills.list 投影，不自己装插件。

## 验收

- 仓库内存在 `.kcode-plugin/plugin.json` 与全部 required 脚本/文档
- 启动后 skills.list 含 `plugin-creator@kcode-plugins-official` 且 enabled
- 商店「创建插件」能预填该技能 mention，不再报「插件创建器暂不可用」
