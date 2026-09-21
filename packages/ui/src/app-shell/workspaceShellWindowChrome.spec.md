# 桌面内容卡圆角

## 行为

桌面工作区和设置页的右侧内容卡对齐 ChatGPT 设置那种悬浮白卡：近白侧栏、四周 4px 留白、16px 圆角。

- 会话、终端、Side Pane、设置内容框共用 `16px`（`rounded-2xl`）
- 侧栏与内容卡之间也保留 4px，四角都收圆，不再贴死导航
- 内容卡是布局框，不计入内部卡片圆角层级
- Linux 外壳用 `20px`，与 `16px` 内卡加 `4px` inset 同心
- Windows 10 同样画完整圆角：卡已内缩，不再冒充窗口外沿

深色主题只跟半径和留白，不改色。

## 所有者

`resolveWorkspaceShellPanelRadiusPx` / `resolveWorkspaceShellWindowChromeClass` 是桌面内容卡半径的唯一来源。设置页复用同一套 class，不各自写 `5px` / `xl`。

## 验收

- 设置页和工作区右侧白卡四角都是 16px
- 侧栏与白卡之间能看到近白底
- Windows / macOS / Linux 半径一致
- 最大化窗口仍保留完整圆角和边框
