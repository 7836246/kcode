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
- 设置「通用」有「显示生成指标」开关（`composerTurnMetricsVisible`，默认开）。关掉后工具条不渲染胶囊；CLI 仍写入 `snapshot.composerTurnMetrics`，只是展示层不读。缺省或旧配置按开启兼容。
- 胶囊宽度计入 `useComposerToolbarFit`。整行溢出时先把胶囊收成 `h-7` icon（保留绿点语义：生成中脉冲；tooltip / `aria-label` 仍是完整「首 token · tok/s · 输出」），再收左侧文案，最后才截断或图标化模型名。不再用容器查询把整枚藏掉。
- 胶囊高度与工具条其他入口一致（`h-7`），内部 `items-center`；工具条是 `items-end`，高度对齐后底部与「完全访问权限 / 增强提示词 / 模型」同一条线。
- 冷恢复的历史轮次没有指标，状态栏为空——只有当轮之后新产生的轮次会带上指标。

## 所有者

- `ProductProjection` 拥有累加器，也拥有下发。`turnHeader.metrics` 是该行收口时的副本。`snapshot.composerTurnMetrics` 是状态栏的当前轮事实，经 `state.updated` 下发。
- 桌面实时链路和手机回放链路读同一份 snapshot 字段。`rows.window` 只有尾部 60 行，窗口外的 `row.upserted` 是空操作，所以状态栏不从行窗口取数。
- `tokensPerSecond` 复用 `@kcode/shared` 的 `calculateOutputTps`。分子只用计时完整的主回合请求，与 Developer Tools 单请求 TPS 同一函数、同一计时窗。
- `resolveTurnMetricsView` 只做空值收口，`buildTurnMetricsSegments` 拥有段落生成与格式化，`isComposerTurnMetricsVisible` 只读展示开关。`TurnMetricsBar` 只做渲染与开关门。
- `ConversationComposer` 把 `snapshot.composerTurnMetrics` 交给 `resolveTurnMetricsView`，并作为 `toolbarStatus` 插槽传给 `ChatPromptEditor`。`ChatPromptEditor` 只负责摆位；窄宽折叠由 `useComposerToolbarFit` 写 `data-composer-compact`。

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
- 关掉「显示生成指标」后工具条没有胶囊；再跑一轮也不出现；重开后有数就显示。
- 窗口变窄到放不下完整胶囊时，胶囊先变成 icon，发送按钮与模型仍在同一行；hover / 焦点能读出三个数。再窄才轮到模型收成 icon。
