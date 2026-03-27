import {
  readLocalStorage,
  removeLocalStorage,
  writeLocalStorage,
} from "../browser/storage";

const PREVIEW_LOCALE_KEY = "wg-studio-preview-locale";
const PREVIEW_THEME_KEY = "wg-studio-preview-theme";

export function getPreviewLocale(): "en" | "ja" {
  return getStoredPreviewLocale() ?? "en";
}

export function getStoredPreviewLocale(): "en" | "ja" | null {
  const stored = readLocalStorage(PREVIEW_LOCALE_KEY);
  if (stored === "ja" || stored === "en") {
    return stored;
  }
  return null;
}

export function setPreviewLocale(locale: "en" | "ja"): void {
  writeLocalStorage(PREVIEW_LOCALE_KEY, locale);

  if (typeof document !== "undefined") {
    document.documentElement.lang = locale;
  }
}

export function getPreviewTheme(): "light" | "dark" | null {
  const stored = readLocalStorage(PREVIEW_THEME_KEY);
  return stored === "light" || stored === "dark" ? stored : null;
}

export function setPreviewTheme(theme: "light" | "dark"): void {
  writeLocalStorage(PREVIEW_THEME_KEY, theme);

  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themeMode = theme;
  }
}

export function clearPreviewTheme(): void {
  removeLocalStorage(PREVIEW_THEME_KEY);
}

export function applyDocumentPreferences(options: {
  locale: "en" | "ja";
  themeMode: "light" | "dark" | "system";
  prefersDark: boolean;
}): void {
  if (typeof document === "undefined") {
    return;
  }

  const resolvedTheme =
    options.themeMode === "system"
      ? (options.prefersDark ? "dark" : "light")
      : options.themeMode;

  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.dataset.themeMode = options.themeMode;
  document.documentElement.lang = options.locale;
}
