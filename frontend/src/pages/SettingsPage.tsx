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
      await queryClient.invalidateQueries({ queryKey: queryKeys.guiSettings });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.initialSettings });
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
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
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
          </div>
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
