import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyServerConfig,
  createUser,
  deleteUser,
  downloadUserBundle,
  getUserBundleWarning,
  listGroups,
  listUsers,
  updateUser,
} from "../../lib/api";
import { confirmAction, downloadBlob } from "../../lib/browser/actions";
import { formatApplyFailureMessage, t } from "../../lib/i18n";
import type { User } from "../../types";
import { useToast } from "../../ui/ToastProvider";
import { useAuth } from "../auth/AuthContext";
import { useGuiSettingsQuery } from "../gui/useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";

export type UserFormState = {
  groupId: string;
  name: string;
  overrideRoutes: string;
  description: string;
  isActive: boolean;
};

export const DEFAULT_CREATE_FORM: UserFormState = {
  groupId: "",
  name: "",
  overrideRoutes: "",
  description: "",
  isActive: true,
};

export function formatDeleteConfirm(name: string) {
  return t("users.delete_confirm_named", `Delete "${name}"?`).replace("{name}", name);
}

export function getBundleWarningText(peerCount: number) {
  return `${t(
    "users.bundle_warning",
    "This bundle will reissue keys for eligible peers, package the new configs into a ZIP, and invalidate older peer files. Apply before distributing the new files.",
  )}\n\n${t("users.bundle_peer_count", "Peer count")}: ${peerCount}`;
}

export function useUsersPageData() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [createForm, setCreateForm] = useState<UserFormState>(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState<UserFormState>(DEFAULT_CREATE_FORM);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const guiSettingsQuery = useGuiSettingsQuery();
  const { pushToast } = useToast();
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => listUsers((await auth.getValidAccessToken()) ?? ""),
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });

  async function refreshQueries() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
    await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
    await queryClient.invalidateQueries({ queryKey: queryKeys.syncState });
  }

  async function applyIfNeeded(successNotice?: string) {
    if (!guiSettingsQuery.data?.refresh_after_apply) {
      if (successNotice) {
        pushToast(successNotice);
      }
      return;
    }

    try {
      await applyServerConfig((await auth.getValidAccessToken()) ?? "");
      pushToast(successNotice ?? t("common.config_applied", "Config applied."));
    } catch (error) {
      pushToast(
        formatApplyFailureMessage(
          successNotice ?? t("common.change_saved", "Change saved."),
          error instanceof Error ? error.message : undefined,
        ),
        "error",
      );
    }
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    setCreateForm(DEFAULT_CREATE_FORM);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm({
      groupId: String(user.group_id),
      name: user.name,
      overrideRoutes: user.allowed_ips_override?.join(", ") ?? "",
      description: user.description ?? "",
      isActive: user.is_active,
    });
  }

  function closeEditModal() {
    setEditingUser(null);
    setEditForm(DEFAULT_CREATE_FORM);
  }

  const createMutation = useMutation({
    mutationFn: async () =>
      createUser((await auth.getValidAccessToken()) ?? "", {
        group_id: Number(createForm.groupId),
        name: createForm.name,
        allowed_ips_override: createForm.overrideRoutes
          ? createForm.overrideRoutes
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
        description: createForm.description,
        is_active: createForm.isActive,
      }),
    onSuccess: async () => {
      closeCreateModal();
      await applyIfNeeded(t("users.created_notice", "User created."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("users.create_failed", "Failed to create user"),
        "error",
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ userId, form }: { userId: number; form: UserFormState }) =>
      updateUser((await auth.getValidAccessToken()) ?? "", userId, {
        name: form.name,
        allowed_ips_override: form.overrideRoutes
          ? form.overrideRoutes
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : null,
        description: form.description,
        is_active: form.isActive,
      }),
    onSuccess: async () => {
      closeEditModal();
      await applyIfNeeded(t("users.updated_notice", "User updated."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("users.update_failed", "Failed to update user"),
        "error",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (user: User) =>
      updateUser((await auth.getValidAccessToken()) ?? "", user.id, {
        is_active: !user.is_active,
      }),
    onSuccess: async (_, user) => {
      await applyIfNeeded(
        user.is_active
          ? t("users.disabled_notice", "User disabled.")
          : t("users.enabled_notice", "User enabled."),
      );
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("users.update_failed", "Failed to update user"),
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) =>
      deleteUser(userId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded(t("users.deleted_notice", "User deleted."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("users.delete_failed", "Failed to delete user"),
        "error",
      );
    },
  });

  const bundleMutation = useMutation({
    mutationFn: async (user: User) => {
      const accessToken = (await auth.getValidAccessToken()) ?? "";
      const warning = await getUserBundleWarning(user.id, accessToken);
      const confirmed = confirmAction(getBundleWarningText(warning.peer_count));
      if (!confirmed) {
        return null;
      }
      return {
        blob: await downloadUserBundle(user.id, accessToken),
        filename: `${user.name}-peers.zip`,
      };
    },
    onSuccess: async (result) => {
      if (!result) {
        return;
      }
      downloadBlob(result.blob, result.filename);
      await applyIfNeeded(t("users.bundle_notice", "User peer bundle downloaded."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("users.bundle_failed", "Failed to download user bundle."),
        "error",
      );
    },
  });

  const groups = groupsQuery.data ?? [];
  const users = usersQuery.data ?? [];
  const activeCount = useMemo(
    () => users.filter((user) => user.is_active).length,
    [users],
  );
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name] as const)),
    [groups],
  );
  const filteredUsers = useMemo(() => {
    const filteredByGroup =
      filterGroupId === "all"
        ? users
        : users.filter((user) => String(user.group_id) === filterGroupId);
    const needle = searchText.trim().toLowerCase();
    if (!needle) {
      return filteredByGroup;
    }

    return filteredByGroup.filter((user) =>
      [
        user.name,
        groupNames.get(user.group_id) ?? `Group ${user.group_id}`,
        user.allowed_ips_override?.join(" ") ?? "",
        user.description ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [filterGroupId, groupNames, searchText, users]);

  return {
    groups,
    users,
    activeCount,
    groupNames,
    filteredUsers,
    searchText,
    setSearchText,
    isCreateOpen,
    setIsCreateOpen,
    filterGroupId,
    setFilterGroupId,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    editingUser,
    guiSettingsQuery,
    closeCreateModal,
    openEditModal,
    closeEditModal,
    createMutation,
    updateMutation,
    toggleMutation,
    deleteMutation,
    bundleMutation,
  };
}
