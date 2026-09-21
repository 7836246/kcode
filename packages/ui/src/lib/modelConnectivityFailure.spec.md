# 模型连通性失败分类

## 行为

设置里的「测试模型」和首次欢迎页的继续，都把探测失败分成三类再给用户看：

- Key：401 / 403、无效密钥、认证失败。提示核对 API Key。
- 接口地址：DNS、拒绝连接、超时、证书、未配置 endpoint。提示核对地址、网络或代理。
- 模型：模型不存在或默认模型不可用。提示改模型名；欢迎页可以先跳过。

认不出的原文保持原样，不编成这三类。`provider-unavailable` / `model-unavailable` 仍用设置页已有资格文案，不经过自由文本分类。

## 所有者

`classifyModelConnectivityFailure` 与 `resolveConnectivityFailureCopy` 只读错误文本和已有 code，不发请求、不写配置。

## 验收

- `401`、`invalid api key` 归为 Key。
- `ENOTFOUND`、超时归为接口地址。
- `model_not_found` 归为模型。
- 空文本和无法识别的句子保持 other，界面显示原文或通用失败。
