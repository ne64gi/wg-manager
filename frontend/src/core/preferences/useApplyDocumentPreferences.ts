import { useEffect } from "react";

import { applyDocumentPreferences, getPreviewTheme, getStoredPreviewLocale } from "./previewPreferences";

type Options = {
  isAuthenticated: boolean;
  themeMode?: "light" | "dark" | "system";
  defaultLocale?: "en" | "ja";
};

export function useApplyDocumentPreferences({
  isAuthenticated,
  themeMode,
  defaultLocale,
}: Options): void {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function syncPreferences() {
      const previewTheme = getPreviewTheme();
      const previewLocale = getStoredPreviewLocale();
      const resolvedThemeMode =
        previewTheme ?? (isAuthenticated ? (themeMode ?? "system") : "system");
      const locale =
        previewLocale ?? (isAuthenticated ? (defaultLocale ?? "en") : "en");

      applyDocumentPreferences({
        locale,
        themeMode: resolvedThemeMode,
        prefersDark: mediaQuery.matches,
      });
    }

    syncPreferences();
    mediaQuery.addEventListener("change", syncPreferences);
    return () => mediaQuery.removeEventListener("change", syncPreferences);
  }, [defaultLocale, isAuthenticated, themeMode]);
}
