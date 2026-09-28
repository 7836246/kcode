import {
  CONFIG_BACKUP_PORTABLE_SETTING_KEYS,
  type AppSettings,
} from "@kcode/shared";

export function pickPortableSettings(settings: AppSettings): Partial<AppSettings> {
  const portable: Partial<AppSettings> = {};
  for (const key of CONFIG_BACKUP_PORTABLE_SETTING_KEYS) {
    if (Object.hasOwn(settings, key)) {
      (portable as Record<string, unknown>)[key] = settings[key];
    }
  }
  return portable;
}
