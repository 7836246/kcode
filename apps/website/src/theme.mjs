export const THEME_STORAGE_KEY = "kcode-theme";

/** @param {string | null} stored */
export function resolveTheme(stored) {
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return "dark";
}

/** @param {string | null} raw */
export function readStoredTheme(raw) {
  return raw === "light" || raw === "dark" ? raw : null;
}
