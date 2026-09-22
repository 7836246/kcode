# 生成指标状态栏只展示当前轮

## 行为

Composer 工具栏中段常驻一枚生成指标状态栏，展示当前会话最后一轮的「首 token · tok/s · 输出 token」。

- 指标口径是 CLI 采集的权威值，客户端不估算：首 token = 该轮首个产出内容的模型请求的 `timeToFirstContentMs`（请求发出 → 首个内容）；输出 token = 该轮全部模型请求 `usage.outputTokens` 之和；tok/s = 输出 token ÷ 各请求「首内容 → 请求结束」耗时之和。
- 三者都未知时整枚不展示，不给空胶囊。任一项缺失时只省略该项，其余照常展示。
- 只跟随 row window 里的最后一条 `turnHeader`。该轮没有指标时整枚隐藏，不回退展示上一轮的数字。
- 生成中在绿点上有脉冲动画；该轮收口后动画停止、数字保留。`prefers-reduced-motion` 下不播放动画。
- composer 处于窄容器时不展示（由容器查询决定），不参与 `useComposerToolbarFit` 的折叠优先级竞争。
- 冷恢复的历史轮次没有指标，状态栏为空——只有当轮之后新产生的轮次会带上指标。

## 所有者

- `turnHeader.metrics` 是唯一数据源，由 CLI `ProductProjection` 拥有：`accumulateTurnMetrics` 在每次 `model_request_completed` 后累加，`upsertTurnMetrics` 负责下发（值未变不发 delta），`upsertTurnHeader` 与 `splitProductTurn` 负责轮收口时定稿。
- `tokensPerSecond` 复用 `@kcode/shared` 的 `calculateOutputTps`，与设置页用量统计、Developer Tools 的 TPS 列同一口径。
- `resolveTurnMetricsView` 拥有「取哪一轮」，`buildTurnMetricsSegments` 拥有段落生成与格式化；`TurnMetricsBar` 只做渲染，不持有状态、不订阅 store。
- `ConversationComposer` 把 `snapshot.rows.window` 交给 `resolveTurnMetricsView`，并作为 `toolbarStatus` 插槽传给 `ChatPromptEditor`；`ChatPromptEditor` 只负责摆位。

## 验收

- 单轮对话跑完后，工具栏出现「首 token X · Y tok/s · 输出 Z」，数值与该轮 Developer Tools 的对应行一致。
- 第二轮首个模型请求完成前，状态栏不显示第一轮的数字。
- 同一轮内第二次模型请求完成时，输出 token 与 tok/s 在原位更新，不新增第二枚胶囊。
- 请求报错、未产出内容时状态栏不出现；中止的轮次保留已累加到的数字。
- 切换会话后，状态栏跟随新会话的最后一轮，不残留上一个会话的数字。
- 窄窗口下状态栏隐藏，模型选择器与发送按钮不被挤压换行。
