/* oxlint-disable eslint(max-lines) -- 备份分区同时收口本机导出导入与 WebDAV 连接，拆开会拆散同一口令与覆盖确认。 */
import { useCallback, useEffect, useState } from "react";
import {
  CONFIG_BACKUP_DEFAULT_FILENAME,
  CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH,
  CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE,
  CONFIG_BACKUP_WEBDAV_PASSWORD_CREDENTIAL_KEY,
  TID_SETTINGS_CONFIG_BACKUP_EXPORT,
  TID_SETTINGS_CONFIG_BACKUP_IMPORT,
  TID_SETTINGS_CONFIG_BACKUP_WEBDAV_DOWNLOAD,
  TID_SETTINGS_CONFIG_BACKUP_WEBDAV_SAVE,
  TID_SETTINGS_CONFIG_BACKUP_WEBDAV_UPLOAD,
} from "@kcode/shared";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { toast } from "@/components/ui/toast.js";
import { useConfirmDialog } from "@/hooks/useConfirmDialog.js";
import { usePlatform } from "@/hooks/usePlatform.js";
import { useCredentials } from "@/hooks/useCredentials.js";
import { useServices } from "@/hooks/useServices.js";
import { useSettings } from "@/hooks/useSettingService.js";
import { useKCodeIntl } from "@/i18n/IntlProvider.js";
import { logger } from "@/logger.js";
import { SettingsGroupCard, SettingsRow } from "@/settings/SettingsPageParts.js";

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function notify(title: string, description?: string) {
  toast(description ? `${title}: ${description}` : title);
}

function errorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === "string" ? code : undefined;
  }
  return undefined;
}

export function ConfigBackupSection() {
  const { intl } = useKCodeIntl();
  const platform = usePlatform();
  const { configBackupService } = useServices();
  const { settings, update, refresh } = useSettings();
  const credentials = useCredentials();
  const confirm = useConfirmDialog();
  const [passphrase, setPassphrase] = useState("");
  const [webdavUrl, setWebdavUrl] = useState("");
  const [webdavUsername, setWebdavUsername] = useState("");
  const [webdavRemotePath, setWebdavRemotePath] = useState(CONFIG_BACKUP_DEFAULT_FILENAME);
  const [webdavPassword, setWebdavPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setWebdavUrl(settings?.configBackupWebdav?.url ?? "");
    setWebdavUsername(settings?.configBackupWebdav?.username ?? "");
    setWebdavRemotePath(settings?.configBackupWebdav?.remotePath || CONFIG_BACKUP_DEFAULT_FILENAME);
  }, [settings?.configBackupWebdav]);

  useEffect(() => {
    void credentials.load(CONFIG_BACKUP_WEBDAV_PASSWORD_CREDENTIAL_KEY).then((saved) => {
      if (saved) {
        setWebdavPassword(saved);
      }
    });
  }, [credentials.load]);

  const requireService = useCallback(() => {
    if (!configBackupService) {
      throw new Error(intl.formatMessage({ id: "settings.configBackup.unavailable" }));
    }
    return configBackupService;
  }, [configBackupService, intl]);

  const requirePassphrase = useCallback(() => {
    if (passphrase.trim().length < CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH) {
      throw new Error(
        intl.formatMessage(
          { id: "settings.configBackup.passphraseTooShort" },
          { min: String(CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH) },
        ),
      );
    }
    return passphrase;
  }, [intl, passphrase]);

  const webdavConnection = useCallback(
    () => ({
      url: webdavUrl.trim(),
      username: webdavUsername.trim(),
      remotePath: webdavRemotePath.trim() || CONFIG_BACKUP_DEFAULT_FILENAME,
      password: webdavPassword,
    }),
    [webdavPassword, webdavRemotePath, webdavUrl, webdavUsername],
  );

  const handleExport = async () => {
    setBusy(true);
    try {
      const service = requireService();
      const secret = requirePassphrase();
      const result = await service.exportEncryptedBackup(secret);
      const bytes = Uint8Array.from(atob(result.bytesBase64), (char) => char.charCodeAt(0));
      if (platform.saveFile) {
        const saved = await platform.saveFile({
          data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
          suggestedName: result.suggestedName,
        });
        if (saved.canceled) {
          return;
        }
        if (!saved.success) {
          throw new Error(saved.error || intl.formatMessage({ id: "settings.configBackup.exportFailed" }));
        }
      } else {
        const blob = new Blob([bytes], { type: "application/octet-stream" });
        const href = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = href;
        link.download = result.suggestedName;
        link.click();
        URL.revokeObjectURL(href);
      }
      notify(intl.formatMessage({ id: "settings.configBackup.exportDone" }));
    } catch (error) {
      logger.warn("[config-backup] export failed", { error });
      notify(intl.formatMessage({ id: "settings.configBackup.exportFailed" }), errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    setBusy(true);
    try {
      const service = requireService();
      const secret = requirePassphrase();
      const confirmed = await confirm({
        title: intl.formatMessage({ id: "settings.configBackup.importConfirmTitle" }),
        description: intl.formatMessage({ id: "settings.configBackup.importConfirmDescription" }),
        confirmLabel: intl.formatMessage({ id: "settings.configBackup.import" }),
        confirmVariant: "destructive",
      });
      if (!confirmed) {
        return;
      }
      if (platform.selectFile) {
        const path = await platform.selectFile();
        if (!path) {
          return;
        }
        await service.importFromLocalPath(secret, path);
      } else {
        const file = await pickBackupFile();
        if (!file) {
          return;
        }
        const buffer = new Uint8Array(await file.arrayBuffer());
        await service.importEncryptedBackup(secret, bytesToBase64(buffer));
      }
      await refresh();
      notify(intl.formatMessage({ id: "settings.configBackup.importDone" }));
    } catch (error) {
      logger.warn("[config-backup] import failed", { error });
      notify(intl.formatMessage({ id: "settings.configBackup.importFailed" }), errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleSaveWebdav = async () => {
    setBusy(true);
    try {
      await update({
        configBackupWebdav: {
          url: webdavUrl.trim(),
          username: webdavUsername.trim(),
          remotePath: webdavRemotePath.trim() || CONFIG_BACKUP_DEFAULT_FILENAME,
        },
      });
      if (webdavPassword) {
        await credentials.save(CONFIG_BACKUP_WEBDAV_PASSWORD_CREDENTIAL_KEY, webdavPassword);
      } else {
        await credentials.delete(CONFIG_BACKUP_WEBDAV_PASSWORD_CREDENTIAL_KEY);
      }
      notify(intl.formatMessage({ id: "settings.configBackup.webdavSaved" }));
    } catch (error) {
      logger.warn("[config-backup] save webdav failed", { error });
      notify(intl.formatMessage({ id: "settings.configBackup.webdavSaveFailed" }), errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleWebdavUpload = async () => {
    setBusy(true);
    try {
      const service = requireService();
      const secret = requirePassphrase();
      const connection = webdavConnection();
      try {
        await service.uploadToWebdav(secret, connection, false);
      } catch (error) {
        if (errorCode(error) !== CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE) {
          throw error;
        }
        const overwrite = await confirm({
          title: intl.formatMessage({ id: "settings.configBackup.webdavOverwriteTitle" }),
          description: intl.formatMessage({ id: "settings.configBackup.webdavOverwriteDescription" }),
          confirmLabel: intl.formatMessage({ id: "settings.configBackup.webdavOverwrite" }),
          confirmVariant: "destructive",
        });
        if (!overwrite) {
          return;
        }
        await service.uploadToWebdav(secret, connection, true);
      }
      notify(intl.formatMessage({ id: "settings.configBackup.webdavUploadDone" }));
    } catch (error) {
      logger.warn("[config-backup] webdav upload failed", { error });
      notify(intl.formatMessage({ id: "settings.configBackup.webdavUploadFailed" }), errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const handleWebdavDownload = async () => {
    setBusy(true);
    try {
      const service = requireService();
      const secret = requirePassphrase();
      const confirmed = await confirm({
        title: intl.formatMessage({ id: "settings.configBackup.importConfirmTitle" }),
        description: intl.formatMessage({ id: "settings.configBackup.importConfirmDescription" }),
        confirmLabel: intl.formatMessage({ id: "settings.configBackup.webdavDownload" }),
        confirmVariant: "destructive",
      });
      if (!confirmed) {
        return;
      }
      await service.downloadFromWebdav(secret, webdavConnection());
      await refresh();
      notify(intl.formatMessage({ id: "settings.configBackup.importDone" }));
    } catch (error) {
      logger.warn("[config-backup] webdav download failed", { error });
      notify(
        intl.formatMessage({ id: "settings.configBackup.webdavDownloadFailed" }),
        errorMessage(error),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <p className="text-ui-base text-foreground-subtle">
        {intl.formatMessage({ id: "settings.configBackup.description" })}
      </p>
      <SettingsGroupCard>
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.configBackup.passphrase" })}
          description={intl.formatMessage(
            { id: "settings.configBackup.passphraseDescription" },
            { min: String(CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH) },
          )}
          control={
            <Input
              type="password"
              size="lg"
              autoComplete="new-password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              placeholder={intl.formatMessage({ id: "settings.configBackup.passphrasePlaceholder" })}
            />
          }
        />
        <SettingsRow
          label={intl.formatMessage({ id: "settings.configBackup.local" })}
          description={intl.formatMessage({ id: "settings.configBackup.localDescription" })}
          control={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={TID_SETTINGS_CONFIG_BACKUP_EXPORT}
                disabled={busy}
                onClick={() => void handleExport()}
              >
                {intl.formatMessage({ id: "settings.configBackup.export" })}
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid={TID_SETTINGS_CONFIG_BACKUP_IMPORT}
                disabled={busy}
                onClick={() => void handleImport()}
              >
                {intl.formatMessage({ id: "settings.configBackup.import" })}
              </Button>
            </div>
          }
        />
      </SettingsGroupCard>
      <SettingsGroupCard>
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.configBackup.webdavUrl" })}
          description={intl.formatMessage({ id: "settings.configBackup.webdavDescription" })}
          control={
            <Input
              size="lg"
              value={webdavUrl}
              onChange={(event) => setWebdavUrl(event.target.value)}
              placeholder="https://dav.example.com/remote.php/dav/files/user/"
            />
          }
        />
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.configBackup.webdavUsername" })}
          control={
            <Input
              size="lg"
              value={webdavUsername}
              onChange={(event) => setWebdavUsername(event.target.value)}
            />
          }
        />
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.configBackup.webdavPassword" })}
          description={intl.formatMessage({ id: "settings.configBackup.webdavPasswordDescription" })}
          control={
            <Input
              type="password"
              size="lg"
              autoComplete="off"
              value={webdavPassword}
              onChange={(event) => setWebdavPassword(event.target.value)}
            />
          }
        />
        <SettingsRow
          controlLayout="wide"
          label={intl.formatMessage({ id: "settings.configBackup.webdavRemotePath" })}
          control={
            <Input
              size="lg"
              value={webdavRemotePath}
              onChange={(event) => setWebdavRemotePath(event.target.value)}
              placeholder={CONFIG_BACKUP_DEFAULT_FILENAME}
            />
          }
        />
        <SettingsRow
          label={intl.formatMessage({ id: "settings.configBackup.webdavActions" })}
          control={
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={TID_SETTINGS_CONFIG_BACKUP_WEBDAV_SAVE}
                disabled={busy}
                onClick={() => void handleSaveWebdav()}
              >
                {intl.formatMessage({ id: "settings.configBackup.webdavSave" })}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                data-testid={TID_SETTINGS_CONFIG_BACKUP_WEBDAV_UPLOAD}
                disabled={busy}
                onClick={() => void handleWebdavUpload()}
              >
                {intl.formatMessage({ id: "settings.configBackup.webdavUpload" })}
              </Button>
              <Button
                type="button"
                size="sm"
                data-testid={TID_SETTINGS_CONFIG_BACKUP_WEBDAV_DOWNLOAD}
                disabled={busy}
                onClick={() => void handleWebdavDownload()}
              >
                {intl.formatMessage({ id: "settings.configBackup.webdavDownload" })}
              </Button>
            </div>
          }
        />
      </SettingsGroupCard>
    </div>
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function pickBackupFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".kcb,application/json,application/octet-stream";
    input.addEventListener("change", () => {
      resolve(input.files?.[0] ?? null);
    });
    input.click();
  });
}
