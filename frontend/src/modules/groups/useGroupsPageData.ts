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
} from "../../lib/api";
import { confirmAction, downloadBlob } from "../../lib/browser/actions";
import { formatApplyFailureMessage, t } from "../../lib/i18n";
import type { Group } from "../../types";
import { useToast } from "../../ui/ToastProvider";
import { useAuth } from "../auth/AuthContext";
import { useGuiSettingsQuery } from "../gui/useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";

export type GroupFormState = {
  name: string;
  scope: string;
  networkCidr: string;
  allowedIps: string;
  dnsServers: string;
  description: string;
  isActive: boolean;
};

export const DEFAULT_CREATE_FORM: GroupFormState = {
  name: "",
  scope: "single_site",
  networkCidr: "",
  allowedIps: "",
  dnsServers: "",
  description: "",
  isActive: true,
};

export const SCOPE_PREFIX: Record<string, number> = {
  single_site: 24,
  multi_site: 16,
  admin: 8,
};

export const SCOPE_EXAMPLE: Record<string, string> = {
  single_site: "10.10.1.0/24",
  multi_site: "10.10.0.0/16",
  admin: "10.0.0.0/8",
};

export function normalizeNetworkCidr(value: string) {
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

export function formatDeleteConfirm(name: string) {
  return t("groups.delete_confirm_named", `Delete "${name}"?`).replace("{name}", name);
}

export function getBundleWarningText(peerCount: number) {
  return `${t(
    "groups.bundle_warning",
    "This bundle will reissue keys for eligible peers, package the new configs into a ZIP, and invalidate older peer files. Apply before distributing the new files.",
  )}\n\n${t("groups.bundle_peer_count", "Peer count")}: ${peerCount}`;
}

export function getScopeValidationMessage(scope: string, networkCidr: string) {
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

export function useGroupsPageData() {
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

  function updateCreateFormField<K extends keyof GroupFormState>(
    key: K,
    value: GroupFormState[K],
  ) {
    setCreateForm((current) => ({ ...current, [key]: value }));
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
      const confirmed = confirmAction(getBundleWarningText(warning.peer_count));
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
      downloadBlob(result.blob, result.filename);
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

  return {
    groups,
    activeCount,
    isCreateOpen,
    setIsCreateOpen,
    editingGroup,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    createScopeError,
    guiSettingsQuery,
    updateCreateFormField,
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
