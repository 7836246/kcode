# 备用模型自动续跑

当前会话选中的模型是这一回合的主模型。工作区可以另存一条有序备用链，最多 3 个，身份键是 `workspaceIdentity?.trim() || workspacePath`。

## 所有者

- 备用链的持久事实在 AppSettings.`modelFallbackByWorkspace`。设置页写入，会话创建和 `setModelFallbackChain` 把它交给当前 runtime。
- 这一回合实际使用的模型属于 turn loop 的 `state.model`。换模型只发生在同一次 turn 的下一次 model step，不新开回合，也不回滚已经写入的工具结果。
- 换成功后，runtime 把会话选型改成备用模型并发布 `ModelSelected`（`origin: "turnFallback"`）。输入栏因此显示实际模型；下一条用户消息也用它，直到用户再选。

## 何时换

同一模型的请求重试先在 adapter 里用完。最终错误仍抛到 turn step 时才考虑备用。

可换原因：`timeout`、`stream_idle_timeout`、`stale_connection`、`rate_limited`、`provider_overloaded`、`server_error`。没有 reason 时，HTTP 429 视为限流，408/504 视为超时，其余 5xx 视为服务端错误。

不换：取消、鉴权失败、鉴权刷新、上下文超限、非法请求（含内容拒绝）、本地未配置、代理和 TLS 错误。原因不明也不换。

备用链按顺序取下一个，跳过当前模型和本回合已经试过的模型。创建备用模型失败时保持原错误，不改选型。

## 事件顺序

```text
model step 失败（可换）
  → 丢弃这次尚未提交工具结果的 assistant 占位
  → state.model 换成下一个备用
  → 持久化会话选型 + ModelSelected(turnFallback)
  → 投影更新 config，并带 modelTransition
  → 同一 turn 的下一次 model step 用新模型，历史工具结果仍在
```

`modelSelectionScope === "execution"` 的执行锁只改本 loop 的 `state.model`，不改用户保存的会话选型，也不发切换事件。

桌面实时链路和手机重放都消费同一条 `ModelSelected`。手机从快照里的 config 与 modelTransition 恢复，不另建一条业务队列。
