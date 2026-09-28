# Discord Bot 通道

## 行为

Discord 用 Bot Token 接入。Gateway WebSocket 收 `MESSAGE_CREATE`，REST 发消息。桌面与 Web 都由 Local Host 持有长连接，不依赖公网回调。

```text
保存 Token
  → credentialRef
  → discordChannelRuntime 建立 Gateway
  → Identify（含 MESSAGE_CONTENT intent）
MESSAGE_CREATE
  → 忽略机器人自己的消息
  → parseCallback → 与 Telegram 相同的 bind / 对话路径
回推
  → POST /channels/{channel_id}/messages
```

- `IBotsService` 是唯一提交口。Gateway 运行时只负责连接和投递 payload。
- 一个 Bot 绑定一个 Discord 用户（`providerUserId`）。
- 远控弹窗增加 Discord 入口。
- 钉钉仍为即将支持。

## 所有者

`createDiscordBotProvider` 拥有 REST 与消息解析。`createDiscordChannelRuntime` 拥有 Gateway 生命周期和跨窗口锁。

## 验收

- 无 token 时 Gateway 不启动，状态为凭据缺失
- 解析私聊文本得到 author id 与 channel id
- 机器人自己的消息不进入 parseCallback
