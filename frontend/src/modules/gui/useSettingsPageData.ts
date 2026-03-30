import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createLoginUser,
  deleteLoginUser,
  exportState,
  getGuiSettings,
  getInitialSettings,
  getSystemVersion,
  importState,
  listGroups,
  listLoginUsers,
  updateLoginUser,
  updateGuiSettings,
  updateInitialSettings,
} from "../../lib/api";
import { confirmAction, downloadBlob } from "../../core/browser/actions";
import { t } from "../../core/i18n";
import type { GuiSettingsUpdate, StateExport } from "../../types";
import { useToast } from "../../design/ui/ToastProvider";
import { useAuth } from "../../core/auth/AuthContext";
import { queryKeys } from "../queryKeys";
import {
  clearPreviewTheme,
  getPreviewTheme,
  getStoredPreviewLocale,
  setPreviewLocale,
  setPreviewTheme,
} from "../../core/preferences/previewPreferences";

export function useSettingsPageData() {
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
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });
  const versionQuery = useQuery({
    queryKey: ["gui", "version"],
    queryFn: async () => getSystemVersion((await auth.getValidAccessToken()) ?? ""),
  });

  const [formState, setFormState] = useState<GuiSettingsUpdate>({});
  const [endpointAddress, setEndpointAddress] = useState("");
  const [endpointPort, setEndpointPort] = useState("51820");
  const [interfaceMtu, setInterfaceMtu] = useState("");
  const [serverAddress, setServerAddress] = useState("");
  const [serverDns, setServerDns] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "group_admin">("admin");
  const [newGroupId, setNewGroupId] = useState("");
  const [newIsActive, setNewIsActive] = useState(true);
  const effectiveThemeMode =
    getPreviewTheme() ?? formState.theme_mode ?? "system";
  const effectiveLocale = getStoredPreviewLocale() ?? formState.default_locale ?? "en";

  function setThemeMode(nextThemeMode: GuiSettingsUpdate["theme_mode"]) {
    if (nextThemeMode === "light" || nextThemeMode === "dark") {
      setPreviewTheme(nextThemeMode);
    } else {
      clearPreviewTheme();
    }
    setFormState((current) => ({ ...current, theme_mode: nextThemeMode }));
  }

  function setDefaultLocale(nextLocale: GuiSettingsUpdate["default_locale"]) {
    if (nextLocale === "ja" || nextLocale === "en") {
      setPreviewLocale(nextLocale);
    }
    setFormState((current) => ({ ...current, default_locale: nextLocale }));
  }

  useEffect(() => {
    if (settingsQuery.data) {
      setFormState(settingsQuery.data);
    }
  }, [settingsQuery.data]);

  useEffect(() => {
    if (initialSettingsQuery.data) {
      setEndpointAddress(initialSettingsQuery.data.endpoint_address);
      setEndpointPort(String(initialSettingsQuery.data.endpoint_port));
      setInterfaceMtu(
        initialSettingsQuery.data.interface_mtu === null
          ? ""
          : String(initialSettingsQuery.data.interface_mtu),
      );
      setServerAddress(initialSettingsQuery.data.server_address);
      setServerDns(initialSettingsQuery.data.server_dns.join(", "));
    }
  }, [initialSettingsQuery.data]);

  const settingsMutation = useMutation({
    mutationFn: async () =>
      updateGuiSettings((await auth.getValidAccessToken()) ?? "", formState),
    onSuccess: async (savedSettings) => {
      setFormState(savedSettings);
      setPreviewLocale(savedSettings.default_locale);
      if (savedSettings.theme_mode === "light" || savedSettings.theme_mode === "dark") {
        setPreviewTheme(savedSettings.theme_mode);
      } else {
        clearPreviewTheme();
      }
      queryClient.setQueryData(queryKeys.guiSettings, savedSettings);
      pushToast(t("settings.saved", "GUI settings saved."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.guiSettings });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.save_failed", "Failed to save interface settings."),
        "error",
      );
    },
  });

  const endpointMutation = useMutation({
    mutationFn: async () =>
      updateInitialSettings((await auth.getValidAccessToken()) ?? "", {
        endpoint_address: endpointAddress,
        endpoint_port: Number(endpointPort),
        interface_mtu: interfaceMtu.trim() ? Number(interfaceMtu) : null,
        server_address: serverAddress,
        server_dns: serverDns.split(",").map((item) => item.trim()).filter((item) => item),
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
        role: newRole,
        group_id:
          newRole === "group_admin" && newGroupId.trim()
            ? Number(newGroupId)
            : null,
        is_active: newIsActive,
      }),
    onSuccess: async () => {
      setNewUsername("");
      setNewPassword("");
      setNewRole("admin");
      setNewGroupId("");
      setNewIsActive(true);
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

  const updateLoginUserMutation = useMutation({
    mutationFn: async ({
      loginUserId,
      payload,
    }: {
      loginUserId: number;
      payload: {
        password?: string;
        email?: string | null;
        role?: "admin" | "group_admin";
        group_id?: number | null;
        is_active?: boolean;
      };
    }) =>
      updateLoginUser((await auth.getValidAccessToken()) ?? "", loginUserId, payload),
    onSuccess: async () => {
      pushToast(t("common.change_saved", "Changes saved."));
      await queryClient.invalidateQueries({ queryKey: queryKeys.loginUsers });
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.login_user_update_failed", "Failed to update login user."),
        "error",
      );
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => exportState((await auth.getValidAccessToken()) ?? ""),
    onSuccess: (payload) => {
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      downloadBlob(blob, `wg-studio-state-${payload.exported_at.slice(0, 10)}.json`);
      pushToast(t("settings.export_done", "State exported."));
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.export_failed", "Failed to export state."),
        "error",
      );
    },
  });

  const importMutation = useMutation({
    mutationFn: async (payload: StateExport) =>
      importState((await auth.getValidAccessToken()) ?? "", payload),
    onSuccess: async (result) => {
      pushToast(
        t(
          "settings.import_done",
          `State imported. Groups: ${result.imported_group_count}, users: ${result.imported_user_count}, peers: ${result.imported_peer_count}.`,
        ),
      );
      await queryClient.invalidateQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("settings.import_failed", "Failed to import state."),
        "error",
      );
    },
  });

  async function handleImportFile(file?: File | null) {
    if (!file) {
      return;
    }

    try {
      const payload = JSON.parse(await file.text()) as StateExport;
      const confirmed = confirmAction(
        t(
          "settings.import_confirm",
          "Importing state will replace the current groups, users, peers, endpoint, and GUI settings. Continue?",
        ),
      );
      if (!confirmed) {
        return;
      }
      importMutation.mutate(payload);
    } catch {
      pushToast(t("settings.import_invalid", "The selected file is not valid wg-studio JSON."), "error");
    }
  }

  return {
    auth,
    groupsQuery,
    settingsQuery,
    initialSettingsQuery,
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
    newRole,
    setNewRole,
    newGroupId,
    setNewGroupId,
    newIsActive,
    setNewIsActive,
    settingsMutation,
    endpointMutation,
    createLoginUserMutation,
    deleteLoginUserMutation,
    updateLoginUserMutation,
    exportMutation,
    importMutation,
    handleImportFile,
  };
}
