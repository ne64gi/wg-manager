import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createUser, deleteUser, listGroups, listUsers, updateUser } from "../lib/api";
import { applyServerConfig } from "../lib/api";
import type { User } from "../types";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { queryKeys } from "../modules/queryKeys";
import { Panel } from "../ui/Cards";
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

export function UsersPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [filterGroupId, setFilterGroupId] = useState("all");
  const [createForm, setCreateForm] = useState<UserFormState>(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState<UserFormState>(DEFAULT_CREATE_FORM);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
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
      pushToast(successNotice ?? "Config applied.");
    } catch (error) {
      pushToast(
        error instanceof Error
          ? `${successNotice ?? "Change saved."} Apply failed: ${error.message}`
          : `${successNotice ?? "Change saved."} Apply failed.`,
        "error",
      );
    }
  }

  function closeCreateModal() {
    setIsCreateOpen(false);
    setCreateError(null);
    setCreateForm(DEFAULT_CREATE_FORM);
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditError(null);
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
    setEditError(null);
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
      await applyIfNeeded("User created.");
      await refreshQueries();
    },
    onError: (error) => {
      setCreateError(error instanceof Error ? error.message : "Failed to create user");
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
      await applyIfNeeded("User updated.");
      await refreshQueries();
    },
    onError: (error) => {
      setEditError(error instanceof Error ? error.message : "Failed to update user");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (user: User) =>
      updateUser((await auth.getValidAccessToken()) ?? "", user.id, {
        is_active: !user.is_active,
      }),
    onSuccess: async (_, user) => {
      await applyIfNeeded(user.is_active ? "User disabled." : "User enabled.");
      await refreshQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: number) =>
      deleteUser(userId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded("User deleted.");
      await refreshQueries();
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
          <div className="eyebrow">Users</div>
          <h1>User policy assignments</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">Total users</div>
          <div className="stat-value">{usersQuery.data?.length ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Enabled</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          + Add user
        </button>
      </div>
      <div className="toolbar-card">
        <label className="toolbar-field">
          <span>Group filter</span>
          <select
            value={filterGroupId}
            onChange={(event) => setFilterGroupId(event.target.value)}
          >
            <option value="all">All groups</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <Panel title="User list">
        <DataTable headers={["Status", "Name", "Group", "Override routes", "Actions"]}>
          {filteredUsers.map((user) => (
            <tr key={user.id}>
              <td>
                <button
                  className={`toggle-chip ${user.is_active ? "toggle-chip-on" : ""}`}
                  onClick={() => toggleMutation.mutate(user)}
                >
                  {user.is_active ? "On" : "Off"}
                </button>
              </td>
              <td>{user.name}</td>
              <td>{groupNames.get(user.group_id) ?? `Group ${user.group_id}`}</td>
              <td>{user.allowed_ips_override?.join(", ") || "Inherit group defaults"}</td>
              <td className="action-row">
                <button className="ghost-button" onClick={() => openEditModal(user)}>
                  Edit
                </button>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`Delete user "${user.name}"?`)) {
                      deleteMutation.mutate(user.id);
                    }
                  }}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      {isCreateOpen ? (
        <div className="modal-backdrop" onClick={closeCreateModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Add user</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Group</span>
                <select
                  value={createForm.groupId}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, groupId: event.target.value }))
                  }
                >
                  <option value="">Select group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>Override routes</span>
                <input
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
                <span>Description</span>
                <input
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, description: event.target.value }))
                  }
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) =>
                    setCreateForm((current) => ({ ...current, isActive: event.target.checked }))
                  }
                />
                <div>
                  <strong>Enabled</strong>
                  <div className="muted-text">Create this user in an active state.</div>
                </div>
              </label>
            </div>
            {createError ? <div className="error-banner">{createError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!createForm.groupId || !createForm.name || createMutation.isPending}
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create user"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingUser ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Edit user</h2>
              <button className="ghost-button" onClick={closeEditModal}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Group</span>
                <input value={groupNames.get(Number(editForm.groupId)) ?? editForm.groupId} disabled />
              </label>
              <label className="field">
                <span>Name</span>
                <input
                  value={editForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>Override routes</span>
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
                <span>Description</span>
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
                  <strong>Enabled</strong>
                  <div className="muted-text">Disable to stop peer activity for this user.</div>
                </div>
              </label>
            </div>
            {editError ? <div className="error-banner">{editError}</div> : null}
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
                {updateMutation.isPending ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
