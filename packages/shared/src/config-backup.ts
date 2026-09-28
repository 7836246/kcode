export const CONFIG_BACKUP_FORMAT = "kcode.config-backup.v1" as const;
export const CONFIG_BACKUP_PAYLOAD_KIND = "kcode.config-backup.payload.v1" as const;
export const CONFIG_BACKUP_DEFAULT_FILENAME = "kcode-config-backup.kcb";
export const CONFIG_BACKUP_MIN_PASSPHRASE_LENGTH = 8;
export const CONFIG_BACKUP_WEBDAV_PASSWORD_CREDENTIAL_KEY = "config-backup.webdav.password";
export const CONFIG_BACKUP_LOCAL_ONLY_ERROR_CODE = "CONFIG_BACKUP_LOCAL_ONLY";
export const CONFIG_BACKUP_PASSPHRASE_TOO_SHORT_ERROR_CODE = "CONFIG_BACKUP_PASSPHRASE_TOO_SHORT";
export const CONFIG_BACKUP_DECRYPT_ERROR_CODE = "CONFIG_BACKUP_DECRYPT_FAILED";
export const CONFIG_BACKUP_INVALID_PACKAGE_ERROR_CODE = "CONFIG_BACKUP_INVALID_PACKAGE";
export const CONFIG_BACKUP_WEBDAV_EXISTS_ERROR_CODE = "CONFIG_BACKUP_WEBDAV_EXISTS";
export const CONFIG_BACKUP_WEBDAV_ERROR_CODE = "CONFIG_BACKUP_WEBDAV_FAILED";

export const CONFIG_BACKUP_PORTABLE_SETTING_KEYS = [
  "locale",
  "localePreference",
  "shortcutBindings",
  "terminalInheritSystemProfile",
  "terminalFontFamily",
  "integratedTerminalShell",
  "httpProxy",
  "httpProxyNoProxy",
  "httpProxyCaCertPath",
  "embeddedBrowserAllowInsecureCertificates",
  "computerUseComposerEntryHidden",
  "taskAutoArchiveEnabled",
  "taskAutoArchiveOlderThanDays",
  "closeToTrayOnWindows",
  "keepAwakeWhileRunning",
  "desktopChromiumHardwareAccelerationEnabled",
  "messageStreamShowReasoning",
  "messageStreamShowTodos",
  "composerTurnMetricsVisible",
  "toolGroupingExploreEnabled",
  "toolGroupingTerminalEnabled",
  "toolGroupingChangesEnabled",
  "kcodeInteractionBehavior",
  "modelFallbackByWorkspace",
  "askUserQuestionAutoResolutionEnabled",
  "modelIoFullRetentionEnabled",
  "providerFamilyConnectionSelections",
  "providerFamilyDomain",
  "nativeSearchEnhancementsEnabled",
  "memoryEnabled",
  "managedSystemRoleEnabled",
  "onboardingOccupation",
  "proactiveSuggestionsEnabled",
  "promptEnhance",
  "receivePreviewUpdates",
  "autoDownloadAndInstallUpdates",
  "settingsSyncFirstRunPromptHandled",
  "kcodeEndpointOrigin",
  "startPlanRecommendationDismissed",
  "configBackupWebdav",
] as const;

export type ConfigBackupPortableSettingKey = (typeof CONFIG_BACKUP_PORTABLE_SETTING_KEYS)[number];

export interface ConfigBackupWebdavSettings {
  url: string;
  username: string;
  remotePath: string;
}

export interface ConfigBackupWebdavConnection {
  url: string;
  username: string;
  remotePath?: string;
  password: string;
}

export interface ConfigBackupExportResult {
  bytesBase64: string;
  suggestedName: string;
}

export interface ConfigBackupImportResult {
  restoredSettings: boolean;
  restoredProviders: boolean;
  exportedAt: string;
}

export interface ConfigBackupWebdavTestResult {
  ok: boolean;
  error?: string;
}

export interface ConfigBackupWebdavUploadResult {
  remoteUrl: string;
}
