import type { UiLocale, SupportedLocale } from "@kcode/contracts";
import { enUS } from "./locales/en-US.js";
import { zhCN } from "./locales/zh-CN.js";
import {
  DEFAULT_LOCALE,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./locale.js";
import type { KCodeCopy } from "./types.js";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectLocale,
  isSupportedLocale,
  isUiLocale,
  resolveLocale,
};
export type { LocaleDetectionInput } from "./locale.js";
export type { CliCopy, TuiCopy, UiLocale, SupportedLocale, KCodeCopy } from "./types.js";

const CATALOGS: Record<SupportedLocale, KCodeCopy> = {
  "en-US": enUS,
  "zh-CN": zhCN,
};

export function getKCodeCopy(locale?: UiLocale | string, detected?: string | null): KCodeCopy {
  return CATALOGS[resolveLocale(locale, detected)];
}
