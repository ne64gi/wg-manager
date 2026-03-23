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
} from "../lib/api";
import { confirmAction, downloadBlob } from "../lib/browser/actions";
import { formatApplyFailureMessage, t } from "../lib/i18n";
import type { User } from "../types";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { queryKeys } from "../modules/queryKeys";
import { Panel } from "../ui/Cards";
import { MobileInfoPopover } from "../ui/MobileInfoPopover";
import { DataTable } from "../ui/Table";
import { useToast } from "../ui/ToastProvider";

type UserFormState = {
  groupId: string;
  name: string;
  overrideRoutes: string;
  description: string;
  isActive: boolean;
};

const DEFAULT_CREATE_FORM: UserFormState = {
  groupId: "",
  name: "",
  overrideRoutes: "",
  description: "",
  isActive: true,
};

function formatDeleteConfirm(name: string) {
  return t("users.delete_confirm_named", `Delete "${name}"?`).replace("{name}", name);
}

function getBundleWarningText(peerCount: number) {
  return `${t(
    "users.bundle_warning",
    "This bundle will reissue keys for eligible peers, package the new configs into a ZIP, and invalidate older peer files. Apply before distributing the new files.",
  )}\n\n${t("users.bundle_peer_count", "Peer count")}: ${peerCount}`;
}

export function UsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState("all");
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
  const activeCount = useMemo(
    () => (usersQuery.data ?? []).filter((user) => user.is_active).length,
    [usersQuery.data],
  );
  const groupNames = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name] as const)),
    [groups],
  );
  const filteredUsers = useMemo(() => {
    const users = usersQuery.data ?? [];
    if (filterGroupId === "all") {
      return users;
    }
    return users.filter((user) => String(user.group_id) === filterGroupId);
  }, [filterGroupId, usersQuery.data]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.users", "Users")}</div>
          <h1>{t("users.title", "User management")}</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">{t("users.total", "Total users")}</div>
          <div className="stat-value">{usersQuery.data?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("users.enabled_total", "Enabled")}</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" data-testid="users-add-button" onClick={() => setIsCreateOpen(true)}>
          {t("users.add", "+ Add user")}
        </button>
      </div>
      <div className="toolbar-card">
        <label className="toolbar-field">
          <span>{t("users.group_filter", "Group filter")}</span>
          <select
            data-testid="users-group-filter"
            value={filterGroupId}
            onChange={(event) => setFilterGroupId(event.target.value)}
          >
            <option value="all">{t("users.all_groups", "All groups")}</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Panel title={t("users.list", "User list")}>
        <div className="desktop-table">
          <DataTable headers={[t("common.status", "Status"), t("users.name", "Name"), t("table.group", "Group"), t("users.override_routes", "Override routes"), t("common.actions", "Actions")]}>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <button
                    className={`toggle-chip ${user.is_active ? "toggle-chip-on" : ""}`}
                    onClick={() => toggleMutation.mutate(user)}
                  >
                    {user.is_active ? t("common.on", "On") : t("common.off", "Off")}
                  </button>
                </td>
                <td>{user.name}</td>
                <td>{groupNames.get(user.group_id) ?? `Group ${user.group_id}`}</td>
                <td>{user.allowed_ips_override?.join(", ") || t("users.inherit_group", "Inherit group defaults")}</td>
                <td className="action-row">
                  <button
                    className="secondary-button"
                    data-testid={`users-download-bundle-${user.id}`}
                    onClick={() => bundleMutation.mutate(user)}
                  >
                    {t("users.bundle", "Download bundle")}
                  </button>
                  <button className="ghost-button" onClick={() => openEditModal(user)}>
                    {t("common.edit", "Edit")}
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (confirmAction(formatDeleteConfirm(user.name))) {
                        deleteMutation.mutate(user.id);
                      }
                    }}
                  >
                    {t("common.delete", "Delete")}
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
        <div className="mobile-list">
          {filteredUsers.map((user) => (
            <article key={user.id} className="mobile-record">
              <div className="mobile-record-main">
                <div>
                  <div className="mobile-record-title">{user.name}</div>
                  <div className="mobile-record-subtitle">
                    {groupNames.get(user.group_id) ?? `Group ${user.group_id}`}
                  </div>
                </div>
                <div className={`status-pill ${user.is_active ? "status-online" : ""}`}>
                  {user.is_active ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                </div>
              </div>
              <div className="mobile-record-actions">
                <button
                  className={`toggle-chip ${user.is_active ? "toggle-chip-on" : ""}`}
                  onClick={() => toggleMutation.mutate(user)}
                >
                  {user.is_active ? t("common.on", "On") : t("common.off", "Off")}
                </button>
                <button
                  className="secondary-button"
                  data-testid={`users-download-bundle-${user.id}`}
                  onClick={() => bundleMutation.mutate(user)}
                >
                  {t("users.bundle", "Download bundle")}
                </button>
                <button className="ghost-button" onClick={() => openEditModal(user)}>
                  {t("common.edit", "Edit")}
                </button>
                <MobileInfoPopover>
                  <div className="mobile-info-grid">
                    <div><strong>{t("users.override_routes", "Override routes")}</strong></div>
                    <div>{user.allowed_ips_override?.join(", ") || t("users.inherit_group", "Inherit group defaults")}</div>
                    <div><strong>{t("common.description", "Description")}</strong></div>
                    <div>{user.description || "—"}</div>
                  </div>
                </MobileInfoPopover>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (confirmAction(formatDeleteConfirm(user.name))) {
                      deleteMutation.mutate(user.id);
                    }
                  }}
                >
                  {t("common.delete", "Delete")}
                </button>
              </div>
            </article>
          ))}
        </div>
      </Panel>
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div className="modal-card modal-compact" data-testid="users-create-modal" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("users.add_title", "Add user")}</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("table.group", "Group")}</span>
                <select
                  data-testid="users-create-group"
                  value={createForm.groupId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, groupId: event.target.value }))
                  }
                >
                  <option value="">{t("users.select_group", "Select group")}</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{t("users.name", "Name")}</span>
                <input
                  data-testid="users-create-name"
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("users.override_routes", "Override routes")}</span>
                <input
                  data-testid="users-create-override-routes"
                  value={createForm.overrideRoutes}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({
                      ...current,
                      overrideRoutes: event.target.value,
                    }))
                  }
                  placeholder="10.10.1.254/32"
                />
              </label>
              <label className="field field-span-2">
                <span>{t("common.description", "Description")}</span>
                <input
                  data-testid="users-create-description"
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  data-testid="users-create-enabled"
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("users.create_active", "Create this user in an active state.")}</div>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                data-testid="users-create-submit"
                disabled={!createForm.groupId || !createForm.name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? t("users.creating", "Creating...") : t("users.create", "Create user")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingUser ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("users.edit_title", "Edit user")}</h2>
              <button className="ghost-button" onClick={closeEditModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("table.group", "Group")}</span>
                <input value={groupNames.get(Number(editForm.groupId)) ?? editForm.groupId} disabled />
              </label>
              <label className="field">
                <span>{t("users.name", "Name")}</span>
                <input
                  value={editForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("users.override_routes", "Override routes")}</span>
                <input
                  value={editForm.overrideRoutes}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      overrideRoutes: event.target.value,
                    }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("common.description", "Description")}</span>
                <input
                  value={editForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("users.disable_hint", "Disable to stop peer activity for this user.")}</div>
                </div>
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!editForm.name || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    userId: editingUser.id,
                    form: editForm,
                  })
                }
              >
                {updateMutation.isPending ? t("users.saving", "Saving...") : t("users.save_changes", "Save changes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
