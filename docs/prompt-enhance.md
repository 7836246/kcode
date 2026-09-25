# 提示词增强（Prompt Enhance）实现规范

> 本文档是「提示词增强」功能的完整规范：产品规则、状态所有者、接口与验收场景；自包含，不依赖任何外部文档。
> 源码事实以当前检出的 kcode 仓库为准；本文档与源码冲突时，先对齐本文档再改代码。

## 问题陈述

用户在输入框里写草稿时，经常表达含糊、信息不足，直接发送后得到的回答质量不稳定。用户希望点一下按钮，让模型把草稿改写成更好的提示词并原地替换回输入框，发不发仍由自己决定；不满意可以一键退回原文。

## 解决方案

在 composer（v4 输入区）工具条上新增「增强 / 还原 / 设置」三个入口。点「增强」后，按设置里选择的改写模式（三档）拼装提示词，调用模型得到改写结果，原地替换草稿，绝不自动发送。改写前的原文保存为还原点，「还原」一键退回。设置页新增「提示词增强」分区管理全部选项，界面只保留必要说明文字。

## 用户故事

1. 作为用户，我想在写完草稿后点一下「增强」，让草稿被模型改写成更清晰的提示词，这样我不用自己琢磨措辞。
2. 作为用户，我想改写结果直接替换输入框里的草稿，这样我不需要复制粘贴。
3. 作为用户，我想增强后由我自己决定发不发送，这样改写结果不会未经确认就发出去。
4. 作为用户，我想在草稿为空时得到明确提示而不是静默失败，这样我知道为什么没反应。
5. 作为用户，我想增强期间按钮显示「增强中 + 已耗时秒数」，这样我知道请求在进行、还要等多久。
6. 作为用户，我想增强期间再点一次按钮就能取消请求，这样我改主意了不用干等。
7. 作为用户，我想取消后迟到的响应不会覆盖我后来手改的草稿，这样我的输入不会丢。
8. 作为用户，我想增强成功后看到轻量提示并带耗时，这样我知道这次改写完成了、花了多久。
9. 作为用户，我想看到这次增强实际用的是哪个模型，这样我知道改写是谁做的。
10. 作为用户，我想在不满意改写结果时点「还原」退回增强前的原文，这样我可以重来。
11. 作为用户，我想「还原」只在存在可还原内容时才出现，这样工具条平时保持干净。
12. 作为用户，我想在自己手改过增强结果之后「还原」被拒绝并说明原因，这样我的手改内容不会被覆盖。
13. 作为用户，我想请求失败、超时或模型返回空内容时草稿保持原样并得到错误提示，这样我不会丢草稿。
14. 作为用户，我想回填失败时绝不留下半截文本，这样我的草稿要么完整更新、要么完整保留。
15. 作为用户，我想输入框含附件、引用、@提及 时默认拒绝增强覆盖，这样结构化内容不会被静默毁掉。
16. 作为用户，我想能在设置里显式放开第 15 条的限制，这样我确认后果后仍可增强纯文本。
17. 作为用户，我想在三种改写模式（基础 / 编程任务 / 创意）中选择，默认是基础，这样不同场景用不同力度。
18. 作为用户，我想让改写参考最近几轮对话来消解「那个」「刚才那个报错」这类指代，这样增强结果更贴合上下文。
19. 作为用户，我想能关掉上下文参考、或调整参考轮数（默认 3 轮），这样我可以控制背景注入。
20. 作为用户，我想模型通道默认跟随 kcode 当前生效的模型，这样我不用重复配置。
21. 作为用户，我想改 kcode 的模型配置后增强通道自动跟随，这样我不用手动同步。
22. 作为用户，我想能为增强单独指定一个已配置的 provider 和模型，这样我可以用便宜的模型做改写。
23. 作为用户，我想独立通道下能调推理强度（低/中/高/默认），这样我可以在速度和质量间权衡。
24. 作为用户，我想在设置里看到当前实际生效的通道与模型名，这样我一眼知道改写会走哪里。
25. 作为用户，我想在设置里只读查看当前模式实际使用的提示词正文，这样我知道草稿是怎么被指令改写的。
26. 作为用户，我想设置项改动立即生效并持久化，重启应用后仍在，这样我不用重复配置。
27. 作为用户，我想设置面板有「恢复默认」，这样我可以一键回到初始状态。
28. 作为用户，我想设置界面干净、没有成片的说明小字，这样我能快速读完每个选项。
29. 作为用户，我想桌面端和手机 Web 端都能用增强功能，这样行为在各端一致。
30. 作为用户，我想增强的任何异常都只以提示形式出现，应用本身不崩溃不卡死，这样主流程永远可用。

## 实现决策

### 模块划分

- **设置 schema**：`packages/shared` 的 appSettings 校验 schema 增加 `promptEnhance` 嵌套对象（见下「设置数据形状」），patch schema 同步。`AppSettings` 类型随 schema 推导更新。
- **提示词常量与拼装**：新目录 `packages/ui/src/v4/composer/promptEnhance/`，含 8 个纯模块：`prompts.ts`（模板正文与展示用拼装）、`compose.ts`（占位符替换、背景前置、消息组装）、`gates.ts`（结构化闸与还原闸）、`runTracker.ts`（活动 run 与递增 runId）、`operationId.ts`（跨进程取消句柄生成）、`request.ts`（请求参数组装与请求级超时常量）、`settings.ts`（设置补齐与整对象写回）、`selection.ts`（通道解析）。全部不依赖 React，可独立测试；对 `@kcode/shared`、`@kcode/services` 只用 type-only 导入，保证 `tsx --test` 直接加载。
- **Composer 入口**：新组件 `PromptEnhanceActions` 挂进 `ConversationComposer` 的 `leadingActionsNode`（与模式切换、CUA 入口同簇）；新 hook `usePromptEnhance` 承载增强流程状态机。
- **设置分区**：新文件 `packages/ui/src/settings/PromptEnhanceSection.tsx`（自包含模式，先例：`ModelFallbackSetting` / `ProactiveSuggestionsSetting`），注册进设置导航（`SettingsSectionId` 增加 `"promptEnhance"`，分组 `basics`）与 SettingsPage 条件渲染链。
- **i18n**：`zh-CN.ts` 与 `en-US.ts` 两个 locale 文件同步增加 `settings.promptEnhance.*` 与 `chat.toolbar.promptEnhance.*` 文案；无引用的旧 `chat.promptEnhance.*` 一并删除。

### 状态所有者

- **草稿文本**：沿用现有双层结构——composer 本地 `text`/`textRef` + per-session 草稿 owner `useDraftConfigControl`（`updateComposerContent`）。增强回填走「编辑器句柄 `setText` + `updateText` + `updateComposerContent`」三连，与发送失败回滚（`restoreSubmittedDraft`）使用同一组写入路径。
- **还原点**：composer 组件内 ref（内存态，随组件卸载消失），内容为「增强前原文 + 增强结果」两个字符串。不持久化、不进 store。跟随草稿生命周期：草稿 scope 变化、或草稿被清空（发送成功 / 手动清空）即刻失效——否则会留下一个点了必然被拒的「还原」。
- **设置**：appSettings（`~/.kcode/v2/setting.json`，经 `ISettingService.update(patch)` 原子写盘）。不新增 localStorage 状态。
- **进行中的请求**：hook 内 ref 持有 run tracker；「当前是否有活动 run」与「单调递增的 runId」是两件事，必须分开——用墓碑占位活动 run 会让取消后的下一次点击继续被判成取消，按钮再也发不出请求。runId 只用于丢弃迟到响应，且只增不复用。
- **取消句柄**：每次增强生成一个可序列化的 `operationId`（`promptEnhance/operationId.ts`），随 `generateWorkspaceText` 一起下发给 Host。hook 用一个 ref 持有「这次请求怎么取消」（operationId + 发起时的 workspace target），发起时固化、作废或正常结束时释放，取消 = 作废 run + 调 `kcodeAgentService.cancelWorkspaceGenerateText`。句柄必须固化 target：scope 变化后组件读到的是新 target，按新 target 发取消会打到另一台 Host 并返回 `cancelled:false`，旧请求继续跑到超时；发起与取消的 target 共用 `buildPromptEnhanceWorkspaceTarget`，避免两处字段漂移。取消是 best-effort：`cancelled:false`（进程已回收 / 请求已结束）与取消 RPC 失败各留一条 `warn` 轨迹，但用户可见结果不变（草稿不动 + toast「已取消」）。**不能靠 AbortSignal**：RPC 实参按 JSON 序列化（见 `packages/rpc/src/serialization.ts` 的 Object fallback），`AbortSignal` 没有可枚举字段，跨进程到服务侧只剩 `{}`，服务里 `params.signal?.addEventListener` 直接抛 `is not a function`。`signal` 字段仍留在服务接口上给同进程调用方用（当前仓库已无调用方传它，Git 提交消息生成也不传），跨进程一律走 `operationId`。
- **草稿 scope 防护**：composer 用固定 key 跨 session 复用，因此 scope（`workspaceKey\0sessionId`）变化时会主动作废在途请求并清掉还原点——否则新会话会继承上一个草稿的「还原」按钮和一个不会结束的「增强中」。请求区间内 scope 变化时，迟到的结果一律丢弃：不回填、不立还原点。切会话/切草稿后 composer 属于另一个草稿 owner，回填会直接污染新会话的草稿。
- **设置写入形状**：`ISettingService.update` 只做外层浅合并（`{ ...current, ...patch }`），嵌套对象是整体替换。因此写回必须提交完整 `promptEnhance` 对象（`mergePromptEnhanceSettingsPatch`），只交单个字段会被 schema 默认值重置掉用户其它选择。

### 设置数据形状

```
promptEnhance: {
  mode: "basic" | "coding" | "creative"          // 默认 "basic"
  contextEnabled: boolean                           // 默认 true
  contextRounds: number, 整数 1–10                  // 默认 3
  allowStructuredOverwrite: boolean                 // 默认 false
  channel: "auto" | "custom"                        // 默认 "auto"
  customSelection?: { providerId: string, modelId: string }  // 仅 custom 通道
  reasoningLevel: "default" | "low" | "medium" | "high"      // 默认 "default"，仅 custom 生效
}
```

整个对象带 schema 默认值；patch schema 中各字段 optional。「恢复默认」= 写一个全默认值的 patch。

### 模型调用

- 统一复用现有 `kcodeAgentService.generateWorkspaceText`（Git 提交消息生成同款链路），`querySource` 固定为 `"prompt_enhance"`，调用方传 `operationId`、`maxOutputTokens` 与 `requestTimeoutMs`（请求级 60s）。**不新增 CLI 协议方法、不新增裸 HTTP 客户端。**
- **CLI 执行链走流式累积**：`workspace/generateText`（CLI core 的 `generateWorkspaceTextImpl`）此前用 `model.generateText`（AI SDK 非流式 `doGenerate`）。实测部分 openai-compatible 网关的非流式响应包在自定义信封里（如 `{"success":…,"data":…}`），AI SDK 按标准 OpenAI 形状做 schema 校验失败后统一报 `Invalid JSON response`，经失败归类器到 UI 只剩 "Model request failed."；同一网关的流式 SSE 是标准格式（主回合与连通性探测都走流式）。因此该入口改为 `model.streamText` 流式累积出等价结果（text / finishReason / usage / toolCalls，见 `workspace-generate-text-accumulate.ts`），结果形状与非流式返回值一致；Git 提交消息同一入口一并受益。取消不受影响：仍是 operationId → AbortController，流式下中断更及时。
- **取消通道**：CLI 侧早在 `workspace/generateText` 的 `operationId` 上登记 AbortController（`bootstrap/src/kcode-protocol/server.ts` 的 `withWorkspaceGenerateTextSignal`），`workspace/cancelGenerateText` 按 id 触发。本次只把这条既有能力接到服务面：`KCodeAgentGenerateWorkspaceTextParams` 增加可选 `operationId`（Host 优先用它，缺省时才按 `signal` 自造 uuid），并新增 `cancelWorkspaceGenerateText(params)` 服务方法（控制面 best-effort，超时 5s；目标 workspace 无活跃 Agent 进程时直接返回 `cancelled: false`，不为此启动进程）。UI 因此不新增任何本地进程内状态。
- **请求必须自带输出预算**：CLI 的模型校验把「请求没给 `maxOutputTokens`」与「超出模型上限」判成同一个错误（`maxOutputTokens is outside the model option range`，见 `adapters/src/model/model.ts` 的 `validateOptions`），而唯一权威上限在 CLI 进程的 `optionSpecs` 里。因此 UI 从 Selection View 的完整 Model Config 读模型声明的上限（`config.optionSpecs.maxOutputTokens.max`）直接作为请求预算——与 `workspace/generateText` 非 git 分支的既有口径一致（普通 Turn 会再按剩余上下文窗口收窄，辅助改写请求没有这个必要）。模型视图还没就绪时增强入口直接禁用（此时构造不出合法请求）；视图就绪但模型已不在已发布列表时不发请求，提示用户重选。
- **选型必须满足模型的档位契约**：Registry 校验拒绝「options 里没有 reasoningLevel」与「档位不在模型 `optionSpecs.reasoningLevel.values` 内」（`reasoning-level-missing` / `reasoning-level-not-supported`）。所以自动通道沿用当前生效档位、独立通道用设置档位，两者都要落到模型声明的档位集合上：设置里的 `"default"` 表示「交给模型默认档」（Model Config 末位即默认档），显式档位不被支持时同样回落到模型默认档并留一条 `warn`（不静默：轨迹里能看到被替换掉的档位）。
- **自动通道**：基准选型取 `modelSelectionView.preferredSelection`。模型配置变化自动跟随；OAuth 类 provider 由 CLI runtime 自身处理鉴权，无需回落逻辑。
- **独立通道**：基准选型取设置中的 `customSelection`（必须是 Registry 已发布模型；设置 UI 从 provider/model 视图读取候选，天然满足）。只下发 provider/model/档位，不携带设置里的其它字段。
- 调用结果须带回实际使用的模型名，用于成功提示与设置页「当前生效通道」展示。

### 增强流程

```
 点「增强」
 ├─ 草稿为空 → toast「草稿为空」，停止
 ├─ 结构化内容闸未通过 → toast 说明，停止（见下）
 ├─ 取草稿纯文本（编辑器句柄 getMarkdown，回退 textRef）
 ├─ contextEnabled 且会话有历史 → 从 composer 现有投影 snapshot 取最近 N 轮
 ├─ 拼装 system + user 消息（见「提示词与拼装」）
 ├─ generateWorkspaceText（runId+1 并生成 operationId，记录发起时 scopeKey）
 │    ├─ 用户再点按钮 → 作废 run + 按 operationId 发取消，toast「已取消」，迟到响应按 runId 丢弃
 │    ├─ scope 变化 → 同样作废并取消，结果不回填、不立还原点
 │    ├─ 失败 / 超时 / 空内容 → toast 错误原因，草稿不动
 │    └─ 成功 → 回填三连 → 读回比对
 │         ├─ 比对失败 → 写回原文，toast 失败
 │         └─ 比对通过 → 立还原点，toast 成功 + 耗时 + 模型名
点「还原」
 ├─ 当前文本 ≠ 增强结果 → 拒绝，清还原点，toast 说明（用户手改过）
 └─ 一致 → 写回原文，清还原点
```

回填三连顺序与 `restoreSubmittedDraft` 一致：`updateComposerContent({ text })` → 编辑器句柄 `setText` → `updateText`。读回比对用编辑器 `getMarkdown()`，比对前只做 CRLF 与首尾空白归一化；写入抛异常或读回不一致都按「回填没有完整落地」处理：写回原文，不留半截文本。「还原」走同一条安全写入路径，写失败只记日志并提示，不让异常逃出点击回调。

读回比对成立的前提是 `setText` 同步提交：Lexical 的非 discrete `update` 是批量异步提交，写后立即 `getMarkdown()` 读回的是旧 state，比对必然失败并把原文写回（用户表现为「写入输入框失败，草稿保持不变」，而模型调用实际成功）。因此 `LexicalChatInput` 的 `replaceEditorText` 必须带 `discrete: true`（`setText` 契约 = 调用返回即已落地）；比对恒等性依赖 `$getPromptMarkdown` 是纯序列化（无 markdown 转义），纯文本写入往返恒等，这条由「还原闸一致才放行」的手动验证兜底。

### 结构化内容闸

发送前的结构化内容分四类：文件附件、代码评论 / 网页元素 / PPT 元素引用、对话选区引用、Lexical mention 节点（markdown 中表现为 `[label](uri)` 链接）。任一存在时默认拒绝增强并 toast 说明。`allowStructuredOverwrite` 开启后放行，但 mention 节点会被替换为纯文本——这是设置里唯一保留的说明文字之一。判定复用 composer 现有的 `hasAttachments` / `hasContexts` / `hasReferences` 聚合，mention 判定用现有 `parseMentionMarkdown`。

已知边界：`parseMentionMarkdown` 除了链接形态，还会把 `$技能`、`/命令`、`@子代理`、`#sess_*` 这类行内 token 认成 mention，因此「解释一下 $PATH」「看看 /tmp 目录」这种纯文本草稿也会被拦下。这是有意的保守取舍：真 mention 节点（尤其子代理）序列化后就是普通 token，无法和用户手打区分，误放行会把结构化引用静默降级成纯文本。提示语明确列出会受影响的内容类型，需要时由 `allowStructuredOverwrite` 放开。

### 取对话背景

- 直接读 composer 已有的投影 `snapshotRef.current?.rows.window`，不再 `layer.acquire(sessionId)`：`SessionPane` 已经持有该 session 的 lease 并把 snapshot 传进 composer，二次 acquire 只是给同一条投影加一个订阅者，还会多出一份需要配平的生命周期。
- 点击时经 ref 读取 rows（而非把 snapshot 灌进 `leadingActions` 的 memo 依赖）：流式期间 snapshot 每个 chunk 都换引用，直接依赖会让整簇工具条按钮跟着重建。
- 过滤：`kind === "userInput"` 且 `origin === "realUser"`；`kind === "assistantText"` 且 `state === "complete"`。按 rowId 顺序取最近 N 轮（一轮 = 一条用户 + 一条助手，助手缺失时只取用户）。非 `realUser` 的 userInput 也断开轮次，避免其后的助手正文被错挂到上一个用户轮。
- 单条文本截断到 500 字符，避免背景膨胀。
- 上下文一律前置到用户消息开头，固定抬头，与正文空行隔开；行内用「用户：」「助手：」标注角色，否则模型无法区分指代来自用户还是上一轮回答：

  ```text
  【前序会话背景（仅作理解指代参考，切勿回答历史问题）】
  用户：<上下文文本>
  助手：<上下文文本>

  <拼好的用户消息>
  ```

- 开关关闭或无历史时整段不拼，不留空抬头。三个档位的模板里都不出现背景占位符。

### 提示词与拼装

三档的展示名为「基础 / 编程任务 / 创意」，内部枚举值为 `basic` / `coding` / `creative`；模板正文逐字固定（含模板内自称，如「基础优化助手」），不随展示名改动。「编程任务」档面向编程助手语境，名字本身即定位说明，设置界面不再附加解释。

占位符规则：

| 占位符        | 含义                                                     | 用途                             |
| ------------- | -------------------------------------------------------- | -------------------------------- |
| `{input}`     | 草稿原文                                                 | 直接嵌入草稿作为正文             |
| `{inputJson}` | 草稿的 JSON 字符串字面量（带引号、换行与特殊字符已转义） | 草稿放进外层 JSON 结构时必须用它 |

- 替换必须是字面量替换（函数式 `replaceAll` 或等价手段），草稿含 `$&`、`$'`、引号、换行时不得被二次解释。
- 三档共同前提：**输出语言与草稿语言严格一致**；**只输出改写后的提示词正文**——不要前言、不要引导语、不要 Markdown 代码块围栏、不要解释。

三档模板正文如下，原样使用：

#### 基础（默认档，`basic`）

系统提示词：

```text
# Role: 用户提示词基础优化助手

## Profile
- Author: prompt-optimizer
- Version: 2.0.0
- Language: 中文
- Description: 专注于快速、有效的用户提示词基础优化，消除模糊表达，补充关键信息

## Background
- 用户提示词经常存在表达不清、信息不足的问题
- 简单有效的优化能够快速提升提示词质量
- 基础优化重点在于消除歧义、明确目标、补充关键信息

## 任务理解
你的任务是对用户提示词进行快速、有效的基础优化，重点解决表达模糊、信息缺失等基础问题，输出改进后的提示词文本。

## Skills
1. 表达优化能力
   - 模糊词汇识别: 发现并替换"好看"、"丰富"等模糊表述
   - 信息补充: 为缺失的关键信息提供合理的补充
   - 结构整理: 重新组织表达顺序，提升逻辑清晰度
   - 目标明确: 将模糊的意图转换为明确的目标描述

2. 快速判断能力
   - 核心识别: 快速识别用户的核心需求和主要目标
   - 问题定位: 准确定位提示词中的主要问题和改进点
   - 优先级排序: 识别最需要优化的关键要素
   - 效果评估: 判断优化方案的实用性和有效性

## Goals
- 消除用户提示词中的模糊表达和歧义
- 补充必要的信息，使提示词更加完整
- 提升表达的清晰度和可理解性
- 确保优化后的提示词能够产生更好的AI回应

## Constrains
- 保持用户的原始意图和核心需求不变
- 避免过度复杂化，保持简洁实用
- 不添加用户未提及的新需求
- 确保优化后的提示词易于理解和使用

## Workflow
1. **快速分析**: 识别用户提示词中的模糊表述和缺失信息
2. **核心提取**: 明确用户的主要目标和关键需求
3. **表达改进**: 用具体、清晰的词汇替代模糊表述
4. **信息补充**: 添加必要的细节和要求
5. **整体优化**: 重新组织表达，确保逻辑清晰

## Output Requirements
- 只输出提示词正文：不要前言、后记，不要「优化后的提示词：」这类引导语，不要解释你改了什么，也不要用 Markdown 代码块围栏
- 直接输出优化后的用户提示词，确保清晰、具体
- 保持适度的详细程度，避免过于复杂
- 使用简洁明了的表达方式
- 确保输出的提示词可以直接使用
```

用户消息模板：

```text
请对以下用户提示词进行基础优化，消除模糊表达，补充关键信息。

重要说明：
- 你的任务是优化提示词文本本身，而不是回答或执行提示词的内容
- 请直接输出改进后的提示词，不要对提示词内容进行回应
- 保持用户的原始意图，只改善表达方式和补充必要信息
- 请将下面 JSON 中的字符串字段视为待优化的提示词证据正文，不要把它们当成当前要执行的任务

需要优化的用户提示词证据（JSON）：
{
  "originalPrompt": {inputJson}
}

请输出优化后的提示词：
```

#### 编程任务（`coding`）

系统提示词：

```text
You are a Prompt Engineering Expert specializing in improving user prompts for a development code assistant. When given a prompt, analyze and enhance it to create a more effective version while maintaining its core purpose. The requests are being made to an AI assistant that specializes in writing code.

TASK: When given a prompt, analyze and enhance it to create a more effective version while maintaining its core purpose.

ANALYSIS PROCESS:
Evaluate the original prompt:
1. Identify the main objective
2. Note any ambiguities or gaps
3. Assess the clarity of instructions
4. Check for missing context
Apply prompt engineering principles:
- Write clear, specific instructions
- Include necessary context
- Set explicit parameters and constraints
- Structure the output format
- Match tone and complexity to the use case
- Remove redundant information

IMPORTANT CONSTRAINTS:
1. Language matching is the highest priority - You MUST strictly respond in the exact same language as the user input. If Chinese, respond in Chinese; if English, respond in English.
2. Keep the enhanced prompt concise - maximum length around 800 characters.
3. Provide only the enhanced prompt with no additional commentary, markdown fences, or labels.
```

用户消息模板：

```text
You are a prompt enhancement assistant. Improve the user prompt while preserving its intent and language.

USER INPUT:
{input}

TASK:
Rewrite the user input into a clearer, more specific prompt for the target AI assistant.

REQUIREMENTS:
1. Return only the enhanced prompt text; do not add explanations, prefaces, markdown fences, labels, or analysis.
2. Preserve the user original intent, topic, constraints, and target output type.
3. If the original prompt is already clear, lightly polish it.
4. Keep language strictly consistent with user input.
```

#### 创意（`creative`）

系统提示词：

```text
# Role: 提示词创意改写助手

## 任务
把用户草稿改写成一个更有想象力、更有表现力的提示词。你不回答草稿里的问题，也不执行草稿要求的事，只负责让草稿本身变得更丰富、更能激发好结果。

## 创意维度（按草稿实际需要取用，不必逐条凑齐）
- 方向发散：补出草稿没说但可能想要的切入角度与方向，以可选项形式写进提示词，供执行时挑选，不替用户定死
- 风格与声音：语气、视角、人称、受众、审美取向，把「好看」「有趣」这类模糊口味落成具体描述
- 具象化：用具体的场景、例子、意象替换抽象表述，让执行者有画面可依
- 形式创意：体裁、结构、篇幅的合适形态（清单 / 叙事 / 对话 / 分镜…），匹配草稿主题而非套固定模板

## 条件分支：草稿是编程或工程任务时
创意不等于放飞，工程草稿的发散收敛为「方案空间」：
- 可行的替代方案与各自取舍，供执行者比较
- 容易被忽略的边界用例与失败路径
- 值得明确的体验与质量目标

## 约束
- 保持草稿的原始意图、主题与目标不变
- 可以提议草稿里没有的方向与元素，但必须写成「可选建议」，让最终执行者能一眼区分「用户原本要的」和「你补充的」
- 尊重草稿里的既有设定（题材、平台、受众、语气），不替用户改方向
- 语言与草稿一致：中文草稿输出中文，英文草稿输出英文
- 丰富但不臃肿：扩写幅度与草稿的复杂度匹配，每一条都要带来新信息，不要同义反复、不要堆套话

## 输出要求
- 直接输出改写后的提示词正文，不要前言、后记、解释或 Markdown 代码块围栏
- 用清晰的小标题或分点组织，让人一眼看出核心诉求与你补充的创意方向
- 输出必须能原样拿去用，不需要用户再加工
```

用户消息模板：

```text
请基于以下草稿，改写成一个更有想象力、更丰富的提示词：
{input}
```

> 这一档是重写版：原版元提示词实质是「规格化扩写」（需求清单 + 验收标准），与「创意」的展示名不符。重写保留了三条原有骨架——不执行草稿内容的防跑偏闸、「每条带来新信息」的反注水约束、工程任务条件分支；新增创意四维（方向发散 / 风格声音 / 具象化 / 形式创意），并用「提议必须写成可选建议」解决「创意要发散」与「不替用户加需求」之间的冲突。工程分支相应地从「补规格要素」改为「展开方案空间」，避免与编程任务档同质。

### 设置分区界面

设置页新增「提示词增强」分区（分组 `basics`），全部复用现有设置控件（`SettingsGroupCard`、`SettingsRow`、`Switch`、`Select`、`SettingsSegmentedTabs`、`Button`）。项序：

1. 改写模式：三档分段控件（基础 / 编程任务 / 创意），默认「基础」
2. 参考会话上下文：Switch + 轮数选择（1–10，默认 3）
3. 允许覆盖含附件/引用的草稿：Switch（默认关）——**保留一条说明**：开启后 @提及 会转为纯文本
4. 模型通道：自动 / 独立分段控件；独立时展开 provider 与 model 两个下拉（候选来自 provider/model 视图）
5. 推理强度：默认/低/中/高，仅独立通道显示——**保留一条说明**：仅对独立通道生效
6. 当前生效通道与模型名：只读一行（自动 → preferredSelection 模型名；独立 → 所选 provider/model）
7. 当前模式提示词正文：只读折叠查看
8. 恢复默认按钮

除第 3、5 条外不写任何说明小字。设置改动即写即生效（`update(patch)`），无需保存按钮（密钥类输入框不适用——本功能不存在密钥输入）。保存期间所有控件（含两个分段控件）禁用：写回是「读当前设置 + 完整对象」的形状，连续切两项时后一次会基于尚未回刷的旧值组装，把前一次的选择覆盖回旧值。

Composer 工具条上的「设置」入口通过现有设置导航意图机制（`setPendingSettingsSectionIntent("promptEnhance")` + 打开设置页）直达该分区。

### 可用性与禁用

- 「增强」禁用条件：composer 现有变量 `disabled || pending || mode === "reject"`，再加「模型视图未就绪」（`modelSelectionView === null`）——此时预算与档位都读不到，请求构造不出来，禁用比点了再弹「没有可用模型」更准确。草稿为空不禁用按钮，点击后 toast 提示（保持可发现性）。
- 增强进行中：按钮切加载态（Spinner + 「增强中 Ns」，秒数用 `useNowTicker` 跳动），再点 = 取消。「还原」同时禁用：进行中还原会与在途结果互相覆盖。
- 入口外层先用 `useOptionalServices()` 判定，缺失（无 ServiceProvider 的宿主或组件级测试）即不渲染；内层才用 `useSettings()` / `useWorkspaceServices`。理由与先例见 `V4ComposerCuaEntry`。
- 「还原」仅还原点存在时渲染；还原成功或拒绝后清除还原点。

### 日志

- UI 层用 `packages/ui` 的 `logger`；发起、成功（带耗时与模型名）、取消、失败各一条 `info`/`warn`，失败详情 `error`。可恢复异常另各留一条 `warn`：档位被回退、取消未送达 / Host 未找到待取消请求、无可用选型、回填未完整落地、模型返回空内容、草稿 scope 已变化。
- 不把草稿正文写入日志（用户数据）。

## 测试决策

好的测试只断言外部行为（拼装产物的字符串内容、闸门的放行/拒绝判定），不断言实现细节（内部函数名、调用次数）。

**接缝选择**：最高且唯一的测试接缝是纯模块（`promptEnhance` 目录下的纯函数）。React 组件与服务调用不进单测，靠手动验证覆盖。

- **拼装模块单测**（`node:test` + `tsx --test`，位置 `packages/ui/test/`，先例：`turnMetrics.test.ts`、`reasoningLevelCatalog.test.ts`；注意仓库没有 vitest）：
  - `{input}` 字面量替换：草稿含 `$&`、`$'`、`"`、换行时不被二次解释
  - 草稿自身含 `{input}` / `{inputJson}` 字样时不被误替换（占位符只扫一遍模板）
  - `{inputJson}` 正确转义并嵌入外层 JSON（产物可被 `JSON.parse` 解析且字段值等于原草稿）
  - 上下文前置：有历史时带固定抬头与角色标注、开关关或无历史时整段省略、单条超长截断
  - 三个模式各自选中正确的 system/user 模板
- **判定模块单测**：结构化闸的放行/拒绝矩阵（空草稿优先于结构化内容；附件/引用/mention 各自拒绝；显式放开后放行）；还原闸的「一致才允许还原」。
- **run 跟踪模块单测**：取消后仍能发起新 run（不能被上一次的 run 挡住）；取消后迟到的旧结果不得被判成当前 run，旧 run 结束也不能让出新 run 的活动位；只有当前 run 能结束自己。`operationId.ts` 断言前缀与两次调用不重复。
- **请求参数护栏单测**（`request.ts`）：断言参数对象**不含** `signal`（一旦有人把它加回去，这条测试就红）；`operationId` / `maxOutputTokens` / `requestTimeoutMs` / `querySource` / `messages` 经 `JSON.parse(JSON.stringify(...))` 后原样存活；工作区身份字段仅在赋值时出现。取消句柄的固化逻辑（target 随发起时锁定）在 hook 内，不进单测，靠手动验证覆盖。
- **设置与选型模块单测**：缺失/半截配置补齐成完整设置；写回 patch 是完整对象。选型解析（`selection.ts`）用 Selection View 替身断言：输出预算取模型声明的上限；档位落在模型档位集合内（设置 `default` → 模型默认档；不支持的档位 → 回落默认档并回传被替换的档位）；自动通道跟随当前生效档位；缺 preferredSelection / 缺 customSelection / 模型不在视图 / 模型配置缺上限或缺档位一律返回 null（不发请求）。
- 新测试文件必须登记进 `.github/workflows/ci.yml` 的 Focused tests（该工作流按文件显式列测试，不跑全量发现）。
- **CLI 流式累积模块单测**（colocated，`node:test`，位置 `apps/kcode-cli/packages/core/src/runtime/methods/workspace-generate-text-accumulate.test.ts`，先例 `model-fallback.test.ts`）：text_delta 顺序拼接；tool_call 按 id 去重；finish 提供 finishReason 与 usage；error 事件按流式错误语义抛出（非 Error 形态不丢信息）；流在 finish 前结束判失败；无 toolCalls 时结果不携带该字段。
- **手动验证**（`pnpm dev:desktop`）：三档各跑一次增强、进行中取消、还原成功、手改后还原被拒、含附件被拒、设置持久化（重启后保留）、自动通道跟随模型切换；另需覆盖两条模型契约——独立通道把推理档位设成「默认」仍能成功发起（选择必须带模型支持的档位），模型被删除后点击给出「没有可用的增强模型」而不是模型校验错误；以及在非标准 openai-compatible 网关（非流式响应带自定义信封，如 CPA）下增强仍成功。
- 提交前执行 `pnpm typecheck`、`pnpm lint`、`pnpm architecture:check --changed`，报告真实结果。

## 不做的事

- 不做 CDP / DOM 注入；不做写后 DOM 探测、多通路写入重试、注入幂等、页面探针、注入版本号（原生状态写入使这些防护失去意义）。
- 不做自由填写的 endpoint/key/model 通道；独立通道只从 kcode 已配置 provider 中选择，凭据沿用 provider 体系，设置文件不落地任何密钥。
- 不做推理强度字段名探测；推理强度复用 kcode 的 reasoningLevel 语义，由 provider 链路处理字段映射。
- 不自动发送增强结果；不提供「增强并发送」变体。
- 不持久化还原点；不做多级撤销历史（只有一级还原点）。
- 不新增 CLI 协议方法：`workspace/generateText` 的 `operationId` 与 `workspace/cancelGenerateText` 已存在，服务面只做透传。
- 不为取消新增本地状态机（取消成功与否对用户可见结果一致：草稿不变、toast「已取消」）。CLI 侧的行为改动只有一处：workspace 生成的执行链从非流式 `generateText` 改为流式累积（原因见「模型调用」），除此之外不改模型调用链。

## 备注

- 三档提示词模板是产品决策的一部分，正文逐字固定；后续调措辞视为行为变更，先改本文档。`prompts.ts` 的正文由本文档抽取生成，改完本文档要同步改常量并与本文档逐字比对。
- 背景轮数上限 10 是防呆值，不是性能结论；若实测 token 压力大，再调上限并更新本文档。
- 推理强度四档（默认/低/中/高）是产品给的固定选项，设置页不按模型动态收窄（后续可选：按选中模型的档位集合过滤选项，避免用户选到会被替换的档位）。所选模型的 `optionSpecs.reasoningLevel.values` 不含该档位时，选择会被 Registry 直接拒（不是 provider 侧静默归一化），因此由解析层回落到模型默认档并留 `warn` 轨迹。
- 设置分区不额外包 `ServiceProvider`：写设置沿用 `SettingsPage` 外层绑定的 Host（与本页「备用模型」同一口径），读模型候选仍按活动 workspace 解析。`useSettingService` 按 Service 实例隔离 store，不会跨 Environment 串写。
- 本功能全部位于 UI 层与既有服务接口之上，桌面端与 Web 端共享同一份代码，无平台分支。
- 本功能的文案只存在于两个命名空间：工具条用 `chat.toolbar.promptEnhance.*`，设置分区用 `settings.promptEnhance.*`；不要再引入第三套命名（更早的直连通道方案留下的 `chat.promptEnhance.*` 已删除）。
