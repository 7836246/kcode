# AskUserQuestion 答案回显（v4 工具卡）实现规范

> 本文档是「AskUserQuestion 工具卡回显用户答案」的完整规范：产品规则、状态所有者、接口与验收场景；自包含，不依赖任何外部文档。
> 源码事实以当前检出的 kcode 仓库为准；本文档与源码冲突时，先对齐本文档再改代码。

## 问题陈述

桌面端 AskUserQuestion 工具卡在用户提交答案后，每个问题下方恒显示「未提供回答」（`chat.askQuestion.noAnswerProvided`），而模型后续 thinking 里能看到真实选择。答案没有丢，是展示层读不到。

期望：单题单选回显所选选项文本；多题每题回显各自答案；多选按产品列表约定用「，」连接；自定义输入回显输入文本；用户未作答而 runtime 自动继续的场景显示「未回答，已自动继续」（`chat.askQuestion.autoContinued`）而不是「未提供回答」。

## 根因

1. **提交与执行侧正常**：客户端以「问题文本」为 key 提交 `answers`，`interaction-broker` 按问题文本重排后经 `modifiedInput` 注入工具输入，handler 正常拿到 `input.answers`。
2. **序列化把结构化输出拍成文本**：AskUserQuestion 定义了 `formatModelContent`，工具结果的 `content` 因此是 `User has answered your questions: "Q"="A"` 这类纯文本；结构化 `answers` 只存在于 handler 的返回对象 `output` 里。
3. **投影层只保留文本**：`buildToolOutput` 只产出 `{ text, display?, truncated? }`，而 AskUserQuestion 从不产出 `display`，`ToolCallRow` 也没有别的结构化 answers 通道；前端桥接取的正是文本。
4. **输入侧没有兜底**：`row.input` 始终是提交前的原始 `questions`（工具入参与模型声明的入参一致），v4 投影不把 `modifiedInput.answers` 回填到行上，因此 `input.answers` 兜底分支永不成立。
5. **前端被设计为不解析模型文本**：`readAskUserQuestionAnswers` 的四种载体（`output.answers` / 旧 `selected` 形态 / `input.answers` / `raw.*`）在 desktop v4 运行时一个都不满足，必然全部落到「未提供回答」。

## 解决方案

只走一条既有通道：**把结构化答案放进工具结果的 `display` 载荷**（`ToolResultDisplayPayload`，kind `ask_user_question`）。这条通道已被生产、持久化、协议校验、前端渲染四层共用，新增一个成员即可，不再造第二条答案通道。

选择它而不是回填 `row.input.answers` 的决定性理由：`row.input` 在冷恢复时来自 durable transcript 的 `part.state.input`，那是模型声明的入参（不含 `answers`）；而 `display` 会随 `completedToolPartMetadata` 写进 tool part 的 `metadata.display`，冷恢复由同一份 metadata 重建，实时链路与 replayable/冷恢复链路因此天然一致。

## 数据流与所有者

单一所有者：**CLI 工具执行结果的结构化载荷**（`ToolResultDisplayPayload`）。其余各层都是它的派生投影，不允许任何一层维护第二份答案真相。

```text
handler output {questions, answers}          ← 唯一答案真相（用户在 elicitation 提交后由 broker 注入）
        │
        ├─ createAskUserQuestionDisplay(output)   ← 唯一构造点（core/tool/executor）
        ▼
ToolExecutionResult.display
        ├── 实时：ToolCallResult 事件 → buildToolOutput → row.output.display ──┐
        └── 持久化：completedToolPartMetadata → part.state.metadata.display    │
                        └── 冷恢复/重连：transcript-hydration 合成同一事件 ───┘
                                                                    ▼
                                        v4 协议校验 → ToolCallRow.output.display
                                                                    ▼
                                        toolCallRowAdapter → raw.display → UI 卡片
```

- **模型可见文本不变**：`output.text` 仍由 `formatModelContent` 决定；display 只是展示载荷，绝不把结构化答案塞进 `text`。
- **两个镜像点必须同步**：`contracts`（zod v3，产出 + 落库校验）与 `packages/shared`（zod v4，v4 协议校验）。少一个成员，strict union 会把整块 display 静默剥掉，卡片退回「未提供回答」——这正是本 bug 的形态。

## 接口

### display 载荷（两侧逐字段一致）

```ts
{
  kind: "ask_user_question",
  answers: Record<string, string>,   // key = 问题原文，与 formatModelContent 的映射同一份
}
```

- `answers` 为空对象 = 用户未作答、runtime 自动继续；**与「没有 display」语义不同**（后者是拒绝/取消/旧数据，卡片显示「未提供回答」）。
- 单值上限 4 KiB（字节，构造侧用 `boundDisplayText` 截断并内联 `...[truncated]`）；两侧 schema 的字符上限取 4096，是 4 KiB 字节的宽松超集，保证不会因协议校验把 display 整块拒掉。
- 问题原文作为 key 不截断：它必须与 `row.input` 的 `questions[].question` 逐字相等才能命中查表。

### 读取（UI）

`readAskUserQuestionAnswers` 增加 `display` 载体，优先级最高；其后仍是既有 `output` / `input.answers` / `raw.*` 分支，旧客户端与旧快照行为不变。取值函数 `getAskUserQuestionAnswerText` 仍是唯一渲染入口。

旧「单条答案」形态（`{type:"answered", selected}` / `{type:"answered_custom", text}`）只携带一个答案、不带问题标识，因此只在「这次请求就问了一个问题」的输入上生效；多题输入下不再把它记到第一题，避免显示一条错位答案。

### 多选分隔符

多选答案在**上游**已被合并成单个字符串：客户端提交时 `join(", ")`，broker 的 `normalizeAnswerValue` 对数组也用 `", "`。因此展示侧在 `multiple` 问题上把这层合并还原成产品列表约定「，」再渲染；这不是解析模型文本，只是把上游合并约定换成展示约定。用户自定义输入里的 `, ` 在同一问题上按列表分隔处理——代价仅是标点，绝不改写单选的自由文本。

## 验收场景

| #   | 场景                     | 期望                   | 覆盖                                     |
| --- | ------------------------ | ---------------------- | ---------------------------------------- |
| 1   | 单题单选提交             | 回显所选选项文本       | producer + 投影 + UI 解析测试            |
| 2   | 多题提交                 | 每题分别回显各自答案   | producer + UI 解析测试                   |
| 3   | 多选提交                 | 各选项以「，」连接     | UI 取值测试                              |
| 4   | 自定义输入提交           | 回显输入文本           | producer + UI 解析测试                   |
| 5   | 无答案自动继续           | 「未回答，已自动继续」 | producer（保留空对象）+ UI 解析返回 `{}` |
| 6   | 冷恢复 / replayable 重放 | 与实时一致             | 落库 schema 往返 + 投影测试              |
| 7   | 拒绝 / 取消 / 旧数据     | 仍「未提供回答」       | 无 display 时回落既有分支                |

## 兼容与迁移

- 纯 additive：新增 display kind，不改任何既有 kind 的字段集（两侧 union 的成员字段表是冻结的）。
- 无 display 的历史行与旧快照不受影响，回落现状。
- 不发 snapshot 版本号变更：`ToolCallRow.output` 形状未变，只是多了一个合法的 display 成员。

## 未覆盖 / 剩余风险

- 若历史会话的 tool part 没有 `metadata.display`（本次修复之前落库的旧数据），冷恢复后仍显示「未提供回答」；只有新产生的会话才带得上该载荷。这是可接受的降级：旧数据本来就没有结构化答案。
- 卡片不单独渲染 display 级截断提示；超长自定义输入由内联 `...[truncated]` 标记自述。
