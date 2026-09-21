export const THEME_STORAGE_KEY = "kcode-theme";

/** @param {string | null} stored */
/** @param {boolean} prefersDark */
export function resolveTheme(stored, prefersDark) {
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return prefersDark ? "dark" : "light";
}

/** @param {string | null} raw */
export function readStoredTheme(raw) {
  return raw === "light" || raw === "dark" ? raw : null;
}
