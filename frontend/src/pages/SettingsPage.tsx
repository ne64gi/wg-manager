import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  changeOwnPassword,
  createLoginUser,
  deleteLoginUser,
  getGuiSettings,
  getInitialSettings,
  listLoginUsers,
  updateGuiSettings,
  updateInitialSettings,
} from "../lib/api";
import { formatDateTime } from "../lib/format";
import { t, translateErrorMessage } from "../lib/i18n";
import { useAuth } from "../modules/auth/AuthContext";
import { queryKeys } from "../modules/queryKeys";
import type { GuiSettingsUpdate } from "../types";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";
import { useToast } from "../ui/ToastProvider";

export function SettingsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const { pushToast } = useToast();
  const settingsQuery = useQuery({
    queryKey: queryKeys.guiSettings,
    queryFn: async () => getGuiSettings((await auth.getValidAccessToken()) ?? ""),
  });
  const initialSettingsQuery = useQuery({
    queryKey: queryKeys.initialSettings,
    queryFn: async () => getInitialSettings((await auth.getValidAccessToken()) ?? ""),
  });
  const loginUsersQuery = useQuery({
    queryKey: queryKeys.loginUsers,
    queryFn: async () => listLoginUsers((await auth.getValidAccessToken()) ?? ""),
  });

  const [formState, setFormState] = useState<GuiSettingsUpdate>({});
  const [endpointAddress, setEndpointAddress] = useState("");
  const [endpointPort, setEndpointPort] = useState("51820");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (settingsQuery.data) {
      setFormState(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (initialSettingsQuery.data) {
      setEndpointAddress(initialSettingsQuery.data.endpoint_address);
      setEndpointPort(String(initialSettingsQuery.data.endpoint_port));
    }
  }, [initialSettingsQuery.data]);

  const settingsMutation = useMutation({
    mutationFn: async () =>
      updateGuiSettings((await auth.getValidAccessToken()) ?? "", formState),
    onSuccess: async () => {
      pushToast(t("settings.saved", "GUI settings saved."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.guiSettings });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.save_failed", "Failed to save GUI settings."),
        "error",
      );
    },
  });

  const endpointMutation = useMutation({
    mutationFn: async () =>
      updateInitialSettings((await auth.getValidAccessToken()) ?? "", {
        endpoint_address: endpointAddress,
        endpoint_port: Number(endpointPort),
      }),
    onSuccess: async () => {
      pushToast(t("settings.endpoint_saved", "Endpoint settings saved."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.initialSettings });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.endpoint_save_failed", "Failed to save endpoint settings."),
        "error",
      );
    },
  });

  const createLoginUserMutation = useMutation({
    mutationFn: async () =>
      createLoginUser((await auth.getValidAccessToken()) ?? "", {
        username: newUsername,
        password: newPassword,
      }),
    onSuccess: async () => {
      setNewUsername("");
      setNewPassword("");
      pushToast(t("settings.login_user_created", "Login user created."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.add_user_failed", "Failed to create login user."),
        "error",
      );
    },
  });

  const deleteLoginUserMutation = useMutation({
    mutationFn: async (loginUserId: number) =>
      deleteLoginUser((await auth.getValidAccessToken()) ?? "", loginUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async () =>
      changeOwnPassword((await auth.getValidAccessToken()) ?? "", {
        current_password: currentPassword,
        new_password: nextPassword,
      }),
    onSuccess: async () => {
      pushToast(t("auth.password_changed", "Password changed."));
      setCurrentPassword("");
      setNextPassword("");
      setConfirmPassword("");
      setPasswordModalOpen(false);
      await queryClient.invalidateQueries({ queryKey: queryKeys.authMe });
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? translateErrorMessage(error.message)
          : t("auth.password_change_failed", "Failed to change password."),
        "error",
      );
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("settings.eyebrow", "Settings")}</div>
          <h1>{t("settings.heading", "GUI and bootstrap settings")}</h1>
        </div>
      </div>

      <div className="two-column-grid">
        <Panel
          title={t("settings.gui_heading", "GUI settings")}
          actions={
            <button className="primary-button" onClick={() => settingsMutation.mutate()}>
              {t("common.save", "Save")}
            </button>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>{t("settings.theme_mode", "Theme mode")}</span>
              <select
                value={formState.theme_mode ?? "system"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    theme_mode: event.target.value as GuiSettingsUpdate["theme_mode"],
                  }))
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
                value={formState.default_locale ?? "en"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    default_locale: event.target.value as GuiSettingsUpdate["default_locale"],
                  }))
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
            <label className="field">
              <span>{t("settings.overview_refresh", "Overview refresh (sec)")}</span>
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
                    traffic_snapshot_interval_seconds: Number(event.target.value),
                  }))
                }
              />
            </label>
            <label className="field">
              <span>{t("settings.online_threshold", "Online threshold (sec)")}</span>
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
            <label className="field">
              <span>{t("settings.error_log_level", "Error log level")}</span>
              <select
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
                <option value="warning">{t("log_level.warning", "warning")}</option>
                <option value="error">{t("log_level.error", "error")}</option>
                <option value="critical">{t("log_level.critical", "critical")}</option>
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
            <label className="field field-span-2 field-checkbox">
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
              <div>
                <span>
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
        </Panel>

        <Panel
          title={t("settings.endpoint_heading", "Endpoint settings")}
          actions={
            <button className="primary-button" onClick={() => endpointMutation.mutate()}>
              {t("common.save", "Save")}
            </button>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>{t("settings.endpoint_address", "Endpoint address")}</span>
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
          </div>
        </Panel>
      </div>

      <Panel title={t("settings.login_users_heading", "Login users")}>
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
          <button className="primary-button" onClick={() => createLoginUserMutation.mutate()}>
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
                  ? t("settings.status_active", "Active")
                  : t("settings.status_disabled", "Disabled")}
              </td>
              <td>{formatDateTime(loginUser.last_login_at)}</td>
              <td>
                {auth.currentUser?.id === loginUser.id ? (
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setPasswordModalOpen(true);
                    }}
                  >
                    {t("settings.change_password", "Change password")}
                  </button>
                ) : null}
                <button
                  className="danger-button"
                  onClick={() => deleteLoginUserMutation.mutate(loginUser.id)}
                >
                  {t("common.delete", "Delete")}
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      {passwordModalOpen ? (
        <div className="modal-backdrop" onClick={() => setPasswordModalOpen(false)}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("auth.change_password_title", "Change password")}</h2>
              <button className="ghost-button" onClick={() => setPasswordModalOpen(false)}>
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
                className="primary-button"
                disabled={
                  !currentPassword ||
                  !nextPassword ||
                  nextPassword !== confirmPassword ||
                  changePasswordMutation.isPending
                }
                onClick={() => {
                  if (nextPassword !== confirmPassword) {
                    pushToast(t("auth.password_mismatch", "Passwords do not match"), "error");
                    return;
                  }
                  changePasswordMutation.mutate();
                }}
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
