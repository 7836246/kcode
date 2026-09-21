# CLI 帮助里的权限默认值

## 行为

`kcode --help` 单独写出权限默认值：

- 交互 TUI 默认逐次确认。
- 只传 `--prompt` 且不写 `--mode` 时使用 `yolo`。普通工具不再逐次确认，可以改文件、执行命令并访问网络。
- 需要确认时显式写 `--mode build`。

中文和英文帮助都包含这段说明。

## 所有者

文案在 CLI i18n 的 `cli.help`。`run.ts` 里的 `DEFAULT_HEADLESS_PROMPT_MODE` 仍是 `yolo`，帮助只说明这个默认值，不另设一套模式。
