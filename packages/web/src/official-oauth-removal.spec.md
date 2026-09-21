# Web 官方 Z.ai / BigModel OAuth 移除

## 行为

KCode Web 不再提供官方 Z.ai / BigModel 登录、OAuth callback 页或分享页官方登录按钮。

- 不渲染 `/share/callback` 官方 OAuth 回调页
- 分享落地页不再展示 Z.ai / BigModel 登录入口
- 构建不再注入 `VITE_ZAI_OAUTH_*`，也不代理 `/api/v1/oauth/token`

通用 API Key 供应商与 MCP OAuth 不在本文件范围。

## 所有者

- Web 启动入口：`main.tsx` 只引导 workspace / 分享预览
- 分享页：只负责预览、主题与「在 KCode 中继续」，不拥有账号登录态

## 验收

- 带 `state` + `code` 的 `/share/callback` 不再进入官方 token 交换
- 分享页 `login_required` 不出现官方 OAuth 按钮
