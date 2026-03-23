import { t } from "../lib/i18n";
import { useLoginPageState } from "../modules/auth/useLoginPageState";
import {
  BrandIcon,
  EyeIcon,
  EyeOffIcon,
  GlobeIcon,
  LockIcon,
  SettingsIcon,
  UserIcon,
} from "../ui/Icons";

export function LoginPage({
  onAuthenticated,
}: {
  onAuthenticated?: () => void;
}) {
  const {
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
  } = useLoginPageState(onAuthenticated);

  return (
    <div className="login-shell">
      <div className="login-backdrop-glow login-backdrop-glow-left" />
      <div className="login-backdrop-glow login-backdrop-glow-right" />
      <form
        className="login-card login-card-xui"
        data-testid="login-form"
        onSubmit={handleSubmit}
      >
        <div className="login-card-top">
          <div className="login-brand-chip">
            <div className="eyebrow">wg-studio</div>
          </div>
          <div className="login-settings-panel">
            <button
              type="button"
              className="login-settings-button"
              data-testid="login-display-settings"
              onClick={() => setIsSettingsOpen((current) => !current)}
              aria-label={t("auth.display_settings_button", "Display settings")}
              title={t("auth.display_settings_button", "Display settings")}
            >
              <SettingsIcon className="icon login-settings-icon" />
            </button>
            {isSettingsOpen ? (
              <div className="login-settings-popover">
                <button
                  type="button"
                  className="login-settings-toggle-row"
                  data-testid="login-theme-toggle"
                  aria-pressed={theme === "dark"}
                  onClick={toggleTheme}
                >
                  <span>{t("auth.dark_mode", "Dark mode")}</span>
                  <span className={`theme-toggle ${theme === "dark" ? "theme-toggle-on" : ""}`}>
                    <span className="theme-toggle-knob" />
                  </span>
                </button>
                <label className="field login-settings-field">
                  <span>{t("auth.language", "Language")}</span>
                  <div className="login-language-shell">
                    <GlobeIcon className="icon login-language-icon" />
                    <select
                      data-testid="login-language-select"
                      value={locale}
                      onChange={(event) => changeLocale(event.target.value)}
                    >
                      <option value="en">{t("locale.en_flag", "🇺🇸 English")}</option>
                      <option value="ja">{t("locale.ja_flag", "🇯🇵 日本語")}</option>
                    </select>
                  </div>
                </label>
              </div>
            ) : null}
          </div>
        </div>
        <div className="login-hero">
          <div className="login-logo-orb">
            <span className="brand-badge brand-badge-logo">
              <BrandIcon className="brand-icon" />
            </span>
          </div>
          <div className="login-hero-copy">
            <h1>
              {needsSetup
                ? t("auth.setup_title", "Create the first admin user")
                : t("auth.login_title", "Sign in")}
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
          <div className="login-input-shell login-input-shell-icon">
            <UserIcon className="icon login-input-icon" />
            <input
              data-testid="login-username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
        </label>
        <label className="field login-field">
          <span>{t("auth.password", "Password")}</span>
          <div className="login-input-shell login-input-shell-icon">
            <LockIcon className="icon login-input-icon" />
            <input
              data-testid="login-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword
                  ? t("auth.hide_password", "Hide password")
                  : t("auth.show_password", "Show password")
              }
              title={
                showPassword
                  ? t("auth.hide_password", "Hide password")
                  : t("auth.show_password", "Show password")
              }
            >
              {showPassword ? (
                <EyeOffIcon className="icon login-password-toggle-icon" />
              ) : (
                <EyeIcon className="icon login-password-toggle-icon" />
              )}
            </button>
          </div>
        </label>
        {needsSetup ? (
          <label className="field login-field">
            <span>{t("auth.confirm_password", "Confirm password")}</span>
            <div className="login-input-shell login-input-shell-icon">
              <LockIcon className="icon login-input-icon" />
              <input
                data-testid="login-confirm-password"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </label>
        ) : null}
        {error ? <div className="error-banner">{error}</div> : null}
        <button
          className="primary-button login-submit"
          data-testid="login-submit"
          type="submit"
          disabled={isSubmitting}
        >
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
