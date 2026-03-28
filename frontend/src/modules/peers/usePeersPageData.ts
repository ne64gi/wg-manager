import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  applyServerConfig,
  createPeer,
  deletePeer,
  getPeerStatuses,
  listGroups,
  listUsers,
  reissuePeer,
  revealPeerArtifacts,
  updatePeer,
} from "../../lib/api";
import { confirmAction } from "../../core/browser/actions";
import { formatApplyFailureMessage, t } from "../../core/i18n";
import { applySortDirection, compareBoolean, compareNumber, compareText } from "../../lib/sort";
import type { Group, RevealedPeerArtifacts, User } from "../../types";
import { useToast } from "../../design/ui/ToastProvider";
import { useAuth } from "../../core/auth/AuthContext";
import { useGuiSettingsQuery } from "../gui/useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";
import { useSortableTable } from "../table/useSortableTable";

export type PeerFormState = {
  userId: string;
  name: string;
  assignedIp: string;
  description: string;
  isActive: boolean;
};

const DEFAULT_CREATE_FORM: PeerFormState = {
  userId: "",
  name: "",
  assignedIp: "",
  description: "",
  isActive: true,
};

function formatDeleteConfirm(name: string) {
  return t("peers.delete_confirm_named", `Delete "${name}"?`).replace("{name}", name);
}

function formatReissueConfirm(name: string) {
  return t(
    "peers.reissue_confirm_named",
    `Reissue keys for "${name}"? Existing peer files will stop working after apply.`,
  ).replace("{name}", name);
}

function canManagePeerSecrets(peer: {
  is_active: boolean;
  user_id: number;
}, peerUser: User | undefined, groups: Group[]) {
  const userIsActive = peerUser?.is_active ?? false;
  const groupIsActive = peerUser
    ? groups.some((group) => group.id === peerUser.group_id && group.is_active)
    : false;
  return peer.is_active && userIsActive && groupIsActive;
}

export function usePeersPageData() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const guiSettingsQuery = useGuiSettingsQuery();
  const { pushToast } = useToast();
  const [revealed, setRevealed] = useState<RevealedPeerArtifacts | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [createForm, setCreateForm] = useState<PeerFormState>(DEFAULT_CREATE_FORM);
  const { sortKey, sortDirection, toggleSort } = useSortableTable<"status" | "peer" | "ip" | "routes" | "traffic">({
    key: "peer",
    direction: "asc",
  });
  const peersRefreshMs = (guiSettingsQuery.data?.peers_refresh_seconds ?? 10) * 1000;

  const peerStatusesQuery = useQuery({
    queryKey: queryKeys.peerStatuses,
    queryFn: async () => getPeerStatuses((await auth.getValidAccessToken()) ?? ""),
    refetchInterval: peersRefreshMs,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: async () => listUsers((await auth.getValidAccessToken()) ?? ""),
  });
  const groupsQuery = useQuery({
    queryKey: queryKeys.groups,
    queryFn: async () => listGroups((await auth.getValidAccessToken()) ?? ""),
  });

  const users = usersQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const peers = peerStatusesQuery.data ?? [];
  const activeUsers = useMemo(() => users.filter((user) => user.is_active), [users]);
  const userMap = useMemo(
    () => new Map(users.map((user) => [user.id, user] as const)),
    [users],
  );
  const groupMap = useMemo(
    () => new Map(groups.map((group) => [group.id, group.name] as const)),
    [groups],
  );
  const filteredPeers = useMemo(() => {
    const needle = searchText.trim().toLowerCase();
    const searchMatched = !needle
      ? peers
      : peers.filter((peer) => {
      const peerUser = userMap.get(peer.user_id);
      const groupName = peerUser ? groupMap.get(peerUser.group_id) ?? "" : "";

      return [
        peer.peer_name,
        peer.user_name,
        groupName,
        peer.assigned_ip,
        peer.endpoint ?? "",
        peer.effective_allowed_ips.join(" "),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
    return [...searchMatched].sort((left, right) => {
      const leftUser = userMap.get(left.user_id);
      const rightUser = userMap.get(right.user_id);
      const leftGroup = leftUser ? groupMap.get(leftUser.group_id) ?? "" : "";
      const rightGroup = rightUser ? groupMap.get(rightUser.group_id) ?? "" : "";
      let result = 0;
      switch (sortKey) {
        case "status":
          result = compareBoolean(left.is_online, right.is_online) || compareText(left.peer_name, right.peer_name);
          break;
        case "ip":
          result = compareText(left.assigned_ip, right.assigned_ip) || compareText(left.peer_name, right.peer_name);
          break;
        case "routes":
          result =
            compareText(left.effective_allowed_ips.join(", "), right.effective_allowed_ips.join(", ")) ||
            compareText(left.peer_name, right.peer_name);
          break;
        case "traffic":
          result = compareNumber(left.total_bytes, right.total_bytes) || compareText(left.peer_name, right.peer_name);
          break;
        case "peer":
        default:
          result =
            compareText(left.peer_name, right.peer_name) ||
            compareText(left.user_name, right.user_name) ||
            compareText(leftGroup, rightGroup);
          break;
      }
      return applySortDirection(result, sortDirection);
    });
  }, [groupMap, peers, searchText, sortDirection, sortKey, userMap]);
  const onlineCount = useMemo(
    () => peers.filter((peer) => peer.is_online).length,
    [peers],
  );

  async function refreshQueries() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
    await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    await queryClient.invalidateQueries({ queryKey: queryKeys.overviewHistory(24) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.serverConfigPreview });
    await queryClient.invalidateQueries({ queryKey: queryKeys.userSummaries });
    await queryClient.invalidateQueries({ queryKey: queryKeys.groupSummaries });
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

  useEffect(() => {
    if (!isCreateOpen) {
      return;
    }

    if (!activeUsers.length) {
      if (createForm.userId) {
        setCreateForm((current) => ({ ...current, userId: "" }));
      }
      return;
    }

    const selectedIsActive = activeUsers.some(
      (user) => String(user.id) === createForm.userId,
    );
    if (!selectedIsActive) {
      setCreateForm((current) => ({
        ...current,
        userId: String(activeUsers[0].id),
      }));
    }
  }, [activeUsers, createForm.userId, isCreateOpen]);

  const createMutation = useMutation({
    mutationFn: async () =>
      createPeer((await auth.getValidAccessToken()) ?? "", {
        user_id: Number(createForm.userId),
        name: createForm.name,
        assigned_ip: createForm.assignedIp || undefined,
        description: createForm.description,
        is_active: createForm.isActive,
      }),
    onSuccess: async () => {
      closeCreateModal();
      await applyIfNeeded(t("peers.created_notice", "Peer created."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("peers.create_failed", "Failed to create peer"),
        "error",
      );
    },
  });

  const revealMutation = useMutation({
    mutationFn: async (peerId: number) =>
      revealPeerArtifacts(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async (artifacts) => {
      setRevealed(artifacts);
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("peers.reveal_failed", "Failed to reveal peer artifacts"),
        "error",
      );
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({
      peerId,
      isActive,
    }: {
      peerId: number;
      isActive: boolean;
    }) =>
      updatePeer((await auth.getValidAccessToken()) ?? "", peerId, {
        is_active: !isActive,
      }),
    onSuccess: async (_, variables) => {
      await applyIfNeeded(
        variables.isActive
          ? t("peers.disabled_notice", "Peer disabled.")
          : t("peers.enabled_notice", "Peer enabled."),
      );
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("peers.update_failed", "Failed to update peer"),
        "error",
      );
    },
  });

  const reissueMutation = useMutation({
    mutationFn: async (peerId: number) =>
      reissuePeer(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded(t("peers.reissue_notice", "Peer keys regenerated."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("peers.reissue_failed", "Failed to reissue peer keys"),
        "error",
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (peerId: number) =>
      deletePeer(peerId, (await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      await applyIfNeeded(t("peers.deleted_notice", "Peer deleted."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("peers.delete_failed", "Failed to delete peer"),
        "error",
      );
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => applyServerConfig((await auth.getValidAccessToken()) ?? ""),
    onSuccess: async () => {
      pushToast(t("peers.apply_notice", "Config applied."));
      await refreshQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error ? error.message : t("common.apply_failed", "Apply failed."),
        "error",
      );
    },
  });

  return {
    auth,
    guiSettingsQuery,
    revealed,
    setRevealed,
    isCreateOpen,
    setIsCreateOpen,
    searchText,
    setSearchText,
    createForm,
    setCreateForm,
    users,
    groups,
    peers,
    activeUsers,
    userMap,
    groupMap,
    filteredPeers,
    onlineCount,
    sortKey,
    sortDirection,
    toggleSort,
    createMutation,
    revealMutation,
    toggleMutation,
    reissueMutation,
    deleteMutation,
    applyMutation,
    closeCreateModal,
  };
}

export {
  DEFAULT_CREATE_FORM,
  canManagePeerSecrets,
  formatDeleteConfirm,
  formatReissueConfirm,
};
