# 欢迎页保存 API Key 后先测通

## 行为

欢迎页点「继续」时，先写入所选供应商的 API Key，再用该供应商的第一个模型做一次连通性探测。测通后才进入工作区。测不通留在欢迎页，并按 Key、接口地址、模型分开说明。

```text
继续
  → 若本会话已经创建过供应商，先删掉那一条
  → createPersonalProvider
  → 取该供应商第一个模型
  → ensureConversationWorkspace（幂等，作为探测 cwd）
  → testModelConnectivity
  → 成功才 markApiKeyLoginSuccess 并离开欢迎页
```

- 跳过不删除已创建的供应商，也不发起探测。
- 同一轮欢迎页里再次继续，会删掉上一次创建的供应商再重建，避免留下两把 Key。
- 删除失败时保留上一条，不继续创建。
- 创建失败时清掉本会话记录，下一次继续重新创建。
- 没有默认模型时留在欢迎页，归为模型失败。
- 当前环境没有探测能力时，保存成功即可进入，不把缺能力当成 Key 错误。
- 本地工作区目录创建失败时留在欢迎页，保留刚创建的供应商，文案用通用失败而不是 Key 错误。

## 所有者

供应商配置只由 `providerSettingsService` 写入。探测 cwd 只来自 `fileService.ensureConversationWorkspace`。欢迎页不另存一份 Key。

## 验收

- Key 被拒绝时不离开欢迎页，文案指向 API Key。
- 地址不可达时文案指向接口或网络，不说成密钥错误。
- 没有模型时文案指向模型，并仍可跳过。
- 探测成功后才完成欢迎页。
