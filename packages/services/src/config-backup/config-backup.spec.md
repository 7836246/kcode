# 配置与 API Key 加密备份

## 行为

用户可以把本机「可迁移配置」和供应商配置（含 API Key）打成一份口令加密包，导出到本地文件，或上传到 WebDAV。导入同一份包会覆盖本机对应字段，不改会话、工作区和本机路径。

```text
导出
  → IConfigBackupService.exportEncryptedBackup(passphrase)
        │
        ├─ ISettingService.get（只取可迁移字段）
        ├─ PersonalProviderConfigRepository.read（含 API Key）
        └─ scrypt + AES-256-GCM 封包 → bytes
导入
  → IConfigBackupService.importEncryptedBackup(passphrase, bytes)
        │
        ├─ 解密失败 → 拒绝，本机不变
        ├─ ISettingService.update(可迁移补丁)
        └─ PersonalProviderConfigRepository.update(供应商配置)
WebDAV
  → 同一加密包 PUT/GET；口令与 WebDAV 密码分属两套密钥
```

- 备份服务是唯一提交口。UI 只提交口令和目的地，不自己拼 JSON、不自己加密。
- 不走 `ISettingsSyncService`（那是从外部 Agent 导入 skills/commands）。
- 包内不含：会话、transcript、workspace 文件、`dataBaseDir`、窗口几何、最近项目路径、WebDAV 密码、凭据库。
- 口令至少 8 个字符。空口令拒绝。
- 导入覆盖本机可迁移设置和供应商配置；本机路径类字段保持不变。
- WebDAV 连接（URL / 用户名 / 远端文件名）可写进 settings；密码只进 `ICredentialService`。
- 远端已有同名文件时，上传必须带 `overwrite: true`，否则拒绝。
- 桌面 Local Host 提供真实服务；远程 workspace 集合只提供 local-only 拒绝桩。

## 所有者

`IConfigBackupService` 拥有备份包格式、加密、导入提交和 WebDAV 传输。`ISettingService` 仍拥有 settings 落盘；`PersonalProviderConfigRepository` 仍拥有 `provider_config.json`。

## 验收

- 导出后再导入（同一口令）恢复供应商 API Key 与可迁移设置
- 错误口令导入失败，本机配置不变
- 导出包不含 `dataBaseDir`、`recentProjects`、会话字段
- WebDAV 上传在远端已存在且未确认覆盖时失败
- 远程 workspace 调用返回 `CONFIG_BACKUP_LOCAL_ONLY`
