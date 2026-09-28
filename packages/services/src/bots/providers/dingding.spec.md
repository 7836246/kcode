# 钉钉企业内部机器人通道

## 行为

钉钉用企业内部应用的 AppKey / AppSecret 接入。Host 通过 Stream 长连接收机器人消息，用 `oToMessages/batchSend`（单聊）或 `groupMessages/send`（群聊）回推。桌面不依赖公网回调。

```text
保存 AppKey + AppSecret
  → dingdingAppKey 落配置，credentialRef = AppSecret
  → dingdingChannelRuntime 换票并连接 Stream
CALLBACK /v1.0/im/bot/messages/get
  → 先 ACK，再 parseCallback
  → 与 Telegram 相同的 bind / 对话路径
回推
  → 私聊 userIds=[staffId]
  → 群聊 openConversationId
```

- `IBotsService` 是唯一提交口。Stream 运行时只负责连接、ACK 和投递 payload。
- 一个 Bot 绑定一个 `senderStaffId`。
- 远控弹窗增加钉钉入口。

## 所有者

`createDingdingBotProvider` 拥有 REST 与消息解析。`createDingdingChannelRuntime` 拥有 Stream 生命周期和跨窗口锁。

## 验收

- 无 AppSecret 时 Stream 不启动
- 解析文本回调得到 staffId；群聊带上 conversationId
- Stream 消息先 ACK 再进入 processProviderCallback
