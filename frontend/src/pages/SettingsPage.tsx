import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLoginUser,
  deleteLoginUser,
  getGuiSettings,
  getInitialSettings,
  listLoginUsers,
  updateGuiSettings,
  updateInitialSettings,
} from "../lib/api";
import { formatDateTime } from "../lib/format";
import { useAuth } from "../modules/auth/AuthContext";
import { queryKeys } from "../modules/queryKeys";
import type { GuiSettingsUpdate } from "../types";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";

export function SettingsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
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
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);
  const [endpointNotice, setEndpointNotice] = useState<string | null>(null);
  const [loginUserError, setLoginUserError] = useState<string | null>(null);

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
      setSettingsNotice("GUI settings saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.guiSettings });
    },
    onError: (error) => {
      setSettingsNotice(error instanceof Error ? error.message : "Failed to save GUI settings.");
    },
  });

  const endpointMutation = useMutation({
    mutationFn: async () =>
      updateInitialSettings(
        (await auth.getValidAccessToken()) ?? "",
        {
          endpoint_address: endpointAddress,
          endpoint_port: Number(endpointPort),
        },
      ),
    onSuccess: async () => {
      setEndpointNotice("Endpoint settings saved.");
      await queryClient.invalidateQueries({ queryKey: queryKeys.initialSettings });
    },
    onError: (error) => {
      setEndpointNotice(error instanceof Error ? error.message : "Failed to save endpoint settings.");
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
      setLoginUserError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
    onError: (error) => {
      setLoginUserError(error instanceof Error ? error.message : "Failed to create login user.");
    },
  });

  const deleteLoginUserMutation = useMutation({
    mutationFn: async (loginUserId: number) =>
      deleteLoginUser((await auth.getValidAccessToken()) ?? "", loginUserId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>GUI and bootstrap settings</h1>
        </div>
      </div>

      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">Theme mode</div>
          <div className="stat-value settings-stat-value">
            {settingsQuery.data?.theme_mode ?? "system"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Default locale</div>
          <div className="stat-value settings-stat-value">
            {settingsQuery.data?.default_locale ?? "en"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Error log level</div>
          <div className="stat-value settings-stat-value">
            {settingsQuery.data?.error_log_level ?? "warning"}
          </div>
        </div>
      </div>

      <div className="two-column-grid">
        <Panel
          title="GUI settings"
          actions={
            <button className="primary-button" onClick={() => settingsMutation.mutate()}>
              Save
            </button>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>Theme mode</span>
              <select
                value={formState.theme_mode ?? "system"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    theme_mode: event.target.value as GuiSettingsUpdate["theme_mode"],
                  }))
                }
              >
                <option value="system">system</option>
                <option value="dark">dark</option>
                <option value="light">light</option>
              </select>
            </label>
            <label className="field">
              <span>Default locale</span>
              <select
                value={formState.default_locale ?? "en"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    default_locale: event.target.value as GuiSettingsUpdate["default_locale"],
                  }))
                }
              >
                <option value="en">en</option>
                <option value="ja">ja</option>
              </select>
            </label>
            <label className="field">
              <span>Overview refresh (sec)</span>
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
              <span>Peers refresh (sec)</span>
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
              <span>Traffic snapshot interval (sec)</span>
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
              <span>Online threshold (sec)</span>
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
              <span>Error log level</span>
              <select
                value={formState.error_log_level ?? "warning"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    error_log_level: event.target.value,
                  }))
                }
              >
                <option value="debug">debug</option>
                <option value="info">info</option>
                <option value="warning">warning</option>
                <option value="error">error</option>
                <option value="critical">critical</option>
              </select>
            </label>
            <label className="field">
              <span>Access log path</span>
              <input
                value={formState.access_log_path ?? "none"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    access_log_path: event.target.value,
                  }))
                }
                placeholder="none"
              />
            </label>
            <label className="field">
              <span>Error log path</span>
              <input
                value={formState.error_log_path ?? "none"}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    error_log_path: event.target.value,
                  }))
                }
                placeholder="none"
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
                <span>Apply immediately after peer changes</span>
                <div className="muted-text">
                  When enabled, create/revoke/delete peer operations trigger server apply.
                </div>
              </div>
            </label>
          </div>
          {settingsNotice ? <div className="info-banner">{settingsNotice}</div> : null}
        </Panel>

        <Panel
          title="Endpoint settings"
          actions={
            <button className="primary-button" onClick={() => endpointMutation.mutate()}>
              Save
            </button>
          }
        >
          <div className="form-grid">
            <label className="field">
              <span>Endpoint address</span>
              <input
                value={endpointAddress}
                onChange={(event) => setEndpointAddress(event.target.value)}
              />
            </label>
            <label className="field">
              <span>Endpoint port</span>
              <input
                type="number"
                value={endpointPort}
                onChange={(event) => setEndpointPort(event.target.value)}
              />
            </label>
          </div>
          {endpointNotice ? <div className="info-banner">{endpointNotice}</div> : null}
        </Panel>
      </div>

      <Panel title="Login users">
        <div className="inline-form">
          <input
            placeholder="username"
            value={newUsername}
            onChange={(event) => setNewUsername(event.target.value)}
          />
          <input
            placeholder="password"
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
          />
          <button className="primary-button" onClick={() => createLoginUserMutation.mutate()}>
            Add user
          </button>
        </div>
        {loginUserError ? <div className="error-banner">{loginUserError}</div> : null}
        <DataTable headers={["Username", "Status", "Last login", "Actions"]}>
          {(loginUsersQuery.data ?? []).map((loginUser) => (
            <tr key={loginUser.id}>
              <td>{loginUser.username}</td>
              <td>{loginUser.is_active ? "Active" : "Disabled"}</td>
              <td>{formatDateTime(loginUser.last_login_at)}</td>
              <td>
                <button
                  className="danger-button"
                  onClick={() => deleteLoginUserMutation.mutate(loginUser.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
    </div>
  );
}
