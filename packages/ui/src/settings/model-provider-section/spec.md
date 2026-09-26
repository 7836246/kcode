# 模型供应商只走自行配置的 API Key

## 行为

KCode 不再提供智谱 / Z.ai / BigModel 官方账号、OAuth、编程套餐或内置模板。用户只能添加自定义或第三方模板（OpenAI、Anthropic、Kimi 等），用自己的 API Key 连接。

删除范围（界面与运行时一并移除）：

- 官方 OAuth：登录、回调、轮询、token 刷新、账号登出
- 编程套餐：购买、支付、权益、额度、升级、Start Plan / Team Plan
- 内置模板：`zai-api`、`bigmodel-api`、`zai-standard-api`、`bigmodel-standard-api`
- 内置账号供应商：`account:zai-*`、`account:bigmodel-*`
- 依赖官方账号 JWT 的官方 MCP 鉴权
- 依赖官方套餐的闲时任务取号与调度

保留：

- 通用 API Key / 自定义 endpoint 供应商
- MCP 协议自己的 OAuth（与智谱账号登录无关）
- 用户已经手填的自定义供应商（即使 baseUrl 指向第三方域名）

## 自定义供应商模型成员

模板里的 `builtinModelIds` 只是该实例的默认目录，不是设置页里不可删的硬成员。实例成员只由 Personal Overlay 拥有：

- `personalModelIds`：用户添加的模型
- `hiddenInheritedModelIds`：用户从本实例隐藏的模板模型

```text
删除个人模型 → 去掉 personalModelIds
删除模板模型 → 写入 hiddenInheritedModelIds → Settings View / Registry 不再展示
保存名称/连接/Key → withModelMembershipFrom 保留成员，不得清掉隐藏名单

获取模型列表 → 等待该 Provider 在途写入 → 读已保存 Base URL / API 格式 / API Key
            → Host GET 远端目录（不经 Agent runtime）→ 此时不改成员
            → 弹窗勾选要写入的模型（已在实例中的只展示、不可改；新模型默认不勾选）
            → 确认后一次事务导入勾选项；取消或全不选不写盘
            → 新模型用供应商 /models 返回的上下文、输出上限和能力填充
            → 供应商没给的字段再按 models.dev、OpenRouter、LiteLLM 补，已有具体规则或个人配置不覆盖
智能配置解析模型 ID 时同样只补通用兜底没覆盖的字段；目录请求失败则保持原配置
清空模型 → 确认后隐藏全部模板模型并清空个人模型；连接配置保留
失败 → 不改成员；UI 只报本次错误
```

一键获取使用已提交的连接配置。草稿未失焦保存时，按仓库里的正式配置请求。远端目录可以很多，不能在未确认时整表写入。

磁盘上残留的 `oauth:*` 凭据、`zhipu-account` 配置和官方账号模型选择会被忽略，不再向 Z.ai / BigModel 官方账号接口发请求。

## 所有者

- 供应商配置与 Registry：Provider Settings / Model Selection
- 登录门禁：`useProviderAvailabilityLoginEntryGuard`；只认可用的 API Key 供应商
- 官方账号态：不再有 owner；OAuth / Coding Plan 服务不再注册

```text
用户添加 API Key 供应商 → Provider Settings 写入 → Registry 投影 → 模型选择
磁盘残留官方账号 / OAuth → 加载时忽略 → 不发官方账号请求
```

## 验收

- 模型设置左侧不再出现「智谱 / Z.ai / Start Plan / 编程套餐」
- 添加供应商不再出现智谱模板或分组
- 登录页只有第三方 API Key 模板或跳过
- 无自定义供应商时，详情区显示空状态，而不是无限 loading
- 仅有残留官方账号模型时，不视为已有可用供应商
- Host 不再注册 OAuth、Coding Plan 订阅服务
- 内置 provider 配置不再包含官方智谱模板或 `account:zai|bigmodel-*`
- 模板实例（如 xAI 的 grok-4.6）模型行显示删除，删除后设置列表和聊天选择都不再出现该模型
- 删除个人添加的模型后，该模型从本实例消失
- 保存 Base URL / API Key 不会把已删除的模板模型重新加回来
- 「获取模型列表」先弹出远端目录供勾选，确认后才写入；取消不改成员
- 新导入的模型写入供应商或公开目录给出的上下文窗口、最大输出和输入能力；具体内置规则与已有个人配置保持不变
- 添加或编辑模型的智能配置会用同一目录补全通用兜底，目录不可用时仍显示原推荐值
- 新拉到的远端模型默认不勾选；已在实例中的只展示为已添加
- 「清空」确认后当前实例模型列表为空，Base URL / API Key 仍在
- 获取失败或缺少连接配置时，成员保持原样并提示原因
