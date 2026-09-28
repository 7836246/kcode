# 移动端远程控制弹窗文案

## 行为

弹窗里所有用户可见字符串走 i18n。飞书显示「国内」地区标签，Lark 显示「国际」地区标签。不再引用已下线的 `login.oauth.regionTag.*`。

- 中文不夹杂 Bot Channel / Bot Channels 这类未翻译英文
- 关闭按钮的辅助文本使用 `common.close`
- 缺 key 时 intl 会回退成 key 本身，因此地区标签必须有 zh-CN / en-US 条目

## 所有者

`WebRemoteControlDialog` 拥有弹窗展示。`getBotProviderRegionTagLabelId` 拥有飞书/Lark 地区标签的 i18n id。`BotsDialog` 复用同一套标签。

## 验收

- 中文：飞书旁显示「国内」，Lark 旁显示「国际」，不出现 `login.oauth.regionTag.*`
- 英文：Feishu 旁显示 `China`，Lark 旁显示 `International`
- 中文入口是「使用机器人通道」「去配置机器人通道」
- 已接通渠道包含微信、飞书、Lark、Telegram、企业微信、Discord；钉钉仍不进入远控入口
