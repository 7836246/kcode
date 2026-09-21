import { getKCodeCopy, type SupportedLocale, type UiLocale } from "@kcode/i18n";

export function formatCliHelp(
  version: string,
  locale?: UiLocale,
  detectedLocale?: SupportedLocale,
): string {
  return getKCodeCopy(locale, detectedLocale).cli.help(version);
}
