import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { getAuthSetupStatus, setupInitialLoginUser } from "../lib/api";
import {
  getPreviewLocale,
  getPreviewTheme,
  setPreviewLocale,
  setPreviewTheme,
  t,
  translateErrorMessage,
} from "../lib/i18n";
import { useAuth } from "../modules/auth/AuthContext";

export function LoginPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [locale, setLocale] = useState<"en" | "ja">(getPreviewLocale());
  const [theme, setTheme] = useState<"light" | "dark">(() => getPreviewTheme() ?? "dark");
  const setupStatusQuery = useQuery({
    queryKey: ["auth", "setup-status"],
    queryFn: getAuthSetupStatus,
    retry: false,
  });
  const needsSetup = setupStatusQuery.data?.has_login_users === false;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      await auth.loginAction({ username, password });
      navigate("/", { replace: true });
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

  async function handleSetupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
      navigate("/", { replace: true });
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

  return (
    <div className="login-shell">
      <div className="login-backdrop-glow login-backdrop-glow-left" />
      <div className="login-backdrop-glow login-backdrop-glow-right" />
      <form className="login-card login-card-xui" onSubmit={needsSetup ? handleSetupSubmit : handleSubmit}>
        <div className="login-card-top">
          <div className="login-brand-chip">
            <div className="eyebrow">wg-studio</div>
          </div>
          <div className="login-settings-panel">
            <button
              type="button"
              className="login-settings-button"
              onClick={() => setIsSettingsOpen((current) => !current)}
            >
              {t("auth.display_settings_button", "Display")}
            </button>
            {isSettingsOpen ? (
              <div className="login-settings-popover">
                <div className="login-settings-heading">
                  {t("auth.settings", "Display settings")}
                </div>
                <div className="login-settings-row">
                  <span>{t("theme.quick_toggle", "Theme")}</span>
                  <button
                    type="button"
                    className={`theme-toggle ${theme === "dark" ? "theme-toggle-on" : ""}`}
                    aria-pressed={theme === "dark"}
                    onClick={() =>
                      setTheme((current) => {
                        const nextTheme = current === "dark" ? "light" : "dark";
                        setPreviewTheme(nextTheme);
                        return nextTheme;
                      })
                    }
                  >
                    <span className="theme-toggle-knob" />
                  </button>
                </div>
                <div className="login-settings-caption">
                  {theme === "dark"
                    ? t("theme.dark", "Dark")
                    : t("theme.light", "Light")}
                </div>
                <label className="field login-settings-field">
                  <span>{t("auth.language", "Language")}</span>
                  <select
                    value={locale}
                    onChange={(event) => {
                      const nextLocale = event.target.value === "ja" ? "ja" : "en";
                      setPreviewLocale(nextLocale);
                      setLocale(nextLocale);
                    }}
                  >
                    <option value="en">{t("locale.en", "English")}</option>
                    <option value="ja">{t("locale.ja", "Japanese")}</option>
                  </select>
                </label>
              </div>
            ) : null}
          </div>
        </div>
        <div className="login-hero">
          <div className="login-logo-orb">
            <span className="brand-badge">wg</span>
          </div>
          <div className="login-hero-copy">
            <h1>
              {needsSetup
                ? t("auth.setup_title", "Create the first admin user")
                : t("auth.login_title", "Control plane sign in")}
            </h1>
            <p className="muted-text">
              {needsSetup
                ? t(
                    "auth.setup_description",
                    "No login users exist yet, so create the first administrator account.",
                  )
                : t(
                    "auth.login_description",
                    "Sign in to access peers, traffic summaries, and apply operations.",
                  )}
            </p>
          </div>
        </div>
        <label className="field login-field">
          <span>{t("auth.username", "Username")}</span>
          <div className="login-input-shell">
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </div>
        </label>
        <label className="field login-field">
          <span>{t("auth.password", "Password")}</span>
          <div className="login-input-shell">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
        </label>
        {needsSetup ? (
          <label className="field login-field">
            <span>{t("auth.confirm_password", "Confirm password")}</span>
            <div className="login-input-shell">
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </label>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <button className="primary-button login-submit" type="submit" disabled={isSubmitting}>
          {needsSetup
            ? isSubmitting
              ? t("auth.setup_submitting", "Creating...")
              : t("auth.setup_submit", "Create admin user")
            : isSubmitting
              ? t("auth.signing_in", "Signing in...")
              : t("auth.sign_in", "Sign in")}
        </button>
      </form>
    </div>
  );
}
