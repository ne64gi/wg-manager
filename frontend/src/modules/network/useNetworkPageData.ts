import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../core/auth/AuthContext";
import { getTopology } from "../../lib/api";
import { useGuiSettingsQuery } from "../gui/useGuiSettingsQuery";
import { queryKeys } from "../queryKeys";

export function useNetworkPageData() {
  const auth = useAuth();
  const guiSettingsQuery = useGuiSettingsQuery();
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

    return {
      totalGroups: topologyGroups.length,
      totalUsers,
      totalPeers,
      onlinePeers,
      hiddenPeers: Math.max(totalPeers - revealedPeers, 0),
    };
  }, [topologyGroups]);

  return {
    topologyGroups,
    metrics,
    isLoading: topologyQuery.isLoading,
  };
}
