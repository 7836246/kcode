# CLI 官方账号 OAuth 与套餐登录移除

## 行为

KCode CLI 不再提供官方 Z.ai / BigModel `login` OAuth、编程套餐 API Key 登录或官方套餐网关。

- `kcode login` / TUI `/login` 官方流程不可用
- 协议 `updateAccountProviderConfig` 拒绝或标为未支持
- 官方 MCP JWT 签发未支持，不读取 `oauth:zai|bigmodel:*`
- 闲时任务不调用官方 ticket API，创建/同步 fail-closed

必须保留：

- `adapters/src/auth/credential-cipher.ts`
- `adapters/src/mcp/oauth*.ts`（MCP 服务器 OAuth）
- 通用 API Key provider

## 所有者

- 登录命令：CLI `login-command` / TUI command-center，不再发起官方授权
- 账号 overlay：协议 handler 拒绝官方 Account Provider Config
- 官方 MCP：auth port 返回未支持
- 闲时任务：off-peak port / handler 不向官方取号

## 验收

- `loginKCodeCli` / `loginBigmodelCodingPlan` / `configureCodingPlanApiKey` 不再完成官方授权
- model runner 不再走 official coding-plan gateway
- 官方 MCP 鉴权请求失败为未支持
- OffPeakCreate / OffPeakList 不访问官方 ticket 接口，fail-closed
