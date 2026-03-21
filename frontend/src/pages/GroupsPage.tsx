import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyServerConfig,
  createGroup,
  deleteGroup,
  downloadGroupBundle,
  getGroupBundleWarning,
  listGroups,
  updateGroup,
} from "../lib/api";
import { formatApplyFailureMessage, t } from "../lib/i18n";
import type { Group } from "../types";
import { useAuth } from "../modules/auth/AuthContext";
import { useGuiSettingsQuery } from "../modules/gui/useGuiSettingsQuery";
import { Panel } from "../ui/Cards";
import { MobileInfoPopover } from "../ui/MobileInfoPopover";
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

function formatDeleteConfirm(name: string) {
  return t("groups.delete_confirm_named", `Delete "${name}"?`).replace("{name}", name);
}

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function getScopeValidationMessage(scope: string, networkCidr: string) {
  const expectedPrefix = SCOPE_PREFIX[scope];
  if (!networkCidr.trim()) {
    return null;
  }

  const match = networkCidr.trim().match(/\/(\d{1,2})$/);
  if (!match) {
    return t(
      "groups.network_prefix_required",
      "Network CIDR must include a prefix, such as 10.10.1.0/24.",
    );
  }

  const actualPrefix = Number(match[1]);
  if (actualPrefix !== expectedPrefix) {
    const scopeLabel = t(`groups.scope_${scope}`, scope);
    return t("groups.prefix_rule", "{scope} groups must use /{prefix}.")
      .replace("{scope}", scopeLabel)
      .replace("{prefix}", String(expectedPrefix));
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
    setCreateForm((current) => ({ ...current, [key]: value }));
  }

  async function refreshGroupQueries() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
    await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
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

  function openEditModal(group: Group) {
    setEditingGroup(group);
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
      await applyIfNeeded(t("groups.created_notice", "Group created."));
      await refreshGroupQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("groups.create_failed", "Failed to create group"),
        "error",
      );
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
      await applyIfNeeded(t("groups.updated_notice", "Group updated."));
      await refreshGroupQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("groups.update_failed", "Failed to update group"),
        "error",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (group: Group) =>
      updateGroup((await auth.getValidAccessToken()) ?? "", group.id, {
        is_active: !group.is_active,
      }),
    onSuccess: async (_, group) => {
      await applyIfNeeded(
        group.is_active
          ? t("groups.disabled_notice", "Group disabled.")
          : t("groups.enabled_notice", "Group enabled."),
      );
      await refreshGroupQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("groups.update_failed", "Failed to update group"),
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: number) =>
      deleteGroup(groupId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded(t("groups.deleted_notice", "Group deleted."));
      await refreshGroupQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("groups.delete_failed", "Failed to delete group"),
        "error",
      );
    },
  });

  const bundleMutation = useMutation({
    mutationFn: async (group: Group) => {
      const accessToken = (await auth.getValidAccessToken()) ?? "";
      const warning = await getGroupBundleWarning(group.id, accessToken);
      const confirmed = window.confirm(
        `${warning.message}\n\n${t("groups.bundle_peer_count", "Peer count")}: ${warning.peer_count}`,
      );
      if (!confirmed) {
        return null;
      }
      return {
        blob: await downloadGroupBundle(group.id, accessToken),
        filename: `${group.name}-peers.zip`,
      };
    },
    onSuccess: async (result) => {
      if (!result) {
        return;
      }
      saveBlob(result.blob, result.filename);
      await applyIfNeeded(t("groups.bundle_notice", "Group peer bundle downloaded."));
      await refreshGroupQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("groups.bundle_failed", "Failed to download group bundle."),
        "error",
      );
    },
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <div className="eyebrow">{t("nav.groups", "Groups")}</div>
          <h1>{t("groups.title", "Group management")}</h1>
        </div>
      </div>
      <div className="stats-grid stats-grid-compact">
        <div className="stat-card">
          <div className="stat-label">{t("groups.total", "Total groups")}</div>
          <div className="stat-value">{groups.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">{t("groups.enabled_total", "Enabled")}</div>
          <div className="stat-value">{activeCount}</div>
        </div>
      </div>
      <div className="toolbar-card">
        <button className="success-button" onClick={() => setIsCreateOpen(true)}>
          {t("groups.add", "+ Add group")}
        </button>
      </div>
      <Panel title={t("groups.list", "Group list")}>
        <div className="desktop-table">
          <DataTable
            headers={[
              t("common.status", "Status"),
              t("groups.name", "Name"),
              t("table.scope", "Scope"),
              t("groups.network", "Network"),
              t("groups.allowed_ips", "Allowed IPs"),
              t("groups.dns", "DNS"),
              t("common.actions", "Actions"),
            ]}
          >
            {groups.map((group) => (
              <tr key={group.id}>
                <td>
                  <button
                    className={`toggle-chip ${group.is_active ? "toggle-chip-on" : ""}`}
                    onClick={() => toggleMutation.mutate(group)}
                  >
                    {group.is_active ? t("common.on", "On") : t("common.off", "Off")}
                  </button>
                </td>
                <td>{group.name}</td>
                <td>{t(`groups.scope_${group.scope}`, group.scope)}</td>
                <td>{group.network_cidr}</td>
                <td>{group.default_allowed_ips.join(", ")}</td>
                <td>{group.dns_servers?.join(", ") || "—"}</td>
                <td className="action-row">
                  <button
                    className="secondary-button"
                    onClick={() => bundleMutation.mutate(group)}
                  >
                    {t("groups.bundle", "Download bundle")}
                  </button>
                  <button className="ghost-button" onClick={() => openEditModal(group)}>
                    {t("common.edit", "Edit")}
                  </button>
                  <button
                    className="danger-button"
                    onClick={() => {
                      if (
                        window.confirm(formatDeleteConfirm(group.name))
                      ) {
                        deleteMutation.mutate(group.id);
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
          {groups.map((group) => (
            <article key={group.id} className="mobile-record">
              <div className="mobile-record-main">
                <div>
                  <div className="mobile-record-title">{group.name}</div>
                  <div className="mobile-record-subtitle">
                    {t(`groups.scope_${group.scope}`, group.scope)} / {group.network_cidr}
                  </div>
                </div>
                <div className={`status-pill ${group.is_active ? "status-online" : ""}`}>
                      {group.is_active ? t("common.enabled", "Enabled") : t("common.disabled", "Disabled")}
                </div>
              </div>
              <div className="mobile-record-actions">
                <button
                  className={`toggle-chip ${group.is_active ? "toggle-chip-on" : ""}`}
                  onClick={() => toggleMutation.mutate(group)}
                >
                  {group.is_active ? t("common.on", "On") : t("common.off", "Off")}
                </button>
                <button
                  className="secondary-button"
                  onClick={() => bundleMutation.mutate(group)}
                >
                  {t("groups.bundle", "Download bundle")}
                </button>
                <button className="ghost-button" onClick={() => openEditModal(group)}>
                  {t("common.edit", "Edit")}
                </button>
                <MobileInfoPopover>
                  <div className="mobile-info-grid">
                    <div><strong>{t("groups.allowed_ips", "Allowed IPs")}</strong></div>
                    <div>{group.default_allowed_ips.join(", ")}</div>
                    <div><strong>{t("groups.dns", "DNS")}</strong></div>
                    <div>{group.dns_servers?.join(", ") || "—"}</div>
                    <div><strong>{t("common.description", "Description")}</strong></div>
                    <div>{group.description || "—"}</div>
                  </div>
                </MobileInfoPopover>
                <button
                  className="danger-button"
                  onClick={() => {
                    if (
                      window.confirm(formatDeleteConfirm(group.name))
                    ) {
                      deleteMutation.mutate(group.id);
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
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("groups.add_title", "Add group")}</h2>
              <button className="ghost-button" onClick={closeCreateModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("groups.name", "Name")}</span>
                <input
                  value={createForm.name}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("name", event.target.value)}
                />
              </label>
              <label className="field">
                <span>{t("groups.scope", "Scope")}</span>
                <select
                  value={createForm.scope}
                  onChange={(event) => updateCreateFormField("scope", event.target.value)}
                >
                  <option value="single_site">{t("groups.scope_single_site", "Single site")}</option>
                  <option value="multi_site">{t("groups.scope_multi_site", "Multi site")}</option>
                  <option value="admin">{t("groups.scope_admin", "Admin")}</option>
                </select>
              </label>
              <label className="field">
                <span>{t("groups.network_cidr", "Network CIDR")}</span>
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
                  {t("groups.scope", "Scope")}: {t(`groups.scope_${createForm.scope}`, createForm.scope)} /{SCOPE_PREFIX[createForm.scope] ?? 24}
                </div>
              </label>
              <label className="field">
                <span>{t("groups.allowed_ips", "Allowed IPs")}</span>
                <input
                  value={createForm.allowedIps}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("allowedIps", event.target.value)}
                  placeholder="10.10.1.0/24"
                />
              </label>
              <label className="field">
                <span>{t("groups.dns_servers", "DNS servers")}</span>
                <input
                  value={createForm.dnsServers}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("dnsServers", event.target.value)}
                  placeholder="1.1.1.1, 8.8.8.8"
                />
              </label>
              <label className="field field-span-2">
                <span>{t("groups.description", "Description")}</span>
                <input
                  value={createForm.description}
                  autoComplete="off"
                  onChange={(event) => updateCreateFormField("description", event.target.value)}
                  placeholder={t("groups.create_note_placeholder", "Optional note")}
                />
              </label>
              <label className="field-checkbox field-span-2">
                <input
                  type="checkbox"
                  checked={createForm.isActive}
                  onChange={(event) => updateCreateFormField("isActive", event.target.checked)}
                />
                <div>
                  <strong>{t("common.enabled", "Enabled")}</strong>
                  <div className="muted-text">{t("groups.create_active", "Create this group in an active state.")}</div>
                </div>
              </label>
            </div>
            {createScopeError ? <div className="error-banner">{createScopeError}</div> : null}
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
                {createMutation.isPending ? t("groups.creating", "Creating...") : t("groups.create", "Create group")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {editingGroup ? (
        <div className="modal-backdrop" onClick={closeEditModal}>
          <div className="modal-card modal-compact" onClick={(event) => event.stopPropagation()}>
            <div className="panel-header">
              <h2>{t("groups.edit_title", "Edit group")}</h2>
              <button className="ghost-button" onClick={closeEditModal}>
                {t("common.close", "Close")}
              </button>
            </div>
            <div className="form-grid">
              <label className="field">
                <span>{t("groups.name", "Name")}</span>
                <input
                  value={editForm.name}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, name: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("groups.scope", "Scope")}</span>
                <input value={t(`groups.scope_${editForm.scope}`, editForm.scope)} disabled />
              </label>
              <label className="field">
                <span>{t("groups.network_cidr", "Network CIDR")}</span>
                <input value={editForm.networkCidr} disabled />
              </label>
              <label className="field">
                <span>{t("groups.allowed_ips", "Allowed IPs")}</span>
                <input
                  value={editForm.allowedIps}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, allowedIps: event.target.value }))
                  }
                />
              </label>
              <label className="field">
                <span>{t("groups.dns_servers", "DNS servers")}</span>
                <input
                  value={editForm.dnsServers}
                  autoComplete="off"
                  onChange={(event) =>
                    setEditForm((current) => ({ ...current, dnsServers: event.target.value }))
                  }
                />
              </label>
              <label className="field field-span-2">
                <span>{t("groups.description", "Description")}</span>
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
                  <div className="muted-text">{t("groups.disable_hint", "Disable to stop new active use from this group.")}</div>
                </div>
              </label>
            </div>
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
                {updateMutation.isPending ? t("groups.saving", "Saving...") : t("groups.save_changes", "Save changes")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
