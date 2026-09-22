# 生成指标状态栏只展示当前轮

## 行为

Composer 工具栏中段常驻一枚生成指标状态栏，展示当前 product turn 的「首 token · tok/s · 输出 token」。

- 指标口径是 CLI 采集的权威值，客户端不估算。只统计 `querySource === "main_turn"` 的模型请求。标题生成、压缩摘要、目标校验不计入。
- 首 token = 该轮首个产出内容的主回合请求的 `timeToFirstContentMs`（请求发出 → 首个内容）。负值或非有限值忽略。
- 输出 token = 该轮全部主回合请求 `usage.outputTokens` 之和。
- tok/s = 计时完整的请求的 output token ÷ 这些请求「首内容 → 请求结束」耗时之和。缺计时的请求仍计入输出 token，但不进入 tok/s 的分子或分母。未知耗时不用请求总耗时替代。
- 三者都未知时整枚不展示，不给空胶囊。任一项缺失时只省略该项，其余照常展示。
- 状态栏读 `snapshot.composerTurnMetrics`。该字段为空时整枚隐藏，不回退展示上一轮的数字。
- 生成中 `streaming === true`，绿点有脉冲动画；该轮收口后动画停止、数字保留，直到下一轮或 queue 切段把字段清成 null。`prefers-reduced-motion` 下不播放动画。
- composer 处于窄容器时不展示（由容器查询决定）。胶囊宽度计入 `useComposerToolbarFit` 的溢出，避免把模型名和发送按钮挤出一行。
- 冷恢复的历史轮次没有指标，状态栏为空——只有当轮之后新产生的轮次会带上指标。

## 所有者

- `ProductProjection` 拥有累加器，也拥有下发。`turnHeader.metrics` 是该行收口时的副本。`snapshot.composerTurnMetrics` 是状态栏的当前轮事实，经 `state.updated` 下发。
- 桌面实时链路和手机回放链路读同一份 snapshot 字段。`rows.window` 只有尾部 60 行，窗口外的 `row.upserted` 是空操作，所以状态栏不从行窗口取数。
- `tokensPerSecond` 复用 `@kcode/shared` 的 `calculateOutputTps`。分子只用计时完整的主回合请求，与 Developer Tools 单请求 TPS 同一函数、同一计时窗。
- `resolveTurnMetricsView` 只做空值收口，`buildTurnMetricsSegments` 拥有段落生成与格式化。`TurnMetricsBar` 只做渲染。
- `ConversationComposer` 把 `snapshot.composerTurnMetrics` 交给 `resolveTurnMetricsView`，并作为 `toolbarStatus` 插槽传给 `ChatPromptEditor`。`ChatPromptEditor` 只负责摆位。

## 事件顺序

```text
main_turn model_request_completed
  → 累加器更新
  → turnHeader.metrics（row.upserted，行在窗口内时）
  → snapshot.composerTurnMetrics streaming=true（state.updated）
TurnComplete
  → 同一份数字，streaming=false
TurnStarted 或 queue drain 切段
  → composerTurnMetrics=null
  → 累加器归零
  → 被收口的 turnHeader 保留自己的 metrics 副本
重连 / 回放 snapshot
  → A 区字段仍在，不依赖 header 是否落在尾部 60 行
```

旁路请求（`session_title`、`compact`、目标校验，以及没有 `querySource` 的请求）不改累加器，也不发指标 delta。

## 验收

- 单轮主回合跑完后，工具栏出现「首 token X · Y tok/s · 输出 Z」。同一轮里标题或压缩请求完成后，这三个数不变。
- 缺首内容时延的主回合请求会增加输出 token，不改变 tok/s。
- 第二轮或 queue 切段后、首个主回合请求完成前，状态栏不显示上一段的数字。上一段 turnHeader 上的副本仍在。
- 同一轮内下一次主回合请求完成时，输出 token 与 tok/s 在原位更新，不新增第二枚胶囊。
- 请求报错、未产出内容时状态栏不出现；中止的轮次保留已累加到的数字。
- 切换会话后，状态栏跟随新会话的 `composerTurnMetrics`，不残留上一个会话的数字。
- 尾窗裁掉 turnHeader 后状态栏仍在，后续 `state.updated` 继续更新。
- 窄窗口下状态栏隐藏；刚能放下胶囊时，模型选择器与发送按钮仍留在同一行。
