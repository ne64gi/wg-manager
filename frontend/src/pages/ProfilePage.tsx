import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../core/auth/AuthContext";
import { t } from "../core/i18n";
import {
  clearPreviewTheme,
  setPreviewLocale,
  setPreviewTheme,
} from "../core/preferences/previewPreferences";
import { useToast } from "../design/ui/ToastProvider";
import { changeOwnPassword, updateOwnProfile } from "../lib/api";
import { queryKeys } from "../modules/queryKeys";
import type { AuthUpdateProfileRequest } from "../types";

const TIMEZONE_OPTIONS = [
  "UTC",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
];

export function ProfilePage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const [email, setEmail] = useState("");
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("system");
  const [locale, setLocale] = useState<"en" | "ja">("en");
  const [timezone, setTimezone] = useState("UTC");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (!auth.currentUser) {
      return;
    }

    setEmail(auth.currentUser.email ?? "");
    setThemeMode(auth.currentUser.preferred_theme_mode);
    setLocale(auth.currentUser.locale);
    setTimezone(auth.currentUser.timezone);
  }, [auth.currentUser]);

  const updateProfileMutation = useMutation({
    mutationFn: async () =>
      updateOwnProfile((await auth.getValidAccessToken()) ?? "", {
        email: email.trim() || null,
        description: auth.currentUser?.description ?? "",
        preferred_theme_mode: themeMode,
        preferred_locale: locale,
        preferred_timezone: timezone,
        avatar_url: auth.currentUser?.avatar_url ?? null,
      } satisfies AuthUpdateProfileRequest),
    onSuccess: async (updatedUser) => {
      if (updatedUser.locale === "ja" || updatedUser.locale === "en") {
        setPreviewLocale(updatedUser.locale);
      }
      if (
        updatedUser.preferred_theme_mode === "light" ||
        updatedUser.preferred_theme_mode === "dark"
      ) {
        setPreviewTheme(updatedUser.preferred_theme_mode);
      } else {
        clearPreviewTheme();
      }

      queryClient.setQueryData(queryKeys.authMe, updatedUser);
      pushToast(t("auth.profile_updated", "Profile updated."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.authMe });
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("auth.profile_update_failed", "Failed to update profile."),
        "error",
      );
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () =>
      changeOwnPassword((await auth.getValidAccessToken()) ?? "", {
        current_password: currentPassword,
        new_password: nextPassword,
      }),
    onSuccess: async (updatedUser) => {
      queryClient.setQueryData(queryKeys.authMe, updatedUser);
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      pushToast(t("auth.password_changed", "Password changed."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.authMe });
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("auth.password_change_failed", "Failed to change password."),
        "error",
      );
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header settings-page-header">
        <div>
          <div className="eyebrow">{t("auth.profile_title", "My profile")}</div>
          <h1>{t("auth.profile_title", "My profile")}</h1>
        </div>
      </div>

      <section className="card page-stack">
        <div className="form-grid">
          <label className="field">
            <span>{t("auth.email", "Email")}</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
            />
          </label>

          <label className="field">
            <span>{t("auth.name", "Name")}</span>
            <input value={auth.currentUser?.username ?? ""} readOnly />
          </label>

          <label className="field">
            <span>{t("auth.timezone", "Timezone")}</span>
            <select
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
            >
              {TIMEZONE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("settings.theme_mode", "Theme mode")}</span>
            <select
              value={themeMode}
              onChange={(event) =>
                setThemeMode(event.target.value as typeof themeMode)
              }
            >
              <option value="system">
                {t("settings.system_label", "System")}
              </option>
              <option value="dark">{t("common.dark", "dark")}</option>
              <option value="light">{t("common.light", "light")}</option>
            </select>
          </label>

          <label className="field">
            <span>{t("settings.default_locale", "Display language")}</span>
            <select
              value={locale}
              onChange={(event) => setLocale(event.target.value as typeof locale)}
            >
              <option value="en">{t("locale.en", "English")}</option>
              <option value="ja">{t("locale.ja", "Japanese")}</option>
            </select>
          </label>
        </div>

        <div className="action-row settings-section-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => updateProfileMutation.mutate()}
            disabled={updateProfileMutation.isPending}
          >
            {t("auth.save_profile", "Save profile")}
          </button>
        </div>
      </section>

      <section className="card page-stack">
        <div className="panel-header">
          <h2>{t("auth.change_password_title", "Change password")}</h2>
        </div>

        <div className="muted-text">
          {t(
            "auth.change_password_description",
            "Verify your current password before updating it.",
          )}
        </div>

        <div className="form-grid">
          <label className="field field-span-2">
            <span>{t("auth.current_password", "Current password")}</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
            />
          </label>

          <label className="field field-span-2">
            <span>{t("auth.new_password", "New password")}</span>
            <input
              type="password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
            />
          </label>

          <label className="field field-span-2">
            <span>{t("auth.confirm_password", "Confirm password")}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
        </div>

        <div className="action-row settings-section-actions">
          <button
            type="button"
            className="primary-button"
            disabled={
              !currentPassword ||
              !nextPassword ||
              nextPassword !== confirmPassword ||
              changePasswordMutation.isPending
            }
            onClick={() => changePasswordMutation.mutate()}
          >
            {t("auth.change_password", "Change password")}
          </button>
        </div>
      </section>
    </div>
  );
}
