# 受管 system-role 入口

## 行为

KCode 自带 Keysmith 那条「真 system-role」路径，不再给打包 runtime 打补丁。

- 产品开关是设置里的「自定义系统角色」，默认关闭。`AppSettings.managedSystemRoleEnabled` 是 UI 状态；`~/.kcode/system-role.json` 的 `enabled` 是 Agent 读取的投影。
- 仅当开关打开且 `~/.kcode/system-role.md` 有非空正文时，才作为 `customSystemPrompt` 进入 system 段。`KCODE_SYSTEM_ROLE_FILE` 改正文路径，`KCODE_SYSTEM_ROLE_ENABLED` 可覆盖开关。
- 首次打开开关且正文文件不存在时，写入一份默认模板。关闭开关保留正文，只停用注入。
- 开关打开后，设置页提供编辑/预览。草稿只在页面里；保存才写 `system-role.md`。预览看的是当前草稿，不是第二份正文。空正文保存后不再注入。
- 工作流子代理（`workflowActor`）不读这份文件，保持与 `customSystemPrompt` 互斥。
- 受管提示词生效时，`AGENTS.md` / Project Memory 只描述环境，不能覆盖 system-role。
- 不读账号、密钥。新开对话才生效。

## 所有者

- `AppSettings.managedSystemRoleEnabled` 是设置页开关的唯一状态。
- `settingService.update` 负责把开关投影到 `~/.kcode/system-role.json`，并在首次开启且正文缺失时写入模板。投影失败不能回滚已经写入的 `setting.json`。
- `readManagedSystemRoleContent` / `writeManagedSystemRoleContent` 是设置页读写正文的唯一入口。
- Electron Host / Agent 不热替换设置写入路径；设置页 HMR 出现开关后，必须重启桌面进程才能真正落盘。
- `readManagedSystemRole` 是 Agent 读盘与清洗的唯一入口；文件本身不能开启模式。
- `createContextBuilderFromSnapshot` 决定是否把它交给 ContextBuilder。
- ContextBuilder 继续拥有段落顺序；`buildRequestUserContextSection` 只按是否已有自定义 system prompt 切换 AGENTS.md 措辞。

## 验收

- 开关默认关闭。即使已有 `system-role.md`，未打开开关也不注入。
- 打开开关后若正文文件不存在，写入默认模板。关闭开关保留正文。
- 打开开关后可以编辑、预览并保存正文；未保存的草稿不进入新对话。
- 开关打开且正文非空时，新对话的 system 段出现该正文；默认 CLI prefix 和「You are KCode」身份段都不再出现。
- 同一情况下 AGENTS.md 不再出现 `OVERRIDE any default behavior`。
- 没有该文件或开关关闭时，默认身份和 AGENTS.md 覆盖句保持原样。
- 带 `workflowActor` 的子代理会话不读该文件。
