# 企业微信自建应用通道

## 行为

企业微信以自建应用接入。用户填写 Corp ID、Agent ID、Secret、回调 Token 和 EncodingAESKey。KCode 用 `gettoken` 测连通，用 `message/send` 回推，用 HTTP 回调收消息。

```text
配置保存
  → credentialRef = Secret，webhookSecretRef = EncodingAESKey
  → wecomCorpId / wecomAgentId / wecomCallbackToken 落在 BotConfig
URL 验证 GET /api/bots/wecom/:botId
  → 解密 echostr，原样返回明文
收消息 POST /api/bots/wecom/:botId
  → 验签并解密 XML → parseCallback → 与 Telegram 相同的 bind / 对话路径
  → HTTP 立即返回 success，回复走 message/send
```

- `IBotsService` 仍是唯一提交口。适配器不另建队列。
- 回调必须走可达的 HTTPS 地址（Web/自建 server）。桌面进程不另开公网端口。
- 绑定模型与 Telegram 相同：一个 Bot 绑定一个 `providerUserId`。
- 定时任务回推目标允许 `wecom`。
- 远控弹窗增加企业微信入口。

## 所有者

`createWecomBotProvider` 拥有企业微信 API、加解密和回调解析。`packages/server` HTTP 只转发 GET/POST。`BotConfig` 拥有 Corp/Agent/Token 字段。

## 验收

- 正确口令可加解密并验签；错误签名拒绝，本机配置不变
- `test()` 在 gettoken 成功时通过
- 文本回调解析出 FromUserName 作为 actor，并能发出 message/send
- 未实现的钉钉、Discord 仍显示即将支持
