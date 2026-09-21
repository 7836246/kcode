# 桌面端官方 OAuth / 套餐 Webview 移除

## 行为

KCode 桌面端不再提供智谱 / Z.ai / BigModel 官方账号登录、支付回调或编程套餐内嵌 Webview。

- `kcode://` 只服务 workspace 打开与 share import
- Main 不注册、不转发 OAuth / payment deep link
- Preload 不再暴露 `registerOAuthState` / `onOAuthCallback` / `onPaymentCallback`
- Host 远程 workspace 不注册 `IOAuthService`、`ICodingPlanSubscriptionService`
- 启动强更不再请求 `zcode.z.ai /api/v1/client/configs`；官方强更缺省不拦截启动

MCP 服务器自己的 OAuth 不在本文件范围。

## 所有者

- Deep link：`desktopOAuthDeepLink` 只路由 workspace / share
- 窗口 chrome：普通 webview preload，不再切换 coding-plan 专用 preload
- 启动 gate：`forceUpdateGuard` 对官方远端配置 fail-closed（不拉、不拦）

## 验收

- 冷启动或二次实例收到 `kcode://oauth/...`、`kcode://payment/...` 时忽略，不向 renderer 投递
- 启动不因官方 client configs 失败或缺失而阻断
- 远程 workspace host 服务集合不含 OAuth / Coding Plan 通道
