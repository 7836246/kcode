# 提示词增强（Prompt Enhance）实现规范

> 本文档是「提示词增强」功能的完整实现规范，自包含、可独立实施，不依赖任何外部文档。
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
- **提示词常量与拼装**：新目录 `packages/ui/src/v4/composer/promptEnhance/`，含提示词常量模块与纯函数拼装模块（见下「提示词与拼装」）。拼装模块不依赖 React，可独立测试。
- **Composer 入口**：新组件 `PromptEnhanceActions` 挂进 `ConversationComposer` 的 `leadingActionsNode`（与模式切换、CUA 入口同簇）；新 hook `usePromptEnhance` 承载增强流程状态机。
- **设置分区**：新文件 `packages/ui/src/settings/PromptEnhanceSection.tsx`（自包含模式，先例：`ModelFallbackSetting` / `ProactiveSuggestionsSetting`），注册进设置导航（`SettingsSectionId` 增加 `"promptEnhance"`，分组 `basics`）与 SettingsPage 条件渲染链。
- **i18n**：`zh-CN.ts` 与 `en-US.ts` 两个 locale 文件同步增加 `settings.promptEnhance.*` 与 `chat.toolbar.promptEnhance.*` 文案。

### 状态所有者

- **草稿文本**：沿用现有双层结构——composer 本地 `text`/`textRef` + per-session 草稿 owner `useDraftConfigControl`（`updateComposerContent`）。增强回填走「编辑器句柄 `setText` + `updateText` + `updateComposerContent`」三连，与发送失败回滚（`restoreSubmittedDraft`）使用同一组写入路径。
- **还原点**：composer 组件内 ref（内存态，随组件卸载消失），内容为「增强前原文 + 增强结果」两个字符串。不持久化、不进 store。
- **设置**：appSettings（`~/.kcode/v2/setting.json`，经 `ISettingService.update(patch)` 原子写盘）。不新增 localStorage 状态。
- **进行中的请求**：hook 内 ref 持有 AbortController 与单调递增 runId。

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

- 统一复用现有 `kcodeAgentService.generateWorkspaceText`（Git 提交消息生成同款链路），`querySource` 固定为 `"prompt_enhance"`，调用方传 `AbortSignal` 与 `requestTimeoutMs`（请求级 60s）。**不新增协议方法、不新增裸 HTTP 客户端。**
- **自动通道**：`selection = modelSelectionService.getView().preferredSelection`。模型配置变化自动跟随；OAuth 类 provider 由 CLI runtime 自身处理鉴权，无需回落逻辑。
- **独立通道**：`selection = 设置中的 customSelection`（必须是 Registry 已发布模型；设置 UI 从 provider/model 视图读取候选，天然满足）。`reasoningLevel` 非 `"default"` 时写入 selection 的 options；为 `"default"` 时不下发。自动通道永远不改写 reasoning。
- 调用结果须带回实际使用的模型名，用于成功提示与设置页「当前生效通道」展示。

### 增强流程

```
点「增强」
 ├─ 草稿为空 → toast「草稿为空」，停止
 ├─ 结构化内容闸未通过 → toast 说明，停止（见下）
 ├─ 取草稿纯文本（textRef / 编辑器句柄 getMarkdown）
 ├─ contextEnabled 且会话有历史 → 从 conversation projection 取最近 N 轮
 ├─ 拼装 system + user 消息（见「提示词与拼装」）
 ├─ generateWorkspaceText（runId+1，持有 AbortController）
 │    ├─ 用户再点按钮 → abort，toast「已取消」，迟到响应按 runId 丢弃
 │    ├─ 失败 / 超时 / 空内容 → toast 错误原因，草稿不动
 │    └─ 成功 → 回填三连 → 读回比对
 │         ├─ 比对失败 → 写回原文，toast 失败
 │         └─ 比对通过 → 立还原点，toast 成功 + 耗时 + 模型名
点「还原」
 ├─ 当前文本 ≠ 增强结果 → 拒绝，清还原点，toast 说明（用户手改过）
 └─ 一致 → 写回原文，清还原点
```

### 结构化内容闸

发送前的结构化内容分四类：文件附件、代码评论 / 网页元素 / PPT 元素引用、对话选区引用、Lexical mention 节点（markdown 中表现为 `[label](uri)` 链接）。任一存在时默认拒绝增强并 toast 说明。`allowStructuredOverwrite` 开启后放行，但 mention 节点会被替换为纯文本——这是设置里唯一保留的说明文字之一。判定复用 composer 现有的 `hasAttachments` / `hasContexts` / `hasReferences` 聚合，mention 判定用现有 `parseMentionMarkdown`。

### 取对话背景

- 经 `useV4Conversation().layer.acquire(sessionId)` 拿 lease，读 projection snapshot 的 `rows.window`。
- 过滤：`kind === "userInput"` 且 `origin === "realUser"`；`kind === "assistantText"` 且 `state === "complete"`。按 rowId 顺序取最近 N 轮（一轮 = 一条用户 + 一条助手，助手缺失时只取用户）。
- 单条文本截断到合理长度（如 500 字符），避免背景膨胀。
- 上下文一律前置到用户消息开头，固定抬头，与正文空行隔开：

  ```text
  【前序会话背景（仅作理解指代参考，切勿回答历史问题）】
  <上下文文本>

  <拼好的用户消息>
  ```

- 开关关闭或无历史时整段不拼，不留空抬头。三个档位的模板里都不出现背景占位符。

### 提示词与拼装

三档的展示名为「基础 / 编程任务 / 创意」，内部枚举值为 `basic` / `coding` / `creative`；模板正文逐字固定（含模板内自称，如「基础优化助手」），不随展示名改动。「编程任务」档面向编程助手语境，名字本身即定位说明，设置界面不再附加解释。

占位符规则：

| 占位符 | 含义 | 用途 |
|---|---|---|
| `{input}` | 草稿原文 | 直接嵌入草稿作为正文 |
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

设置页新增「提示词增强」分区（分组 `basics`），全部复用现有设置控件（`SettingsRow`、`Switch`、`Select`、`SettingsSegmentedTabs`、`Input`）。项序：

1. 改写模式：三档分段控件（基础 / 编程任务 / 创意），默认「基础」
2. 参考会话上下文：Switch + 轮数选择（1–10，默认 3）
3. 允许覆盖含附件/引用的草稿：Switch（默认关）——**保留一条说明**：开启后 @提及 会转为纯文本
4. 模型通道：自动 / 独立分段控件；独立时展开 provider 与 model 两个下拉（候选来自 provider/model 视图）
5. 推理强度：默认/低/中/高，仅独立通道显示——**保留一条说明**：仅对独立通道生效
6. 当前生效通道与模型名：只读一行（自动 → preferredSelection 模型名；独立 → 所选 provider/model）
7. 当前模式提示词正文：只读折叠查看
8. 恢复默认按钮

除第 3、5 条外不写任何说明小字。设置改动即写即生效（`update(patch)`），无需保存按钮（密钥类输入框不适用——本功能不存在密钥输入）。

Composer 工具条上的「设置」入口通过现有设置导航意图机制（`setPendingSettingsSectionIntent("promptEnhance")` + 打开设置页）直达该分区。

### 可用性与禁用

- 「增强」禁用条件复用 composer 现有变量：`disabled || pending || mode === "reject"`。草稿为空不禁用按钮，点击后 toast 提示（保持可发现性）。
- 增强进行中：按钮切加载态（Spinner + 「增强中 Ns」，秒数用 `useNowTicker` 跳动），再点 = 取消。
- 「还原」仅还原点存在时渲染；还原成功或拒绝后清除还原点。

### 日志

- UI 层用 `packages/ui` 的 `logger`；发起、成功（带耗时与模型名）、取消、失败各一条 `info`/`warn`，失败详情 `error`。
- 不把草稿正文写入日志（用户数据）。

## 测试决策

好的测试只断言外部行为（拼装产物的字符串内容、闸门的放行/拒绝判定），不断言实现细节（内部函数名、调用次数）。

**接缝选择**：最高且唯一的测试接缝是纯拼装/判定模块（`promptEnhance` 目录下的纯函数）。React 组件与服务调用不进单测，靠手动验证覆盖。

- **拼装模块单测**（vitest，位置 `packages/ui/test/`，先例：`composerSubmissionConfig.test.ts`、`turnMetrics.test.ts`、`reasoningLevelCatalog.test.ts`）：
  - `{input}` 字面量替换：草稿含 `$&`、`$'`、`"`、换行时不被二次解释
  - `{inputJson}` 正确转义并嵌入外层 JSON（产物可被 `JSON.parse` 解析且字段值等于原草稿）
  - 上下文前置：有历史时带固定抬头、开关关或无历史时整段省略
  - 三个模式各自选中正确的 system/user 模板
- **还原闸判定单测**：当前文本与增强结果一致才允许还原；不一致返回拒绝原因。
- **手动验证**（`pnpm dev:desktop`）：三档各跑一次增强、进行中取消、还原成功、手改后还原被拒、含附件被拒、设置持久化（重启后保留）、自动通道跟随模型切换。
- 提交前执行 `pnpm typecheck`、`pnpm lint`、`pnpm architecture:check --changed`，报告真实结果。

## 不做的事

- 不做 CDP / DOM 注入；不做写后 DOM 探测、多通路写入重试、注入幂等、页面探针、注入版本号（原生状态写入使这些防护失去意义）。
- 不做自由填写的 endpoint/key/model 通道；独立通道只从 kcode 已配置 provider 中选择，凭据沿用 provider 体系，设置文件不落地任何密钥。
- 不做推理强度字段名探测；推理强度复用 kcode 的 reasoningLevel 语义，由 provider 链路处理字段映射。
- 不自动发送增强结果；不提供「增强并发送」变体。
- 不持久化还原点；不做多级撤销历史（只有一级还原点）。
- 不做服务端/CLI 侧改动：`generateWorkspaceText` 现有接口已够用。

## 备注

- 三档提示词模板是产品决策的一部分，正文逐字固定；后续调措辞视为行为变更，先改本文档。
- 背景轮数上限 10 是防呆值，不是性能结论；若实测 token 压力大，再调上限并更新本文档。
- 本功能全部位于 UI 层与既有服务接口之上，桌面端与 Web 端共享同一份代码，无平台分支。
