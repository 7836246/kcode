import { readStoredTheme as readStoredThemeRaw, resolveTheme as resolveThemeRaw, THEME_STORAGE_KEY as THEME_STORAGE_KEY_RAW } from "./theme.mjs";

export const THEME_STORAGE_KEY = THEME_STORAGE_KEY_RAW as string;

export type SiteTheme = "light" | "dark";

export function readStoredTheme(raw: string | null): SiteTheme | null {
  return readStoredThemeRaw(raw) as SiteTheme | null;
}

export function resolveTheme(stored: string | null): SiteTheme {
  return resolveThemeRaw(stored) as SiteTheme;
}

export function applyTheme(theme: SiteTheme): void {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  const color = document.querySelector('meta[name="theme-color"]');
  if (color) {
    color.setAttribute("content", theme === "dark" ? "#161616" : "#ffffff");
  }
}

export function persistTheme(theme: SiteTheme): void {
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
}
