# Composer 提交选型

## 行为

点击发送时，本次请求的模型以 Composer 冻结的 Submission 为准。`ModelSelectionView` 只解析当前草稿意图（账号套餐重映射、档位补全），不保存第二份选型。

- 账号套餐重映射可以改 `providerId`、保留 `modelId`。View 已按当前草稿 `getView({ selection })` 时，提交必须用 View 的 `effectiveSelection`，不能因为 `providerId` 变了就当成过期 View 而发送未映射草稿。
- 切模后 `getView` 尚未跟上时，hook 不会交出上一份 ready View。此时展示仍用草稿；提交门禁因 View 未就绪而挡住。
- View 已就绪但 `effectiveSelection` 为空（`selectionIssue`：账号连接不可用 / provider 或模型找不到）时，不得回落到未解析草稿去发送。
- 已有会话在 `running` / `prewarming` 时，发送前不得 `switchModelConfig`。进行中的回合已冻结 admitted Selection；共享 Session 选型被改掉会污染 subagent、标题生成和 compact。下一回合由 `sendText` 携带的 Submission 应用。
- 空闲已有会话仍可在发送前 best-effort 对齐 runtime。CAS 失败只记日志，不阻断 `sendText`：冻结意图已经足够，且部分成功后抛错会留下「Session 已切、正文被还回输入框」。

## 所有者

- 草稿意图：`useDraftConfigControl` / Composer draft
- 当前草稿的解析结果：目标 Host `ModelSelectionView.effectiveSelection`
- 一次发送的执行配置：`createComposerSubmissionConfig` 冻结的 Submission；CLI `sendText` intent 与 `applySubmissionExecutionState` 消费它
- 共享 Session 选型：仅空闲时由发送前 `switchModelConfig` 对齐；进行中的回合不是它的写入窗口

```text
点击发送
  → View 未就绪：不发送
  → View 就绪且 effectiveSelection 为空：不发送
  → 冻结 Submission（含账号重映射后的 providerId）
  → 会话空闲：best-effort switchModelConfig（失败不阻断）
  → 会话 running/prewarming：跳过 switchModelConfig
  → sendText(intent.modelSelection = Submission)
```

## 验收

- 草稿仍是 `account:zai-individual-coding-plan/glm-4.6`，当前唯一账号是 team 套餐时，提交使用 team 的 providerId。
- 用户刚切到另一供应商、View 仍在加载时，不拿上一份 effectiveSelection 覆盖草稿，发送被挡住。
- View 报 `account-connection-unavailable` 且没有 effectiveSelection 时，发送按钮不可用。
- 回合进行中再切模发送：不调用 `switchModelConfig`；新消息随 sendText 排队，当前回合模型不变。
- 发送前 CAS 连续 stale 或 dispatch 失败：正文照常发出，不把草稿还回输入框。
