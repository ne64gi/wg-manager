import { useMemo } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../core/auth/AuthContext";
import { getTopology, updateGroup, updatePeer, updateUser } from "../../lib/api";
import { t } from "../../core/i18n";
import { useToast } from "../../design/ui/ToastProvider";
import type { NetworkGraphSelection } from "./NetworkGraph";
import { useGuiSettingsQuery } from "../gui/useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";

export function useNetworkPageData() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const guiSettingsQuery = useGuiSettingsQuery();
  const { pushToast } = useToast();
  const overviewRefreshMs = (guiSettingsQuery.data?.overview_refresh_seconds ?? 5) * 1000;

  const topologyQuery = useQuery({
    queryKey: queryKeys.topology,
    queryFn: async () => getTopology((await auth.getValidAccessToken()) ?? ""),
    enabled: auth.isAuthenticated,
    refetchInterval: overviewRefreshMs,
  });

  const topologyGroups = topologyQuery.data ?? [];
  const metrics = useMemo(() => {
    const totalUsers = topologyGroups.reduce((sum, group) => sum + group.user_count, 0);
    const totalPeers = topologyGroups.reduce((sum, group) => sum + group.peer_count, 0);
    const onlinePeers = topologyGroups.reduce((sum, group) => sum + group.online_peer_count, 0);
    const revealedPeers = topologyGroups.reduce(
      (sum, group) =>
        sum +
        group.users.reduce(
          (userSum, user) => userSum + user.peers.filter((peer) => peer.is_revealed).length,
          0,
        ),
      0,
    );
    const topTalkers = topologyGroups
      .flatMap((group) =>
        group.users.flatMap((user) =>
          user.peers.map((peer) => ({
            peerId: peer.peer_id,
            peerName: peer.peer_name,
            userName: user.user_name,
            groupName: group.group_name,
            totalBytes: peer.total_bytes,
            isOnline: peer.is_online,
          })),
        ),
      )
      .sort((left, right) => right.totalBytes - left.totalBytes)
      .slice(0, 5);

    return {
      totalGroups: topologyGroups.length,
      totalUsers,
      totalPeers,
      onlinePeers,
      hiddenPeers: Math.max(totalPeers - revealedPeers, 0),
      topTalkers,
    };
  }, [topologyGroups]);

  async function invalidateNetworkQueries() {
    await queryClient.invalidateQueries({ queryKey: queryKeys.groups });
    await queryClient.invalidateQueries({ queryKey: queryKeys.users });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peers });
    await queryClient.invalidateQueries({ queryKey: queryKeys.peerStatuses });
    await queryClient.invalidateQueries({ queryKey: queryKeys.topology });
    await queryClient.invalidateQueries({ queryKey: queryKeys.overview });
    await queryClient.invalidateQueries({ queryKey: queryKeys.syncState });
  }

  const toggleSelectionMutation = useMutation({
    mutationFn: async (selection: NetworkGraphSelection) => {
      if (!selection || selection.kind === "server" || selection.entityId == null) {
        return null;
      }

      const accessToken = (await auth.getValidAccessToken()) ?? "";
      switch (selection.kind) {
        case "group":
          return updateGroup(accessToken, selection.entityId, {
            is_active: !selection.isActive,
          });
        case "user":
          return updateUser(accessToken, selection.entityId, {
            is_active: !selection.isActive,
          });
        case "peer":
          return updatePeer(accessToken, selection.entityId, {
            is_active: !selection.isActive,
          });
        default:
          return null;
      }
    },
    onSuccess: async (_, selection) => {
      if (!selection || selection.kind === "server") {
        return;
      }

      pushToast(
        selection.isActive
          ? t("network.toggle_disabled", "Disabled from the network graph.")
          : t("network.toggle_enabled", "Enabled from the network graph."),
      );
      await invalidateNetworkQueries();
    },
    onError: (error) => {
      pushToast(
        error instanceof Error
          ? error.message
          : t("network.toggle_failed", "Failed to update the selected node."),
        "error",
      );
    },
  });

  return {
    topologyGroups,
    metrics,
    isLoading: topologyQuery.isLoading,
    toggleSelectionMutation,
  };
}
