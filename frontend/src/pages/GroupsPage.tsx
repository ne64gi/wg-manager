import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { createGroup, deleteGroup, listGroups, updateGroup } from "../lib/api";
import { applyServerConfig } from "../lib/api";
import type { Group } from "../types";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { Panel } from "../ui/Cards";
import { DataTable } from "../ui/Table";
import { queryKeys } from "../modules/queryKeys";
import { useToast } from "../ui/ToastProvider";

type GroupFormState = {
  name: string;
  scope: string;
  networkCidr: string;
  allowedIps: string;
  dnsServers: string;
  description: string;
  isActive: boolean;
};

const DEFAULT_CREATE_FORM: GroupFormState = {
  name: "",
  scope: "single_site",
  networkCidr: "",
  allowedIps: "",
  dnsServers: "",
  description: "",
  isActive: true,
};

const SCOPE_PREFIX: Record<string, number> = {
  single_site: 24,
  multi_site: 16,
  admin: 8,
};

const SCOPE_EXAMPLE: Record<string, string> = {
  single_site: "10.10.1.0/24",
  multi_site: "10.10.0.0/16",
  admin: "10.0.0.0/8",
};

function normalizeNetworkCidr(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(
    /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\/(\d{1,2})$/,
  );
  if (!match) {
    return trimmed;
  }

  const octets = match.slice(1, 5).map(Number);
  const prefix = Number(match[5]);
  if (octets.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return trimmed;
  }
  if (Number.isNaN(prefix) || prefix < 0 || prefix > 32) {
    return trimmed;
  }

  let address =
    ((octets[0] << 24) >>> 0) |
    ((octets[1] << 16) >>> 0) |
    ((octets[2] << 8) >>> 0) |
    (octets[3] >>> 0);

  const mask = prefix === 0 ? 0 : ((0xffffffff << (32 - prefix)) >>> 0);
  address = address & mask;

  return [
    (address >>> 24) & 255,
    (address >>> 16) & 255,
    (address >>> 8) & 255,
    address & 255,
  ].join(".") + `/${prefix}`;
}

function getScopeValidationMessage(scope: string, networkCidr: string) {
  const expectedPrefix = SCOPE_PREFIX[scope];
  if (!networkCidr.trim()) {
    return null;
  }

  const match = networkCidr.trim().match(/\/(\d{1,2})$/);
  if (!match) {
    return "Network CIDR must include a prefix, such as 10.10.1.0/24.";
  }

  const actualPrefix = Number(match[1]);
  if (actualPrefix !== expectedPrefix) {
    return `${scope} groups must use /${expectedPrefix}.`;
  }

  return null;
}

function toUpdatePayload(form: GroupFormState) {
  return {
    name: form.name,
    default_allowed_ips: form.allowedIps
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
    dns_servers: form.dnsServers
      ? form.dnsServers
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : null,
    description: form.description,
    is_active: form.isActive,
  };
}

export function GroupsPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [createForm, setCreateForm] = useState<GroupFormState>(DEFAULT_CREATE_FORM);
  const [editForm, setEditForm] = useState<GroupFormState>(DEFAULT_CREATE_FORM);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const guiSettingsQuery = useGuiSettingsQuery();
  const { pushToast } = useToast();
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });

  const groups = groupsQuery.data ?? [];
  const activeCount = useMemo(
    () => groups.filter((group) => group.is_active).length,
    [groups],
  );
  const createScopeError = getScopeValidationMessage(createForm.scope, createForm.networkCidr);

  function updateCreateFormField<K extends keyof GroupFormState>(
    key: K,
    value: GroupFormState[K],
  ) {
    setCreateError(null);
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function refreshGroupQueries() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
    await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
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

  function openEditModal(group: Group) {
    setEditingGroup(group);
    setEditError(null);
    setEditForm({
      name: group.name,
      scope: group.scope,
      networkCidr: group.network_cidr,
      allowedIps: group.default_allowed_ips.join(", "),
      dnsServers: group.dns_servers?.join(", ") ?? "",
      description: group.description ?? "",
      isActive: group.is_active,
    });
  }

  function closeEditModal() {
    setEditingGroup(null);
    setEditError(null);
    setEditForm(DEFAULT_CREATE_FORM);
  }

  const createMutation = useMutation({
    mutationFn: async () =>
      createGroup((await auth.getValidAccessToken()) ?? "", {
        name: createForm.name,
        scope: createForm.scope,
        network_cidr: normalizeNetworkCidr(createForm.networkCidr),
        default_allowed_ips: createForm.allowedIps
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
        dns_servers: createForm.dnsServers
          ? createForm.dnsServers
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean)
          : undefined,
        description: createForm.description,
        is_active: createForm.isActive,
      }),
    onSuccess: async () => {
      closeCreateModal();
      await applyIfNeeded("Group created.");
      await refreshGroupQueries();
    },
    onError: (error) => {
      setCreateError(error instanceof Error ? error.message : "Failed to create group");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      groupId,
      form,
    }: {
      groupId: number;
      form: GroupFormState;
    }) => updateGroup((await auth.getValidAccessToken()) ?? "", groupId, toUpdatePayload(form)),
    onSuccess: async () => {
      closeEditModal();
      await applyIfNeeded("Group updated.");
      await refreshGroupQueries();
    },
    onError: (error) => {
      setEditError(error instanceof Error ? error.message : "Failed to update group");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (group: Group) =>
      updateGroup((await auth.getValidAccessToken()) ?? "", group.id, {
        is_active: !group.is_active,
      }),
    onSuccess: async (_, group) => {
      await applyIfNeeded(group.is_active ? "Group disabled." : "Group enabled.");
      await refreshGroupQueries();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) =>
      deleteGroup(groupId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded("Group deleted.");
      await refreshGroupQueries();
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">Groups</div>
          <h1>Network groups</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">Total groups</div>
          <div className="stat-value">{groups.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Enabled</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          + Add group
        </button>
      </div>
      <Panel title="Group list">
        <DataTable
          headers={["Status", "Name", "Scope", "Network", "Allowed IPs", "DNS", "Actions"]}
        >
          {groups.map((group) => (
            <tr key={group.id}>
              <td>
                <button
                  className={`toggle-chip ${group.is_active ? "toggle-chip-on" : ""}`}
                  onClick={() => toggleMutation.mutate(group)}
                >
                  {group.is_active ? "On" : "Off"}
                </button>
              </td>
              <td>{group.name}</td>
              <td>{group.scope}</td>
              <td>{group.network_cidr}</td>
              <td>{group.default_allowed_ips.join(", ")}</td>
              <td>{group.dns_servers?.join(", ") || "—"}</td>
              <td className="action-row">
                <button className="ghost-button" onClick={() => openEditModal(group)}>
                  Edit
                </button>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (window.confirm(`Delete group "${group.name}"?`)) {
                      deleteMutation.mutate(group.id);
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
              <h2>Add group</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                Close
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>Name</span>
                <input
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("name", event.target.value)}
                />
              </label>
              <label className="field">
                <span>Scope</span>
                <select
                  value={createForm.scope}
                  onChange={(event) => updateCreateFormField("scope", event.target.value)}
                >
                  <option value="single_site">single_site</option>
                  <option value="multi_site">multi_site</option>
                  <option value="admin">admin</option>
                </select>
              </label>
              <label className="field">
                <span>Network CIDR</span>
                <input
                  value={createForm.networkCidr}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("networkCidr", event.target.value)}
                  onBlur={(event) =>
                    updateCreateFormField("networkCidr", normalizeNetworkCidr(event.target.value))
                  }
                  placeholder={SCOPE_EXAMPLE[createForm.scope] ?? "10.10.1.0/24"}
                />
                <div className="muted-text">
                  Required for this scope: /{SCOPE_PREFIX[createForm.scope] ?? 24}
                </div>
              </label>
              <label className="field">
                <span>Allowed IPs</span>
                <input
                  value={createForm.allowedIps}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("allowedIps", event.target.value)}
                  placeholder="10.10.1.0/24"
                />
              </label>
              <label className="field">
                <span>DNS servers</span>
                <input
                  value={createForm.dnsServers}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("dnsServers", event.target.value)}
                  placeholder="1.1.1.1, 8.8.8.8"
                />
              </label>
              <label className="field field-span-2">
                <span>Description</span>
                <input
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("description", event.target.value)}
                  placeholder="Optional note"
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) => updateCreateFormField("isActive", event.target.checked)}
                />
                <div>
                  <strong>Enabled</strong>
                  <div className="muted-text">Create this group in an active state.</div>
                </div>
              </label>
            </div>
            {createScopeError ? <div className="error-banner">{createScopeError}</div> : null}
            {createError ? <div className="error-banner">{createError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={
                  !createForm.name ||
                  !createForm.networkCidr ||
                  !createForm.allowedIps ||
                  Boolean(createScopeError) ||
                  createMutation.isPending
                }
                onClick={() => createMutation.mutate()}
              >
                {createMutation.isPending ? "Creating..." : "Create group"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingGroup ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>Edit group</h2>
              <button className="ghost-button" onClick={closeEditModal}>
                Close
              </button>
            </div>
            <div className="form-grid">
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
              <label className="field">
                <span>Scope</span>
                <input value={editForm.scope} disabled />
              </label>
              <label className="field">
                <span>Network CIDR</span>
                <input value={editForm.networkCidr} disabled />
              </label>
              <label className="field">
                <span>Allowed IPs</span>
                <input
                  value={editForm.allowedIps}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, allowedIps: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>DNS servers</span>
                <input
                  value={editForm.dnsServers}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, dnsServers: event.target.value }))
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
                  <div className="muted-text">Disable to stop new active use from this group.</div>
                </div>
              </label>
            </div>
            {editError ? <div className="error-banner">{editError}</div> : null}
            <div className="modal-actions">
              <button
                className="primary-button"
                disabled={!editForm.name || !editForm.allowedIps || updateMutation.isPending}
                onClick={() =>
                  updateMutation.mutate({
                    groupId: editingGroup.id,
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
