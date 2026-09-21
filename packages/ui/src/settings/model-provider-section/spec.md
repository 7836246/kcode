# 官方智谱供应商不再对用户提供

## 行为

KCode 不再把官方智谱账号族当作可连接供应商。用户只能添加自定义或第三方模板（OpenAI、Anthropic、Kimi 等）。

隐藏范围：

- 设置页「智谱」分组：Z.ai、BigModel、Start Plan、编程套餐、个人/团队套餐卡
- 「添加供应商」里的智谱模板：`zai-api`、`bigmodel-api`、`zai-standard-api`、`bigmodel-standard-api`
- 登录页 Z.ai / BigModel API Key 选项；登录改为其余 API Key 模板或跳过
- 聊天模型列表中的内置智谱账号供应商
- 侧栏资料菜单里的编程套餐用量 / 升级入口

运行时仍保留账号族实现，避免拆掉已有协议与 Host 契约。已有用户自行添加的智谱 API Key 自定义供应商继续可见。

## 所有者

- 产品是否展示：UI 投影（设置导航、模板选择器、登录表单、模型分组、侧栏用量）
- 供应商配置与 Registry：仍由 Provider Settings / Model Selection 服务拥有
- 登录门禁：`useProviderAvailabilityLoginEntryGuard`；跳过只写 `providerFamilyDomainMigrated`，不再强迫选择智谱 family

## 验收

- 模型设置左侧不再出现「智谱 / Z.ai / Start Plan」
- 添加供应商不再出现智谱分组
- 登录页不再出现 Z.ai、BigModel
- 无自定义供应商时，详情区显示空状态，而不是无限 loading
- 仅有内置智谱账号模型时，不视为已有可用供应商，启动仍进入登录/配置
