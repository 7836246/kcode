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
