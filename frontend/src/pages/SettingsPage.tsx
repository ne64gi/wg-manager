import { useRef, useState, type ReactNode } from "react";

import { formatDateTime } from "../lib/format";
import { t } from "../core/i18n";
import { useSettingsPageData } from "../modules/gui/useSettingsPageData";
import type { GuiSettingsUpdate } from "../types";
import { DataTable } from "../design/ui/Table";
import { GlobeIcon, LockIcon, SettingsIcon } from "../ui/Icons";

type TabKey = "general" | "server" | "security";

function Accordion({
  title,
  children,
  defaultOpen = true,
  summaryTestId,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  summaryTestId?: string;
}) {
  return (
    <details className="accordion-card" open={defaultOpen}>
      <summary className="accordion-summary" data-testid={summaryTestId}>
        <span className="accordion-title">{title}</span>
        <span className="accordion-summary-chevron">⌄</span>
      </summary>
      <div className="accordion-content">{children}</div>
    </details>
  );
}

export function SettingsPage() {
  const {
    auth,
    loginUsersQuery,
    versionQuery,
    formState,
    setFormState,
    effectiveThemeMode,
    effectiveLocale,
    setThemeMode,
    setDefaultLocale,
    endpointAddress,
    setEndpointAddress,
    endpointPort,
    setEndpointPort,
    interfaceMtu,
    setInterfaceMtu,
    serverAddress,
    setServerAddress,
    serverDns,
    setServerDns,
    newUsername,
    setNewUsername,
    newPassword,
    setNewPassword,
    passwordModalOpen,
    setPasswordModalOpen,
    currentPassword,
    setCurrentPassword,
    nextPassword,
    setNextPassword,
    confirmPassword,
    setConfirmPassword,
    settingsMutation,
    endpointMutation,
    createLoginUserMutation,
    deleteLoginUserMutation,
    changePasswordMutation,
    exportMutation,
    importMutation,
    handleImportFile,
    submitPasswordChange,
  } = useSettingsPageData();

  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [tab, setTab] = useState<TabKey>("general");

  return (
    <div className="page-stack">
      <div className="page-header settings-page-header">
        <div>
          <div className="eyebrow">{t("settings.eyebrow", "Settings")}</div>
          <h1 data-testid="settings-page-heading">
            {t("settings.heading", "Settings")}
          </h1>
        </div>
      </div>

      <div className="tabs settings-tabs">
        <button
          type="button"
          className={`tab-button ${tab === "general" ? "active" : ""}`}
          onClick={() => setTab("general")}
        >
          <SettingsIcon />
          <span>{t("settings.general_tab", "General")}</span>
        </button>

        <button
          type="button"
          className={`tab-button ${tab === "server" ? "active" : ""}`}
          onClick={() => setTab("server")}
        >
          <GlobeIcon />
          <span>{t("settings.server_tab", "Server")}</span>
        </button>

        <button
          type="button"
          className={`tab-button ${tab === "security" ? "active" : ""}`}
          onClick={() => setTab("security")}
        >
          <LockIcon />
          <span>{t("settings.security_tab", "Security")}</span>
        </button>
      </div>

      <div className="tab-content">
        {tab === "general" ? (
          <div className="page-stack">
            <Accordion
              title={t("settings.gui_heading", "GUI settings")}
              defaultOpen
            >
              <div className="form-grid">
                <label className="field">
                  <span>{t("settings.theme_mode", "Theme mode")}</span>
                  <select
                    data-testid="settings-theme-mode-select"
                    value={effectiveThemeMode}
                    onChange={(event) =>
                      setThemeMode(
                        event.target.value as GuiSettingsUpdate["theme_mode"],
                      )
                    }
                  >
                    <option value="system">
                      {t("settings.system_label", "System")}
                    </option>
                    <option value="dark">{t("common.dark", "dark")}</option>
                    <option value="light">{t("common.light", "light")}</option>
                  </select>
                  <div className="muted-text">
                    {t("settings.theme_hint", "Switch the GUI theme.")}
                  </div>
                </label>

                <label className="field">
                  <span>{t("settings.default_locale", "Default locale")}</span>
                  <select
                    data-testid="settings-default-locale-select"
                    value={effectiveLocale}
                    onChange={(event) =>
                      setDefaultLocale(
                        event.target.value as GuiSettingsUpdate["default_locale"],
                      )
                    }
                  >
                    <option value="en">{t("locale.en", "English")}</option>
                    <option value="ja">{t("locale.ja", "Japanese")}</option>
                  </select>
                  <div className="muted-text">
                    {t(
                      "settings.locale_hint",
                      "Default language for newly opened screens.",
                    )}
                  </div>
                </label>
              </div>

              <div className="action-row settings-section-actions">
                <button
                  type="button"
                  className="primary-button"
                  data-testid="settings-save-gui"
                  onClick={() => settingsMutation.mutate()}
                  disabled={settingsMutation.isPending}
                >
                  {t("common.save", "Save")}
                </button>
              </div>
            </Accordion>

            <Accordion
              title={t("settings.language_and_time", "Language and time")}
              defaultOpen={false}
              summaryTestId="settings-language-and-time-summary"
            >
              <div className="form-grid">
                <label className="field">
                  <span>
                    {t("settings.overview_refresh", "Overview refresh (sec)")}
                  </span>
                  <input
                    type="number"
                    value={formState.overview_refresh_seconds ?? 5}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        overview_refresh_seconds: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>{t("settings.peers_refresh", "Peers refresh (sec)")}</span>
                  <input
                    type="number"
                    value={formState.peers_refresh_seconds ?? 10}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        peers_refresh_seconds: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>
                    {t(
                      "settings.snapshot_interval",
                      "Traffic snapshot interval (sec)",
                    )}
                  </span>
                  <input
                    type="number"
                    value={formState.traffic_snapshot_interval_seconds ?? 300}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        traffic_snapshot_interval_seconds: Number(
                          event.target.value,
                        ),
                      }))
                    }
                  />
                </label>

                <label className="field">
                  <span>
                    {t(
                      "settings.snapshot_retention_days",
                      "Traffic history retention (days)",
                    )}
                  </span>
                  <input
                    type="number"
                    data-testid="settings-snapshot-retention-days"
                    value={formState.traffic_snapshot_retention_days ?? 30}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        traffic_snapshot_retention_days: Number(event.target.value),
                      }))
                    }
                  />
                  <div className="muted-text">
                    {t(
                      "settings.snapshot_retention_days_hint",
                      "Snapshots older than this retention window are deleted automatically.",
                    )}
                  </div>
                </label>

                <label className="field">
                  <span>
                    {t("settings.online_threshold", "Online threshold (sec)")}
                  </span>
                  <input
                    type="number"
                    value={formState.online_threshold_seconds ?? 120}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        online_threshold_seconds: Number(event.target.value),
                      }))
                    }
                  />
                </label>

                <label className="field field-span-2 field-checkbox settings-checkbox-row">
                  <input
                    type="checkbox"
                    checked={formState.refresh_after_apply ?? true}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        refresh_after_apply: event.target.checked,
                      }))
                    }
                  />
                  <div className="settings-checkbox-copy">
                    <span className="settings-checkbox-title">
                      {t(
                        "settings.apply_after_change",
                        "Apply immediately after peer changes",
                      )}
                    </span>
                    <div className="muted-text">
                      {t(
                        "settings.apply_after_change_hint",
                        "When enabled, create/revoke/delete peer operations trigger server apply.",
                      )}
                    </div>
                  </div>
                </label>
              </div>

              <div className="action-row settings-section-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => settingsMutation.mutate()}
                  disabled={settingsMutation.isPending}
                >
                  {t("common.save", "Save")}
                </button>
              </div>
            </Accordion>

            <Accordion
              title={t("settings.version_heading", "Build information")}
              defaultOpen={false}
            >
              <div className="form-grid">
                <div className="field">
                  <span>{t("settings.system_version", "System version")}</span>
                  <input
                    value={versionQuery.data?.version ?? ""}
                    readOnly
                    placeholder="0.0.0"
                  />
                </div>

                <div className="field">
                  <span>
                    {t("settings.frontend_version", "Frontend version")}
                  </span>
                  <input
                    value={
                      versionQuery.data?.frontend_version ??
                      __WG_STUDIO_VERSION__
                    }
                    readOnly
                    placeholder="0.0.0"
                  />
                </div>

                <div className="field">
                  <span>{t("settings.runtime_adapter", "Runtime adapter")}</span>
                  <input
                    data-testid="settings-runtime-adapter"
                    value={versionQuery.data?.runtime_adapter ?? ""}
                    readOnly
                    placeholder="docker_container"
                  />
                </div>
              </div>
            </Accordion>
          </div>
        ) : null}

        {tab === "server" ? (
          <div className="page-stack">
            <Accordion
              title={t("settings.endpoint_heading", "Endpoint settings")}
              defaultOpen
            >
              <div className="form-grid">
                <label className="field">
                  <span>
                    {t("settings.endpoint_address", "Endpoint address")}
                  </span>
                  <input
                    value={endpointAddress}
                    onChange={(event) => setEndpointAddress(event.target.value)}
                  />
                  <div className="muted-text">
                    {t(
                      "settings.endpoint_hint",
                      "Address and port embedded into peer configs.",
                    )}
                  </div>
                </label>

                <label className="field">
                  <span>{t("settings.endpoint_port", "Endpoint port")}</span>
                  <input
                    type="number"
                    value={endpointPort}
                    onChange={(event) => setEndpointPort(event.target.value)}
                  />
                  <div className="muted-text">
                    {t(
                      "settings.endpoint_port_hint",
                      "Public port number embedded in generated peer configs.",
                    )}
                  </div>
                </label>

                <label className="field">
                  <span>{t("settings.server_address", "Server address")}</span>
                  <input
                    value={serverAddress}
                    onChange={(event) => setServerAddress(event.target.value)}
                    placeholder={t(
                      "settings.server_address_placeholder",
                      "e.g. 10.255.255.1/32",
                    )}
                  />
                  <div className="muted-text">
                    {t(
                      "settings.server_address_hint",
                      "Server IP address used in generated WireGuard server config.",
                    )}
                  </div>
                </label>

                <label className="field">
                  <span>{t("settings.server_dns", "Server DNS")}</span>
                  <input
                    value={serverDns}
                    onChange={(event) => setServerDns(event.target.value)}
                    placeholder={t(
                      "settings.server_dns_placeholder",
                      "e.g. 1.1.1.1,8.8.8.8",
                    )}
                  />
                  <div className="muted-text">
                    {t(
                      "settings.server_dns_hint",
                      "Comma-separated DNS servers used in generated peer configs.",
                    )}
                  </div>
                </label>

                <label className="field">
                  <span>{t("settings.interface_mtu", "Interface MTU")}</span>
                  <input
                    data-testid="settings-interface-mtu"
                    type="number"
                    min="576"
                    max="9000"
                    value={interfaceMtu}
                    onChange={(event) => setInterfaceMtu(event.target.value)}
                    placeholder={t(
                      "settings.interface_mtu_placeholder",
                      "optional",
                    )}
                  />
                  <div className="muted-text">
                    {t(
                      "settings.interface_mtu_hint",
                      "Optional MTU embedded into generated WireGuard interface configs.",
                    )}
                  </div>
                </label>
              </div>

              <div className="action-row settings-section-actions">
                <button
                  type="button"
                  className="primary-button"
                  data-testid="settings-interface-save"
                  onClick={() => endpointMutation.mutate()}
                  disabled={endpointMutation.isPending}
                >
                  {t("common.save", "Save")}
                </button>
              </div>
            </Accordion>

            <Accordion
              title={t("settings.server_runtime", "Server runtime")}
              defaultOpen={false}
            >
              <div className="form-grid">
                <label className="field">
                  <span>{t("settings.error_log_level", "Error log level")}</span>
                  <select
                    data-testid="settings-error-log-level-select"
                    value={formState.error_log_level ?? "warning"}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        error_log_level: event.target.value,
                      }))
                    }
                  >
                    <option value="debug">{t("log_level.debug", "debug")}</option>
                    <option value="info">{t("log_level.info", "info")}</option>
                    <option value="warning">
                      {t("log_level.warning", "warning")}
                    </option>
                    <option value="error">{t("log_level.error", "error")}</option>
                    <option value="critical">
                      {t("log_level.critical", "critical")}
                    </option>
                  </select>
                  <div className="muted-text">
                    {t(
                      "settings.log_level_hint",
                      "Choose which GUI error levels should be recorded.",
                    )}
                  </div>
                </label>

                <label className="field">
                  <span>{t("settings.access_log_path", "Access log path")}</span>
                  <input
                    value={formState.access_log_path ?? "none"}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        access_log_path: event.target.value,
                      }))
                    }
                    placeholder={t("common.none", "none")}
                  />
                </label>

                <label className="field">
                  <span>{t("settings.error_log_path", "Error log path")}</span>
                  <input
                    value={formState.error_log_path ?? "none"}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        error_log_path: event.target.value,
                      }))
                    }
                    placeholder={t("common.none", "none")}
                  />
                </label>
              </div>

              <div className="action-row settings-section-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => settingsMutation.mutate()}
                  disabled={settingsMutation.isPending}
                >
                  {t("common.save", "Save")}
                </button>
              </div>
            </Accordion>

            <Accordion
              title={t("settings.transfer_heading", "State import / export")}
              defaultOpen={false}
            >
              <div className="warning-banner">
                {t(
                  "settings.transfer_backup_rule",
                  "Take a full DB backup before import. JSON state import is for logical transfer, not full recovery.",
                )}
              </div>

              <div className="muted-text">
                {t(
                  "settings.transfer_hint",
                  "Export the current control-plane state as JSON, or import a previously exported state to replace the current one.",
                )}
              </div>

              <div className="action-row settings-section-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => exportMutation.mutate()}
                  disabled={exportMutation.isPending}
                >
                  {t("settings.export_state", "Export JSON")}
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => importInputRef.current?.click()}
                  disabled={importMutation.isPending}
                >
                  {t("settings.import_state", "Import JSON")}
                </button>

                <input
                  ref={importInputRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={async (event) => {
                    await handleImportFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </div>
            </Accordion>
          </div>
        ) : null}

        {tab === "security" ? (
          <div className="page-stack">
            <Accordion
              title={t("settings.login_users_heading", "Login users")}
              defaultOpen
            >
              <div className="inline-form">
                <input
                  placeholder={t(
                    "settings.login_user_username_placeholder",
                    "username",
                  )}
                  value={newUsername}
                  onChange={(event) => setNewUsername(event.target.value)}
                />
                <input
                  placeholder={t(
                    "settings.login_user_password_placeholder",
                    "password",
                  )}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => createLoginUserMutation.mutate()}
                  disabled={createLoginUserMutation.isPending}
                >
                  {t("settings.add_user", "Add user")}
                </button>
              </div>

              <DataTable
                headers={[
                  t("common.username", "Username"),
                  t("common.status", "Status"),
                  t("common.last_login", "Last login"),
                  t("common.actions", "Actions"),
                ]}
              >
                {(loginUsersQuery.data ?? []).map((loginUser) => (
                  <tr key={loginUser.id}>
                    <td>{loginUser.username}</td>
                    <td>
                      {loginUser.is_active
                        ? t("common.enabled", "Enabled")
                        : t("common.disabled", "Disabled")}
                    </td>
                    <td>{formatDateTime(loginUser.last_login_at)}</td>
                    <td>
                      <div className="action-row action-row-compact">
                        {auth.currentUser?.id === loginUser.id ? (
                          <button
                            type="button"
                            className="ghost-button"
                            onClick={() => setPasswordModalOpen(true)}
                          >
                            {t("settings.change_password", "Change password")}
                          </button>
                        ) : null}

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() =>
                            deleteLoginUserMutation.mutate(loginUser.id)
                          }
                          disabled={deleteLoginUserMutation.isPending}
                        >
                          {t("common.delete", "Delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            </Accordion>
          </div>
        ) : null}
      </div>

      {passwordModalOpen ? (
        <div className="modal-backdrop" onClick={() => setPasswordModalOpen(false)}>
          <div
            className="modal-card modal-compact"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="panel-header">
              <h2>{t("auth.change_password_title", "Change password")}</h2>
              <button
                type="button"
                className="ghost-button"
                onClick={() => setPasswordModalOpen(false)}
              >
                {t("common.close", "Close")}
              </button>
            </div>

            <div className="muted-text">
              {t(
                "auth.change_password_description",
                "Verify your current password before updating it.",
              )}
            </div>

            <div className="form-grid" style={{ marginTop: 16 }}>
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

            <div className="modal-actions">
              <button
                type="button"
                className="primary-button"
                disabled={
                  !currentPassword ||
                  !nextPassword ||
                  nextPassword !== confirmPassword ||
                  changePasswordMutation.isPending
                }
                onClick={submitPasswordChange}
              >
                {t("auth.change_password", "Change password")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
