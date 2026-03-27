import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { getAuthSetupStatus, setupInitialLoginUser } from "../../lib/api";
import { t, translateErrorMessage } from "../../lib/i18n";
import { useAuth } from "./AuthContext";
import {
  getPreviewLocale,
  getPreviewTheme,
  setPreviewLocale,
  setPreviewTheme,
} from "../preferences/previewPreferences";

export function useLoginPageData(onAuthenticated?: () => void) {
  const auth = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [locale, setLocale] = useState<"en" | "ja">(getPreviewLocale());
  const [theme, setTheme] = useState<"light" | "dark">(() => getPreviewTheme() ?? "dark");
  const setupStatusQuery = useQuery({
    queryKey: ["auth", "setup-status"],
    queryFn: getAuthSetupStatus,
    retry: false,
  });
  const needsSetup = setupStatusQuery.data?.has_login_users === false;

  async function handleLoginSubmit() {
    setIsSubmitting(true);
    setError(null);

    try {
      await auth.loginAction({ username, password });
      onAuthenticated?.();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? translateErrorMessage(submissionError.message)
          : t("auth.invalid_credentials", "Login failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSetupSubmit() {
    setIsSubmitting(true);
    setError(null);

    if (password !== confirmPassword) {
      setError(t("auth.password_mismatch", "Passwords do not match"));
      setIsSubmitting(false);
      return;
    }

    try {
      const pair = await setupInitialLoginUser({ username, password });
      await auth.acceptTokenPair(pair);
      onAuthenticated?.();
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? translateErrorMessage(submissionError.message)
          : t("auth.setup_failed", "Setup failed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsSetup) {
      await handleSetupSubmit();
      return;
    }
    await handleLoginSubmit();
  }

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      setPreviewTheme(nextTheme);
      return nextTheme;
    });
  }

  function changeLocale(value: string) {
    const nextLocale = value === "ja" ? "ja" : "en";
    setPreviewLocale(nextLocale);
    setLocale(nextLocale);
  }

  return {
    username,
    setUsername,
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    error,
    isSubmitting,
    isSettingsOpen,
    setIsSettingsOpen,
    showPassword,
    setShowPassword,
    locale,
    changeLocale,
    theme,
    toggleTheme,
    needsSetup,
    handleSubmit,
  };
}
