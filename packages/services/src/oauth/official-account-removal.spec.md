# 官方智谱账号与 OAuth 运行时移除

## 行为

官方智谱 / Z.ai / BigModel 账号登录不再是产品能力。Host 不注册 `IOAuthService` 与 `ICodingPlanSubscriptionService`，也不再解析 `zhipu-account` 访问方式。

绑定在这套账号上的能力一并下线：

- 官方 MCP：不再用 MaaS JWT / Coding Plan 头签发身份
- 闲时任务：不再向官方取号或同步票据
- 动态工作流 / 强制更新：不再从官方套餐配置拉取；缺省为关闭或不拦截启动

MCP 服务器自己的 OAuth 发现、授权码交换和刷新仍由 CLI MCP 适配器拥有，与本文件无关。

## 所有者

- 供应商运行时：Provider Settings / Registry，只合成 personal + 非官方 builtin
- 公开客户端配置：`IClientConfigService`；不再经套餐服务读官方灰度
- 残留凭据：`ICredentialService` 可继续存用户 API Key；`oauth:*` 键不再被业务读取

## 验收

- `createNodeServiceCollection` 不注册 OAuth、Coding Plan 通道
- 协议不再接受 `zhipu-account` 作为有效 access
- 官方 MCP 鉴权请求失败为未支持，不读取 `oauth:zai|bigmodel:*`
- 闲时任务创建/同步不再访问官方票据接口
