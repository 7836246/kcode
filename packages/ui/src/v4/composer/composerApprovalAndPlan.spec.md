# Composer 批准菜单与计划模式

## 行为

输入框权限选择对齐 ChatGPT 批准菜单；计划模式对齐 Codex Learn，不再和批准项混在同一组单选里。

- 批准菜单只包含 `build` / `edit` / `yolo`。标题是「应如何批准 KCode 操作?」，每项为名称 + 说明，选中项右侧打勾。
- 计划模式不出现在批准菜单里。
- 计划模式放在 `+` 添加菜单的「添加」分区，作为独立开关：点击只切换 `planEnabled`，不插入 mention 或 slash 命令。
- 计划开启后，输入框旁显示 Learn 风格芯片；点击芯片关闭计划。行内编辑输入框不提供该开关。

## 所有者

- `draftConfig.mode` 与 `draftConfig.planEnabled` 仍由 Composer 草稿写入，经 `onSwitchMode` 进入 `useDraftConfigControl`。
- `V4ComposerModeControls` 只投影批准菜单和开启态芯片。
- `ChatPromptActionMenu` 只展示 `+` 菜单开关，不保存第二份计划状态。
- `ConversationComposer` 把草稿上的 `planEnabled` 注入添加菜单；`ChatPromptEditor` 行内编辑路径不传该入口。

## 验收

- 打开权限菜单能看到三条批准项，看不到计划勾选项。
- `+` 菜单在附件之后提供「计划模式」；开启后输入框出现计划芯片，再点芯片即关闭。
- 行内编辑消息时，添加菜单没有计划开关。
- 快捷键循环权限仍只在 `build` / `edit` / `yolo` 之间切换，不把计划算进单选。
